// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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

import { inject, injectable } from '@theia/core/shared/inversify';
import { ChatAgent, ChatAgentLocation, ChatChangeEvent, ChatServiceImpl, ChatSession, ParsedChatRequest, SessionOptions } from '../common';
import { PreferenceService } from '@theia/core/lib/common';
import { DEFAULT_CHAT_AGENT_PREF, PIN_CHAT_AGENT_PREF } from '../common/ai-chat-preferences';
import { ChangeSetFileService } from './change-set-file-service';
import { PreferenceScope } from '@theia/core';

/**
 * Customizes the ChatServiceImpl to consider preference based default chat agent
 */
@injectable()
export class FrontendChatServiceImpl extends ChatServiceImpl {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(ChangeSetFileService)
    protected readonly changeSetFileService: ChangeSetFileService;

    protected override isPinChatAgentEnabled(): boolean {
        return this.preferenceService.get<boolean>(PIN_CHAT_AGENT_PREF, true);
    }

    protected override initialAgentSelection(parsedRequest: ParsedChatRequest): ChatAgent | undefined {
        const agentPart = this.getMentionedAgent(parsedRequest);
        let configuredDefaultChatAgent: ChatAgent | undefined;
        if (!agentPart) {
            configuredDefaultChatAgent = this.getConfiguredDefaultChatAgent();
        }

        // #region agent log - initialAgentSelection
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_initialAgentSelection`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H1',
                location: 'frontend-chat-service.ts:initialAgentSelection',
                message: 'initialAgentSelection decision inputs',
                data: {
                    hasAgentMention: !!agentPart,
                    mentionedAgentId: agentPart?.agentId ?? null,
                    configuredDefaultAgentId: configuredDefaultChatAgent?.id ?? null
                }
            })
        }).catch(() => { });
        // #endregion

        if (!agentPart && configuredDefaultChatAgent) {
            return configuredDefaultChatAgent;
        }

        const result = super.initialAgentSelection(parsedRequest);

        // #region agent log - initialAgentSelection result
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_initialAgentSelection_result`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H2',
                location: 'frontend-chat-service.ts:initialAgentSelection',
                message: 'initialAgentSelection result agent',
                data: {
                    resultAgentId: result?.id ?? null
                }
            })
        }).catch(() => { });
        // #endregion

        return result;
    }

    protected getConfiguredDefaultChatAgent(): ChatAgent | undefined {
        const configuredDefaultChatAgentId = this.preferenceService.get<string>(DEFAULT_CHAT_AGENT_PREF, undefined);
        const configuredDefaultChatAgent = configuredDefaultChatAgentId ? this.chatAgentService.getAgent(configuredDefaultChatAgentId) : undefined;

        // #region agent log - getConfiguredDefaultChatAgent
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `log_${Date.now()}_getConfiguredDefaultChatAgent`,
                timestamp: Date.now(),
                runId: 'pre-fix',
                hypothesisId: 'H3',
                location: 'frontend-chat-service.ts:getConfiguredDefaultChatAgent',
                message: 'configured default chat agent resolution',
                data: {
                    configuredDefaultChatAgentId: configuredDefaultChatAgentId ?? null,
                    hasResolvedAgent: !!configuredDefaultChatAgent
                }
            })
        }).catch(() => { });
        // #endregion

        if (configuredDefaultChatAgentId && !configuredDefaultChatAgent) {
            // Migrate legacy or invalid default agent ids to MiniAtoms.
            if (configuredDefaultChatAgentId === 'Coder') {
                this.preferenceService.set(DEFAULT_CHAT_AGENT_PREF, 'MiniAtoms', PreferenceScope.User);
            } else {
                this.logger.warn(`The configured default chat agent with id '${configuredDefaultChatAgentId}' does not exist or is disabled.`);
            }
        }

        if (configuredDefaultChatAgent) {
            return configuredDefaultChatAgent;
        }

        // Product default: fall back to MiniAtoms when no usable configured agent exists.
        const miniAtomsAgent = this.chatAgentService.getAgent('MiniAtoms');
        return miniAtomsAgent;
    }

    override createSession(location?: ChatAgentLocation, options?: SessionOptions, pinnedAgent?: ChatAgent): ChatSession {
        const session = super.createSession(location, options, pinnedAgent);
        session.model.onDidChange(event => {
            if (ChatChangeEvent.isChangeSetEvent(event)) {
                this.changeSetFileService.closeDiffsForSession(session.id, session.model.changeSet.getElements().map(({ uri }) => uri));
            }
        });
        return session;
    }
}
