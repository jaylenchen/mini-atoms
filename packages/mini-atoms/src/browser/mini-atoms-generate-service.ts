// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { ChatService, ChatAgentLocation } from '@theia/ai-chat';
import { extractHTML } from '../common/code-extractor';

const PROMPT_PREFIX = 'Generate a single-file HTML application (with inline CSS and JavaScript) that does the following. ';
const PROMPT_SUFFIX = ' Reply with only one markdown code block containing the full HTML document, starting with ```html and ending with ```.';

@injectable()
export class MiniAtomsGenerateService {

    @inject(ChatService)
    protected readonly chatService: ChatService;

    /**
     * Asks the chat agent to generate an HTML app from the description and returns the extracted HTML or null.
     */
    async generate(description: string): Promise<string | null> {
        const session = this.chatService.createSession(ChatAgentLocation.Panel, { focus: false });
        const prompt = PROMPT_PREFIX + description.trim() + PROMPT_SUFFIX;
        const invocation = await this.chatService.sendRequest(session.id, { text: prompt });
        if (!invocation) {
            return null;
        }
        try {
            const responseModel = await invocation.responseCompleted;
            if (responseModel.isError && responseModel.errorObject) {
                throw responseModel.errorObject;
            }
            const fullText = responseModel.response.asString();
            const html = extractHTML(fullText);
            return html;
        } finally {
            await this.chatService.deleteSession(session.id);
        }
    }
}
