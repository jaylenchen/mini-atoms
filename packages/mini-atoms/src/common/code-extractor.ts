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
 * Matches ```html\n...\n``` or ```HTML\n...\n``` and returns the inner content.
 */
export function extractHTML(text: string): string | null {
    const regex = /```(?:html|HTML)?\s*\n([\s\S]*?)```/;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}
