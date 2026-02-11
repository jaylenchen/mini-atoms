// *****************************************************************************
// Copyright (C) 2019 Red Hat, Inc. and others.
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
import { SCM_VIEW_CONTAINER_ID } from './scm-contribution';

/**
 * Removes the SCM (Git) view container from the left sidebar when restoring layout,
 * so the Git entry stays hidden even when layout is restored from storage.
 */
@injectable()
export class ScmLayoutTransformer implements ShellLayoutTransformer {

    transformLayoutOnRestore(layoutData: ApplicationShell.LayoutData): void {
        if (layoutData.leftPanel?.items) {
            layoutData.leftPanel.items = layoutData.leftPanel.items.filter(
                item => item.widget?.id !== SCM_VIEW_CONTAINER_ID
            );
        }
    }
}
