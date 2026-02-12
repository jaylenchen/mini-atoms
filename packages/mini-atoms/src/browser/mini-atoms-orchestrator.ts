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
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import type { ChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';
import { extractHTML } from '../common/code-extractor';
import type { AppDesign, AppSpec, MiniAtomsOrchestrationState } from '../common/orchestrator-types';
import { MiniAtomsWidget } from './mini-atoms-widget';
import { MiniAtomsStorageService } from './mini-atoms-storage';

/**
 * Lightweight orchestrator for Mini Atoms.
 *
 *  - Keeps per-session orchestration state (spec, design, latest code, last stored app).
 *  - Parses the structured sections (## Product / ## Architecture / ## Code) from the
 *    Mini Atoms chat agent response.
 *  - Updates the left-hand preview widget and history storage.
 *
 * NOTE:
 *  This sits on top of the existing MiniAtomsChatAgent. The multi-role behaviour
 *  (product manager / architect / developer) is implemented in the agent's prompt,
 *  while this class turns the final response into preview + in-memory state.
 */
@injectable()
export class MiniAtomsOrchestrator {

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(MiniAtomsStorageService)
    protected readonly storageService: MiniAtomsStorageService;

    /**
     * Per-project orchestration state. For now we simply treat the chat
     * session id as project id (1 session = 1 app).
     */
    protected readonly stateByProject = new Map<string, MiniAtomsOrchestrationState>();

    /**
     * Entry-point used by MiniAtomsChatIntegration when a response completes.
     */
    async handleCompletedChatRequest(request: ChatRequestModel): Promise<void> {
        const response = request.response;
        if (!response.isComplete || response.isError) {
            return;
        }

        const fullText = response.response.asString();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: 'mini-atoms-orchestrator.ts:handleCompletedChatRequest',
                message: 'response asString',
                data: { fullTextLen: fullText.length, fullTextStart: fullText.slice(0, 200).replace(/\n/g, '\\n') },
                timestamp: Date.now(),
                hypothesisId: 'H5'
            })
        }).catch(() => { });
        // #endregion
        const html = extractHTML(fullText);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1574a3d6-646c-40e3-aab6-3e8748b9cadf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: 'mini-atoms-orchestrator.ts:after extractHTML',
                message: 'extractHTML returned',
                data: { htmlIsNull: html === null, htmlLen: html ? html.length : 0 },
                timestamp: Date.now(),
                hypothesisId: 'H5'
            })
        }).catch(() => { });
        // #endregion
        if (!html) {
            return;
        }

        if (html.length > 2000 && !/<\/html>\s*$/i.test(html.trim())) {
            console.warn('[Mini Atoms] Extracted HTML may be truncated (missing </html>). Ask for a simpler app or increase backend max_output_tokens.');
        }

        const projectId = request.session.id;
        const userText = request.request.text;

        const spec = this.parseProductSection(fullText, userText);
        const design = this.parseArchitectureSection(fullText);

        const stored = await this.saveAndPreview(html, userText);

        const state: MiniAtomsOrchestrationState = {
            projectId,
            spec,
            design,
            code: { html },
            lastStoredApp: stored
        };
        this.stateByProject.set(projectId, state);
    }

    /**
     * Retrieve orchestration state for a given project/session if available.
     */
    getState(projectId: string): MiniAtomsOrchestrationState | undefined {
        return this.stateByProject.get(projectId);
    }

    protected async saveAndPreview(html: string, description?: string): Promise<import('../common/mini-atoms-types').StoredApp> {
        const widget = this.widgetManager.tryGetWidget(MiniAtomsWidget.ID) as MiniAtomsWidget | undefined;
        if (widget) {
            widget.setPreviewHtml(html);
        }

        const stored = await this.storageService.saveCurrent({
            description: (description ?? 'From Chat').trim() || 'From Chat',
            html
        });

        if (widget) {
            await widget.refreshFromStorage();
        }

        return stored;
    }

    /**
     * Parse the `## Product` section of the response into an AppSpec.
     */
    protected parseProductSection(fullText: string, userText?: string): AppSpec | undefined {
        const section = this.extractSection(fullText, 'Product');
        if (!section) {
            return undefined;
        }
        const lines = this.normalizeBulletSection(section);
        if (!lines.length) {
            return undefined;
        }

        const title = (userText ?? lines[0]).slice(0, 60) || 'Generated App';
        const summary = lines[0];
        const features = lines;

        const spec: AppSpec = {
            title,
            summary,
            features
        };
        return spec;
    }

    /**
     * Parse the `## Architecture` section of the response into an AppDesign.
     *
     * The LLM is free-form here, so we use a very forgiving heuristic:
     *  - first line: layout
     *  - subsequent lines: components / interactions depending on wording.
     */
    protected parseArchitectureSection(fullText: string): AppDesign | undefined {
        const section = this.extractSection(fullText, 'Architecture');
        if (!section) {
            return undefined;
        }
        const lines = this.normalizeBulletSection(section);
        if (!lines.length) {
            return undefined;
        }

        const layout = lines[0];
        const components: string[] = [];
        const stateModel: string[] = [];
        const interactions: string[] = [];

        for (const line of lines.slice(1)) {
            const lower = line.toLowerCase();
            if (lower.includes('state') || lower.includes('数据') || lower.includes('状态')) {
                stateModel.push(line);
            } else if (lower.includes('点击') || lower.includes('输入') || lower.includes('交互') || lower.includes('flow')) {
                interactions.push(line);
            } else {
                components.push(line);
            }
        }

        const design: AppDesign = {
            layout,
            components,
            stateModel,
            interactions
        };

        return design;
    }

    /**
     * Extract a markdown section headed by `## <heading>` until the next `##` or end of text.
     */
    protected extractSection(fullText: string, heading: string): string | undefined {
        const pattern = new RegExp(`^##\\s+${heading}\\s*[\\r\\n]+([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'mi');
        const match = fullText.match(pattern);
        return match?.[1]?.trim();
    }

    /**
     * Normalise a markdown bullet section into plain text lines.
     */
    protected normalizeBulletSection(section: string): string[] {
        return section
            .split(/\r?\n/)
            .map(line => line.replace(/^[\s>*-]+\s*/, '').trim())
            .filter(line => !!line);
    }
}

