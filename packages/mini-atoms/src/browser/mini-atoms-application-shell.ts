// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Layout, TheiaSplitPanel } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import { ApplicationShellWithToolbarOverride } from '@theia/toolbar/lib/browser/application-shell-with-toolbar-override';

/** Class added to the shell when using left-right only layout (for CSS targeting). */
export const MINI_ATOMS_LEFT_RIGHT_LAYOUT_CLASS = 'mini-atoms-left-right-layout';

/**
 * Application shell that uses a left-right only layout: the main area gets zero width,
 * so only the left and right side panels are visible and share the horizontal space.
 * Extends the toolbar shell so that the toolbar is still shown when present.
 */
@injectable()
export class MiniAtomsApplicationShell extends ApplicationShellWithToolbarOverride {

    protected override initializeShell(): void {
        super.initializeShell();
        this.addClass(MINI_ATOMS_LEFT_RIGHT_LAYOUT_CLASS);
    }

    protected override createLayout(): Layout {
        // Keep main+bottom in a panel so they remain in the widget tree (for addWidget(area: 'main') etc.),
        // but do NOT add this panel to the visible layout so the center column does not appear at all.
        const bottomSplitLayout = this.createSplitLayout(
            [this.mainPanel, this.bottomPanel],
            [1, 0],
            { orientation: 'vertical', spacing: 0 },
        );
        const panelForBottomArea = new TheiaSplitPanel({ layout: bottomSplitLayout });
        panelForBottomArea.id = 'theia-bottom-split-panel';
        panelForBottomArea.hide();

        // Left-right only: horizontal split contains ONLY left and right panels (no center).
        const leftRightSplitLayout = this.createSplitLayout(
            [this.leftPanelHandler.container, this.rightPanelHandler.container],
            [1, 1],
            { orientation: 'horizontal', spacing: 0 },
        );
        const panelForSideAreas = new TheiaSplitPanel({ layout: leftRightSplitLayout });
        panelForSideAreas.id = 'theia-left-right-split-panel';
        // Do not include the status bar in this layout: only top, toolbar, and left/right split.
        return this.createBoxLayout(
            [this.topPanel, this.toolbar, panelForSideAreas],
            [0, 0, 1],
            { direction: 'top-to-bottom', spacing: 0 },
        );
    }
}
