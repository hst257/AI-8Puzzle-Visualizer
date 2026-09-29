# Repository Guidelines

> Whatever action you can do yourself, Please do yourself, this includes starting apps and verification

## Project Structure & Module Organization

This repository is a static 8-puzzle search visualizer.

- `index.html` contains all page markup and interactive controls.
- `css/styles.css` defines the responsive visual system and component states.
- `js/algorithms.js` contains puzzle utilities, heuristics, and all six search implementations.
- `js/app.js` connects the algorithms to navigation, playback, comparison, and form controls.
- `test/algorithms.test.js` covers algorithm correctness with Node's built-in test runner.
- `docs/ALGORITHMS.md` documents the search methods and complexity assumptions.
- `assets/` and `images/` are reserved for static media and screenshots.

Keep algorithm logic independent of the DOM. UI changes belong in `app.js`, `index.html`, or `styles.css`.

## Build, Test, and Development Commands

No build step or dependency installation is required.

```bash
python -m http.server 8000
```

Serves the repository at `http://localhost:8000`. Use a server because browser ES modules do not work reliably through `file://` URLs.

```bash
npm test
node --check js/app.js
```

`npm test` runs every Node test. The syntax check is useful after editing UI behavior.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript. Prefer ES modules, `const`, template literals, and small single-purpose functions. Use `camelCase` for JavaScript identifiers, kebab-case for CSS classes and element IDs, and descriptive algorithm keys such as `iddls` or `astar`.

There is no automated formatter or linter. Match surrounding style and run `git diff --check` before committing. Preserve DOM IDs referenced by `js/app.js`, or update both files together.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Add cases to `test/algorithms.test.js` with behavior-focused names, for example: `test("DLS reports a cutoff below the solution depth", ...)`. Cover solvability, legal successors, heuristics, result paths, and failure conditions when changing search logic. Run `npm test` before every pull request.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects such as `Fix bugs` and `Add dynamic resolution change`. Continue that style, but make the subject specific, for example `Improve mobile playback controls`.

Pull requests should explain the user-visible change, list verification commands, and note algorithm or performance implications. Include desktop and mobile screenshots for UI changes. Link related issues and keep unrelated refactors in separate commits.

## Deployment & Safety

GitHub Pages serves the repository root directly. Keep paths relative and never commit secrets, API keys, generated logs, or editor-specific files.
