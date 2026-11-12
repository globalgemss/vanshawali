# Royal Premium Modern V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish every Vanshawali 360 demo screen into one cohesive Royal Premium responsive experience.

**Architecture:** Enhance existing React screen composition and shared CSS without changing demo data storage contracts. Keep mobile navigation and family details as React state-based interactions.

**Tech Stack:** React, TypeScript, Vinext, CSS.

**Spec:** `docs/superpowers/specs/2026-11-08-royal-premium-v3-design.md`

## Global Constraints
- Existing project and owner-private audience must stay unchanged.
- No real backend or sending; demo-only behavior remains explicit.
- Preserve page routes, localStorage keys and sample data.

## Review Focus
- Narrow mobile viewport navigation remains usable.
- Tree selection still works after visual changes.
- Long Nepali names wrap without overlap.
- Keyboard focus is visible.
- Cross-page demo actions remain interactive.

---

### Task 1: Shared Premium Styling
**Files:** Modify `app/globals.css`, `app/demo.css`.
- [ ] Define refined color/typography/elevation and focus style overrides.
- [ ] Apply consistent panel, metric, button and modal treatments.
- [ ] Verify responsive layouts and a production build.

### Task 2: Navigation and Tree Usability
**Files:** Modify `app/page.tsx`, `app/globals.css`.
- [ ] Improve mobile navigation labels and add meaningful contextual actions.
- [ ] Improve Family Tree selected-person detail panel and empty states.
- [ ] Verify TypeScript and existing demo interactions.

### Task 3: Visual Verification and Publication
**Files:** No new product files.
- [ ] Inspect desktop and mobile preview when available.
- [ ] Push matching source and package build artifact.
- [ ] Publish owner-private version and verify deployment response.
