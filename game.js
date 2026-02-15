const GRID_SIZE = 12;
const WORD_POOL = [
  'JAVASCRIPT',
  'BROWSER',
  'CANVAS',
  'PUZZLE',
  'BUTTON',
  'CODING',
  'LOGIC',
  'RANDOM',
  'MOUSE',
  'SCRIPT',
  'LETTER',
  'SEARCH'
];

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const gridEl = document.getElementById('grid');
const wordListEl = document.getElementById('word-list');
const statusEl = document.getElementById('status');
const newGameBtn = document.getElementById('new-game');
const hintBtn = document.getElementById('hint');
const resetBtn = document.getElementById('reset');

let state = null;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(arr) {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function makeEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
}

function createGameData() {
  const selectedWords = shuffle(WORD_POOL).slice(0, 10);
  const grid = makeEmptyGrid();
  const placements = new Map();

  for (const word of selectedWords) {
    let placed = false;
    for (let tries = 0; tries < 250 && !placed; tries += 1) {
      const [dx, dy] = DIRECTIONS[randomInt(DIRECTIONS.length)];
      const startRow = randomInt(GRID_SIZE);
      const startCol = randomInt(GRID_SIZE);

      const cells = [];
      for (let i = 0; i < word.length; i += 1) {
        const row = startRow + dx * i;
        const col = startCol + dy * i;
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
          cells.length = 0;
          break;
        }

        const current = grid[row][col];
        if (current !== '' && current !== word[i]) {
          cells.length = 0;
          break;
        }

        cells.push({ row, col });
      }

      if (!cells.length) {
        continue;
      }

      cells.forEach(({ row, col }, index) => {
        grid[row][col] = word[index];
      });

      placements.set(word, cells);
      placed = true;
    }

    if (!placed) {
      return createGameData();
    }
  }

  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + randomInt(26));
      }
    }
  }

  return {
    grid,
    words: selectedWords,
    placements,
    foundWords: new Set(),
    highlighted: new Set(),
    selecting: false,
    selectionStart: null,
    selectionCells: []
  };
}

function keyForCell(row, col) {
  return `${row}:${col}`;
}

function renderGrid() {
  gridEl.innerHTML = '';

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = state.grid[row][col];
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      if (state.highlighted.has(keyForCell(row, col))) {
        cell.classList.add('found');
      }

      gridEl.appendChild(cell);
    }
  }
}

function renderWordList() {
  wordListEl.innerHTML = '';
  state.words.forEach((word) => {
    const li = document.createElement('li');
    li.textContent = word;
    li.dataset.word = word;
    if (state.foundWords.has(word)) {
      li.classList.add('found');
    }
    wordListEl.appendChild(li);
  });
}

function setStatus(message) {
  statusEl.textContent = message;
}

function resetGameSelection() {
  state.selecting = false;
  state.selectionStart = null;
  state.selectionCells = [];
  gridEl.querySelectorAll('.cell.selected').forEach((cell) => {
    cell.classList.remove('selected');
  });
}

function getCellElement(row, col) {
  return gridEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function applySelectionPreview(cells) {
  gridEl.querySelectorAll('.cell.selected').forEach((cell) => cell.classList.remove('selected'));
  cells.forEach(({ row, col }) => {
    const cell = getCellElement(row, col);
    if (cell) {
      cell.classList.add('selected');
    }
  });
}

function lineCells(start, end) {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  const absR = Math.abs(dr);
  const absC = Math.abs(dc);

  const isStraight = dr === 0 || dc === 0 || absR === absC;
  if (!isStraight) {
    return [];
  }

  const stepR = dr === 0 ? 0 : dr / absR;
  const stepC = dc === 0 ? 0 : dc / absC;
  const length = Math.max(absR, absC) + 1;

  const result = [];
  for (let i = 0; i < length; i += 1) {
    result.push({
      row: start.row + stepR * i,
      col: start.col + stepC * i
    });
  }

  return result;
}

function wordFromCells(cells) {
  return cells.map(({ row, col }) => state.grid[row][col]).join('');
}

function markFoundWord(word) {
  const cells = state.placements.get(word);
  if (!cells) {
    return;
  }

  state.foundWords.add(word);
  cells.forEach(({ row, col }) => {
    state.highlighted.add(keyForCell(row, col));
    const cell = getCellElement(row, col);
    if (cell) {
      cell.classList.add('found');
    }
  });

  const li = wordListEl.querySelector(`li[data-word="${word}"]`);
  if (li) {
    li.classList.add('found');
  }

  const allFound = state.foundWords.size === state.words.length;
  if (allFound) {
    setStatus('🎉 Поздравляем! Вы нашли все слова.');
  } else {
    setStatus(`Найдено слов: ${state.foundWords.size} / ${state.words.length}`);
  }
}

function tryFinalizeSelection() {
  if (!state.selectionCells.length) {
    return;
  }

  const word = wordFromCells(state.selectionCells);
  const reversed = word.split('').reverse().join('');

  const matched = state.words.find((candidate) => {
    if (state.foundWords.has(candidate)) {
      return false;
    }
    return candidate === word || candidate === reversed;
  });

  if (matched) {
    markFoundWord(matched);
  }
}

function parseCellTarget(target) {
  const cell = target.closest('.cell');
  if (!cell) {
    return null;
  }
  return {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col)
  };
}

function handlePointerDown(event) {
  const point = parseCellTarget(event.target);
  if (!point) {
    return;
  }

  state.selecting = true;
  state.selectionStart = point;
  state.selectionCells = [point];
  applySelectionPreview(state.selectionCells);
}

function handlePointerMove(event) {
  if (!state.selecting || !state.selectionStart) {
    return;
  }

  const point = parseCellTarget(event.target);
  if (!point) {
    return;
  }

  const cells = lineCells(state.selectionStart, point);
  if (!cells.length) {
    return;
  }

  state.selectionCells = cells;
  applySelectionPreview(cells);
}

function handlePointerUp() {
  if (!state.selecting) {
    return;
  }

  tryFinalizeSelection();
  resetGameSelection();
}

function resetFoundOnly() {
  state.foundWords.clear();
  state.highlighted.clear();
  renderGrid();
  renderWordList();
  setStatus('Прогресс сброшен. Ищите слова снова!');
}

function showHint() {
  const targetWord = state.words.find((word) => !state.foundWords.has(word));
  if (!targetWord) {
    setStatus('Все слова уже найдены!');
    return;
  }

  const cells = state.placements.get(targetWord) || [];
  const hintCells = [];
  cells.forEach(({ row, col }) => {
    const cell = getCellElement(row, col);
    if (cell) {
      cell.classList.add('hint');
      hintCells.push(cell);
    }
  });

  setStatus(`Подсказка: ищите слово «${targetWord}»`);

  window.setTimeout(() => {
    hintCells.forEach((cell) => cell.classList.remove('hint'));
  }, 1000);
}

function startNewGame() {
  state = createGameData();
  renderGrid();
  renderWordList();
  setStatus(`Найдите все слова: 0 / ${state.words.length}`);
  resetGameSelection();
}

gridEl.addEventListener('pointerdown', handlePointerDown);
gridEl.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);
newGameBtn.addEventListener('click', startNewGame);
resetBtn.addEventListener('click', resetFoundOnly);
hintBtn.addEventListener('click', showHint);

startNewGame();
