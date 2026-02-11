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
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { generateUuid } from '@theia/core/lib/common/uuid';
import {
    StoredApp,
    MINI_ATOMS_STORAGE_KEY_CURRENT,
    MINI_ATOMS_STORAGE_KEY_APPS
} from '../common/mini-atoms-types';

@injectable()
export class MiniAtomsStorageService {

    @inject(StorageService)
    protected readonly storage: StorageService;

    async saveCurrent(app: { description: string; html: string }): Promise<StoredApp> {
        const stored: StoredApp = {
            id: generateUuid(),
            description: app.description,
            html: app.html,
            createdAt: new Date().toISOString()
        };
        await this.storage.setData(MINI_ATOMS_STORAGE_KEY_CURRENT, stored);
        const list = await this.listHistory();
        const next = [stored, ...list.filter(a => a.id !== stored.id)].slice(0, 50);
        await this.storage.setData(MINI_ATOMS_STORAGE_KEY_APPS, next);
        return stored;
    }

    async getCurrent(): Promise<StoredApp | undefined> {
        return this.storage.getData<StoredApp>(MINI_ATOMS_STORAGE_KEY_CURRENT);
    }

    async listHistory(): Promise<StoredApp[]> {
        const data = await this.storage.getData<StoredApp[]>(MINI_ATOMS_STORAGE_KEY_APPS, []);
        return Array.isArray(data) ? data : [];
    }

    async getById(id: string): Promise<StoredApp | undefined> {
        const list = await this.listHistory();
        return list.find(a => a.id === id);
    }

    async deleteById(id: string): Promise<void> {
        const list = (await this.listHistory()).filter(a => a.id !== id);
        await this.storage.setData(MINI_ATOMS_STORAGE_KEY_APPS, list);
        const current = await this.getCurrent();
        if (current?.id === id) {
            await this.storage.setData(MINI_ATOMS_STORAGE_KEY_CURRENT, undefined);
        }
    }
}
