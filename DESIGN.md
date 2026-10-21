---
name: My Tasks
description: A personal organizer that sits beside your work. Ruled leaves, coloured tab dividers, ink actions.
colors:
  page: "#eef1f5"
  leaf: "#ffffff"
  panel: "#e4e8ee"
  rule: "#e6e9ef"
  line: "#d3d9e2"
  ink: "#15171c"
  ink-2: "#464c59"
  ink-3: "#69707d"
  on-ink: "#ffffff"
  danger: "#c8261b"
  danger-surface: "#fbe9e7"
  warn: "#9a5b00"
  warn-surface: "#fbf0dc"
  focus: "#2f4bd8"
  hue-0: "#f08a24"
  hue-1: "#f2c230"
  hue-2: "#3e9f4b"
  hue-3: "#14918c"
  hue-4: "#2f4bd8"
  hue-5: "#b8327f"
  hue-6: "#9b4e2a"
typography:
  title:
    fontFamily: "Segoe UI Variable Text, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  heading:
    fontFamily: "Segoe UI Variable Text, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Segoe UI Variable Text, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  stamp:
    fontFamily: "Cascadia Mono, Consolas, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
rounded:
  stamp: "4px"
  control: "6px"
  sheet: "10px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 16px"
  button-new-task:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.sheet}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 10px"
  stamp-due:
    textColor: "{colors.ink-2}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    height: "20px"
  stamp-overdue:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    height: "20px"
---

# Design System: My Tasks

## Overview

**Creative North Star: "The Ring Binder"**

My Tasks is a small, always-on-top window that lives beside other work. It is designed like a personal organizer: each folder is a coloured tab divider, tasks are entries on a ruled leaf, the checkbox is a punched hole that fills with the divider's colour when an entry is done. Everything else stays quiet so the dividers do the wayfinding.

The window is narrow (360 to 600px) and glanced at many times a day, so hierarchy comes from size, weight and the divider colour, never from decoration. Ink is the only action colour. Vermilion is held back for overdue items and errors, so it always means something.

**Key Characteristics:**
- Seven divider hues assigned by folder order, used at full strength on tabs only.
- A fore-edge tab rail on the right that mirrors the folders and turns to one on click.
- Ruled rows, punched-hole checkboxes, mono stamps for dates and counts.
- Neutral leaf and page surfaces; ink buttons; one held-out danger colour.
- Fast, ease-out motion that confirms presses and never decorates.

## Colors

### Primary
- **Ink** (`#15171c`, dark: `#eceef2`): every primary action (New task, Create, Save, selected date, toggles). Also body text.

### Divider hues
- **Orange, Marigold, Leaf green, Teal, Cobalt, Magenta, Umber** (`--hue-0` to `--hue-6`): one per folder by order (`index % 7`). Each has a paired ink (`--hue-N-ink`) chosen for contrast on that hue.

### Neutral
- **Page** (`#eef1f5`): window background behind leaves.
- **Leaf** (`#ffffff`): folder content, sheets, inputs.
- **Panel** (`#e4e8ee`): titlebar, filter bar, tab rail, hover fills.
- **Rule / Line** (`#e6e9ef` / `#d3d9e2`): row rules and control borders.
- **Ink 2 / Ink 3** (`#464c59` / `#69707d`): secondary text, icons, placeholders.

### Held-out states
- **Danger** (`#c8261b`): overdue stamps, destructive actions, errors.
- **Warn** (`#9a5b00`): due within 24 hours.
- **Focus** (`#2f4bd8`): focus rings, links, drop targets.

**The One Voice Rule.** Ink is the only action colour. Divider hues identify folders; they never become buttons.

**The Held-Out Red Rule.** Danger appears only for overdue, errors and destructive actions, so it is never decorative.

## Typography

**Body Font:** Segoe UI Variable (system UI fallbacks)
**Stamp Font:** Cascadia Mono, for dates, counts, times and versions

### Hierarchy
- **Title** (700, 20px): sheet headings on login.
- **Heading** (650, 16px): sheet and settings titles; folder names at 14px/650.
- **Body** (400, 14px, 1.45): task text, settings rows.
- **Label** (600, 12px): field labels, button text, section captions (uppercase 11px with 0.06em tracking for settings sections).
- **Stamp** (400, 11px mono): due dates, folder counts, statistics values.

**The Size-and-Weight Rule.** Hierarchy comes from size and weight in one family. No second display face.

## Layout

A 4px armature (4, 8, 12, 16, 20, 24). The workspace is a row: the scrolling folder column, then a 30px tab rail. Folder groups stack with 16px gaps; the column keeps 88px of bottom padding so the New task button never covers the last entry. Sheets open at the top of the window (56px down) and scroll inside the scrim when tall.

## Elevation & Depth

Flat by default. Only things that float get a shadow.

### Shadow Vocabulary
- **sheet-shadow**: dialogs and settings.
- **pop-shadow**: dropdowns, date picker, the New task button.
- **hole-shadow**: the inset on an unchecked punched-hole checkbox.

**The Float-Only Rule.** Leaves, rows and tabs carry borders, not shadows.

## Shapes

Three radii with fixed jobs: 4px for stamps and badges, 6px for controls, 10px for sheets, leaves and the New task button. Folder tabs round only their top corners; rail tabs round only their outer corners.

## Components

### Buttons
- **Primary**: ink fill, on-ink text, 34px, 6px radius, `scale(0.97)` on press.
- **Secondary**: leaf fill, line border, ink-2 text.
- **Destructive**: transparent with a danger border and text; danger-surface on hover.
- **New task**: ink, 40px, 10px radius, pinned bottom-right of the folder column.

### Inputs / Fields
34px, leaf fill, line border, 6px radius; border turns ink on focus. The task title in the sheet is an underlined 16px field. Dropdowns and the date picker pop 4px below their trigger with pop-shadow and scale in from the trigger corner.

### Folder divider (signature)
A hue-coloured tab (chevron plus name) stands on a 2px rule of the same hue; the leaf below holds the ruled task rows. The count is a mono stamp at the right. Rename and delete appear on hover or focus.

### Task row
Punched-hole checkbox (fills with the divider hue when done), task text, then label badge and due stamp. High priority adds an ink dot on the hole; low priority writes in ink-2. Edit and Archive appear on hover.

### Tab rail (signature)
One tab per folder on the right edge, height growing with open tasks. The tab for the folder in view slides out fully; clicking a tab scrolls its folder to the top.

## Do's and Don'ts

### Do:
- **Do** assign divider hues by folder order and keep them on tabs, rules and checked holes.
- **Do** use mono stamps for any date, time or count.
- **Do** give every pressable element `scale(0.97)` on press with the 120ms ease-out curve.
- **Do** keep the custom background working: leaves become 82% opaque over it.

### Don't:
- **Don't** use a divider hue as a button or text colour.
- **Don't** use red for anything that is not overdue, an error or destructive.
- **Don't** add shadows to leaves or rows, or gradients and glows anywhere.
- **Don't** use emoji or hand-drawn SVG; icons come from the Iconify mdi set, outline variants.
