import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GOAL,
  DEFAULT_INITIAL,
  isSolvable,
  manhattanDistance,
  misplacedTiles,
  randomSolvableState,
  solvePuzzle,
  successors,
  validateState
} from "../js/algorithms.js";

test("validates complete tile permutations", () => {
  assert.equal(validateState(DEFAULT_INITIAL), "");
  assert.match(validateState([1, 1, 2, 3, 4, 5, 6, 7, 8]), /exactly once/);
});

test("detects solvability relative to a custom goal", () => {
  assert.equal(isSolvable(DEFAULT_INITIAL, DEFAULT_GOAL), true);
  const impossible = DEFAULT_INITIAL.slice();
  [impossible[0], impossible[1]] = [impossible[1], impossible[0]];
  assert.equal(isSolvable(impossible, DEFAULT_GOAL), false);
});

test("generates only legal neighboring states", () => {
  assert.equal(successors([1, 2, 3, 4, 0, 5, 6, 7, 8]).length, 4);
  assert.equal(successors([0, 1, 2, 3, 4, 5, 6, 7, 8]).length, 2);
});

test("calculates both heuristics without counting the blank", () => {
  assert.equal(misplacedTiles(DEFAULT_INITIAL, DEFAULT_GOAL), 4);
  assert.equal(manhattanDistance(DEFAULT_INITIAL, DEFAULT_GOAL), 5);
  assert.equal(manhattanDistance(DEFAULT_GOAL, DEFAULT_GOAL), 0);
});

test("BFS, IDDLS, and A* find the optimal five-move example path", () => {
  for (const algorithm of ["bfs", "iddls", "astar"]) {
    const result = solvePuzzle({ initial: DEFAULT_INITIAL, goal: DEFAULT_GOAL, algorithm, depthLimit: 20, trace: false });
    assert.equal(result.found, true, algorithm);
    assert.equal(result.moves, 5, algorithm);
    assert.deepEqual(result.path.at(-1).state, DEFAULT_GOAL, algorithm);
  }
});

test("DLS reports a cutoff below the solution depth", () => {
  const result = solvePuzzle({ initial: DEFAULT_INITIAL, goal: DEFAULT_GOAL, algorithm: "dls", depthLimit: 4, trace: false });
  assert.equal(result.found, false);
  assert.equal(result.reason, "cutoff");
});

test("random generator always returns a valid reachable state", () => {
  for (let index = 0; index < 20; index += 1) {
    const state = randomSolvableState(DEFAULT_GOAL, 20);
    assert.equal(validateState(state), "");
    assert.equal(isSolvable(state, DEFAULT_GOAL), true);
  }
});
