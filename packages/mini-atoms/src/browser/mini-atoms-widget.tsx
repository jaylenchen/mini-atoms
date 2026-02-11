// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Message } from '@theia/core/shared/@lumino/messaging';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { codicon, PINNED_CLASS } from '@theia/core/lib/browser';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { nls } from '@theia/core/lib/common/nls';
import type { StoredApp } from '../common/mini-atoms-types';
import { PREVIEW_IFRAME_SANDBOX } from './mini-atoms-preview';
import { MiniAtomsStorageService } from './mini-atoms-storage';

/**
 * Left-panel widget: preview only. Code apps are generated in the right (Chat) and displayed here.
 */
@injectable()
export class MiniAtomsWidget extends ReactWidget {

    @inject(MiniAtomsStorageService)
    protected readonly storageService: MiniAtomsStorageService;

    static readonly ID = 'mini-atoms';
    static readonly LABEL = nls.localizeByDefault('Mini Atoms');

    protected previewHtml: string | null = null;
    protected error: string | null = null;
    protected historyList: StoredApp[] = [];

    @postConstruct()
    protected init(): void {
        this.id = MiniAtomsWidget.ID;
        this.title.label = MiniAtomsWidget.LABEL;
        this.title.caption = MiniAtomsWidget.LABEL;
        this.title.iconClass = codicon('browser');
        this.title.closable = false;
        if (!this.title.className.includes(PINNED_CLASS)) {
            this.title.className += ` ${PINNED_CLASS}`;
        }
        this.addClass('mini-atoms-widget');
        this.loadStored();
    }

    protected override onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.loadStored();
    }

    protected async loadStored(): Promise<void> {
        const [current, history] = await Promise.all([
            this.storageService.getCurrent(),
            this.storageService.listHistory()
        ]);
        if (current) {
            this.previewHtml = current.html;
        }
        this.historyList = history;
        this.update();
    }

    /**
     * Reload current preview and history from storage.
     * Can be called from external integrations when a new app is saved.
     */
    public async refreshFromStorage(): Promise<void> {
        await this.loadStored();
    }

    /** Load a past app from history. */
    protected onLoadHistoryItem = (app: StoredApp): void => {
        this.previewHtml = app.html;
        this.error = null;
        this.update();
    };

    /** Set preview HTML (called when Chat response contains HTML). */
    setPreviewHtml(html: string | null): void {
        this.previewHtml = html;
        this.error = null;
        this.update();
    }

    /** Set error message. */
    setError(message: string | null): void {
        this.error = message;
        this.update();
    }

    protected formatHistoryDate(iso: string): string {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    }

    protected render(): React.ReactNode {
        const hasHistory = this.historyList.length > 0;
        const hasCode = !!this.previewHtml;
        return <div className='mini-atoms-container'>
            <div className='mini-atoms-preview-section'>
                <label className='mini-atoms-label'>{nls.localizeByDefault('Preview')}</label>
                <div id='mini-atoms-preview' className='mini-atoms-preview-container'>
                    {this.error && <div className='mini-atoms-error'>{this.error}</div>}
                    {!this.error && this.previewHtml && (
                        <iframe
                            sandbox={PREVIEW_IFRAME_SANDBOX}
                            srcDoc={this.previewHtml}
                            className='mini-atoms-preview-iframe'
                            title={nls.localizeByDefault('Generated app preview')}
                        />
                    )}
                    {!this.error && !this.previewHtml && (
                        <div className='mini-atoms-preview-empty'>
                            <p>{nls.localizeByDefault('Generated app from Chat will appear here.')}</p>
                            <p className='mini-atoms-hint'>{nls.localizeByDefault('Use AI Chat on the right to generate code apps.')}</p>
                        </div>
                    )}
                </div>
            </div>
            {(hasHistory || hasCode) && (
                <div className='mini-atoms-bottom-row'>
                    {hasCode && (
                        <div className='mini-atoms-code-section'>
                            <label className='mini-atoms-label'>{nls.localizeByDefault('Code')}</label>
                            <pre className='mini-atoms-code-block'>
                                {this.previewHtml}
                            </pre>
                        </div>
                    )}
                    {hasHistory && (
                        <div className='mini-atoms-history-section'>
                            <label className='mini-atoms-label'>{nls.localizeByDefault('History')}</label>
                            <ul className='mini-atoms-history-list'>
                                {this.historyList.map(app => (
                                    <li key={app.id} className='mini-atoms-history-item'>
                                        <button
                                            type='button'
                                            className='mini-atoms-history-btn'
                                            onClick={() => this.onLoadHistoryItem(app)}
                                            title={app.description}
                                        >
                                            <span className='mini-atoms-history-desc'>
                                                {app.description.slice(0, 60)}{app.description.length > 60 ? '…' : ''}
                                            </span>
                                            <span className='mini-atoms-history-date'>
                                                {this.formatHistoryDate(app.createdAt)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>;
    }
}
