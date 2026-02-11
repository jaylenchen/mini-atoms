// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Sandbox attribute for preview iframe: allow scripts and same-origin (e.g. localStorage).
 * Do not add allow-top-navigation to prevent iframe from navigating the parent.
 */
export const PREVIEW_IFRAME_SANDBOX = 'allow-scripts allow-same-origin';

/**
 * Creates an iframe that renders the given HTML in a sandbox and appends it to the container.
 * Clears the container first. Caller can use the returned iframe for cleanup (e.g. remove on unmount).
 */
export function createSandboxPreview(html: string, container: HTMLElement): HTMLIFrameElement {
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', PREVIEW_IFRAME_SANDBOX);
    iframe.srcdoc = html;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.minHeight = '300px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.className = 'mini-atoms-preview-iframe';
    container.appendChild(iframe);
    return iframe;
}
