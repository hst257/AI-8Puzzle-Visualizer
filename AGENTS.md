# Repository Guidelines

> Whatever action you can do yourself, Please do yourself, this includes starting apps and verification

## Project Structure & Module Organization

This is a static 8-puzzle search visualizer.

- `index.html` contains page markup and controls.
- `css/styles.css` defines the responsive visual system and component states.
- `js/algorithms.js` contains puzzle utilities and search algorithms.
- `js/app.js` connects the algorithms to navigation, playback, comparison, and form controls.
- `test/algorithms.test.js` uses Node's test runner.
- `docs/ALGORITHMS.md` documents the search methods and complexity assumptions.
- `DESIGN.md` is the visual design specification for the interface.
- `assets/` and `images/` hold static media and screenshots.

Keep algorithm logic independent of the DOM. UI changes belong in `app.js`, `index.html`, or `styles.css`.

## Build, Test, and Development Commands

No build step is required.

```bash
python -m http.server 8000
```

Serves the repository at `http://localhost:8000`. Browser ES modules require a server instead of a `file://` URL.

```bash
npm test
node --check js/app.js
```

`npm test` runs all tests. Use the syntax check after editing UI behavior.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript. Prefer ES modules and small single-purpose functions. Use `camelCase` for JavaScript identifiers, kebab-case for CSS classes and IDs, and keys such as `iddls` or `astar`.

Follow `DESIGN.md` for visual changes. Use Phosphor icons (`ph ph-*`) for interface controls instead of Unicode symbols, emoji, or custom SVGs. Decorative icons require `aria-hidden="true"`; controls still need accessible text or titles.

Match surrounding style and run `git diff --check` before committing. Preserve DOM IDs referenced by `js/app.js`.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Add cases to `test/algorithms.test.js` with behavior-focused names, for example: `test("DLS reports a cutoff below the solution depth", ...)`. Cover solvability, legal successors, heuristics, result paths, and failure conditions when changing search logic. Run `npm test` before every pull request.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects such as `Fix bugs` and `Add dynamic resolution change`. Continue that style, but make the subject specific, for example `Improve mobile playback controls`.

Pull requests should explain the user-visible change, list verification commands, and note algorithm or performance implications. Include desktop and mobile screenshots for UI changes. Link related issues and keep unrelated refactors in separate commits.

## Deployment & Safety

GitHub Pages serves the repository root directly. Keep paths relative and never commit secrets, API keys, generated logs, or editor-specific files.
