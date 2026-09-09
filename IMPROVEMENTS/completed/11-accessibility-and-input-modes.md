# Accessible Command Surface and Alternate Input Modes

## Feature

Make the globe operable with a complete keyboard, screen-reader, reduced-motion,
high-contrast, touch, and gamepad input layer. The 3D scene remains visual, but
its meaningful state—selected entity, layer health, camera location, time, and
available actions—must be available as a navigable semantic surface.

## Why it is valuable

The application has a dense cockpit UI, many custom panels, voice controls,
keyboard shortcuts, draggable positions, and multiple exclusive surfaces. A
consistent input model makes it usable for people who cannot use a mouse or
microphone and makes automated QA more reliable. It also reduces the risk that
important truth states exist only as color, animation, or a tiny Cesium pick.

## Implementation

Create `src/input/inputController.js` with an input-independent command model:
focus next layer, toggle layer, move camera north/south/east/west, zoom,
select next visible entity, open provenance, enter/exit cockpit, change style,
pause replay, and announce status. Map keyboard, pointer, touch, gamepad, and
voice actions to the same commands. Preserve existing shortcuts through a
versioned keymap and provide conflict warnings.

Add a semantic “scene list” panel that contains the selected entity, visible
layers, health states, nearby contacts, and current camera locality. Cesium
canvas gets a clear accessible label and live announcements only for meaningful
changes, with a user-controlled verbosity level. Do not stream every telemetry
tick into an aria-live region. Add visible focus rings, roving tabindex in
toolbars, proper dialog focus traps, and escape arbitration consistent with the
existing first-run surface rules.

Respect `prefers-reduced-motion` by disabling decorative shader transitions,
camera easing where appropriate, animated split-flap effects, and auto-rotating
briefings. Add a high-contrast theme that preserves source-state distinctions
with text and icons, not color alone. Touch controls need large hit targets,
pinch/rotate gestures, and an explicit “pick mode” so a drag never accidentally
selects an entity.

## Testing and rollout

Add unit tests for command routing and shortcut precedence. Use Puppeteer checks
for focus order, dialog return focus, accessible names, reduced motion, and
keyboard-only completion of common missions. Run axe-style audits where tooling
permits and manually test VoiceOver/NVDA because canvas semantics need human
verification. Add a non-visual state snapshot for every major scene surface.

## Definition of done

A keyboard-only user can launch a mission, enable a layer, select a contact,
read its source state, change the camera, and exit. Screen-reader users receive
the same meaningful state without telemetry spam, and reduced-motion/high-
contrast modes preserve both function and truth labels.
