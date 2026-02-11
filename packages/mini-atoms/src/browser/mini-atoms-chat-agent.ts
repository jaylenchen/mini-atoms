// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    AbstractStreamParsingChatAgent,
    ChatAgentLocation,
} from '@theia/ai-chat';
import { LanguageModelRequirement, PromptVariantSet } from '@theia/ai-core';
import { codicon } from '@theia/core/lib/browser';
import { nls } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';
import { MINI_ATOMS_HTML_OUTPUT_INSTRUCTION } from '../common/code-extractor';

export const MINI_ATOMS_AGENT_ID = 'Mini Atoms';

const MINI_ATOMS_SYSTEM_PROMPT_ID = 'mini-atoms-agent-prompt';

const MINI_ATOMS_SYSTEM_PROMPT_TEMPLATE = `You are a helpful assistant that generates single-file HTML applications for the Mini Atoms preview. The user will describe what they want (e.g. a todo app, a counter, a small game), and you must reply with exactly one markdown code block containing a complete, runnable HTML document.

Rules:
- Use a single \`\`\`html code block. No other code blocks or extra markdown in the response.
- The HTML must be self-contained: include inline CSS and JavaScript as needed. No external scripts or stylesheets.
- Start the document with \`\`\`html and end with \`\`\`.
- Keep the app simple and focused on the user's request.

${MINI_ATOMS_HTML_OUTPUT_INSTRUCTION}
`;

/**
 * Dedicated chat agent for Mini Atoms: generates single-file HTML apps that are
 * shown in the left preview. Uses a fixed system prompt so the model always
 * outputs a \`\`\`html ... \`\`\` block, which MiniAtomsChatIntegration then
 * extracts and displays.
 */
@injectable()
export class MiniAtomsChatAgent extends AbstractStreamParsingChatAgent {

    override readonly id = MINI_ATOMS_AGENT_ID;
    override readonly name = MINI_ATOMS_AGENT_ID;
    override readonly description = nls.localizeByDefault(
        'Generates single-file HTML apps for the Mini Atoms preview. Output is shown in the left panel.'
    );
    override iconClass = codicon('browser');
    override locations: ChatAgentLocation[] = [ChatAgentLocation.Panel];
    override tags = [nls.localizeByDefault('Chat'), nls.localizeByDefault('Preview')];
    override languageModelRequirements: LanguageModelRequirement[] = [{ purpose: 'chat' }];
    protected override defaultLanguageModelPurpose: string = 'chat';

    override readonly prompts: PromptVariantSet[] = [{
        id: MINI_ATOMS_SYSTEM_PROMPT_ID,
        defaultVariant: {
            id: MINI_ATOMS_SYSTEM_PROMPT_ID,
            template: MINI_ATOMS_SYSTEM_PROMPT_TEMPLATE,
        },
    }];
    protected override systemPromptId: string | undefined = MINI_ATOMS_SYSTEM_PROMPT_ID;
}
