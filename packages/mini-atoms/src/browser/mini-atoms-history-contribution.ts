// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import { CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { AbstractViewContribution, codicon } from '@theia/core/lib/browser';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { MiniAtomsHistoryWidget } from './mini-atoms-history-widget';

export const MiniAtomsHistoryCommand = {
    id: MiniAtomsHistoryWidget.ID,
    label: MiniAtomsHistoryWidget.LABEL,
    iconClass: codicon('history')
};

@injectable()
export class MiniAtomsHistoryContribution extends AbstractViewContribution<MiniAtomsHistoryWidget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: MiniAtomsHistoryWidget.ID,
            widgetName: MiniAtomsHistoryWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 1
            }
        });
    }

    onStart(): void {
        // Ensure the history view is always created in the left side panel,
        // even when a previous layout is restored.
        this.openView({ activate: false }).then(() => { });
    }

    override registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(MiniAtomsHistoryCommand, {
            execute: () => this.openView({ reveal: true, activate: true })
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: MiniAtomsHistoryCommand.id,
            label: MiniAtomsHistoryCommand.label
        });
    }
}

