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
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { ChatService, isSessionCreatedEvent } from '@theia/ai-chat';
import { ChatAddRequestEvent, ChatChangeEvent, ChatModel, ChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { extractHTML } from '../common/code-extractor';
import { MiniAtomsWidget } from './mini-atoms-widget';
import { MiniAtomsStorageService } from './mini-atoms-storage';

/**
 * When a Chat response completes and contains an HTML code block, show it in the left preview and save to history.
 */
@injectable()
export class MiniAtomsChatIntegration implements FrontendApplicationContribution {

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(MiniAtomsStorageService)
    protected readonly storageService: MiniAtomsStorageService;

    protected readonly toDispose = new DisposableCollection();

    onStart(): void {
        this.chatService.getSessions().forEach(session => this.attachToSession(session.model));
        this.toDispose.push(this.chatService.onSessionEvent(event => {
            if (isSessionCreatedEvent(event)) {
                const session = this.chatService.getSession(event.sessionId);
                if (session) {
                    this.attachToSession(session.model);
                }
            }
        }));
    }

    protected attachToSession(model: ChatModel): void {
        this.toDispose.push(model.onDidChange((event: ChatChangeEvent) => {
            if (event.kind === 'addRequest') {
                this.whenResponseComplete((event as ChatAddRequestEvent).request);
            }
        }));
    }

    protected whenResponseComplete(request: ChatRequestModel): void {
        const response = request.response;
        const listener = (): void => {
            if (!response.isComplete || response.isError) {
                return;
            }
            const text = response.response.asString();
            const html = extractHTML(text);
            if (html) {
                this.showInPreview(html, request.request.text ?? 'From Chat');
            }
            disposable.dispose();
        };
        const disposable = response.onDidChange(listener);
        if (response.isComplete && !response.isError) {
            listener();
        }
    }

    protected showInPreview(html: string, description: string): void {
        const widget = this.widgetManager.tryGetWidget(MiniAtomsWidget.ID) as MiniAtomsWidget | undefined;
        if (widget) {
            widget.setPreviewHtml(html);
        }
        this.storageService.saveCurrent({ description: description.trim() || 'From Chat', html }).then(() => { });
    }

    onStop(): void {
        this.toDispose.dispose();
    }
}
