// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Instruction text to append to prompts when the response should be shown in Mini Atoms preview.
 * Use this in agent system instructions or user prompts so the model outputs a single HTML code block.
 */
export const MINI_ATOMS_HTML_OUTPUT_INSTRUCTION =
    'Reply with only one markdown code block containing the full HTML document, starting with ```html and ending with ```.';

/**
 * Extracts the first HTML code block from markdown text (e.g. LLM response).
 * Uses line-boundary closing fence so that ``` or backticks inside the content
 * (e.g. in JS template literals or strings) do not truncate the result.
 */
export function extractHTML(text: string): string | null {
    // #region agent log
    const firstTick = text.indexOf('```');
    const snippet = text.slice(Math.max(0, firstTick >= 0 ? firstTick : 0), (firstTick >= 0 ? firstTick : 0) + 120);
    fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: 'code-extractor.ts:extractHTML:before',
            message: 'extractHTML input',
            data: { textLen: text.length, firstTickIndex: firstTick >= 0 ? firstTick : -1, snippetAroundFirstTick: snippet.replace(/\n/g, '\\n') },
            timestamp: Date.now(),
            hypothesisId: 'H1_H2_H3'
        })
    }).catch(() => { });
    // #endregion

    // Opening: first line that is exactly ``` or ```html or ```HTML (case-insensitive), optional trailing space
    const openMatch = text.match(/^```(?:html|HTML)?\s*$/m);
    if (!openMatch || openMatch.index === undefined) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: 'code-extractor.ts:extractHTML:after',
                message: 'extractHTML result',
                data: { matched: false, reason: 'no opening fence' },
                timestamp: Date.now(),
                hypothesisId: 'H1_H2_H3_H4'
            })
        }).catch(() => { });
        // #endregion
        return null;
    }
    const afterFence = openMatch.index + openMatch[0].length;
    const skipNewline = (text.slice(afterFence).match(/^\r?\n/) ?? [null])[0];
    const bodyStart = afterFence + (skipNewline ? skipNewline.length : 0);
    const rest = text.slice(bodyStart);

    // Closing: next line that is only ``` (optional whitespace) – so content-internal ``` does not end the block
    const closeMatch = rest.match(/\r?\n```\s*$/m);
    const content = closeMatch ? rest.slice(0, closeMatch.index).trim() : rest.trim();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: 'code-extractor.ts:extractHTML:after',
            message: 'extractHTML result',
            data: {
                matched: true,
                capturedLen: content.length,
                capturedStarts: content.slice(0, 80).replace(/\n/g, '\\n'),
                hadClosingFence: !!closeMatch
            },
            timestamp: Date.now(),
            hypothesisId: 'H1_H2_H3_H4'
        })
    }).catch(() => { });
    // #endregion
    return content || null;
}
