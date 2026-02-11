// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject } from '@theia/core/shared/inversify';
import { isLanguageModelStreamResponse, LanguageModel, LanguageModelRegistry, LanguageModelResponse, LanguageModelStreamResponsePart, UserRequest } from './language-model';
import { LanguageModelExchangeRequest, LanguageModelSession } from './language-model-interaction-model';
import { Emitter } from '@theia/core';

export interface RequestAddedEvent {
    type: 'requestAdded',
    id: string;
}
export interface ResponseCompletedEvent {
    type: 'responseCompleted',
    requestId: string;
}
export interface SessionsClearedEvent {
    type: 'sessionsCleared'
}
export type SessionEvent = RequestAddedEvent | ResponseCompletedEvent | SessionsClearedEvent;

export const LanguageModelService = Symbol('LanguageModelService');
export interface LanguageModelService {
    onSessionChanged: Emitter<SessionEvent>['event'];
    /**
     * Collection of all recorded LanguageModelSessions.
     */
    sessions: LanguageModelSession[];
    /**
     * Submit a language model request, it will automatically be recorded within a LanguageModelSession.
     */
    sendRequest(
        languageModel: LanguageModel,
        languageModelRequest: UserRequest
    ): Promise<LanguageModelResponse>;
}
export class LanguageModelServiceImpl implements LanguageModelService {

    @inject(LanguageModelRegistry)
    protected languageModelRegistry: LanguageModelRegistry;

    private _sessions: LanguageModelSession[] = [];

    get sessions(): LanguageModelSession[] {
        return this._sessions;
    }

    set sessions(newSessions: LanguageModelSession[]) {
        this._sessions = newSessions;
        if (newSessions.length === 0) {
            this.sessionChangedEmitter.fire({ type: 'sessionsCleared' });
        }
    }

    protected sessionChangedEmitter = new Emitter<SessionEvent>();
    onSessionChanged = this.sessionChangedEmitter.event;

    async sendRequest(
        languageModel: LanguageModel,
        languageModelRequest: UserRequest
    ): Promise<LanguageModelResponse> {
        // Filter messages based on client settings
        languageModelRequest.messages = languageModelRequest.messages.filter(message => {
            if (message.type === 'thinking' && languageModelRequest.clientSettings?.keepThinking === false) {
                return false;
            }
            if ((message.type === 'tool_result' || message.type === 'tool_use') &&
                languageModelRequest.clientSettings?.keepToolCalls === false) {
                return false;
            }
            // Keep all other messages
            return true;
        });

        let response = await languageModel.request(languageModelRequest, languageModelRequest.cancellationToken);

        // #region agent log - LanguageModelService_sendRequest_responseType
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_lm_sendRequest_responseType`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H8',
                location: 'language-model-service.ts:sendRequest',
                message: 'Language model response type after request',
                data: {
                    isStream: isLanguageModelStreamResponse(response),
                    sessionId: languageModelRequest.sessionId,
                    requestId: languageModelRequest.requestId,
                    subRequestId: languageModelRequest.subRequestId ?? null,
                    languageModelId: languageModel.id,
                    hasCancellationToken: !!languageModelRequest.cancellationToken
                }
            })
        }).catch(() => { });
        // #endregion

        let storedResponse: LanguageModelExchangeRequest['response'];
        if (isLanguageModelStreamResponse(response)) {
            const parts: LanguageModelStreamResponsePart[] = [];
            response = {
                ...response,
                stream: createLoggingAsyncIterable(
                    response.stream,
                    parts,
                    () => this.sessionChangedEmitter.fire({
                        type: 'responseCompleted',
                        requestId: languageModelRequest.subRequestId ?? languageModelRequest.requestId
                    }),
                    {
                        sessionId: languageModelRequest.sessionId,
                        requestId: languageModelRequest.requestId,
                        subRequestId: languageModelRequest.subRequestId,
                        languageModelId: languageModel.id,
                        agentId: languageModelRequest.agentId
                    }
                )
            };
            storedResponse = { parts };
        } else {
            storedResponse = response;
        }
        this.storeRequest(languageModel, languageModelRequest, storedResponse);

        return response;
    }

    protected storeRequest(languageModel: LanguageModel, languageModelRequest: UserRequest, response: LanguageModelExchangeRequest['response']): void {
        // Find or create the session for this request
        let session = this._sessions.find(s => s.id === languageModelRequest.sessionId);
        if (!session) {
            session = {
                id: languageModelRequest.sessionId,
                exchanges: []
            };
            this._sessions.push(session);
        }

        // Find or create the exchange for this request
        let exchange = session.exchanges.find(r => r.id === languageModelRequest.requestId);
        if (!exchange) {
            exchange = {
                id: languageModelRequest.requestId,
                requests: [],
                metadata: { agent: languageModelRequest.agentId }
            };
            session.exchanges.push(exchange);
        }

        // Create and add the LanguageModelExchangeRequest to the exchange
        const exchangeRequest: LanguageModelExchangeRequest = {
            id: languageModelRequest.subRequestId ?? languageModelRequest.requestId,
            request: languageModelRequest,
            languageModel: languageModel.id,
            response: response,
            metadata: {}
        };

        exchange.requests.push(exchangeRequest);

        exchangeRequest.metadata.agent = languageModelRequest.agentId;
        exchangeRequest.metadata.timestamp = Date.now();
        if (languageModelRequest.promptVariantId) {
            exchangeRequest.metadata.promptVariantId = languageModelRequest.promptVariantId;
        }
        if (languageModelRequest.isPromptVariantCustomized !== undefined) {
            exchangeRequest.metadata.isPromptVariantCustomized = languageModelRequest.isPromptVariantCustomized;
        }

        this.sessionChangedEmitter.fire({ type: 'requestAdded', id: languageModelRequest.subRequestId ?? languageModelRequest.requestId });
    }

}

/**
 * Creates an AsyncIterable wrapper that stores each yielded item while preserving the
 * original AsyncIterable behavior.
 */
async function* createLoggingAsyncIterable(
    stream: AsyncIterable<LanguageModelStreamResponsePart>,
    parts: LanguageModelStreamResponsePart[],
    streamFinished: () => void,
    meta?: {
        sessionId: string;
        requestId: string;
        subRequestId?: string;
        languageModelId: string;
        agentId?: string;
    }
): AsyncIterable<LanguageModelStreamResponsePart> {
    let partCount = 0;
    let textPartCount = 0;
    let lastPartType: string | undefined;
    let hadError = false;
    try {
        for await (const part of stream) {
            parts.push(part);
            partCount++;
            if ('content' in part && typeof (part as { content: unknown }).content === 'string') {
                textPartCount++;
                lastPartType = 'text';
            } else if ('tool_calls' in part) {
                lastPartType = 'tool_call';
            } else if ('thought' in part) {
                lastPartType = 'thinking';
            } else if ('input_tokens' in part && 'output_tokens' in part) {
                lastPartType = 'usage';
            }
            yield part;
        }
    } catch (error) {
        hadError = true;
        parts.push({ content: `[NOT FROM LLM] An error occurred: ${error instanceof Error ? error.message : String(error)}` });

        // #region agent log - LanguageModelService_stream_error
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_lm_stream_error`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H9',
                location: 'language-model-service.ts:createLoggingAsyncIterable',
                message: 'Error while consuming LLM stream',
                data: {
                    sessionId: meta?.sessionId ?? null,
                    requestId: meta?.requestId ?? null,
                    subRequestId: meta?.subRequestId ?? null,
                    languageModelId: meta?.languageModelId ?? null,
                    agentId: meta?.agentId ?? null,
                    partCountSoFar: partCount,
                    textPartCountSoFar: textPartCount,
                    lastPartType,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            })
        }).catch(() => { });
        // #endregion

        throw error;
    } finally {
        streamFinished();

        // #region agent log - LanguageModelService_stream_summary
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_lm_stream_summary`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H10',
                location: 'language-model-service.ts:createLoggingAsyncIterable',
                message: 'LLM stream completed',
                data: {
                    sessionId: meta?.sessionId ?? null,
                    requestId: meta?.requestId ?? null,
                    subRequestId: meta?.subRequestId ?? null,
                    languageModelId: meta?.languageModelId ?? null,
                    agentId: meta?.agentId ?? null,
                    partCount,
                    textPartCount,
                    lastPartType: lastPartType ?? null,
                    hadError
                }
            })
        }).catch(() => { });
        // #endregion
    }
}
