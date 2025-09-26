// 狀態
const state = {
  originalList: [],
  pool: [],
  drawn: [],
  removed: [],
  current: null,
  allowRepeat: false,
  physicsTimer: null,
  balls: [],
  boostTimer: null,
  baseSpeed: 2.2,
  boostSpeed: 5.5,
  isSpinning: false,
};

// 元件
const els = {
  setupPanel: document.getElementById('setupPanel'),
  namesInput: document.getElementById('namesInput'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  csvInput: document.getElementById('csvInput'),
  startBtn: document.getElementById('startBtn'),
  minHint: document.getElementById('minHint'),
  currentCount: document.getElementById('currentCount'),

  lotteryPanel: document.getElementById('lotteryPanel'),
  balls: document.getElementById('balls'),
  selectedDisplay: document.getElementById('selectedDisplay'),
  keepBtn: document.getElementById('keepBtn'),
  removeBtn: document.getElementById('removeBtn'),
  drawNextBtn: document.getElementById('drawNextBtn'),
  resetBtn: document.getElementById('resetBtn'),

  totalCount: document.getElementById('totalCount'),
  remainingCount: document.getElementById('remainingCount'),
  drawnCount: document.getElementById('drawnCount'),
  removedCount: document.getElementById('removedCount'),

  allowRepeat: document.getElementById('allowRepeat'),
};

function normalizeNames(raw) {
  if (!raw) return [];
  const tokens = raw
    .split(/[\n,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
  // 去重，保留原始順序
  const seen = new Set();
  const unique = [];
  for (const t of tokens) {
    if (!seen.has(t)) { seen.add(t); unique.push(t); }
  }
  return unique;
}

function updateSetupCount() {
  const list = normalizeNames(els.namesInput.value);
  els.currentCount.textContent = String(list.length);
  els.startBtn.disabled = list.length < 1;
}

function loadSample(count = 20) {
  const arr = Array.from({ length: count }, (_, i) => `參與者_${String(i + 1).padStart(3, '0')}`);
  els.namesInput.value = arr.join('\n');
  updateSetupCount();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function initPool(list) {
  state.originalList = [...list];
  state.pool = shuffle([...list]);
  state.drawn = [];
  state.removed = [];
  state.current = null;
  updateStats();
}

function updateStats() {
  els.totalCount.textContent = String(state.originalList.length);
  els.remainingCount.textContent = String(state.pool.length);
  els.drawnCount.textContent = String(state.drawn.length);
  els.removedCount.textContent = String(state.removed.length);
}

function createBalls(count) {
  els.balls.innerHTML = '';
  state.balls = [];
  const width = els.balls.clientWidth || 800;
  const height = els.balls.clientHeight || 360;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'ball';
    el.style.left = Math.random() * (width - 40) + 'px';
    el.style.top = Math.random() * (height - 40) + 'px';
    el.textContent = String(i + 1);
    els.balls.appendChild(el);
    state.balls.push({ el, vx: (Math.random() - 0.5) * state.baseSpeed, vy: (Math.random() - 0.5) * state.baseSpeed });
  }
}

function startPhysics() {
  stopPhysics();
  const width = els.balls.clientWidth || 800;
  const height = els.balls.clientHeight || 360;
  state.physicsTimer = setInterval(() => {
    for (const b of state.balls) {
      const rect = b.el.getBoundingClientRect();
      let x = parseFloat(b.el.style.left);
      let y = parseFloat(b.el.style.top);
      x += b.vx; y += b.vy;
      if (x <= 0 || x >= width - 40) b.vx *= -1;
      if (y <= 0 || y >= height - 40) b.vy *= -1;
      b.el.style.left = Math.max(0, Math.min(width - 40, x)) + 'px';
      b.el.style.top = Math.max(0, Math.min(height - 40, y)) + 'px';
    }
  }, 16);
}

function stopPhysics() {
  if (state.physicsTimer) {
    clearInterval(state.physicsTimer);
    state.physicsTimer = null;
  }
}

function drawOne() {
  if (state.pool.length === 0) {
    els.selectedDisplay.textContent = '已無可抽人員';
    disableActionButtons(true);
    els.drawNextBtn.disabled = true;
    return null;
  }
  // 抽取流程：先加速球體，滾動顯示候選名稱，最後定格
  startBoost();
  spinName(() => {
    const index = Math.floor(Math.random() * state.pool.length);
    const name = state.pool[index];
    state.current = name;
    els.selectedDisplay.textContent = name;
    els.selectedDisplay.classList.add('spin');
    setTimeout(() => els.selectedDisplay.classList.remove('spin'), 700);
    disableActionButtons(false);
    els.drawNextBtn.disabled = true;
    stopBoost();
  });
  return true;
}

function disableActionButtons(disabled) {
  els.keepBtn.disabled = disabled;
  els.removeBtn.disabled = disabled;
}

function commitKeep() {
  // 保留：將此名加入已抽清單，但可選擇是否從池中移除
  if (!state.current) return;
  state.drawn.push(state.current);
  if (!state.allowRepeat) {
    state.pool = state.pool.filter(n => n !== state.current);
  }
  state.current = null;
  updateStats();
  disableActionButtons(true);
  els.drawNextBtn.disabled = false;
}

function commitRemove() {
  if (!state.current) return;
  state.removed.push(state.current);
  state.pool = state.pool.filter(n => n !== state.current);
  state.current = null;
  updateStats();
  disableActionButtons(true);
  els.drawNextBtn.disabled = false;
}

function triggerNext() {
  els.drawNextBtn.disabled = true;
  drawOne();
  updateStats();
}

function start() {
  const list = normalizeNames(els.namesInput.value);
  if (list.length === 0) {
    alert('請至少提供 1 位參與者');
    return;
  }
  initPool(list);
  els.setupPanel.classList.add('hidden');
  els.lotteryPanel.classList.remove('hidden');
  createBalls(list.length);
  startPhysics();
  // 首次不自動抽，等待使用者按下「抽下一位」
  disableActionButtons(true);
  els.drawNextBtn.disabled = false;
  els.selectedDisplay.textContent = '按下「抽下一位」開始';
}

function resetAll() {
  stopPhysics();
  state.originalList = [];
  state.pool = [];
  state.drawn = [];
  state.removed = [];
  state.current = null;
  els.balls.innerHTML = '';
  els.selectedDisplay.textContent = '準備中...';
  els.lotteryPanel.classList.add('hidden');
  els.setupPanel.classList.remove('hidden');
  updateSetupCount();
}

// 綁定事件
els.namesInput.addEventListener('input', updateSetupCount);
els.loadSampleBtn.addEventListener('click', () => loadSample(20));
els.csvInput.addEventListener('change', handleCsvFile);
els.startBtn.addEventListener('click', start);
els.keepBtn.addEventListener('click', commitKeep);
els.removeBtn.addEventListener('click', commitRemove);
els.drawNextBtn.addEventListener('click', triggerNext);
els.resetBtn.addEventListener('click', resetAll);
els.allowRepeat.addEventListener('change', (e) => { state.allowRepeat = e.target.checked; });

// 初始
updateSetupCount();

// 加速控制：抽取期間提升速度，結束恢復
function startBoost() {
  if (state.isSpinning) return;
  state.isSpinning = true;
  for (const b of state.balls) {
    const speed = state.boostSpeed / Math.max(0.6, Math.random() + 0.4);
    const dirX = Math.sign(b.vx) || (Math.random() > 0.5 ? 1 : -1);
    const dirY = Math.sign(b.vy) || (Math.random() > 0.5 ? 1 : -1);
    b.vx = dirX * speed * Math.random();
    b.vy = dirY * speed * Math.random();
  }
}

function stopBoost() {
  setTimeout(() => {
    for (const b of state.balls) {
      const speed = state.baseSpeed / Math.max(0.6, Math.random() + 0.4);
      const dirX = Math.sign(b.vx) || (Math.random() > 0.5 ? 1 : -1);
      const dirY = Math.sign(b.vy) || (Math.random() > 0.5 ? 1 : -1);
      b.vx = dirX * speed * Math.random();
      b.vy = dirY * speed * Math.random();
    }
    state.isSpinning = false;
  }, 800);
}

// 名稱滾動動畫：在最終決定前快速閃動幾個名字
function spinName(onDone) {
  const spanMs = 60;
  const cycles = Math.min(18, 6 + Math.floor(Math.random() * 12));
  let t = 0;
  const tempPool = state.pool.length ? state.pool : state.originalList;
  const timer = setInterval(() => {
    const idx = Math.floor(Math.random() * tempPool.length);
    els.selectedDisplay.textContent = tempPool[idx];
    t++;
    if (t >= cycles) {
      clearInterval(timer);
      onDone();
    }
  }, spanMs);
}

// 解析 CSV 並抓取 Student ID 欄位
async function handleCsvFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const ids = parseCsvForStudentIds(text);
    if (ids.length === 0) {
      alert('CSV 未找到學號 (Student ID) 欄位或沒有有效資料');
      return;
    }
    els.namesInput.value = ids.join('\n');
    updateSetupCount();
  } catch (err) {
    console.error(err);
    alert('讀取 CSV 失敗');
  } finally {
    e.target.value = '';
  }
}

function parseCsvForStudentIds(csvText) {
  // 簡易 CSV 解析：支援含逗號與引號的欄位
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < csvText.length) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { pushField(); }
      else if (ch === '\n' || ch === '\r') {
        // 處理 CRLF 或 LF
        if (ch === '\r' && csvText[i + 1] === '\n') i++;
        pushField(); pushRow();
      } else { field += ch; }
    }
    i++;
  }
  // 收尾
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
  if (rows.length === 0) return [];
  // 找 header 中的 Student ID 欄位索引（大小寫不敏感）
  const header = rows[0].map(h => h.trim());
  let idIdx = header.findIndex(h => h.toLowerCase() === 'student id' || h.toLowerCase() === 'student_id');
  if (idIdx === -1) {
    // 兼容常見變體（中文或常見拼寫）
    const lower = header.map(h => h.toLowerCase());
    idIdx = lower.findIndex(h => ['學號','學號(student id)','學號 (student id)','sid','id'].includes(h));
  }
  const ids = [];
  const pushIfMatch = (text) => {
    if (!text) return;
    // 偵測格式：一個英文字母 + 7 位數字，如 D1345490
    const regex = /\b[A-Za-z][0-9]{7}\b/g;
    const matches = String(text).match(regex);
    if (matches) {
      for (const m of matches) ids.push(m.toUpperCase());
    }
  };
  if (idIdx !== -1) {
    for (let r = 1; r < rows.length; r++) {
      const val = (rows[r][idIdx] || '').trim();
      // 欄位值可能包含其他字，使用規則擷取
      pushIfMatch(val);
    }
  } else {
    // 沒有標題或找不到欄位：全表掃描所有儲存格
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        pushIfMatch((rows[r][c] || '').trim());
      }
    }
  }
  // 去重
  const seen = new Set();
  const unique = [];
  for (const n of ids) { if (!seen.has(n)) { seen.add(n); unique.push(n); } }
  return unique;
}


