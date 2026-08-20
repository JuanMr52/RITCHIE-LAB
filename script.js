/* =========================================================
   RITCHIE LAB — lógica de la aplicación
   Todo el contenido científico proviene exclusivamente del
   material de estudio proporcionado. No se agrega información
   externa en ninguna pregunta, explicación o texto.
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIGURACIÓN DE SUPABASE
   Pega aquí tu Project URL y tu clave pública (anon key).
   Si se dejan vacíos, la app funciona en MODO DEMO
   (ranking guardado solo en este navegador).
   --------------------------------------------------------- */
const SUPABASE_URL = "PEGAR_AQUI";
const SUPABASE_ANON_KEY = "PEGAR_AQUI";

/* Clave sencilla para entrar al modo presentador (cámbiala). */
const PRESENTER_KEY = "ritchie2026";

/* Cada cuántos ms se refresca el ranking del presentador */
const PRESENTER_POLL_MS = 4000;

/* ---------------------------------------------------------
   2. ESTADO DE SUPABASE (carga diferida vía CDN, opcional)
   --------------------------------------------------------- */
let supabaseClient = null;
const supabaseConfigured =
  SUPABASE_URL && SUPABASE_URL !== "PEGAR_AQUI" &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "PEGAR_AQUI";

async function initSupabase() {
  if (!supabaseConfigured) return null;
  try {
    if (!window.supabase) {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch (e) {
    console.warn("No se pudo inicializar Supabase, se usará modo demo.", e);
    return null;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---------------------------------------------------------
   3. ESTADO GENERAL DE LA APLICACIÓN
   --------------------------------------------------------- */
const STAGES = [
  { id: "stage-01", label: "Preparación" },
  { id: "stage-02", label: "Filtración" },
  { id: "stage-03", label: "Centrifugación" },
  { id: "stage-04", label: "Formol" },
  { id: "stage-05", label: "Éter" },
  { id: "stage-06", label: "Separación" },
  { id: "stage-07", label: "Microscopía" },
];

const state = {
  alias: "",
  team: "",
  score: 0,
  maxScore: 100,
  startTime: null,
  endTime: null,
  centrifuge1: { rpm: null, time: null },
  centrifuge2: { rpm: null, time: null },
  orderPicks: [],
};

const CORRECT_ORDER = ["eter", "anillo", "formol", "sedimento"];
const LAYER_LABELS = {
  eter: "Éter o gasolina",
  anillo: "Anillo con restos de materias fecales",
  formol: "Formol",
  sedimento: "Sedimento",
};

/* ---------------------------------------------------------
   4. NAVEGACIÓN ENTRE PANTALLAS
   --------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  const target = document.getElementById(`screen-${id}`);
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  const header = document.getElementById("progressHeader");
  const stageIndex = STAGES.findIndex((s) => s.id === id);
  if (stageIndex >= 0) {
    header.classList.remove("hidden");
    updateProgress(stageIndex);
  } else {
    header.classList.add("hidden");
  }
}

function buildProgressTrack() {
  const track = document.getElementById("progressTrack");
  track.innerHTML = "";
  STAGES.forEach((s, i) => {
    const step = document.createElement("div");
    step.className = "progress-step";
    step.dataset.index = i;
    step.title = `${String(i + 1).padStart(2, "0")} ${s.label}`;
    track.appendChild(step);
  });
}

function updateProgress(currentIndex) {
  document.querySelectorAll(".progress-step").forEach((step, i) => {
    step.classList.toggle("done", i < currentIndex);
    step.classList.toggle("current", i === currentIndex);
  });
}

/* ---------------------------------------------------------
   5. PREGUNTAS DE OPCIÓN MÚLTIPLE (genérico)
   --------------------------------------------------------- */
function wireQuestionBlock(block, onAnswered) {
  const grid = block.querySelector(".options-grid");
  const correct = grid.dataset.correct;
  const feedback = block.querySelector(".feedback-box");
  const buttons = grid.querySelectorAll(".option-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (grid.dataset.answered === "true") return;
      grid.dataset.answered = "true";
      const chosen = btn.dataset.value;
      const isCorrect = chosen === correct;

      buttons.forEach((b) => {
        b.disabled = true;
        if (b.dataset.value === correct) b.classList.add("correct");
        else if (b === btn) b.classList.add("incorrect");
      });

      feedback.hidden = false;
      feedback.classList.add(isCorrect ? "ok" : "bad");
      feedback.innerHTML = isCorrect
        ? `<span class="feedback-title">✓ Correcto</span>${block.dataset.explain || ""}`
        : `<span class="feedback-title">✗ Incorrecto</span>${block.dataset.explain || ""}`;

      onAnswered(isCorrect, chosen);
    });
  });
}

/* Textos de explicación (tomados literalmente del material) por bloque */
const EXPLANATIONS = {
  q1a: "Se agrega solución isotónica y se mezcla hasta que la materia fecal quede líquida, en una cantidad aproximada de 10 mL.",
  q2a: "La materia fecal líquida se pasa por una gasa doble y húmeda.",
  q2b: "Se colocan aproximadamente 10 mL de materia fecal líquida en un tubo de centrifugación de 15 mL.",
  q3b: "Después de centrifugar se decanta el sobrenadante y se conserva el sedimento.",
  q4a: "Se agregan aproximadamente 10 mL de formol al 10%.",
  q4b: "Se deja reposar durante 5 minutos.",
  q5a: "Se agregan 3 mL de éter.",
  q5b: "Se tapa el tubo y se mezcla fuertemente durante 30 segundos.",
  q5c: "En ausencia de éter, el libro indica que se reemplaza por gasolina blanca.",
  q7a: "Se decantan cuidadosamente las tres capas superiores.",
  q7c: "Se preparan preparaciones en fresco y con lugol para observación al microscopio.",
};

function initQuestionBlocks() {
  document.querySelectorAll(".question-block").forEach((block) => {
    const key = block.dataset.question;
    block.dataset.explain = EXPLANATIONS[key] ? `<p>${EXPLANATIONS[key]}</p>` : "";
  });
}

/* ---------------------------------------------------------
   6. ETAPA 01 — PREPARACIÓN (10 pts)
   --------------------------------------------------------- */
function setupStage01() {
  const screen = document.getElementById("screen-stage-01");
  const block = screen.querySelector('[data-question="q1a"]');
  const continueBtn = screen.querySelector(".btn-continue");

  wireQuestionBlock(block, (isCorrect) => {
    if (isCorrect) addScore(10);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   7. ETAPA 02 — FILTRACIÓN (10 pts)
   --------------------------------------------------------- */
function setupStage02() {
  const screen = document.getElementById("screen-stage-02");
  const blockA = screen.querySelector('[data-question="q2a"]');
  const blockB = screen.querySelector('[data-question="q2b"]');
  const continueBtn = screen.querySelector(".btn-continue");
  let earned = 0;

  wireQuestionBlock(blockA, (isCorrect) => {
    if (isCorrect) earned += 5;
    blockB.hidden = false;
  });
  wireQuestionBlock(blockB, (isCorrect) => {
    if (isCorrect) earned += 5;
    addScore(earned);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   8. ETAPA 03 — PRIMERA CENTRIFUGACIÓN (20 pts)
   --------------------------------------------------------- */
function setupChipGroup(container) {
  const chips = container.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
  });
}

function getSelectedChip(container) {
  const sel = container.querySelector(".chip.selected");
  return sel ? sel.dataset.value : null;
}

function setupStage03() {
  const screen = document.getElementById("screen-stage-03");
  const rpmGroup = screen.querySelector('[data-config="rpm"]');
  const timeGroup = screen.querySelector('[data-config="time"]');
  setupChipGroup(rpmGroup);
  setupChipGroup(timeGroup);

  const runBtn = document.getElementById("btnRunCentrifuge1");
  const feedback = document.getElementById("centrifuge1Feedback");
  const visual = document.getElementById("centrifugeVisual1").querySelector(".centrifuge-body");
  const q3bBlock = document.getElementById("q3bBlock");
  const q3cInfo = document.getElementById("q3cInfo");
  const continueBtn = screen.querySelector(".btn-continue");
  let earnedConfig = 0;
  let configLocked = false;

  runBtn.addEventListener("click", () => {
    if (configLocked) return;
    const rpm = Number(getSelectedChip(rpmGroup));
    const time = Number(getSelectedChip(timeGroup));
    if (!rpm || !time) {
      feedback.hidden = false;
      feedback.className = "feedback-box bad";
      feedback.innerHTML = `<span class="feedback-title">Falta seleccionar</span><p>Elige un valor de RPM y de tiempo antes de centrifugar.</p>`;
      return;
    }
    configLocked = true;
    state.centrifuge1 = { rpm, time };
    visual.classList.add("spinning");
    runBtn.disabled = true;

    setTimeout(() => {
      visual.classList.remove("spinning");
      const rpmOk = rpm >= 1500 && rpm <= 2000;
      const timeOk = time === 2;
      const isCorrect = rpmOk && timeOk;
      if (isCorrect) earnedConfig += 10;

      feedback.hidden = false;
      feedback.className = `feedback-box ${isCorrect ? "ok" : "bad"}`;
      feedback.innerHTML = isCorrect
        ? `<span class="feedback-title">✓ Correcto</span><p>La primera centrifugación se realiza a 1.500–2.000 rpm durante 2 minutos.</p>`
        : `<span class="feedback-title">✗ Revisa los valores</span><p>La primera centrifugación se realiza a 1.500–2.000 rpm durante 2 minutos.</p>`;

      q3bBlock.hidden = false;
    }, 1400);
  });

  wireQuestionBlock(q3bBlock, (isCorrect) => {
    if (isCorrect) earnedConfig += 10;
    q3cInfo.hidden = false;
    addScore(earnedConfig);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   9. ETAPA 04 — FORMOL (20 pts)
   --------------------------------------------------------- */
function setupStage04() {
  const screen = document.getElementById("screen-stage-04");
  const blockA = screen.querySelector('[data-question="q4a"]');
  const blockB = screen.querySelector('[data-question="q4b"]');
  const strip = document.getElementById("formolStrip");
  const continueBtn = screen.querySelector(".btn-continue");
  let earned = 0;

  wireQuestionBlock(blockA, (isCorrect) => {
    if (isCorrect) earned += 10;
    blockB.hidden = false;
  });
  wireQuestionBlock(blockB, (isCorrect) => {
    if (isCorrect) earned += 10;
    strip.hidden = false;
    addScore(earned);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   10. ETAPA 05 — ÉTER (20 pts)
   Distribución: 3 preguntas -> ~6.67 c/u; se redondea para
   que la suma sea exactamente 20 (7 + 7 + 6).
   --------------------------------------------------------- */
function setupStage05() {
  const screen = document.getElementById("screen-stage-05");
  const blockA = screen.querySelector('[data-question="q5a"]');
  const blockB = screen.querySelector('[data-question="q5b"]');
  const infoC = document.getElementById("q5cInfo");
  const blockC = screen.querySelector('[data-question="q5c"]');
  const continueBtn = screen.querySelector(".btn-continue");
  let earned = 0;

  wireQuestionBlock(blockA, (isCorrect) => {
    if (isCorrect) earned += 7;
    blockB.hidden = false;
  });
  wireQuestionBlock(blockB, (isCorrect) => {
    if (isCorrect) earned += 7;
    infoC.hidden = false;
    blockC.hidden = false;
  });
  wireQuestionBlock(blockC, (isCorrect) => {
    if (isCorrect) earned += 6;
    addScore(earned);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   11. ETAPA 06 — CENTRIFUGACIÓN FINAL + 4 CAPAS (10 pts)
   --------------------------------------------------------- */
function setupStage06() {
  const screen = document.getElementById("screen-stage-06");
  const rpmGroup = screen.querySelector('[data-config="rpm2"]');
  const timeGroup = screen.querySelector('[data-config="time2"]');
  setupChipGroup(rpmGroup);
  setupChipGroup(timeGroup);

  const runBtn = document.getElementById("btnRunCentrifuge2");
  const feedback = document.getElementById("centrifuge2Feedback");
  const visual = document.getElementById("centrifugeVisual2").querySelector(".centrifuge-body");
  const doneMsg = document.getElementById("centrifugeDoneMsg");
  const layersWrap = document.getElementById("layersWrap");
  const orderWrap = document.getElementById("orderWrap");
  const continueBtn = screen.querySelector(".btn-continue");
  let locked = false;

  runBtn.addEventListener("click", () => {
    if (locked) return;
    const rpm = Number(getSelectedChip(rpmGroup));
    const time = Number(getSelectedChip(timeGroup));
    if (!rpm || !time) {
      feedback.hidden = false;
      feedback.className = "feedback-box bad";
      feedback.innerHTML = `<span class="feedback-title">Falta seleccionar</span><p>Elige un valor de RPM y de tiempo antes de centrifugar.</p>`;
      return;
    }
    locked = true;
    state.centrifuge2 = { rpm, time };
    visual.classList.add("spinning");
    runBtn.disabled = true;

    setTimeout(() => {
      visual.classList.remove("spinning");
      const isCorrect = rpm === 1500 && time === 2;
      feedback.hidden = false;
      feedback.className = `feedback-box ${isCorrect ? "ok" : "bad"}`;
      feedback.innerHTML = isCorrect
        ? `<span class="feedback-title">✓ Correcto</span><p>La centrifugación final se realiza a 1.500 rpm durante 2 minutos.</p>`
        : `<span class="feedback-title">✗ Revisa los valores</span><p>La centrifugación final se realiza a 1.500 rpm durante 2 minutos.</p>`;

      doneMsg.hidden = false;
      setTimeout(() => {
        layersWrap.hidden = false;
      }, 500);
    }, 1400);
  });

  /* --- toque de capas: identificar el sedimento --- */
  const tubeBig = document.getElementById("tubeBig");
  const layerFeedback = document.getElementById("layerFeedback");
  let layerAnswered = false;
  let layerPoints = 0;

  tubeBig.querySelectorAll(".layer").forEach((layerBtn) => {
    layerBtn.addEventListener("click", () => {
      if (layerAnswered) return;
      layerAnswered = true;
      const value = layerBtn.dataset.value;
      const isCorrect = value === "sedimento";

      tubeBig.querySelectorAll(".layer").forEach((l) => {
        if (l.dataset.value === "sedimento") l.classList.add("correct-pick");
      });
      if (!isCorrect) layerBtn.classList.add("wrong-pick");

      layerFeedback.hidden = false;
      layerFeedback.className = `feedback-box ${isCorrect ? "ok" : "bad"}`;
      layerFeedback.innerHTML = isCorrect
        ? `<span class="feedback-title">✓ Correcto</span><p>El sedimento pequeño contiene los huevos, quistes, etc.</p>`
        : `<span class="feedback-title">✗ Incorrecto</span><p>Revisa nuevamente las cuatro capas formadas después de la centrifugación. El sedimento pequeño contiene los huevos, quistes, etc.</p>`;

      if (isCorrect) layerPoints = 6;

      setTimeout(() => {
        orderWrap.hidden = false;
      }, 400);
    });
  });

  /* --- actividad extra: ordenar las capas --- */
  const orderCards = document.getElementById("orderCards");
  const orderSlots = document.getElementById("orderSlots");
  const orderFeedback = document.getElementById("orderFeedback");

  for (let i = 0; i < 4; i++) {
    const slot = document.createElement("div");
    slot.className = "order-slot";
    slot.dataset.index = i;
    slot.textContent = `Posición ${i + 1}`;
    orderSlots.appendChild(slot);
  }

  orderCards.querySelectorAll(".order-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.classList.contains("picked")) return;
      if (state.orderPicks.length >= 4) return;
      state.orderPicks.push(card.dataset.value);
      card.classList.add("picked");

      const slot = orderSlots.children[state.orderPicks.length - 1];
      slot.textContent = LAYER_LABELS[card.dataset.value];
      slot.classList.add("filled");

      if (state.orderPicks.length === 4) {
        const isCorrect = JSON.stringify(state.orderPicks) === JSON.stringify(CORRECT_ORDER);
        orderFeedback.hidden = false;
        orderFeedback.className = `feedback-box ${isCorrect ? "ok" : "bad"}`;
        orderFeedback.innerHTML = isCorrect
          ? `<span class="feedback-title">✓ Estructura correcta del tubo.</span>`
          : `<span class="feedback-title">El orden correcto es:</span><p>Éter o gasolina → Anillo con restos de materias fecales → Formol → Sedimento.</p>`;

        if (isCorrect) layerPoints = Math.min(10, layerPoints + 4);
        addScore(layerPoints);
        continueBtn.hidden = false;
      }
    });
  });
}

/* ---------------------------------------------------------
   12. ETAPA 07 — RECUPERACIÓN + MICROSCOPÍA (10 pts)
   --------------------------------------------------------- */
function setupStage07() {
  const screen = document.getElementById("screen-stage-07");
  const blockA = screen.querySelector('[data-question="q7a"]');
  const infoB = document.getElementById("q7bInfo");
  const blockC = screen.querySelector('[data-question="q7c"]');
  const microStrip = document.getElementById("microStrip");
  const continueBtn = screen.querySelector(".btn-continue");
  let earned = 0;

  wireQuestionBlock(blockA, (isCorrect) => {
    if (isCorrect) earned += 5;
    infoB.hidden = false;
    blockC.hidden = false;
  });
  wireQuestionBlock(blockC, (isCorrect) => {
    if (isCorrect) earned += 5;
    microStrip.hidden = false;
    addScore(earned);
    continueBtn.hidden = false;
  });
}

/* ---------------------------------------------------------
   13. PUNTUACIÓN
   --------------------------------------------------------- */
function addScore(points) {
  state.score = Math.min(state.maxScore, state.score + points);
}

/* ---------------------------------------------------------
   14. CONTINUAR ENTRE ETAPAS
   --------------------------------------------------------- */
function wireContinueButtons() {
  document.querySelectorAll(".btn-continue").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.next;
      if (next === "final") {
        finishSimulation();
      } else {
        showScreen(next);
      }
    });
  });
}

function finishSimulation() {
  state.endTime = Date.now();
  const elapsedSec = Math.round((state.endTime - state.startTime) / 1000);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  document.getElementById("finalScore").textContent = state.score;
  document.getElementById("finalTime").textContent = `Tiempo: ${mm}:${ss}`;

  const modeNote = document.getElementById("modeNote");
  setModeNote(modeNote);

  showScreen("final");
}

function setModeNote(el) {
  if (supabaseConfigured && supabaseClient) {
    el.textContent = "Ranking grupal activo";
    el.classList.add("active");
  } else {
    el.textContent = "Modo demostración: ranking local";
    el.classList.remove("active");
  }
}

/* ---------------------------------------------------------
   15. IDENTIFICACIÓN / INICIO
   --------------------------------------------------------- */
function wireLandingAndId() {
  document.getElementById("btnStartSim").addEventListener("click", () => {
    showScreen("id");
  });

  document.getElementById("idForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const alias = document.getElementById("inputAlias").value.trim();
    const team = document.getElementById("inputTeam").value.trim();
    if (!alias) return;
    state.alias = alias.slice(0, 24);
    state.team = team.slice(0, 24);
    state.startTime = Date.now();
    showScreen("stage-01");
  });
}

/* ---------------------------------------------------------
   16. RANKING — GUARDAR Y RECUPERAR
   --------------------------------------------------------- */
const LOCAL_KEY = "ritchieLabScores";

function getLocalScores() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalScore(entry) {
  const scores = getLocalScores();
  scores.push(entry);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(scores));
}

async function submitScore() {
  const elapsedSec = Math.round((state.endTime - state.startTime) / 1000);
  const entry = {
    alias: state.alias,
    team: state.team || null,
    score: state.score,
    time_seconds: elapsedSec,
    finished_at: new Date().toISOString(),
  };

  if (supabaseConfigured && supabaseClient) {
    try {
      const { error } = await supabaseClient.from("ritchie_scores").insert([entry]);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Fallo al guardar en Supabase, se guarda localmente.", e);
      saveLocalScore(entry);
      return false;
    }
  } else {
    saveLocalScore(entry);
    return true;
  }
}

async function fetchTopScores(limit = 10) {
  if (supabaseConfigured && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("ritchie_scores")
        .select("*")
        .order("score", { ascending: false })
        .order("time_seconds", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Fallo al leer Supabase, se usa ranking local.", e);
    }
  }
  return getLocalScores()
    .sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds)
    .slice(0, limit);
}

function renderRankingList(rows, listEl) {
  listEl.innerHTML = "";
  if (!rows.length) {
    listEl.innerHTML = `<li class="ranking-empty">Todavía no hay puntuaciones registradas.</li>`;
    return;
  }
  rows.forEach((row, i) => {
    const li = document.createElement("li");
    const mm = String(Math.floor(row.time_seconds / 60)).padStart(2, "0");
    const ss = String(row.time_seconds % 60).padStart(2, "0");
    li.innerHTML = `
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-name">${escapeHtml(row.alias)}${row.team ? ` <span class="rank-team">· ${escapeHtml(row.team)}</span>` : ""}</span>
      <span class="rank-score">${row.score} · ${mm}:${ss}</span>
    `;
    listEl.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireFinalAndRanking() {
  const submitBtn = document.getElementById("btnSubmitScore");
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    await submitScore();
    submitBtn.textContent = "Puntuación guardada ✓";
  });

  document.getElementById("btnViewRanking").addEventListener("click", async () => {
    showScreen("ranking");
    const note = document.getElementById("rankingModeNote");
    setModeNote(note);
    const list = document.getElementById("rankingList");
    list.innerHTML = `<li class="ranking-empty">Cargando...</li>`;
    const rows = await fetchTopScores(10);
    renderRankingList(rows, list);
  });

  document.getElementById("btnRankingBack").addEventListener("click", () => {
    showScreen("final");
  });
}

/* ---------------------------------------------------------
   17. MODO PRESENTADOR
   --------------------------------------------------------- */
let presenterPollHandle = null;

function wirePresenter() {
  document.getElementById("presenterLink").addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("presenter-gate");
  });

  document.getElementById("presenterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("inputPresenterKey").value;
    const errorEl = document.getElementById("presenterError");
    if (val === PRESENTER_KEY) {
      errorEl.hidden = true;
      enterPresenterMode();
    } else {
      errorEl.hidden = false;
    }
  });

  document.getElementById("btnPresenterRefresh").addEventListener("click", refreshPresenterView);
}

async function enterPresenterMode() {
  showScreen("presenter");
  const note = document.getElementById("presenterModeNote");
  setModeNote(note);
  await refreshPresenterView();
  if (presenterPollHandle) clearInterval(presenterPollHandle);
  presenterPollHandle = setInterval(refreshPresenterView, PRESENTER_POLL_MS);
}

async function refreshPresenterView() {
  const rows = await fetchTopScores(10);
  const allRows = supabaseConfigured && supabaseClient ? rows : getLocalScores();
  document.getElementById("presenterCount").textContent = allRows.length;

  const body = document.getElementById("presenterTableBody");
  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5" class="ranking-empty">Sin datos todavía</td></tr>`;
    return;
  }
  rows.forEach((row, i) => {
    const mm = String(Math.floor(row.time_seconds / 60)).padStart(2, "0");
    const ss = String(row.time_seconds % 60).padStart(2, "0");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(row.alias)}</td><td>${escapeHtml(row.team || "—")}</td><td>${row.score}</td><td>${mm}:${ss}</td>`;
    body.appendChild(tr);
  });
}

/* ---------------------------------------------------------
   18. INICIALIZACIÓN
   --------------------------------------------------------- */
async function init() {
  buildProgressTrack();
  initQuestionBlocks();
  wireLandingAndId();
  wireContinueButtons();
  wireFinalAndRanking();
  wirePresenter();

  setupStage01();
  setupStage02();
  setupStage03();
  setupStage04();
  setupStage05();
  setupStage06();
  setupStage07();

  if (supabaseConfigured) {
    await initSupabase();
  }
}

document.addEventListener("DOMContentLoaded", init);
