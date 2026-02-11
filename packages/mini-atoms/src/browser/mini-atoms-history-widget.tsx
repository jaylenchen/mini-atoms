// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { codicon, PINNED_CLASS } from '@theia/core/lib/browser';
import { nls } from '@theia/core';
import type { StoredApp } from '../common/mini-atoms-types';
import { MiniAtomsStorageService } from './mini-atoms-storage';

/**
 * Separate history/code view for Mini Atoms apps.
 * Shows all generated apps on the left and the full HTML code on the right.
 */
@injectable()
export class MiniAtomsHistoryWidget extends ReactWidget {

    static readonly ID = 'mini-atoms-history';
    static readonly LABEL = nls.localizeByDefault('Mini Atoms History');

    @inject(MiniAtomsStorageService)
    protected readonly storageService: MiniAtomsStorageService;

    protected historyList: StoredApp[] = [];
    protected selectedApp: StoredApp | undefined;

    @postConstruct()
    protected async init(): Promise<void> {
        this.id = MiniAtomsHistoryWidget.ID;
        this.title.label = MiniAtomsHistoryWidget.LABEL;
        this.title.caption = MiniAtomsHistoryWidget.LABEL;
        this.title.iconClass = codicon('history');
        this.title.closable = false;
        if (!this.title.className.includes(PINNED_CLASS)) {
            this.title.className += ` ${PINNED_CLASS}`;
        }
        this.addClass('mini-atoms-history-widget');
        await this.loadHistory();
    }

    protected override async onAfterShow(): Promise<void> {
        await this.loadHistory();
    }

    protected async loadHistory(): Promise<void> {
        this.historyList = await this.storageService.listHistory();
        if (this.historyList.length > 0 && !this.selectedApp) {
            this.selectedApp = this.historyList[0];
        } else if (this.selectedApp) {
            // Keep selection if it still exists.
            const existing = this.historyList.find(app => app.id === this.selectedApp!.id);
            this.selectedApp = existing ?? this.historyList[0];
        }
        this.update();
    }

    protected handleSelectApp(app: StoredApp): void {
        this.selectedApp = app;
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
        return <div className='mini-atoms-container mini-atoms-history-container'>
            <div className='mini-atoms-history-list-panel'>
                <label className='mini-atoms-label'>{nls.localizeByDefault('Generated Apps')}</label>
                {this.historyList.length === 0 && (
                    <div className='mini-atoms-preview-empty'>
                        <p>{nls.localizeByDefault('No generated apps yet.')}</p>
                        <p className='mini-atoms-hint'>
                            {nls.localizeByDefault('Use MiniAtoms in AI Chat to generate apps, they will appear here.')}
                        </p>
                    </div>
                )}
                {this.historyList.length > 0 && (
                    <ul className='mini-atoms-history-list mini-atoms-history-list-full'>
                        {this.historyList.map(app => {
                            const isSelected = this.selectedApp?.id === app.id;
                            return (
                                <li key={app.id} className='mini-atoms-history-item'>
                                    <button
                                        type='button'
                                        className={`mini-atoms-history-btn ${isSelected ? 'selected' : ''}`}
                                        onClick={() => this.handleSelectApp(app)}
                                        title={app.description}
                                    >
                                        <span className='mini-atoms-history-desc'>
                                            {app.description.slice(0, 80)}{app.description.length > 80 ? '…' : ''}
                                        </span>
                                        <span className='mini-atoms-history-date'>
                                            {this.formatHistoryDate(app.createdAt)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            <div className='mini-atoms-code-section mini-atoms-code-section-full'>
                <label className='mini-atoms-label'>{nls.localizeByDefault('Code')}</label>
                <pre className='mini-atoms-code-block'>
                    {this.selectedApp ? this.selectedApp.html : ''}
                </pre>
            </div>
        </div>;
    }
}

