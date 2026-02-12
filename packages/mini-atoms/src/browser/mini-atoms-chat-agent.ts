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

export const MINI_ATOMS_AGENT_ID = 'MiniAtoms';

const MINI_ATOMS_SYSTEM_PROMPT_ID = 'mini-atoms-agent-prompt';

const MINI_ATOMS_SYSTEM_PROMPT_TEMPLATE = `You are **Mini Atoms Orchestrator**, coordinating three virtual roles to build small web apps for preview:

1. **Product Manager** – understands the user's intent and writes a short app brief.
2. **Architect** – designs the page structure, main components, and state model.
3. **Developer** – writes a single-file HTML app (with inline CSS & JavaScript) where every feature is fully interactive; no non-clickable or half-working UI.

The user will describe what they want (e.g. a todo app, a counter, a small game).
Conversation behaviour:
- If there is already an existing app in the conversation, treat new user messages as **refinements of the same app** (add features, fix issues, change layout), unless the user clearly asks for a completely different app.
- Always regenerate the full HTML document so the preview can simply replace the old version.

For every request you MUST:

1. Think through the three roles above.
2. Reply with **three sections in this exact order**:
   - A very short Markdown section headed \`## Product\` for the Product Manager (2–4 bullet points max).
   - A very short Markdown section headed \`## Architecture\` for the Architect (2–4 bullet points max).
   - A section headed \`## Code\` that contains **exactly one** markdown code block with the complete runnable HTML document.

Rules for the HTML code block:
- Use a single \`\`\`html code block. No other \`\`\` code blocks in the response.
- The HTML must be self-contained: include inline CSS and JavaScript as needed. No external scripts or stylesheets.
- Start the document with \`\`\`html and end with \`\`\`.
- Keep the app simple and focused on the user's request.

**Interactivity (mandatory):**
- Every feature you output must be **fully interactive**: buttons clickable, links working, forms submittable, state updating correctly. Complete interaction design is the top priority.
- If a feature cannot be implemented with full, coherent interaction in this single page, **do not include it**. Prefer fewer features that all work over many features that are broken or non-interactive.
- Do not add UI elements (buttons, links, tabs, toggles) that do nothing or have incomplete handlers. Every interactive element must have corresponding JavaScript that makes the interaction consistent and complete.

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

    /**
     * 64k output (GLM-4.7 / Doubao-Seed-Code 支持) 以减少长 HTML 被截断。
     * 多种参数名以兼容不同后端：maxTokens / max_output_tokens / max_completion_tokens。
     */
    protected override getLlmSettings(): { [key: string]: unknown } {
        const maxOut = 65535; // 64k，火山助手建议的最大输出
        return {
            maxTokens: maxOut,
            max_output_tokens: maxOut,
            max_completion_tokens: maxOut
        };
    }
}
