import {
  ALGORITHM_NAMES,
  DEFAULT_GOAL,
  DEFAULT_INITIAL,
  isSolvable,
  keyOf,
  labelOf,
  randomSolvableState,
  solvePuzzle,
  validateState
} from "./algorithms.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const delay = (milliseconds = 0) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const icon = (name) => `<i class="ph ph-${name}" aria-hidden="true"></i>`;

const elements = {
  initialInput: $("#initial-input"), goalInput: $("#goal-input"),
  initialBoard: $("#initial-board"), currentBoard: $("#current-board"), goalBoard: $("#goal-board"),
  algorithm: $("#algorithm-select"), depth: $("#depth-limit"), heuristic: $("#heuristic-select"),
  depthField: $("#depth-field"), heuristicField: $("#heuristic-field"), algorithmNote: $("#algorithm-note"),
  validation: $("#validation-message"), status: $("#run-status"), moveBadge: $("#move-badge"),
  summary: $("#summary-panel"), summaryTitle: $("#summary-title"), summaryIcon: $("#summary-icon"),
  summaryStats: $("#summary-stats"), solutionPath: $("#solution-path"),
  solutionPlayer: $("#solution-player"), solutionPlayerBoard: $("#solution-player-board"),
  solutionStepLabel: $("#solution-step-label"), solutionMoveLabel: $("#solution-move-label"),
  solutionProgressBar: $("#solution-progress-bar"), solutionGoalBadge: $("#solution-goal-badge"),
  solutionPlay: $("#solution-play-btn"), solutionSpeed: $("#solution-speed-select"),
  animateSolution: $("#animate-solution-btn"),
  generated: $("#metric-generated"), expanded: $("#metric-expanded"), depthMetric: $("#metric-depth"),
  cost: $("#metric-cost"), h: $("#metric-h"), f: $("#metric-f"),
  successors: $("#successor-list"), frontier: $("#frontier-list"), explored: $("#explored-list"),
  nodeDetail: $("#node-detail"), play: $("#play-btn"), speed: $("#speed-select"),
  compareBody: $("#comparison-body"), compareButton: $("#compare-btn")
};

const algorithmNotes = {
  bfs: "Explores the shallowest states first. Complete and optimal when every move has equal cost.",
  dfs: "Follows one branch deeply before backtracking. Memory-efficient, but not optimal.",
  dls: "Depth-first search with a fixed cutoff. A solution below the limit will not be reached.",
  iddls: "Repeats depth-limited search with limits 0, 1, 2… combining BFS optimality with DFS memory use.",
  gbfs: "Expands the state that looks closest to the goal according to h(n). Fast, but not optimal.",
  astar: "Balances path cost g(n) with estimated remaining cost h(n) using f(n) = g(n) + h(n)."
};

const algorithmInfo = {
  bfs: { short: "BFS", name: "Breadth-First Search", principle: "A FIFO queue expands every node at depth d before any node at depth d + 1.", description: "BFS searches outward in uniform layers from the initial state. In an unweighted puzzle, the first goal it finds has the fewest moves.", time: "O(bᵈ)", space: "O(bᵈ)", complete: "Yes", optimal: "Yes*", pros: ["Finds the shortest move sequence", "Predictable and complete"], cons: ["Stores a large frontier", "Memory grows exponentially"] },
  dfs: { short: "DFS", name: "Depth-First Search", principle: "A LIFO stack follows the newest successor and backtracks at dead ends.", description: "DFS commits to one branch at a time. It can reach deep solutions quickly, but the first solution may be needlessly long.", time: "O(bᵐ)", space: "O(bm)", complete: "Finite graph†", optimal: "No", pros: ["Low memory requirement", "Can find deep goals quickly"], cons: ["May explore an unhelpful branch", "Does not guarantee shortest path"] },
  dls: { short: "DLS", name: "Depth-Limited Search", principle: "DFS is stopped whenever the configured maximum depth is reached.", description: "DLS prevents an unlimited descent, but it needs a useful limit. A goal beyond that boundary produces a cutoff rather than a solution.", time: "O(bˡ)", space: "O(bl)", complete: "If l ≥ d", optimal: "No", pros: ["Controls depth and memory", "Avoids arbitrarily deep paths"], cons: ["Needs a suitable limit", "Can miss shallower alternatives in graph variants"] },
  iddls: { short: "IDDLS", name: "Iterative Deepening DLS", principle: "Runs DLS repeatedly with limits 0, 1, 2, … until the goal is found.", description: "IDDLS revisits shallow states, but most nodes live at the deepest level. It achieves BFS-like guarantees with linear-depth memory.", time: "O(bᵈ)", space: "O(bd)", complete: "Yes", optimal: "Yes*", pros: ["Shortest path with unit costs", "Much lower memory than BFS"], cons: ["Repeats earlier expansions", "Repeated work is visible on shallow levels"] },
  gbfs: { short: "GBFS", name: "Greedy Best-First Search", principle: "A priority queue expands the node with the smallest heuristic h(n).", description: "GBFS aims straight toward the estimated goal and ignores the cost already paid. A strong heuristic can make it very fast.", time: "O(bᵐ)", space: "O(bᵐ)", complete: "Finite graph†", optimal: "No", pros: ["Often expands few nodes", "Simple goal-directed behavior"], cons: ["Can be misled by the heuristic", "Does not guarantee cheapest path"] },
  astar: { short: "A*", name: "A* Search", principle: "A priority queue minimizes f(n) = g(n) + h(n).", description: "A* considers both the path already travelled and the estimated distance remaining. With an admissible heuristic, it finds an optimal solution.", time: "O(bᵈ)", space: "O(bᵈ)", complete: "Yes", optimal: "Yes‡", pros: ["Optimal with an admissible heuristic", "Usually expands fewer nodes than BFS"], cons: ["Can consume substantial memory", "Performance depends on heuristic quality"] }
};

const algorithmOrder = Object.keys(algorithmInfo);
const algorithmTransitionDuration = 360;
const algorithmTransitionEasing = "cubic-bezier(.65, 0, .35, 1)";

let result = null;
let playbackEvents = [];
let playbackIndex = 0;
let timer = null;
let playing = false;
let lastRenderedState = DEFAULT_INITIAL.slice();
let solutionTimer = null;
let solutionPlaying = false;
let solutionIndex = 0;
let selectedAlgorithm = algorithmOrder[0];
let algorithmTransitionToken = 0;

function buildInputs(container, values) {
  container.replaceChildren();
  values.forEach((value, index) => {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 1;
    input.value = value === 0 ? "" : String(value);
    input.placeholder = "_";
    input.setAttribute("aria-label", `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`);
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-8]/g, "").slice(-1);
      updateStaticBoards();
      clearNotice();
    });
    container.append(input);
  });
}

function readState(container) {
  return $$('input', container).map((input) => input.value.trim() === "" ? 0 : Number(input.value));
}

function writeState(container, state) {
  $$('input', container).forEach((input, index) => { input.value = state[index] === 0 ? "" : state[index]; });
}

function renderBoard(container, state, previous = null) {
  container.replaceChildren();
  const oldBlank = previous ? previous.indexOf(0) : -1;
  state.forEach((value, index) => {
    const tile = document.createElement("span");
    tile.className = `tile${value === 0 ? " blank" : ""}${index === oldBlank && value !== 0 ? " moved" : ""}`;
    tile.textContent = value === 0 ? "" : value;
    tile.setAttribute("aria-label", value === 0 ? "blank" : `tile ${value}`);
    container.append(tile);
  });
}

function updateStaticBoards() {
  const initial = readState(elements.initialInput);
  const goal = readState(elements.goalInput);
  renderBoard(elements.initialBoard, initial);
  renderBoard(elements.goalBoard, goal);
  if (!result) renderBoard(elements.currentBoard, initial);
}

function showNotice(message, type = "error") {
  elements.validation.textContent = message;
  elements.validation.className = `notice ${type}`;
}

function clearNotice() {
  elements.validation.textContent = "";
  elements.validation.className = "notice";
}

function validConfiguration() {
  const initial = readState(elements.initialInput);
  const goal = readState(elements.goalInput);
  const issue = validateState(initial) || validateState(goal);
  if (issue) { showNotice(issue); return null; }
  if (!isSolvable(initial, goal)) { showNotice("This initial state cannot reach the selected goal. Change a tile or generate a solvable puzzle."); return null; }
  return { initial, goal };
}

function updateAlgorithmFields() {
  const algorithm = elements.algorithm.value;
  elements.depthField.classList.toggle("hidden", !["dls", "iddls"].includes(algorithm));
  elements.heuristicField.classList.toggle("hidden", !["gbfs", "astar"].includes(algorithm));
  elements.algorithmNote.textContent = algorithmNotes[algorithm];
}

function setStatus(label, state = "idle") {
  elements.status.className = `status-pill ${state}`;
  elements.status.innerHTML = `<i></i> ${label}`;
}

function formatStateList(states) {
  if (!states?.length) return "-";
  return states.map((state) => `<span>${labelOf(state)}</span>`).join("");
}

function successorBoard(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "successor-item";
  const board = document.createElement("div");
  board.className = "puzzle-board";
  renderBoard(board, item.state);
  const caption = document.createElement("small");
  caption.textContent = item.move;
  wrapper.append(board, caption);
  return wrapper;
}

function renderEvent(event, index = playbackIndex) {
  if (!event) return;
  renderBoard(elements.currentBoard, event.current, lastRenderedState);
  lastRenderedState = event.current.slice();
  elements.moveBadge.textContent = event.iteration !== null && event.iteration !== undefined
    ? `Expansion ${index + 1} · limit ${event.iteration}` : `Expansion ${index + 1}`;
  elements.generated.textContent = event.generated ?? "-";
  elements.expanded.textContent = event.expanded ?? "-";
  elements.depthMetric.textContent = event.depth ?? 0;
  elements.cost.textContent = event.g ?? 0;
  const informed = ["gbfs", "astar"].includes(elements.algorithm.value);
  elements.h.textContent = informed ? event.h : "-";
  elements.f.textContent = elements.algorithm.value === "astar" ? event.f : "-";
  elements.successors.replaceChildren();
  if (event.successors?.length) event.successors.forEach((item) => elements.successors.append(successorBoard(item)));
  else elements.successors.innerHTML = '<p class="empty-copy">No new successors generated.</p>';
  elements.frontier.innerHTML = formatStateList(event.frontier);
  elements.explored.innerHTML = formatStateList(event.explored);
  elements.nodeDetail.textContent = `Parent: ${event.parent ? labelOf(event.parent) : "-"}  ·  Move: ${event.move || "Start"}  ·  g(n): ${event.g ?? 0}`;
}

function stopPlayback() {
  if (timer) clearTimeout(timer);
  timer = null;
  playing = false;
  elements.play.innerHTML = icon("play");
  elements.play.title = "Resume";
}

function stopSolutionPlayback(completed = false) {
  if (solutionTimer) clearTimeout(solutionTimer);
  solutionTimer = null;
  solutionPlaying = false;
  elements.solutionPlay.innerHTML = icon(completed ? "arrow-counter-clockwise" : "play");
  elements.solutionPlay.title = completed ? "Replay solution" : "Resume solution";
}

function renderSolutionStep(index) {
  if (!result?.path?.length) return;
  solutionIndex = Math.max(0, Math.min(result.path.length - 1, index));
  const step = result.path[solutionIndex];
  const previous = solutionIndex > 0 ? result.path[solutionIndex - 1].state : null;
  renderBoard(elements.solutionPlayerBoard, step.state, previous);
  renderBoard(elements.currentBoard, step.state, lastRenderedState);
  lastRenderedState = step.state.slice();

  const finalIndex = result.path.length - 1;
  const complete = solutionIndex === finalIndex;
  const progress = finalIndex === 0 ? 100 : (solutionIndex / finalIndex) * 100;
  elements.solutionStepLabel.textContent = `Step ${solutionIndex} of ${finalIndex}`;
  elements.solutionMoveLabel.textContent = complete ? "Goal reached" : solutionIndex === 0 ? "Start" : `${step.move} move`;
  elements.solutionProgressBar.style.width = `${progress}%`;
  elements.solutionGoalBadge.innerHTML = complete ? `Goal reached ${icon("check")}` : "In progress";
  elements.solutionGoalBadge.classList.toggle("complete", complete);

  $$(".path-step", elements.solutionPath).forEach((pathStep, pathIndex) => pathStep.classList.toggle("active", pathIndex === solutionIndex));
  const activeStep = $$(".path-step", elements.solutionPath)[solutionIndex];
  if (activeStep) {
    elements.solutionPath.scrollTo({
      left: Math.max(0, activeStep.offsetLeft - elements.solutionPath.clientWidth / 2 + activeStep.clientWidth / 2),
      behavior: "smooth"
    });
  }
}

function scheduleSolutionStep() {
  if (!solutionPlaying || !result?.path?.length) return;
  if (solutionIndex >= result.path.length - 1) {
    stopSolutionPlayback(true);
    elements.animateSolution.innerHTML = `<span>${icon("arrow-counter-clockwise")}</span> Replay animation`;
    return;
  }
  solutionTimer = setTimeout(() => {
    renderSolutionStep(solutionIndex + 1);
    scheduleSolutionStep();
  }, Number(elements.solutionSpeed.value));
}

function playSolution({ restart = false } = {}) {
  if (!result?.found || !result.path.length) return;
  stopPlayback();
  if (restart || solutionIndex >= result.path.length - 1) solutionIndex = 0;
  elements.solutionPlayer.classList.remove("hidden");
  renderSolutionStep(solutionIndex);
  solutionPlaying = true;
  elements.solutionPlay.innerHTML = icon("pause");
  elements.solutionPlay.title = "Pause solution";
  elements.animateSolution.innerHTML = `<span>${icon("arrow-counter-clockwise")}</span> Restart animation`;
  scheduleSolutionStep();
}

function openSolutionPlayer() {
  if (!result?.found) return;
  stopSolutionPlayback();
  solutionIndex = 0;
  elements.solutionPlayer.classList.remove("hidden");
  renderSolutionStep(0);
  elements.solutionPlayer.scrollIntoView({ behavior: "smooth", block: "center" });
  playSolution();
}

function setupControlPanelScroll() {
  const panel = $(".control-panel");
  panel.addEventListener("wheel", (event) => {
    if (!window.matchMedia("(min-width: 821px)").matches || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const maximum = panel.scrollHeight - panel.clientHeight;
    if (maximum <= 1) return;

    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1;
    const requested = panel.scrollTop + event.deltaY * unit;
    const next = Math.max(0, Math.min(maximum, requested));
    const remainder = requested - next;
    panel.scrollTop = next;
    if (Math.abs(remainder) > 0.5) window.scrollBy({ top: remainder, left: 0, behavior: "auto" });
    event.preventDefault();
  }, { passive: false });
}

function scheduleNext() {
  if (!playing) return;
  if (playbackIndex >= playbackEvents.length - 1) {
    stopPlayback();
    setStatus(result?.found ? "Goal reached" : "Search complete", "done");
    return;
  }
  timer = setTimeout(() => {
    playbackIndex += 1;
    renderEvent(playbackEvents[playbackIndex]);
    scheduleNext();
  }, Number(elements.speed.value));
}

function play() {
  if (!playbackEvents.length) return;
  if (playbackIndex >= playbackEvents.length - 1) playbackIndex = 0;
  playing = true;
  elements.play.innerHTML = icon("pause");
  elements.play.title = "Pause";
  setStatus("Playing trace", "running");
  renderEvent(playbackEvents[playbackIndex]);
  scheduleNext();
}

function togglePlayback() {
  if (playing) { stopPlayback(); setStatus("Paused", "idle"); }
  else play();
}

function formatTime(milliseconds) {
  if (milliseconds < 1) return `${milliseconds.toFixed(2)} ms`;
  return `${milliseconds.toFixed(1)} ms`;
}

function formatMemory(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function showSummary(searchResult) {
  elements.summary.classList.remove("hidden");
  elements.summaryTitle.textContent = searchResult.found ? "Solution found" : searchResult.reason === "cutoff" ? "Depth cutoff reached" : searchResult.reason === "unsolvable" ? "Puzzle is unsolvable" : "Solution not found";
  elements.summaryIcon.innerHTML = icon(searchResult.found ? "check" : "x");
  const stats = [
    ["Moves", searchResult.moves ?? "-"], ["Generated", searchResult.generated],
    ["Expanded", searchResult.expanded], ["Max depth", searchResult.maxDepth],
    ["Execution time", formatTime(searchResult.timeMs)], ["Path cost", searchResult.pathCost ?? "-"],
    ["Approx. memory", formatMemory(searchResult.memoryBytes)], ["Algorithm", ALGORITHM_NAMES[elements.algorithm.value]]
  ];
  elements.summaryStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  stopSolutionPlayback();
  solutionIndex = 0;
  elements.solutionPlayer.classList.add("hidden");
  elements.animateSolution.innerHTML = `<span>${icon("play")}</span> Animate solution`;
  elements.solutionPath.replaceChildren();
  if (!searchResult.path.length) {
    elements.solutionPath.innerHTML = '<p class="empty-copy">No solution path is available for this run.</p>';
    return;
  }
  searchResult.path.forEach((step, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "path-step";
    const board = document.createElement("div");
    board.className = "puzzle-board";
    renderBoard(board, step.state);
    const caption = document.createElement("p");
    caption.textContent = index === 0 ? "Step 0 · Start" : `Step ${index} · ${step.move}`;
    wrapper.append(board, caption);
    wrapper.addEventListener("click", () => {
      stopSolutionPlayback();
      elements.solutionPlayer.classList.remove("hidden");
      renderSolutionStep(index);
    });
    elements.solutionPath.append(wrapper);
  });
}

async function runSearch() {
  const states = validConfiguration();
  if (!states) return;
  stopPlayback();
  stopSolutionPlayback();
  result = null;
  playbackEvents = [];
  elements.summary.classList.add("hidden");
  setStatus("Searching", "running");
  showNotice("Computing the search trace…", "success");
  await delay(30);
  try {
    result = solvePuzzle({
      ...states,
      algorithm: elements.algorithm.value,
      depthLimit: Number(elements.depth.value),
      heuristic: elements.heuristic.value,
      trace: true
    });
    playbackEvents = result.events;
    playbackIndex = 0;
    if (playbackEvents.length) renderEvent(playbackEvents[0], 0);
    showSummary(result);
    if (playbackEvents.length > 500) showNotice(`Large trace ready: ${playbackEvents.length.toLocaleString()} sampled expansion frames. Use Play or step controls to inspect it.`, "success");
    else clearNotice();
    setStatus(result.found ? "Trace ready" : "Search complete", result.found ? "running" : "done");
    if (playbackEvents.length && playbackEvents.length <= 500) play();
  } catch (error) {
    showNotice(error.message);
    setStatus("Error", "idle");
  }
}

async function runComparison() {
  const states = validConfiguration();
  if (!states) { location.hash = "solver"; return; }
  elements.compareButton.disabled = true;
  elements.compareButton.textContent = "Running…";
  elements.compareBody.innerHTML = '<tr><td colspan="6" class="table-empty">Computing six searches…</td></tr>';
  await delay(30);
  const algorithms = ["bfs", "dfs", "dls", "iddls", "gbfs", "astar"];
  const rows = [];
  for (const algorithm of algorithms) {
    await delay(0);
    const searchResult = solvePuzzle({ ...states, algorithm, depthLimit: Number(elements.depth.value), heuristic: elements.heuristic.value, trace: false });
    rows.push({ algorithm, ...searchResult });
    elements.compareBody.innerHTML = rows.map(comparisonRow).join("") + (rows.length < algorithms.length ? '<tr><td colspan="6" class="table-empty">Running remaining algorithms…</td></tr>' : "");
  }
  elements.compareButton.disabled = false;
  elements.compareButton.innerHTML = `Run again ${icon("arrow-clockwise")}`;
}

function comparisonRow(row) {
  const memoryClass = row.memoryBytes < 50_000 ? "Low" : row.memoryBytes < 500_000 ? "Medium" : "High";
  const shortName = algorithmInfo[row.algorithm].short;
  const fullName = ALGORITHM_NAMES[row.algorithm];
  const detailName = fullName.startsWith(shortName) ? fullName.slice(shortName.length).trim() : fullName;
  return `<tr><td data-label="Algorithm">${shortName} <small>${detailName}</small></td><td data-label="Result"><span class="result-chip ${row.found ? "" : "fail"}">${row.found ? "Found" : row.reason === "cutoff" ? "Cutoff" : "Not found"}</span></td><td data-label="Nodes expanded">${row.expanded.toLocaleString()}</td><td data-label="Moves">${row.moves ?? "-"}</td><td data-label="Time">${formatTime(row.timeMs)}</td><td data-label="Memory" title="${formatMemory(row.memoryBytes)}">${memoryClass}</td></tr>`;
}

function algorithmDetailMarkup(selected) {
  const info = algorithmInfo[selected];
  return `
    <div class="algorithm-detail-page" data-algorithm-page="${selected}">
      <div class="algorithm-overview"><span class="algo-code">ALGORITHM / ${info.short}</span><h2>${info.name}</h2><p>${info.description}</p></div>
      <div class="algorithm-facts"><p class="kicker">Working principle</p><p>${info.principle}</p><div class="complexity-grid"><div><span>Time</span><strong>${info.time}</strong></div><div><span>Space</span><strong>${info.space}</strong></div><div><span>Complete</span><strong>${info.complete}</strong></div><div><span>Optimal</span><strong>${info.optimal}</strong></div></div><div class="pros-cons"><div><h3>Advantages</h3><ul>${info.pros.map((item) => `<li>${item}</li>`).join("")}</ul></div><div><h3>Limitations</h3><ul>${info.cons.map((item) => `<li>${item}</li>`).join("")}</ul></div></div><p class="fine-print">* With equal step costs. † With repeated-state checking in a finite graph. ‡ With an admissible, consistent heuristic.</p></div>
    </div>`;
}

function moveAlgorithmIndicator(selected) {
  const tabs = $("#algorithm-tabs");
  const button = $(`[data-algo="${selected}"]`, tabs);
  const indicator = $(".algorithm-tab-indicator", tabs);
  if (!button || !indicator) return;

  indicator.style.width = `${button.offsetWidth}px`;
  indicator.style.transform = `translate3d(${button.offsetLeft}px, 0, 0)`;
}

function updateAlgorithmSelection(selected, scroll = false) {
  const tabs = $("#algorithm-tabs");
  const button = $(`[data-algo="${selected}"]`, tabs);
  if (!button) return;

  $$("button", tabs).forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  moveAlgorithmIndicator(selected);

  if (scroll && tabs.scrollWidth > tabs.clientWidth) {
    const left = button.offsetLeft - (tabs.clientWidth - button.offsetWidth) / 2;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    tabs.scrollTo({ left: Math.max(0, left), behavior });
  }
}

async function animateAlgorithmDetail(selected, direction, token) {
  const detail = $("#algorithm-detail");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const currentPage = $(".algorithm-detail-page:last-child", detail);
  if (reducedMotion || !currentPage) {
    detail.innerHTML = algorithmDetailMarkup(selected);
    detail.dataset.algorithm = selected;
    detail.setAttribute("aria-labelledby", `algorithm-tab-${selected}`);
    return true;
  }

  const template = document.createElement("template");
  template.innerHTML = algorithmDetailMarkup(selected).trim();
  const nextPage = template.content.firstElementChild;
  detail.append(nextPage);
  detail.dataset.algorithm = selected;
  detail.setAttribute("aria-labelledby", `algorithm-tab-${selected}`);
  detail.classList.add("is-transitioning");
  const distance = direction * 100;
  const exitAnimation = currentPage.animate([
    { transform: "translate3d(0, 0, 0)" },
    { transform: `translate3d(${-distance}%, 0, 0)` }
  ], { duration: algorithmTransitionDuration, easing: algorithmTransitionEasing, fill: "forwards" });
  const entryAnimation = nextPage.animate([
    { transform: `translate3d(${distance}%, 0, 0)` },
    { transform: "translate3d(0, 0, 0)" }
  ], { duration: algorithmTransitionDuration, easing: algorithmTransitionEasing, fill: "both" });
  await Promise.allSettled([exitAnimation.finished, entryAnimation.finished]);
  if (token !== algorithmTransitionToken) return false;

  currentPage.remove();
  detail.classList.remove("is-transitioning");
  return true;
}

async function transitionAlgorithmInfo(target) {
  if (!algorithmOrder.includes(target)) return;

  const detail = $("#algorithm-detail");
  const tabs = $("#algorithm-tabs");
  tabs.classList.remove("is-transitioning");
  const token = ++algorithmTransitionToken;
  const pages = $$(".algorithm-detail-page", detail);
  pages.flatMap((page) => page.getAnimations()).forEach((animation) => animation.cancel());
  pages.slice(0, -1).forEach((page) => page.remove());
  const settledPage = $(".algorithm-detail-page:last-child", detail);
  if (settledPage) detail.dataset.algorithm = settledPage.dataset.algorithmPage;
  detail.classList.remove("is-transitioning");
  selectedAlgorithm = detail.dataset.algorithm || selectedAlgorithm;

  const currentIndex = algorithmOrder.indexOf(selectedAlgorithm);
  const targetIndex = algorithmOrder.indexOf(target);
  if (currentIndex === targetIndex) {
    updateAlgorithmSelection(target);
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const direction = Math.sign(targetIndex - currentIndex);
  tabs.classList.add("is-transitioning");
  updateAlgorithmSelection(target, true);
  try {
    if (reducedMotion) {
      selectedAlgorithm = target;
      detail.innerHTML = algorithmDetailMarkup(target);
      detail.dataset.algorithm = target;
      detail.setAttribute("aria-labelledby", `algorithm-tab-${target}`);
      return;
    }

    const completed = await animateAlgorithmDetail(target, direction, token);
    if (!completed) return;
    selectedAlgorithm = target;
  } finally {
    if (token === algorithmTransitionToken) {
      tabs.classList.remove("is-transitioning");
      moveAlgorithmIndicator(selectedAlgorithm);
    }
  }
}

function renderAlgorithmInfo(selected = "bfs") {
  const tabs = $("#algorithm-tabs");
  const detail = $("#algorithm-detail");
  selectedAlgorithm = selected;
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Search algorithms");
  tabs.innerHTML = `<span class="algorithm-tab-indicator" aria-hidden="true"></span>${Object.entries(algorithmInfo).map(([id, info]) => `<button type="button" id="algorithm-tab-${id}" role="tab" aria-controls="algorithm-detail" aria-selected="${id === selected}" data-algo="${id}" class="${id === selected ? "active" : ""}">${info.short}</button>`).join("")}`;
  detail.setAttribute("role", "tabpanel");
  detail.setAttribute("aria-labelledby", `algorithm-tab-${selected}`);
  detail.innerHTML = algorithmDetailMarkup(selected);
  detail.dataset.algorithm = selected;
  $$("button", tabs).forEach((button) => {
    button.addEventListener("click", () => transitionAlgorithmInfo(button.dataset.algo));
    button.addEventListener("keydown", (event) => {
      const currentIndex = algorithmOrder.indexOf(button.dataset.algo);
      const nextIndex = event.key === "ArrowRight" ? Math.min(algorithmOrder.length - 1, currentIndex + 1)
        : event.key === "ArrowLeft" ? Math.max(0, currentIndex - 1)
          : event.key === "Home" ? 0
            : event.key === "End" ? algorithmOrder.length - 1
              : currentIndex;
      if (nextIndex === currentIndex) return;
      event.preventDefault();
      const nextButton = $(`[data-algo="${algorithmOrder[nextIndex]}"]`, tabs);
      nextButton.focus();
      transitionAlgorithmInfo(nextButton.dataset.algo);
    });
  });
  requestAnimationFrame(() => updateAlgorithmSelection(selected));
  window.addEventListener("resize", () => updateAlgorithmSelection(selectedAlgorithm));
}

function navigate(pageId) {
  const target = document.getElementById(pageId) ? pageId : "home";
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === target));
  $$(".main-nav a").forEach((link) => link.classList.toggle("active", link.dataset.page === target));
  $("#main-nav").classList.remove("open");
  $(".nav-toggle").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (target === "learn") requestAnimationFrame(() => updateAlgorithmSelection(selectedAlgorithm));
}

function setupHeroPressurePlate() {
  const board = $(".demo-board");
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!board || !supportsHover || reducedMotion) return;

  let animationFrame = null;
  let bounds = null;

  const updatePlate = (event) => {
    if (!bounds) bounds = board.getBoundingClientRect();
    const pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));

    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      board.classList.add("is-pressure-active");
      board.style.setProperty("--plate-rotate-x", `${(-pointerY * 8).toFixed(2)}deg`);
      board.style.setProperty("--plate-rotate-y", `${(pointerX * 8).toFixed(2)}deg`);
      board.style.setProperty("--plate-shadow-shift-x", `${(-pointerX * 7).toFixed(1)}px`);
      board.style.setProperty("--plate-shadow-shift-y", `${(-pointerY * 7).toFixed(1)}px`);
    });
  };

  const resetPlate = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    bounds = null;
    board.classList.remove("is-pressure-active");
    board.style.setProperty("--plate-rotate-x", "0deg");
    board.style.setProperty("--plate-rotate-y", "0deg");
    board.style.setProperty("--plate-shadow-shift-x", "0px");
    board.style.setProperty("--plate-shadow-shift-y", "0px");
  };

  board.addEventListener("pointerenter", (event) => {
    bounds = board.getBoundingClientRect();
    updatePlate(event);
  });
  board.addEventListener("pointermove", updatePlate);
  board.addEventListener("pointerleave", resetPlate);
  board.addEventListener("pointercancel", resetPlate);
}

function setupSiteMeshShader() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_time;

    float hash21(vec2 point) {
      point = fract(point * vec2(123.34, 345.45));
      point += dot(point, point + 34.345);
      return fract(point.x * point.y);
    }

    float noise(vec2 point) {
      vec2 cell = floor(point);
      vec2 offset = fract(point);
      vec2 curve = offset * offset * (3.0 - 2.0 * offset);
      return mix(
        mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), curve.x),
        mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0, 1.0)), curve.x),
        curve.y
      );
    }

    float fbm(vec2 point) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int octave = 0; octave < 4; octave++) {
        value += amplitude * noise(point);
        point = point * 2.03 + vec2(13.7, 8.4);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 point = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
      float time = u_time * 0.23;

      vec2 drift = vec2(
        fbm(point * 1.35 + vec2(time, -time * 0.42)),
        fbm(point * 1.35 + vec2(5.2 - time * 0.36, 1.3 + time * 0.28))
      ) - 0.5;
      vec2 warped = point + drift * 0.22;

      vec2 centerA = vec2(sin(time * 0.73), cos(time * 0.57)) * 0.48;
      vec2 centerB = vec2(cos(time * 0.43 + 1.8), sin(time * 0.64 + 2.4)) * 0.56;
      float fieldA = exp(-dot(warped - centerA, warped - centerA) * 4.8);
      float fieldB = exp(-dot(warped - centerB, warped - centerB) * 5.6);
      float texture = fbm(warped * 1.9 + time * 0.08);

      vec3 deepNavy = vec3(0.031, 0.047, 0.086);
      vec3 slate = vec3(0.118, 0.161, 0.231);
      vec3 deepTeal = vec3(0.027, 0.278, 0.267);
      vec3 accent = vec3(0.176, 0.831, 0.749);

      vec3 color = mix(deepNavy, slate, 0.38 + texture * 0.32);
      color = mix(color, deepTeal, fieldA * 0.42);
      color = mix(color, accent, fieldB * 0.11);

      float edgeDistance = length(uv - 0.5) * 1.2;
      color *= 1.0 - smoothstep(0.38, 0.82, edgeDistance) * 0.18;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");

  canvas.className = "site-mesh";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  let frame = null;
  let visible = document.visibilityState === "visible";
  let lastDraw = 0;
  const start = performance.now();

  const resizeCanvas = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const rawWidth = Math.max(1, Math.round(document.documentElement.clientWidth * pixelRatio));
    const rawHeight = Math.max(1, Math.round(window.innerHeight * pixelRatio));
    const scale = Math.min(1, Math.sqrt(1_000_000 / Math.max(1, rawWidth * rawHeight)));
    const width = Math.max(1, Math.round(rawWidth * scale));
    const height = Math.max(1, Math.round(rawHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const render = (now) => {
    frame = null;
    if (!visible) return;
    if (now - lastDraw >= 32) {
      lastDraw = now;
      resizeCanvas();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    frame = requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!frame && visible) frame = requestAnimationFrame(render);
  };

  window.addEventListener("resize", () => {
    resizeCanvas();
    requestRender();
  });

  document.addEventListener("visibilitychange", () => {
    visible = document.visibilityState === "visible";
    if (visible) requestRender();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  });

  resizeCanvas();
  requestRender();
}

function setupHeroGravityGrid() {
  const hero = $(".hero-visual");
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || !supportsHover || reducedMotion) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.className = "gravity-grid";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);

  const grid = {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    strength: 0,
    targetStrength: 0,
    frame: null
  };

  const warpPoint = (x, y) => {
    const deltaX = grid.x - x;
    const deltaY = grid.y - y;
    const distance = Math.hypot(deltaX, deltaY);
    const radius = 125;
    if (!grid.strength || distance >= radius || distance < .01) return [x, y];
    const falloff = 1 - distance / radius;
    const pull = 15 * falloff * falloff * grid.strength;
    return [x + deltaX / distance * pull, y + deltaY / distance * pull];
  };

  const drawGrid = () => {
    context.clearRect(0, 0, grid.width, grid.height);
    context.strokeStyle = getComputedStyle(hero).getPropertyValue("--paper-2").trim() || "#edf0ec";
    context.lineWidth = 1;

    const spacing = 32;
    const sample = 10;
    for (let x = 0; x <= grid.width + spacing; x += spacing) {
      context.beginPath();
      for (let y = 0; y <= grid.height + sample; y += sample) {
        const [warpedX, warpedY] = warpPoint(x, y);
        if (y === 0) context.moveTo(warpedX, warpedY);
        else context.lineTo(warpedX, warpedY);
      }
      context.stroke();
    }

    for (let y = 0; y <= grid.height + spacing; y += spacing) {
      context.beginPath();
      for (let x = 0; x <= grid.width + sample; x += sample) {
        const [warpedX, warpedY] = warpPoint(x, y);
        if (x === 0) context.moveTo(warpedX, warpedY);
        else context.lineTo(warpedX, warpedY);
      }
      context.stroke();
    }
  };

  const animateGrid = () => {
    grid.x += (grid.targetX - grid.x) * .18;
    grid.y += (grid.targetY - grid.y) * .18;
    grid.strength += (grid.targetStrength - grid.strength) * .16;
    drawGrid();

    const stillMoving = Math.abs(grid.targetX - grid.x) > .1
      || Math.abs(grid.targetY - grid.y) > .1
      || Math.abs(grid.targetStrength - grid.strength) > .01;
    grid.frame = stillMoving ? requestAnimationFrame(animateGrid) : null;
  };

  const scheduleGrid = () => {
    if (!grid.frame) grid.frame = requestAnimationFrame(animateGrid);
  };

  const releaseGrid = () => {
    grid.targetStrength = 0;
    scheduleGrid();
  };

  const resizeGrid = () => {
    const bounds = hero.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    grid.width = bounds.width;
    grid.height = bounds.height;
    canvas.width = Math.max(1, Math.round(grid.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(grid.height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawGrid();
    hero.classList.add("gravity-grid-ready");
  };

  hero.addEventListener("pointermove", (event) => {
    if (event.target.closest(".demo-board, .trace-header, .trace-route, .trace-meta")) {
      releaseGrid();
      return;
    }

    const bounds = hero.getBoundingClientRect();
    grid.targetX = event.clientX - bounds.left;
    grid.targetY = event.clientY - bounds.top;
    if (!grid.strength) {
      grid.x = grid.targetX;
      grid.y = grid.targetY;
    }
    grid.targetStrength = 1;
    scheduleGrid();
  });
  hero.addEventListener("pointerleave", releaseGrid);
  hero.addEventListener("pointercancel", releaseGrid);

  const resizeObserver = new ResizeObserver(resizeGrid);
  resizeObserver.observe(hero);
  resizeGrid();
}

function initialize() {
  buildInputs(elements.initialInput, DEFAULT_INITIAL);
  buildInputs(elements.goalInput, DEFAULT_GOAL);
  updateStaticBoards();
  updateAlgorithmFields();
  renderAlgorithmInfo();
  setupControlPanelScroll();
  setupHeroPressurePlate();
  setupSiteMeshShader();
  setupHeroGravityGrid();
  navigate(location.hash.slice(1) || "home");

  $$('[data-page]').forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault(); location.hash = link.dataset.page;
  }));
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));
  $(".nav-toggle").addEventListener("click", (event) => {
    const open = $("#main-nav").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open));
  });
  elements.algorithm.addEventListener("change", updateAlgorithmFields);
  $("#run-btn").addEventListener("click", runSearch);
  $("#randomize-btn").addEventListener("click", () => {
    const goal = readState(elements.goalInput);
    if (validateState(goal)) { showNotice(validateState(goal)); return; }
    const random = randomSolvableState(goal, 14 + Math.floor(Math.random() * 9));
    writeState(elements.initialInput, random); result = null; clearNotice(); updateStaticBoards();
  });
  $("#swap-btn").addEventListener("click", () => {
    const initial = readState(elements.initialInput); const goal = readState(elements.goalInput);
    writeState(elements.initialInput, goal); writeState(elements.goalInput, initial); result = null; updateStaticBoards();
  });
  elements.play.addEventListener("click", togglePlayback);
  $("#prev-btn").addEventListener("click", () => { stopPlayback(); playbackIndex = Math.max(0, playbackIndex - 1); renderEvent(playbackEvents[playbackIndex]); setStatus("Paused", "idle"); });
  $("#next-btn").addEventListener("click", () => { stopPlayback(); playbackIndex = Math.min(playbackEvents.length - 1, playbackIndex + 1); renderEvent(playbackEvents[playbackIndex]); setStatus("Paused", "idle"); });
  $("#reset-btn").addEventListener("click", () => { stopPlayback(); playbackIndex = 0; if (playbackEvents.length) renderEvent(playbackEvents[0]); setStatus("Ready", "idle"); });
  elements.animateSolution.addEventListener("click", openSolutionPlayer);
  elements.solutionPlay.addEventListener("click", () => {
    if (solutionPlaying) stopSolutionPlayback();
    else playSolution();
  });
  $("#solution-prev-btn").addEventListener("click", () => { stopSolutionPlayback(); renderSolutionStep(solutionIndex - 1); });
  $("#solution-next-btn").addEventListener("click", () => { stopSolutionPlayback(); renderSolutionStep(solutionIndex + 1); });
  $("#solution-restart-btn").addEventListener("click", () => { stopSolutionPlayback(); playSolution({ restart: true }); });
  elements.solutionSpeed.addEventListener("change", () => {
    if (!solutionPlaying) return;
    if (solutionTimer) clearTimeout(solutionTimer);
    scheduleSolutionStep();
  });
  elements.compareButton.addEventListener("click", runComparison);
  $$(".student-strip dd").forEach((field, index) => {
    const stored = localStorage.getItem(`puzzle-student-${index}`); if (stored) field.textContent = stored;
    field.addEventListener("blur", () => localStorage.setItem(`puzzle-student-${index}`, field.textContent.trim()));
  });
}

initialize();
