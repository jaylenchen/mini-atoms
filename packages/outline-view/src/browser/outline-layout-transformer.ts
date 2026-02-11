// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
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

import { injectable } from '@theia/core/shared/inversify';
import { ApplicationShell, ShellLayoutTransformer } from '@theia/core/lib/browser';
import { OUTLINE_WIDGET_FACTORY_ID } from './outline-view-contribution';

/**
 * Removes the Outline view from the right sidebar when restoring layout,
 * so the Outline entry stays hidden even when layout is restored from storage.
 */
@injectable()
export class OutlineLayoutTransformer implements ShellLayoutTransformer {

    transformLayoutOnRestore(layoutData: ApplicationShell.LayoutData): void {
        if (layoutData.rightPanel?.items) {
            layoutData.rightPanel.items = layoutData.rightPanel.items.filter(
                item => item.widget?.id !== OUTLINE_WIDGET_FACTORY_ID
            );
        }
    }
}
