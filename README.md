# Mascot — an Agents Hub plugin

A purple "cloud" with eyes in the sidebar header (the hub row, at the right edge, mirroring the avatar — 32 px) shows the
state of the whole fleet at a glance:

- **waiting for you** — a session has a question, a tool request, or has crashed: it sways;
- **working** — at least one session is busy with a turn: it blinks and glances around;
- **asleep** — all sessions are free or asleep: eyes closed, it breathes slowly.

The tooltip on hover is a summary ("Working 1 · waiting for you 1 · asleep 2"). A click does nothing. With "reduce
motion" it stays on the first frame.

The UI text is in English by default and in Russian for a hub whose language is Russian (`hub.lang`).

Place — `sidebar.header` (Plugin API 1.5). On a hub with an API below 1.5 the mascot sits in the sidebar footer.

## Install

"Settings" → "Plugins" → find "mascot" or paste the link to this repo → "Check and install".

## Your own character

Vector: the shapes are in `shapes.js` (the body is circles of one fill, plus the eye centers; three ready ones: `cloud`,
`flower`, `fuzzy`), the shape is chosen by `SHAPE` in `main.js`, the color by `--mascot` in `mascot.css`.
