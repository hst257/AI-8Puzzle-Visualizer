# Algorithm notes

## State representation

Each puzzle is represented as a nine-element array in row-major order. The integer `0` represents the blank. A compact string serialization is used as the key in visited-state maps and sets.

## Legal moves

The successor function locates the blank and swaps it with an adjacent numbered tile. Depending on its position, the blank may move up, left, down, or right. Every move has a path cost of one.

## Solvability

For a 3 × 3 puzzle, the parity of the tile permutation relative to the selected goal is invariant. The application maps each initial tile to its position in the goal order and counts inversions. An even count is solvable; an odd count is not. This works even when the selected goal is not the conventional `1 2 3 / 4 5 6 / 7 8 _` layout.

## Search strategies

### BFS

Uses a FIFO queue and a visited set. It is complete and optimal for unit step costs, but the frontier can occupy substantial memory.

### DFS

Uses a LIFO stack and repeated-state checking. It uses less frontier memory but does not guarantee the shortest solution.

### DLS

Uses a LIFO stack and refuses to generate successors at the configured depth limit. Failure is reported as a cutoff when deeper nodes may exist.

### IDDLS

Runs DLS at successive limits from zero through the configured maximum. It is complete and optimal for unit step costs when the maximum is at least the shallowest goal depth.

### GBFS

Uses a minimum-priority queue ordered by `h(n)`. It is goal-directed but ignores the path cost already incurred, so it is not optimal.

### A*

Uses a minimum-priority queue ordered by `f(n) = g(n) + h(n)`. Both included heuristics are admissible for this problem, so A* returns an optimal path.

## Heuristics

`Misplaced tiles` counts numbered tiles not in their goal cells. `Manhattan distance` sums how many orthogonal grid steps each numbered tile is from its goal cell. The blank is excluded from both scores.

## Safety limit

Each search run is capped at 200,000 expansions. The entire reachable component of a 3 × 3 puzzle contains 181,440 states, so the cap permits exhaustive graph searches while guarding against accidental implementation regressions.
