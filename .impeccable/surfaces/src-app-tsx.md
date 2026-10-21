---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components"]
---

# Main widget surface

Scope: the whole app window (titlebar, filters, folder list, tasks, add/edit modal, settings, login). Mode: Operate. Widget-first: tall narrow frameless window, 360 to 600px wide, always on top.

Audience and job: one person glancing at their own tasks beside other work; capture in seconds, tick off, see what is due. Constraints: every existing feature survives; light and dark; user background image/color with overlay opacity keeps working. Unattended run: assigned direction built without a decision round; re-roll stays open to the user.

## Direction contract

THESIS: The widget is a personal organizer opened at its dividers. Folders are coloured tab dividers, tasks are entries written on the ruled leaf. Refuses the category default of identical white cards with a purple accent and a floating gradient button.

OWN-WORLD: Leaf page (cool paper white in light, graphite in dark) with faint ruled lines under entries. Seven divider hues at full strength, assigned by folder order: oxide orange, chrome yellow, grass, teal, ultramarine, violet, sienna; vermilion held out for overdue and errors only. Ink (near black / near white) is the only action colour. Checkboxes are punched holes: done means the hole is filled. Dates and counts in tabular mono like a planner's printed figures. Corners 6px on controls, 10px on sheets, tabs square on the bound edge.

STORY: The user sees every folder as a tab at once, reads what is due by the stamped dates, adds an entry with the ink button, and ticks entries off without leaving the page.

FIRST VIEWPORT: Slim titlebar (search left, settings and window controls right). Below, the All/Active/Done segmented control. Then folders stacked as dividers: each a full-width coloured tab strip with name, count stamp, and actions; its entries on ruled lines beneath. A stepped tab rail on the right edge shows one tab per folder in its hue; clicking a tab scrolls to that divider. Ink add button bottom right.

FORM: Personal organizer with coloured tab dividers, position 6 of 7 on my grounded list; seed key 094565eb. Raise from the acetate tab board: section hue carried at full strength on the divider, never tinted down, and the error colour held out of the hue wheel. Raise from the boarding pass: due dates as labelled tabular stamps. Raise from the Crouwel grid: one strict 4px spacing armature everywhere. Raise from the type specimen: hierarchy by size and weight only, one family.

SIGNATURE INTERACTION: the tab rail. Hover extends a tab, click scrolls its divider into view, the divider in view holds its tab extended. Motion grammar: 120 to 200ms custom ease-out, scale(0.97) on press, sheets rise 8px and fade; reduced motion removes movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
