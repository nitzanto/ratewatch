# Design prototypes

Interactive prototypes from the design direction work in issue #32, exported from the Claude Design canvas. They are reference material, not product code: build the real screens in `apps/web` from `DESIGN.md` and these files.

| File                | Screen                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `Main.dc.html`      | Admin dashboard: live users table, user drawer, admin controls, states |
| `Clicker.dc.html`   | Cookie clicker: Crumb's stages, the 429 wait and welcome back          |
| `SignIn.dc.html`    | Sign-in page with waving Crumb                                         |
| `Character.dc.html` | Crumb's character sheet: moods, stages, sizes, motion rules            |
| `Palettes.dc.html`  | The three enterprise palettes considered; Harbor was chosen            |

## Reading them

Each file is a Design Component: HTML with `{{ }}` bindings, `<sc-for>` loops and `<sc-if>` branches, plus a `class Component extends DCLogic` script whose `renderVals()` holds the data and the behaviour. They need the design editor's runtime (`support.js`) to render, so opening one in a browser shows the raw template. To view or change them, import them into a Claude Design canvas, or read the markup and the script directly: the logic shows the intended behaviour, for example the stable table ordering, undo, timed pause and Crumb's stage thresholds.

All numbers in them are sample data.

Prettier skips these files (see `.prettierignore`) because reformatting would break the template syntax.
