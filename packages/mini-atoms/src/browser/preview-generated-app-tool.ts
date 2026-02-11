// *****************************************************************************
// Copyright (C) 2025 and others.
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

import { injectable, inject } from '@theia/core/shared/inversify';
import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';

/**
 * Function ID for the tool that writes generated HTML to a file and opens it in the mini-browser.
 * Used in the Mini Atoms prompt template so the model knows which tool to call.
 */
export const PREVIEW_GENERATED_APP_FUNCTION_ID = 'previewGeneratedApp';

@injectable()
export class PreviewGeneratedAppTool implements ToolProvider {

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MiniBrowserOpenHandler)
    protected readonly miniBrowserOpenHandler: MiniBrowserOpenHandler;

    getTool(): ToolRequest {
        return {
            id: PREVIEW_GENERATED_APP_FUNCTION_ID,
            name: PREVIEW_GENERATED_APP_FUNCTION_ID,
            providerName: 'mini-atoms',
            description: 'Writes the provided HTML content to a file in the workspace and opens it in the mini-browser in the main area. Use when you have generated a complete, self-contained HTML application.',
            parameters: {
                type: 'object',
                properties: {
                    html: {
                        type: 'string',
                        description: 'Complete HTML document content (e.g. starting with <!DOCTYPE html> or <html>). Include all CSS and JavaScript inline.'
                    }
                },
                required: ['html']
            },
            handler: (argString: string) => this.handlePreview(argString)
        };
    }

    protected async handlePreview(argString: string): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
        const root = this.workspaceService.getWorkspaceRootUri(undefined);
        if (!root) {
            return { content: [{ type: 'text', text: 'No workspace opened.' }] };
        }
        let html: string;
        try {
            const args = JSON.parse(argString) as { html?: string };
            html = typeof args.html === 'string' ? args.html : argString;
        } catch {
            html = argString;
        }
        const uri = root.resolve('.theia/generated-app-preview.html');
        await this.fileService.write(uri, html);
        await this.miniBrowserOpenHandler.open(uri, { widgetOptions: { area: 'main' } });
        return { content: [{ type: 'text', text: 'Opened the generated app in the mini-browser.' }] };
    }
}
