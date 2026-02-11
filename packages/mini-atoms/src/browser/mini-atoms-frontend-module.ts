// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule, interfaces } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    WidgetFactory,
    bindViewContribution,
    noopWidgetStatusBarContribution,
    WidgetStatusBarContribution,
    FrontendApplicationContribution,
} from '@theia/core/lib/browser';
import { ChatAgent } from '@theia/ai-chat';
import { Agent } from '@theia/ai-core';
import { MiniAtomsContribution } from './mini-atoms-contribution';
import { MiniAtomsWidget } from './mini-atoms-widget';
import { MiniAtomsStorageService } from './mini-atoms-storage';
import { MiniAtomsChatIntegration } from './mini-atoms-chat-integration';
import { MiniAtomsApplicationShell } from './mini-atoms-application-shell';
import { MiniAtomsChatAgent } from './mini-atoms-chat-agent';
import '../../src/browser/style/index.css';

export default new ContainerModule((bind: interfaces.Bind, _unbind: interfaces.Unbind, _isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
    bind(MiniAtomsApplicationShell).toSelf().inSingletonScope();
    rebind(ApplicationShell).toService(MiniAtomsApplicationShell);
    bindViewContribution(bind, MiniAtomsContribution);
    bind(FrontendApplicationContribution).toService(MiniAtomsContribution);
    bind(WidgetStatusBarContribution).toConstantValue(noopWidgetStatusBarContribution(MiniAtomsWidget));
    bind(MiniAtomsChatIntegration).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(MiniAtomsChatIntegration);

    bind(MiniAtomsChatAgent).toSelf().inSingletonScope();
    bind(Agent).toService(MiniAtomsChatAgent);
    bind(ChatAgent).toService(MiniAtomsChatAgent);
    bind(MiniAtomsStorageService).toSelf().inSingletonScope();
    bind(MiniAtomsWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: MiniAtomsWidget.ID,
        createWidget: () => context.container.get<MiniAtomsWidget>(MiniAtomsWidget)
    })).inSingletonScope();
});
