export const DEFAULT_INITIAL = [2, 8, 3, 1, 6, 4, 7, 0, 5];
export const DEFAULT_GOAL = [1, 2, 3, 8, 0, 4, 7, 6, 5];
export const ALGORITHM_NAMES = {
  bfs: "Breadth-First Search",
  dfs: "Depth-First Search",
  dls: "Depth-Limited Search",
  iddls: "Iterative Deepening DLS",
  gbfs: "Greedy Best-First Search",
  astar: "A* Search"
};

const MAX_EXPANSIONS = 200000;
const MAX_DETAILED_TRACE = 20000;
const DIRECTIONS = [
  { name: "Up", delta: -3, allowed: (index) => index >= 3 },
  { name: "Left", delta: -1, allowed: (index) => index % 3 !== 0 },
  { name: "Down", delta: 3, allowed: (index) => index < 6 },
  { name: "Right", delta: 1, allowed: (index) => index % 3 !== 2 }
];

export function keyOf(state) {
  return state.join("");
}

export function labelOf(state) {
  return state.map((value) => value || "_").join(" ");
}

export function validateState(state) {
  if (!Array.isArray(state) || state.length !== 9) return "A state must contain exactly 9 cells.";
  if (state.some((value) => !Number.isInteger(value) || value < 0 || value > 8)) return "Use each number from 0 to 8; 0 represents the blank.";
  if (new Set(state).size !== 9) return "Each tile from 0 to 8 must appear exactly once.";
  return "";
}

export function isSolvable(initial, goal) {
  const goalOrder = new Map(goal.filter(Boolean).map((tile, index) => [tile, index]));
  const permutation = initial.filter(Boolean).map((tile) => goalOrder.get(tile));
  let inversions = 0;
  for (let i = 0; i < permutation.length; i += 1) {
    for (let j = i + 1; j < permutation.length; j += 1) {
      if (permutation[i] > permutation[j]) inversions += 1;
    }
  }
  return inversions % 2 === 0;
}

export function successors(state) {
  const blank = state.indexOf(0);
  return DIRECTIONS.filter((direction) => direction.allowed(blank)).map((direction) => {
    const next = state.slice();
    const swapIndex = blank + direction.delta;
    next[blank] = next[swapIndex];
    next[swapIndex] = 0;
    return { state: next, move: direction.name };
  });
}

export function misplacedTiles(state, goal) {
  let score = 0;
  for (let i = 0; i < 9; i += 1) {
    if (state[i] !== 0 && state[i] !== goal[i]) score += 1;
  }
  return score;
}

export function manhattanDistance(state, goal) {
  const goalPosition = new Map(goal.map((tile, index) => [tile, index]));
  let score = 0;
  state.forEach((tile, index) => {
    if (tile === 0) return;
    const target = goalPosition.get(tile);
    score += Math.abs(Math.floor(index / 3) - Math.floor(target / 3));
    score += Math.abs((index % 3) - (target % 3));
  });
  return score;
}

function heuristicFunction(name, goal) {
  return name === "misplaced"
    ? (state) => misplacedTiles(state, goal)
    : (state) => manhattanDistance(state, goal);
}

function node(state, parent = null, move = null, h = 0) {
  const depth = parent ? parent.depth + 1 : 0;
  return { state, key: keyOf(state), parent, move, depth, g: depth, h, f: depth + h };
}

function pathFrom(goalNode) {
  const path = [];
  let cursor = goalNode;
  while (cursor) {
    path.push({ state: cursor.state.slice(), move: cursor.move, depth: cursor.depth });
    cursor = cursor.parent;
  }
  return path.reverse();
}

function makeTracker(trace) {
  return {
    trace,
    events: [],
    generated: 1,
    expanded: 0,
    maxDepth: 0,
    maxStored: 1,
    exploredRecent: []
  };
}

function recordExpansion(tracker, current, generatedNodes, frontierNodes, iteration = null, frontierSize = frontierNodes.length) {
  tracker.expanded += 1;
  tracker.maxDepth = Math.max(tracker.maxDepth, current.depth);
  tracker.maxStored = Math.max(tracker.maxStored, frontierSize + tracker.expanded);
  tracker.exploredRecent.push(current.state.slice());
  if (tracker.exploredRecent.length > 8) tracker.exploredRecent.shift();
  if (!tracker.trace) return;
  if (tracker.events.length >= MAX_DETAILED_TRACE && tracker.expanded % 500 !== 0) return;

  const frontierSample = frontierNodes.slice(0, 8).map((item) => item.state.slice());
  tracker.events.push({
    current: current.state.slice(),
    parent: current.parent ? current.parent.state.slice() : null,
    move: current.move,
    depth: current.depth,
    g: current.g,
    h: current.h,
    f: current.f,
    generated: tracker.generated,
    expanded: tracker.expanded,
    maxDepth: tracker.maxDepth,
    successors: generatedNodes.map((item) => ({ state: item.state.slice(), move: item.move })),
    frontier: frontierSample,
    explored: tracker.exploredRecent.map((state) => state.slice()),
    iteration
  });
}

function finish(tracker, startTime, goalNode, reason = "exhausted") {
  const elapsed = performance.now() - startTime;
  const path = goalNode ? pathFrom(goalNode) : [];
  if (tracker.trace && goalNode && keyOf(tracker.events.at(-1)?.current || []) !== goalNode.key) {
    tracker.events.push({
      current: goalNode.state.slice(), parent: goalNode.parent?.state.slice() || null, move: goalNode.move,
      depth: goalNode.depth, g: goalNode.g, h: goalNode.h, f: goalNode.f,
      generated: tracker.generated, expanded: tracker.expanded, maxDepth: tracker.maxDepth,
      successors: [], frontier: [], explored: tracker.exploredRecent.map((state) => state.slice()), iteration: null
    });
  }
  return {
    found: Boolean(goalNode),
    reason: goalNode ? "goal" : reason,
    path,
    moves: goalNode ? path.length - 1 : null,
    generated: tracker.generated,
    expanded: tracker.expanded,
    maxDepth: tracker.maxDepth,
    timeMs: elapsed,
    pathCost: goalNode ? goalNode.g : null,
    memoryBytes: tracker.maxStored * 184,
    events: tracker.events
  };
}

function uninformedGraphSearch(initial, goal, mode, trace) {
  const started = performance.now();
  const root = node(initial.slice());
  const tracker = makeTracker(trace);
  const frontier = [root];
  let head = 0;
  const seen = new Set([root.key]);
  const goalKey = keyOf(goal);

  while (mode === "bfs" ? head < frontier.length : frontier.length > 0) {
    if (tracker.expanded >= MAX_EXPANSIONS) return finish(tracker, started, null, "limit");
    const current = mode === "bfs" ? frontier[head++] : frontier.pop();
    const generatedNodes = [];
    if (current.key !== goalKey) {
      const adjacent = successors(current.state);
      if (mode === "dfs") adjacent.reverse();
      for (const next of adjacent) {
        const nextKey = keyOf(next.state);
        if (seen.has(nextKey)) continue;
        seen.add(nextKey);
        const child = node(next.state, current, next.move);
        frontier.push(child);
        generatedNodes.push(child);
        tracker.generated += 1;
      }
    }
    const frontierSize = mode === "bfs" ? frontier.length - head : frontier.length;
    const activeFrontier = tracker.trace
      ? (mode === "bfs" ? frontier.slice(head, head + 8) : frontier.slice(-8).reverse())
      : [];
    recordExpansion(tracker, current, generatedNodes, activeFrontier, null, frontierSize);
    if (current.key === goalKey) return finish(tracker, started, current);
  }
  return finish(tracker, started, null);
}

function depthLimitedIteration(initial, goalKey, limit, tracker, iteration) {
  const root = node(initial.slice());
  const stack = [root];
  const shallowest = new Map([[root.key, 0]]);
  let cutoff = false;

  while (stack.length) {
    if (tracker.expanded >= MAX_EXPANSIONS) return { goalNode: null, cutoff: false, limited: true };
    const current = stack.pop();
    const generatedNodes = [];
    if (current.key === goalKey) {
      recordExpansion(tracker, current, generatedNodes, tracker.trace ? stack.slice(-8).reverse() : [], iteration, stack.length);
      return { goalNode: current, cutoff: false, limited: false };
    }
    if (current.depth < limit) {
      const adjacent = successors(current.state).reverse();
      for (const next of adjacent) {
        const nextKey = keyOf(next.state);
        const nextDepth = current.depth + 1;
        if (shallowest.has(nextKey) && shallowest.get(nextKey) <= nextDepth) continue;
        shallowest.set(nextKey, nextDepth);
        const child = node(next.state, current, next.move);
        stack.push(child);
        generatedNodes.push(child);
        tracker.generated += 1;
      }
    } else if (successors(current.state).length) {
      cutoff = true;
    }
    recordExpansion(tracker, current, generatedNodes, tracker.trace ? stack.slice(-8).reverse() : [], iteration, stack.length);
  }
  return { goalNode: null, cutoff, limited: false };
}

function depthLimitedSearch(initial, goal, limit, trace) {
  const started = performance.now();
  const tracker = makeTracker(trace);
  const outcome = depthLimitedIteration(initial, keyOf(goal), limit, tracker, limit);
  return finish(tracker, started, outcome.goalNode, outcome.limited ? "limit" : outcome.cutoff ? "cutoff" : "exhausted");
}

function iterativeDeepening(initial, goal, maxLimit, trace) {
  const started = performance.now();
  const tracker = makeTracker(trace);
  const goalKey = keyOf(goal);
  for (let limit = 0; limit <= maxLimit; limit += 1) {
    if (limit > 0) tracker.generated += 1;
    const outcome = depthLimitedIteration(initial, goalKey, limit, tracker, limit);
    if (outcome.goalNode) return finish(tracker, started, outcome.goalNode);
    if (outcome.limited) return finish(tracker, started, null, "limit");
    if (!outcome.cutoff) return finish(tracker, started, null, "exhausted");
  }
  return finish(tracker, started, null, "cutoff");
}

class MinHeap {
  constructor(compare) { this.items = []; this.compare = compare; }
  get length() { return this.items.length; }
  push(value) {
    this.items.push(value);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[parent], value) <= 0) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = value;
  }
  pop() {
    if (this.items.length === 1) return this.items.pop();
    const root = this.items[0];
    const last = this.items.pop();
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      let child = right < this.items.length && this.compare(this.items[right], this.items[left]) < 0 ? right : left;
      if (this.compare(last, this.items[child]) <= 0) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return root;
  }
  sample(count = 8) { return this.items.slice().sort(this.compare).slice(0, count); }
}

function informedSearch(initial, goal, mode, heuristicName, trace) {
  const started = performance.now();
  const h = heuristicFunction(heuristicName, goal);
  let order = 0;
  const compare = mode === "gbfs"
    ? (a, b) => a.h - b.h || a.depth - b.depth || a.order - b.order
    : (a, b) => a.f - b.f || a.h - b.h || a.order - b.order;
  const root = node(initial.slice(), null, null, h(initial));
  root.order = order++;
  const frontier = new MinHeap(compare);
  frontier.push(root);
  const bestG = new Map([[root.key, 0]]);
  const closed = new Set();
  const tracker = makeTracker(trace);
  const goalKey = keyOf(goal);

  while (frontier.length) {
    if (tracker.expanded >= MAX_EXPANSIONS) return finish(tracker, started, null, "limit");
    const current = frontier.pop();
    if (closed.has(current.key)) continue;
    closed.add(current.key);
    const generatedNodes = [];
    if (current.key !== goalKey) {
      for (const next of successors(current.state)) {
        const nextKey = keyOf(next.state);
        const nextG = current.g + 1;
        if (closed.has(nextKey) || (bestG.has(nextKey) && bestG.get(nextKey) <= nextG)) continue;
        bestG.set(nextKey, nextG);
        const child = node(next.state, current, next.move, h(next.state));
        child.order = order++;
        frontier.push(child);
        generatedNodes.push(child);
        tracker.generated += 1;
      }
    }
    recordExpansion(tracker, current, generatedNodes, tracker.trace ? frontier.sample() : [], null, frontier.length);
    if (current.key === goalKey) return finish(tracker, started, current);
  }
  return finish(tracker, started, null);
}

export function solvePuzzle({ initial, goal, algorithm = "iddls", depthLimit = 20, heuristic = "manhattan", trace = true }) {
  const initialError = validateState(initial);
  const goalError = validateState(goal);
  if (initialError || goalError) throw new Error(initialError || goalError);
  if (!isSolvable(initial, goal)) {
    return { found: false, reason: "unsolvable", path: [], moves: null, generated: 0, expanded: 0, maxDepth: 0, timeMs: 0, pathCost: null, memoryBytes: 0, events: [] };
  }
  const safeLimit = Math.max(0, Math.min(80, Number(depthLimit) || 0));
  switch (algorithm) {
    case "bfs": return uninformedGraphSearch(initial, goal, "bfs", trace);
    case "dfs": return uninformedGraphSearch(initial, goal, "dfs", trace);
    case "dls": return depthLimitedSearch(initial, goal, safeLimit, trace);
    case "iddls": return iterativeDeepening(initial, goal, safeLimit, trace);
    case "gbfs": return informedSearch(initial, goal, "gbfs", heuristic, trace);
    case "astar": return informedSearch(initial, goal, "astar", heuristic, trace);
    default: throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

export function randomSolvableState(goal, scrambleMoves = 24) {
  let state = goal.slice();
  let previousKey = "";
  for (let i = 0; i < scrambleMoves; i += 1) {
    let options = successors(state).filter((item) => keyOf(item.state) !== previousKey);
    if (!options.length) options = successors(state);
    const selected = options[Math.floor(Math.random() * options.length)];
    previousKey = keyOf(state);
    state = selected.state;
  }
  return state;
}
