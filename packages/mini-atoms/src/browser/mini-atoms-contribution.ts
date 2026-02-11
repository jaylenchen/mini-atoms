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
import { AbstractViewContribution, codicon, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { MiniAtomsWidget } from './mini-atoms-widget';

export const MiniAtomsCommand = {
    id: MiniAtomsWidget.ID,
    label: MiniAtomsWidget.LABEL,
    iconClass: codicon('browser')
};

@injectable()
export class MiniAtomsContribution extends AbstractViewContribution<MiniAtomsWidget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: MiniAtomsWidget.ID,
            widgetName: MiniAtomsWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 0
            }
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.openView({ activate: true });
    }

    override registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(MiniAtomsCommand, {
            execute: () => this.openView({ reveal: true, activate: true })
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: MiniAtomsCommand.id,
            label: MiniAtomsCommand.label
        });
    }
}
