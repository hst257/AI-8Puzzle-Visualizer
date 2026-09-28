# AI 8-Puzzle Search Visualizer

An interactive, browser-based visualization of six state-space search algorithms solving the classic 8-puzzle. The project is a static site and can be deployed directly with GitHub Pages—no server, build step, package manager, or API key is required.

## Live website

`https://hst257.github.io/AI-8Puzzle-Visualizer/`

## Features

- Manual initial-state and goal-state entry
- Guaranteed-solvable random puzzle generation
- Solvability and input validation for arbitrary goal layouts
- Search-trace playback with pause, resume, next, previous, reset, and speed controls
- Current node, parent, successors, frontier, explored set, depth, `g(n)`, `h(n)`, and `f(n)` displays
- Solution path with animated blank-tile movement
- Summary metrics: moves, generated/expanded nodes, depth, time, path cost, and estimated memory
- Six-algorithm comparison on the same puzzle
- Responsive algorithm reference guide

## Algorithms implemented

All algorithms are implemented from scratch in JavaScript in `js/algorithms.js`.

1. Breadth-First Search (BFS)
2. Depth-First Search (DFS)
3. Depth-Limited Search (DLS)
4. Iterative Deepening Depth-Limited Search (IDDLS)
5. Greedy Best-First Search (GBFS)
6. A* Search

## Heuristics

- **Misplaced tiles:** counts numbered tiles outside their goal positions.
- **Manhattan distance:** sums each numbered tile's horizontal and vertical distance from its goal position.

The blank tile is excluded from both heuristics.

## Technologies

- HTML5
- CSS3
- JavaScript ES6 modules
- Bootstrap 5 utilities/base styles
- Google Fonts (Manrope and DM Mono)

## Student details

- **Student:** Harshit Sharma Thakur
- **Registration number:** 24BCE0437
- **Course:** Artificial Intelligence
- **Assignment:** 8-Puzzle Search Algorithm Visualizer

The three student fields on the home page can be clicked and edited. Values are remembered in the browser using `localStorage`. Replace the placeholders in this file and `index.html` before submission if you want the information committed to the repository.

## How to run

Because the project uses ES modules, serve the folder through a small local web server instead of opening `index.html` as a `file://` URL.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

No installation is required. The application also works with any static-file server, such as the VS Code Live Server extension.

Run the algorithm test suite with:

```bash
npm test
```

## GitHub Pages deployment

1. Push this folder to a GitHub repository (for example, `AI-8Puzzle-Visualizer`).
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.
5. Add the generated live URL to the **Live website** section above.

## Repository structure

```text
AI-8Puzzle-Visualizer/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── algorithms.js
│   └── app.js
├── assets/
├── images/
├── docs/
│   └── ALGORITHMS.md
└── README.md
```

## Screenshots

Add screenshots to `images/` after entering your student information, then embed them here before final submission.

## Notes on measurement

Execution time is measured with the browser's high-resolution `performance.now()` timer. Memory is an intentionally transparent approximation based on the peak number of search records retained; browser engines do not expose reliable per-algorithm heap measurements to ordinary web pages.

## References

- Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach*, 4th edition.
- [MDN Web Docs: JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Bootstrap documentation](https://getbootstrap.com/docs/5.3/)

## License

This project is intended for educational use.
