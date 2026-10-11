import { evaluate, LINES, TARGETS } from './logic.js';

export function legalMoves(board) {
  const used = new Set(board);
  return board.flatMap((cell, index) => cell === null
    ? Array.from({length:9}, (_, i) => i + 1).filter(n => !used.has(n)).map(number => ({index, number}))
    : []);
}

function outcome(status, player, ply) {
  if (status === 'playing') return null;
  if (status === 'draw') return 0;
  return status === `player${player}` ? 10000 - ply : -10000 + ply;
}

function potential(board, player) {
  const available = Array.from({length:9}, (_, i) => i + 1).filter(n => !board.includes(n));
  let score = 0;
  for (const line of LINES) {
    const values = line.map(i => board[i]);
    const blanks = values.filter(n => n === null).length;
    const sum = values.reduce((total, n) => total + (n ?? 0), 0);
    if (blanks === 1 && available.includes(TARGETS[player] - sum)) score += 30;
    if (blanks === 2 && available.some((a, i) => available.slice(i + 1).some(b => sum + a + b === TARGETS[player]))) score += 3;
  }
  return score;
}

function heuristic(board, player) {
  return potential(board, player) - potential(board, 3 - player);
}

function children(board, player, computer, ply) {
  return legalMoves(board).map(action => {
    const next = [...board]; next[action.index] = action.number;
    const status = evaluate(next).status;
    return {action, board:next, status, estimate:outcome(status, computer, ply) ?? heuristic(next, computer)};
  }).sort((a,b) => player === computer ? b.estimate - a.estimate : a.estimate - b.estimate);
}

// Iterative deepening completes a whole search depth before replacing its answer.
// The node budget bounds work; the browser runs this in a worker to keep controls responsive.
export function chooseComputerMove(game, difficulty = 'medium', random = Math.random) {
  if (game.status !== 'playing') return null;
  const actions = legalMoves(game.board);
  if (!actions.length) return null;
  if (difficulty === 'easy') return actions[Math.min(actions.length - 1, Math.floor(Math.max(0, random()) * actions.length))];
  const computer = game.turn;
  const options = children(game.board, computer, computer, 1);
  const immediate = options.find(child => child.status === `player${computer}`);
  if (immediate) return immediate.action;
  let best = options[0].action;
  const maxDepth = difficulty === 'hard' ? 4 : 2;
  const budget = difficulty === 'hard' ? 80000 : 6000;
  let nodes = 0;
  const exhausted = Symbol('search budget');
  function search(board, status, turn, depth, alpha, beta, ply) {
    if (++nodes > budget) throw exhausted;
    const terminal = outcome(status, computer, ply);
    if (terminal !== null) return terminal;
    if (!depth) return heuristic(board, computer);
    let value = turn === computer ? -Infinity : Infinity;
    for (const child of children(board, turn, computer, ply + 1)) {
      const score = search(child.board, child.status, 3 - turn, depth - 1, alpha, beta, ply + 1);
      if (turn === computer) { value = Math.max(value, score); alpha = Math.max(alpha, value); }
      else { value = Math.min(value, score); beta = Math.min(beta, value); }
      if (beta <= alpha) break;
    }
    return value;
  }
  for (let depth = 1; depth <= maxDepth; depth++) {
    let iterationBest = best, score = -Infinity;
    try {
      for (const child of options) {
        const candidate = search(child.board, child.status, 3 - computer, depth - 1, score, Infinity, 1);
        if (candidate > score) {score = candidate; iterationBest = child.action;}
      }
      best = iterationBest;
    } catch (error) {
      if (error !== exhausted) throw error;
      break;
    }
  }
  return best;
}
