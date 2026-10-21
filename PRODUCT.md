# Product

<!-- impeccable:product-schema 1 -->

> Facts marked *(inferred)* come from the codebase and the original request, not from an interview answer. Confirm or correct them.

## Platform

web

(Electron desktop shell around a Vite/React web UI. The design language is web, not native OS.)

## Users

A single person keeping their own task list on a Windows desktop. *(inferred)* The app sits in a narrow, always-on-top, frameless window beside other work and is glanced at many times a day: add a task quickly, tick it off, move on.

## Product Purpose

My Tasks is a personal to-do widget that stays on screen without getting in the way. It holds tasks grouped into folders, with priority, labels, due dates with reminders, notes, and image attachments, synced to the user's Firebase account. Success means capturing and clearing tasks takes seconds and the window never demands attention it has not earned.

## Positioning

A desktop-resident task panel rather than a full productivity suite: always-on-top, launch-at-startup, small footprint, and personal (users can set their own background image or color). *(inferred)*

## Operating Context

- Window: frameless, resizable, minimum 570x930; used as a tall narrow panel. Widget-first per the user's direction.
- Used alongside other apps; often glanced at rather than focused on.
- Keyboard: Esc, Ctrl+D (theme), Ctrl+Z / Ctrl+Y (undo/redo).
- Light and dark themes; user-chosen background image or color with an overlay-opacity control.

## Capabilities and Constraints

- Tasks: create/edit in a modal, inline double-click edit, toggle done, archive, restore, permanent delete, clear completed, undo/redo.
- Fields: text with links, priority (low/medium/high), label, folder, due date and time, notification (duration and type), notes, image attachments (upload, paste, drop) with a lightbox.
- Folders: create, rename, delete with confirmation, collapse, drag to reorder; tasks drag between folders.
- Filters: All / Active / Done, label filter, search with highlighting.
- Settings: theme, background color/image/overlay, always-on-top, launch at startup, folders, archived view, export/import JSON, statistics, version, sign out.
- Auth: Firebase email sign in / sign up / reset. Data in Firestore.
- Every existing feature must survive the redesign.

## Brand Commitments

Name: "My Tasks". No other binding identity assets exist. The user's custom background feature is part of the product and must keep working.

## Evidence on Hand

No marketing content, testimonials, or metrics exist. Do not invent any.

## Product Principles

1. Glanceable first: state (what is due, what is done) reads at a glance in a narrow window.
2. Capture in seconds: adding a task is always one obvious action away.
3. Quiet by default: the widget lives beside other work and should not compete with it.
4. Personal: the user's own background and theme choices are respected, not overridden.
