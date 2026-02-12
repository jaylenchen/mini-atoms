// *****************************************************************************
// Copyright (C) 2025 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import type { StoredApp } from './mini-atoms-types';

/**
 * High–level project/session identifier for a Mini Atoms app.
 *
 * In practice this will usually be aligned with the chat `session.id`,
 * but we keep it as a separate type so we can decouple later if needed.
 */
export type MiniAtomsProjectId = string;

/**
 * Structured specification created by the “product manager” role.
 *
 * This is intentionally lightweight – it just captures the essentials
 * that the “architect” and “developer” roles need in order to work.
 */
export interface AppSpec {
    /** Short, human–readable name of the app (e.g. "Todo List"). */
    title: string;
    /** One–sentence description of the app’s purpose. */
    summary: string;
    /** Target users or scenario, free–form text. */
    targetUser?: string;
    /**
     * High–level feature bullets.
     * Example: ["Add todos", "Mark as completed", "Delete todos"].
     */
    features: string[];
}

/**
 * Output of the “architect” role.
 *
 * Describes how the app is structured (sections/components) and which
 * state it maintains. This stays technology–agnostic on purpose and is
 * used to guide the HTML/JS implementation.
 */
export interface AppDesign {
    /** High–level layout description (e.g. "two-column", "single-page"). */
    layout: string;
    /**
     * List of logical UI sections or components.
     * Example: ["Header", "TodoInput", "TodoList", "Footer"].
     */
    components: string[];
    /**
     * Description of the main state the app keeps.
     * Example: ["todos: array of { id, text, completed }"].
     */
    stateModel: string[];
    /**
     * Important interactions / user flows in free–form text.
     * Example: ["User types todo and presses Enter to add to list"].
     */
    interactions: string[];
}

/**
 * Final code artifact produced by the “developer” role for Mini Atoms.
 *
 * For the current demo we restrict this to a single HTML document that
 * can be injected into the preview iframe via `srcDoc`.
 */
export interface GeneratedCode {
    /** Complete HTML document string. */
    html: string;
}

/**
 * Aggregated orchestration state for a single Mini Atoms project.
 *
 * This mirrors the multi–step pipeline:
 * user intent → AppSpec → AppDesign → GeneratedCode → StoredApp history.
 */
export interface MiniAtomsOrchestrationState {
    projectId: MiniAtomsProjectId;
    /** Latest structured spec created from the user’s natural–language intent. */
    spec?: AppSpec;
    /** Latest architecture design derived from the spec. */
    design?: AppDesign;
    /** Latest generated HTML code. */
    code?: GeneratedCode;
    /** Reference to the last stored app snapshot, if any. */
    lastStoredApp?: StoredApp;
}

