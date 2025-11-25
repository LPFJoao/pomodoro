// ===== Elements
const $ = (s) => document.querySelector(s);
const modeEl = $("#mode"),
  timeEl = $("#time"),
  arc = $("#arc");
const startBtn = $("#start"),
  pauseBtn = $("#pause"),
  resetBtn = $("#reset"),
  skipBtn = $("#skip");
const statusEl = $("#status");
const taskSel = $("#taskSel"),
  taskForm = $("#taskForm"),
  taskInput = $("#taskInput"),
  taskList = $("#taskList");
const todayTimeEl = $("#todayTime"),
  totalPomsEl = $("#totalPoms"),
  chart = $("#chart");
const btnSettings = $("#btnSettings"),
  btnExport = $("#btnExport"),
  dlg = $("#dlg");
const sWork = $("#sWork"),
  sShort = $("#sShort"),
  sLong = $("#sLong"),
  sCycles = $("#sCycles");
const sAutoStartWork = $("#sAutoStartWork"),
  sAutoStartBreak = $("#sAutoStartBreak"),
  sSound = $("#sSound"),
  sNotify = $("#sNotify");
const beep = $("#beep");
const cycleInfo = $("#cycleInfo"),
  pomCountEl = $("#pomCount");

// ===== State
const DEF = {
  work: 25,
  short: 5,
  long: 15,
  cycles: 4,
  autoWork: false,
  autoBreak: true,
  sound: true,
  notify: false
};
let S = loadSettings();
let tasks = loadTasks();
let log = loadLog();
let timer = null;
let phase = "work"; // 'work' | 'short' | 'long'
let remaining = S.work * 60;
let running = false;
let cycle = 0; // number of completed works since last long break
let totalPoms = log.totalPoms || 0;
setupAudio();

// ===== Init UI
syncSettingsUI();
renderTasks();
fillTaskSelect();
updatePhaseUI();
updateStats();
drawChart();

// ===== Timer Logic
function start() {
  if (running) return;
  running = true;
  statusEl.textContent = "Running";
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  tick();
  timer = setInterval(tick, 1000);
}
function pause() {
  if (!running) return;
  running = false;
  statusEl.textContent = "Paused";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  clearInterval(timer);
  timer = null;
}
function reset() {
  running = false;
  clearInterval(timer);
  timer = null;
  statusEl.textContent = "Idle";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  remaining = getPhaseMinutes() * 60;
  drawTime();
}
function skip() {
  completePhase(/*skipped*/ true);
}
function tick() {
  remaining = Math.max(0, remaining - 1);
  drawTime();
  if (remaining === 0) {
    completePhase(false);
  }
}
function completePhase(skipped) {
  pause();
  if (!skipped) {
    onPhaseEnd();
  }
  // switch phase
  if (phase === "work") {
    cycle++;
    if (cycle >= S.cycles) {
      phase = "long";
      cycle = 0;
    } else phase = "short";
  } else {
    phase = "work";
  }
  remaining = getPhaseMinutes() * 60;
  updatePhaseUI();
  if ((phase === "work" && S.autoWork) || (phase !== "work" && S.autoBreak))
    start();
}
function getPhaseMinutes() {
  return phase === "work" ? S.work : phase === "short" ? S.short : S.long;
}
function updatePhaseUI() {
  modeEl.textContent =
    phase === "work"
      ? "Work"
      : phase === "short"
      ? "Short Break"
      : "Long Break";
  cycleInfo.textContent = `Cycle ${cycle} / ${S.cycles}`;
  drawTime();
}
function drawTime() {
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  timeEl.textContent = `${mm}:${ss}`;
  // ring progress
  const total = getPhaseMinutes() * 60;
  const pct = 1 - remaining / total;
  const C = 2 * Math.PI * 54; // stroke dasharray in CSS
  arc.style.strokeDasharray = C;
  arc.style.strokeDashoffset = C * (1 - pct);
}

// ===== Phase end side-effects
function onPhaseEnd() {
  // sound
  if (S.sound) {
    playBeep();
  }
  // notify
  if (S.notify && "Notification" in window) {
    if (Notification.permission === "granted") {
      const title = phase === "work" ? "Work finished!" : "Break finished!";
      const next =
        phase === "work"
          ? cycle + 1 >= S.cycles
            ? "Long break"
            : "Short break"
          : "Work";
      new Notification(title, { body: `Next: ${next}` });
    }
  }
  // logging
  if (phase === "work") {
    // +1 pomodoro on current task
    const id = taskSel.value;
    const t = tasks.find((t) => String(t.id) === id);
    if (t) {
      t.poms = (t.poms || 0) + 1;
      saveTasks();
      renderTasks();
    }
    totalPoms++;
    log.totalPoms = totalPoms;
    // add minutes to today
    addMinutesToLog(S.work);
    updateStats();
    drawChart();
    pomCountEl.textContent = `${totalPoms} pomodoros`;
  }
}

// ===== Data & Storage
function loadSettings() {
  try {
    return {
      ...DEF,
      ...JSON.parse(localStorage.getItem("pomo_settings_v1") || "{}")
    };
  } catch {
    return { ...DEF };
  }
}
function saveSettings() {
  localStorage.setItem("pomo_settings_v1", JSON.stringify(S));
}
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem("pomo_tasks_v1") || "[]");
  } catch {
    return [];
  }
}
function saveTasks() {
  localStorage.setItem("pomo_tasks_v1", JSON.stringify(tasks));
}
function loadLog() {
  try {
    return JSON.parse(localStorage.getItem("pomo_log_v1") || "{}");
  } catch {
    return {};
  }
}
function saveLog() {
  localStorage.setItem("pomo_log_v1", JSON.stringify(log));
}
function addMinutesToLog(min) {
  const k = todayKey();
  log[k] = (log[k] || 0) + min;
  saveLog();
}
function todayKey(d = new Date()) {
  const yyyy = d.getFullYear(),
    mm = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ===== Tasks UI
function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach((t) => {
    const li = $("#taskTpl").content.firstElementChild.cloneNode(true);
    li.dataset.id = t.id;
    li.querySelector(".name").textContent = t.name;
    li.querySelector(".chk").checked = !!t.done;
    li.querySelector(".poms").textContent = t.poms || 0;
    li.querySelector(".chk").addEventListener("change", (e) => {
      t.done = e.target.checked;
      saveTasks();
      renderTasks();
      fillTaskSelect();
    });
    li.querySelector(".del").addEventListener("click", () => {
      const i = tasks.findIndex((x) => x.id === t.id);
      tasks.splice(i, 1);
      saveTasks();
      renderTasks();
      fillTaskSelect();
    });
    taskList.appendChild(li);
  });
  pomCountEl.textContent = `${totalPoms} pomodoros`;
}
function fillTaskSelect() {
  taskSel.innerHTML =
    tasks.map((t) => `<option value="${t.id}">${t.name}</option>`).join("") ||
    '<option value="">(No task)</option>';
  if (tasks.length && !taskSel.value) taskSel.value = tasks[0].id;
}
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = taskInput.value.trim();
  if (!name) return;
  tasks.unshift({ id: Date.now(), name, done: false, poms: 0 });
  taskInput.value = "";
  saveTasks();
  renderTasks();
  fillTaskSelect();
});

// ===== Settings
btnSettings.addEventListener("click", () => dlg.showModal());
$("#closeDlg").addEventListener("click", (e) => dlg.close());
$("#saveDlg").addEventListener("click", (e) => {
  e.preventDefault();
  S.work = clamp(+sWork.value, 1, 120);
  S.short = clamp(+sShort.value, 1, 60);
  S.long = clamp(+sLong.value, 1, 60);
  S.cycles = clamp(+sCycles.value, 2, 12);
  S.autoWork = !!sAutoStartWork.checked;
  S.autoBreak = !!sAutoStartBreak.checked;
  S.sound = !!sSound.checked;
  S.notify = !!sNotify.checked;
  saveSettings();
  if (!running) {
    remaining = getPhaseMinutes() * 60;
    drawTime();
  }
  dlg.close();
});
function syncSettingsUI() {
  sWork.value = S.work;
  sShort.value = S.short;
  sLong.value = S.long;
  sCycles.value = S.cycles;
  sAutoStartWork.checked = S.autoWork;
  sAutoStartBreak.checked = S.autoBreak;
  sSound.checked = S.sound;
  sNotify.checked = S.notify;
  if (
    S.notify &&
    "Notification" in window &&
    Notification.permission !== "granted"
  ) {
    Notification.requestPermission();
  }
}
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

// ===== Stats & Chart
function updateStats() {
  const today = log[todayKey()] || 0;
  todayTimeEl.textContent = today ? `${today}m` : "0m";
  totalPomsEl.textContent = totalPoms;
}
function drawChart() {
  const ctx = chart.getContext("2d");
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const w = chart.clientWidth || 300,
    h = chart.height;
  chart.width = Math.floor(w * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // last 7 days keys
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  const values = days.map((k) => log[k] || 0);
  const max = Math.max(60, ...values); // at least 1h scale
  const barW = (w - 16) / values.length - 6;

  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(0, h - 0.5, w, 1);

  values.forEach((v, i) => {
    const x = 8 + i * (barW + 6);
    const bh = (v / max) * (h - 20);
    ctx.fillStyle = "rgba(56,189,248,0.22)";
    ctx.fillRect(x, h - bh - 12, barW, bh);
    ctx.fillStyle = "#cfe7ff";
    ctx.font = "10px ui-monospace,monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(v || ""), x + barW / 2, h - 2);
  });
}

// ===== Export CSV
btnExport.addEventListener("click", () => {
  const rows = [["date", "minutes"]];
  const keys = Object.keys(log)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort();
  keys.forEach((k) => rows.push([k, log[k]]));
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pomodoro_log.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ===== Beep (Web Audio), fallback to tiny noise if locked
function setupAudio() {
  try {
    // generate a short beep WAV in-memory (Base64) to avoid CORS
    const wav = genBeepWav({ freq: 880, ms: 180 });
    beep.src = wav;
  } catch {}
}
function playBeep() {
  if (!S.sound) return;
  const p = beep.play();
  if (p && p.catch)
    p.catch(() => {
      /* ignore autoplay lock */
    });
}
function genBeepWav({ freq = 880, ms = 180 } = {}) {
  // very small PCM u8 mono 8kHz
  const sampleRate = 8000,
    samples = Math.floor(sampleRate * (ms / 1000));
  const data = new Uint8Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-3 * t); // decay
    data[i] = Math.max(0, Math.min(255, 128 + Math.floor(s * 127)));
  }
  // WAV header
  function str(s) {
    return Array.from(s).map((c) => c.charCodeAt(0));
  }
  function u32(n) {
    return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  }
  function u16(n) {
    return [n & 255, (n >> 8) & 255];
  }
  const header = [].concat(
    str("RIFF"),
    u32(36 + data.length),
    str("WAVEfmt "),
    u32(16),
    u16(1),
    u16(1),
    u32(sampleRate),
    u32(sampleRate),
    u16(1),
    u16(8),
    str("data"),
    u32(data.length)
  );
  const bytes = new Uint8Array(header.length + data.length);
  bytes.set(header, 0);
  bytes.set(data, header.length);
  const b64 = btoa(String.fromCharCode(...bytes));
  return "data:audio/wav;base64," + b64;
}

// ===== Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    running ? pause() : start();
  }
  if (e.key.toLowerCase() === "r") {
    reset();
  }
  if (e.key.toLowerCase() === "s") {
    skip();
  }
});

// ===== Wire controls
startBtn.addEventListener("click", start);
pauseBtn.addEventListener("click", pause);
resetBtn.addEventListener("click", reset);
skipBtn.addEventListener("click", skip);

// ===== Notifications permission (lazy)
if (
  S.notify &&
  "Notification" in window &&
  Notification.permission !== "granted"
) {
  Notification.requestPermission();
}
