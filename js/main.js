// === 发疯得福 — State Machine ===
console.log('🎭 发疯得福 starting...');

const STATE = {
  IDLE: 'idle', PRESET_AUTO: 'preset_auto', RESULT_CTA: 'result_cta',
  INPUT: 'input', MODE_SELECT: 'mode_select', CHARACTER_SELECT: 'character_select', GENERATING: 'generating',
  PAPER_FORMING: 'paper_forming', TOOL_SELECT: 'tool_select',
  DESTRUCTION: 'destruction', VENTING: 'venting', BLINDBOX: 'blindbox'
};

let currentState = STATE.IDLE;
let selectedCharacter = null;
let selectedTool = null;
let selectedMode = null;
let userComplaint = '';
let generatedRant = '';
let isPresetMode = false;

// === DOM refs ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const paperStage = $('#paper-stage');
const paper = $('#paper');
const paperContent = $('#paper-content');
const toolbar = $('#toolbar');
const destructionHint = $('#destruction-hint');
const inputArea = $('#input-area');
const complaintInput = $('#complaint-input');
const btnMouth = $('#btn-mouth');
const characterSelect = $('#character-select');
const resultCta = $('#result-cta');
const homePage = $('#home-page');
const blindboxReveal = $('#blindbox-reveal');
const loadingOverlay = $('#loading-overlay');
const destructionCanvas = $('#destruction-canvas');
const ventingCanvas = $('#venting-canvas');
const modeSelect = $('#mode-select');
const ventingHint = $('#venting-hint');
const ventingHintText = $('#venting-hint-text');
const ventingProgress = $('#venting-progress');
const ventingProgressFill = $('#venting-progress-fill');

// === Helpers ===
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// === State transitions ===
function setState(newState) {
  console.log(`[State] ${currentState} → ${newState}`);
  currentState = newState;

  [inputArea, characterSelect, resultCta, blindboxReveal, loadingOverlay,
   toolbar, destructionHint, modeSelect, ventingHint, homePage].forEach(el => { if (el) el.classList.add('hidden'); });
  const selectLabel = $('#select-label');
  if (selectLabel) selectLabel.classList.add('hidden');
  if (destructionCanvas) destructionCanvas.classList.remove('active');
  if (ventingCanvas) {
    ventingCanvas.classList.remove('active');
    const vctx = ventingCanvas.getContext('2d');
    if (vctx) vctx.clearRect(0, 0, ventingCanvas.width, ventingCanvas.height);
  }
  // Hide venting progress by default
  if (ventingProgress) ventingProgress.classList.add('hidden');
  // Show paper by default; individual states hide it if needed
  if (paperStage) { paperStage.classList.remove('hidden'); paperStage.classList.remove('shifted-up'); paperStage.classList.remove('typewriting'); }

  switch (newState) {
    case STATE.IDLE: showHomePage(); break;
    case STATE.PRESET_AUTO:
      runPresetAuto().catch(err => { console.error('Preset failed:', err); setState(STATE.INPUT); });
      break;
    case STATE.RESULT_CTA: showResultCta(); break;
    case STATE.INPUT: showInput(); break;
    case STATE.MODE_SELECT: showModeSelect(); break;
    case STATE.CHARACTER_SELECT: showCharacterSelect(); break;
    case STATE.GENERATING: runGenerating(); break;
    case STATE.PAPER_FORMING:
      runPaperForming().catch(err => { console.error('Paper failed:', err); setState(STATE.TOOL_SELECT); });
      break;
    case STATE.TOOL_SELECT: showToolSelect(); break;
    case STATE.DESTRUCTION: startDestruction(); break;
    case STATE.VENTING: startVenting(); break;
    case STATE.BLINDBOX: showBlindbox().catch(() => showBlindbox()); break;
  }
}

// === IDLE: Home page ===
function showHomePage() {
  paperStage.classList.add('hidden');
  homePage.classList.remove('hidden');
  // Try to start BGM when home page is shown
  tryStartBGM();
}

function tryStartBGM() {
  if (typeof audioManager === 'undefined') return;
  if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => { audioManager.playGoofyBGM(); });
  } else {
    audioManager.playGoofyBGM();
  }
}

// === IDLE → PRESET_AUTO (no longer auto-triggered) ===
async function startPresetAuto() {
  paper.classList.add('folded');
  paperContent.innerHTML = `
    <img src="assets/img/barbie.png" class="idle-barbie"
         style="position:absolute;top:10%;left:50%;transform:translateX(-50%);
                width:55%;height:auto;object-fit:contain;
                filter:saturate(1.3) contrast(1.05);
                z-index:0;pointer-events:none;">`;
  paperStage.classList.remove('hidden');
  await sleep(800);
  setState(STATE.PRESET_AUTO);
}

// === PRESET_AUTO ===
async function runPresetAuto() {
  isPresetMode = true;
  const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
  selectedCharacter = preset.character;  // for correct stamp image
  paper.classList.remove('folded', 'pre-fold');
  paperContent.innerHTML = '';
  paper.style.transform = '';
  $$('.fold').forEach(f => { f.style.transform = ''; });

  const lines = preset.rant.split('\n').filter(l => l.trim());
  paperStage.classList.add('typewriting');
  const ttsPromise = (typeof speak === 'function')
    ? speak(preset.rant, selectedCharacter).catch(() => {})
    : Promise.resolve();
  await playTypewriter(lines);
  paperStage.classList.remove('typewriting');
  ttsPromise.catch(() => {});

  paper.classList.add('pre-fold');
  await sleep(300);
  paper.classList.remove('pre-fold');
  await playFoldAnimation();
  await sleep(400);
  await capturePaperSnapshot();
  paperStage.classList.add('hidden');
  destructionCanvas.classList.add('active');
  if (typeof startCanvasDestruction === 'function') {
    await startCanvasDestruction(preset.tool, true);
  }
  setState(STATE.BLINDBOX);
}

// === RESULT_CTA / INPUT / CHARACTER ===
function showResultCta() { resultCta.classList.remove('hidden'); }

function showInput() {
  isPresetMode = false;
  inputArea.classList.remove('hidden');
  complaintInput.value = '';
  complaintInput.focus();
}

function showCharacterSelect() {
  paperStage.classList.remove('hidden');
  paperStage.classList.add('shifted-up');
  // Show Barbie on paper while choosing character
  paperContent.innerHTML = `
    <img src="assets/img/barbie.png" class="idle-barbie"
         style="position:absolute;top:10%;left:50%;transform:translateX(-50%);
                width:55%;height:auto;object-fit:contain;
                filter:saturate(1.3) contrast(1.05);
                z-index:0;pointer-events:none;">`;
  const selectLabel = $('#select-label');
  if (selectLabel) selectLabel.classList.remove('hidden');
  characterSelect.classList.remove('hidden');
  $$('.character-card').forEach(c => c.classList.remove('selected'));
  selectedCharacter = null;
}

// === GENERATING ===
async function runGenerating() {
  paperStage.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');
  const loadingImg = document.getElementById('loading-character');
  if (loadingImg) {
    loadingImg.src = selectedCharacter === 'macaque'
      ? 'assets/img/character-avatars/macaque-loading.png'
      : 'assets/img/character-avatars/opossum-loading.png';
  }

  try {
    if (typeof generateRant === 'function') {
      generatedRant = await generateRant(userComplaint, selectedCharacter);
    } else {
      generatedRant = PRESETS[0].rant;
    }
  } catch (e) {
    console.warn('LLM failed:', e);
    generatedRant = PRESETS[0].rant;
  }

  loadingOverlay.classList.add('hidden');
  setState(STATE.PAPER_FORMING);
}

// === PAPER_FORMING ===
async function runPaperForming() {
  paper.classList.remove('folded', 'pre-fold');
  paperContent.innerHTML = '';
  paper.style.transform = '';
  $$('.fold').forEach(f => { f.style.transform = ''; });

  const lines = generatedRant.split('\n').filter(l => l.trim());
  paperStage.classList.add('typewriting');
  // Start TTS in parallel with typewriter
  const ttsPromise = (typeof speak === 'function')
    ? speak(generatedRant, selectedCharacter).catch(() => {})
    : Promise.resolve();
  await playTypewriter(lines);
  paperStage.classList.remove('typewriting');
  // Don't wait for TTS to finish — let it play in background
  ttsPromise.catch(() => {});

  paper.classList.add('pre-fold');
  await sleep(300);
  paper.classList.remove('pre-fold');
  await playFoldAnimation();

  // Show CTA with context-appropriate buttons
  if (isPresetMode) {
    $('#cta-text').textContent = '你的纸呢？要不要也来一个？';
    $('#btn-start-input').classList.remove('hidden');
    $('#btn-share-result').classList.remove('hidden');
    $('#btn-continue-destroy').classList.add('hidden');
  } else {
    $('#cta-text').textContent = '文字已就位，接下来？';
    $('#btn-start-input').classList.add('hidden');
    $('#btn-share-result').classList.add('hidden');
    $('#btn-continue-destroy').classList.remove('hidden');
  }
  resultCta.classList.remove('hidden');
}

// === TOOL_SELECT / DESTRUCTION ===
function showToolSelect() {
  paperStage.classList.remove('hidden');
  toolbar.classList.remove('hidden');
  $$('.tool-btn').forEach(b => b.classList.remove('selected'));
  selectedTool = null;
}

async function capturePaperSnapshot() {
  if (typeof html2canvas !== 'undefined' && typeof setPaperSnapshot !== 'undefined') {
    try {
      const snapCanvas = await html2canvas(paper, { backgroundColor: null, scale: 2 });
      const img = new Image();
      img.src = snapCanvas.toDataURL();
      await new Promise(r => { img.onload = r; });
      setPaperSnapshot(img);
    } catch (e) { console.warn('Paper capture failed:', e); }
  }
}

async function startDestruction() {
  toolbar.classList.add('hidden');
  destructionHint.classList.remove('hidden');
  await capturePaperSnapshot();
  paperStage.classList.add('hidden');
  destructionCanvas.classList.add('active');

  // Pre-fetch AI blindbox while destruction plays
  if (typeof startPreFetchBlindbox === 'function') {
    startPreFetchBlindbox(userComplaint, generatedRant);
  }

  if (typeof startCanvasDestruction === 'function') {
    await startCanvasDestruction(selectedTool, false);
  }
  setState(STATE.BLINDBOX);
}

// === BLINDBOX ===
async function showBlindbox() {
  paperStage.classList.add('hidden');
  destructionCanvas.classList.remove('active');
  const boxType = typeof getRandomBlindboxType === 'function' ? getRandomBlindboxType() : 'soul-shard';
  if (typeof showBlindboxResult === 'function') await showBlindboxResult(boxType);
  if (isPresetMode) setTimeout(() => { blindboxReveal.classList.add('hidden'); setState(STATE.RESULT_CTA); }, 5000);
}

// === Typewriter — renders text+stamp to Canvas → image on paper (pixel-perfect) ===
async function playTypewriter(lines) {
  console.log('Typewriter:', lines.length, 'lines');
  paperContent.innerHTML = '';
  paperContent.style.display = 'block';
  paperContent.style.padding = '';

  // Create an img element that fills paper-content exactly
  const display = document.createElement('img');
  display.style.cssText = 'width:100%;height:100%;object-fit:fill;display:block;position:absolute;top:0;left:0;';
  display.className = 'typewriter-output';
  paperContent.appendChild(display);

  // Canvas: render text + stamp onto the paper at 2x resolution
  const scale = 2;
  const paperW = Math.round(paper.clientWidth);
  const paperH = Math.round(paper.clientHeight);
  const cw = paperW * scale;
  const ch = paperH * scale;

  const offscreen = document.createElement('canvas');
  offscreen.width = cw;
  offscreen.height = ch;
  const octx = offscreen.getContext('2d');
  octx.scale(scale, scale);

  // Generous margins — text guaranteed within paper
  const marginX = 64;  // ~4 chars narrower total
  const marginTop = 152;  // moved down ~4 lines
  const maxTextWidth = paperW - marginX * 2;
  const stampW = 180;
  const stampH = 120;
  const lineHeight = 30;
  const fontSize = 14;

  const fullText = lines.join('\n');
  const totalChars = fullText.length;
  let revealed = 0;

  // Preload stamp image
  const charImg = selectedCharacter === 'macaque' ? 'macaque-logo' : 'opossum-logo';
  const stampImg = new Image();
  stampImg.src = `assets/img/character-avatars/${charImg}.png`;
  await new Promise(r => { stampImg.onload = r; stampImg.onerror = r; });

  function redrawCanvas() {
    octx.clearRect(0, 0, paperW, paperH);

    // Draw revealed text (character by character)
    let charCount = 0;
    let y = marginTop;

    octx.font = `700 ${fontSize}px "PingFang SC", sans-serif`;
    octx.fillStyle = '#111';
    octx.textAlign = 'center';
    octx.textBaseline = 'top';

    for (const line of lines) {
      let lineText = '';
      for (const ch of line) {
        if (charCount >= revealed) break;
        lineText += ch;
        charCount++;
      }

      if (lineText.length > 0) {
        const wrapped = wrapText(octx, lineText, maxTextWidth);
        for (const wline of wrapped) {
          // Slight random jitter for angry feel
          const jx = (Math.random() - 0.5) * 3;
          const jy = (Math.random() - 0.5) * 2;
          octx.fillText(wline, paperW / 2 + jx, y + jy);
          y += lineHeight;
        }
      }

      if (charCount >= revealed) break;
    }

    // Draw stamp at upper-right corner, large
    if (revealed >= totalChars && stampImg.complete && stampImg.naturalWidth > 0) {
      const stampDrawH = Math.min(stampH, stampImg.naturalHeight * (stampW / stampImg.naturalWidth));
      const stampX = paperW - stampW - 4;
      const stampY = 2;
      octx.globalAlpha = 0.92;
      octx.drawImage(stampImg, stampX, stampY, stampW, stampDrawH);
      octx.globalAlpha = 1;
    }

    // Update display
    display.src = offscreen.toDataURL();
  }

  // Wrap function: split text into lines that fit within maxWidth
  function wrapText(ctx, text, maxWidth) {
    const result = [];
    let current = '';
    for (const ch of text) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current.length > 0) {
        result.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) result.push(current);
    return result.length > 0 ? result : [text];
  }

  // Animate character by character — angry, jumpy, erratic
  return new Promise((resolve) => {
    function revealNext() {
      if (revealed < totalChars) {
        // Burst mode: 1-3 chars at a time, with uneven timing
        const burst = 1 + Math.floor(Math.random() * 3);
        revealed = Math.min(totalChars, revealed + burst);
        redrawCanvas();
        const delay = 8 + Math.random() * 25;  // fast and erratic
        setTimeout(revealNext, delay);
      } else {
        // Final redraw with stamp
        redrawCanvas();
        setTimeout(resolve, 300);
      }
    }
    revealNext();
  });
}

// === Fold animation ===
async function playFoldAnimation() {
  if (typeof gsap === 'undefined') { paper.classList.add('folded'); return; }

  const tl = gsap.timeline();
  tl.to('.fold-tl', { rotateX: 32, rotateY: 32, duration: 0.35, ease: 'power2.in' })
    .to('.fold-tr', { rotateX: 32, rotateY: -32, duration: 0.35, ease: 'power2.in' }, '-=0.12')
    .to('.fold-bl', { rotateX: -32, rotateY: 32, duration: 0.35, ease: 'power2.in' }, '-=0.12')
    .to('.fold-br', { rotateX: -32, rotateY: -30, duration: 0.35, ease: 'power2.in' }, '-=0.12')
    .to(paper, { scale: 0.88, rotate: -4, duration: 0.45, ease: 'power2.out' }, '-=0.1');

  await new Promise(resolve => { tl.eventCallback('onComplete', resolve); tl.play(); });
  paper.classList.add('folded');
}

// === MODE_SELECT ===
function showModeSelect() {
  paperStage.classList.add('hidden');
  modeSelect.classList.remove('hidden');
  $$('.mode-card').forEach(c => c.classList.remove('selected'));
  selectedMode = null;
}

// === VENTING ===
function startVenting() {
  modeSelect.classList.add('hidden');
  paperStage.classList.add('hidden');
  destructionCanvas.classList.remove('active');
  ventingCanvas.classList.add('active');
  ventingHint.classList.remove('hidden');

  // Pre-fetch AI blindbox while venting
  if (typeof startPreFetchBlindbox === 'function') {
    startPreFetchBlindbox(userComplaint, generatedRant || userComplaint);
  }

  if (typeof window.startVentingMode === 'function') {
    window.startVentingMode(selectedMode, {
      complaint: userComplaint,
      rant: generatedRant,
      onComplete: () => {
        ventingCanvas.classList.remove('active');
        ventingHint.classList.add('hidden');
        setState(STATE.BLINDBOX);
      }
    });
  } else {
    // Fallback if venting.js not loaded
    setTimeout(() => {
      ventingCanvas.classList.remove('active');
      ventingHint.classList.add('hidden');
      setState(STATE.BLINDBOX);
    }, 2000);
  }
}

// Update hint text during venting
function updateVentingHint(text, progress) {
  if (ventingHintText) ventingHintText.textContent = text;
  if (progress !== undefined && ventingProgress && ventingProgressFill) {
    ventingProgress.classList.remove('hidden');
    ventingProgressFill.style.width = Math.min(100, Math.max(0, progress * 100)) + '%';
  }
}

// === Event Bindings ===

// Home page buttons
$('#btn-home-mouthpiece').addEventListener('click', () => {
  tryStartBGM();
  homePage.classList.add('hidden');
  setState(STATE.INPUT);
});
$('#btn-home-venting').addEventListener('click', () => {
  tryStartBGM();
  userComplaint = '今天真的烦死了';  // default for blindbox generation
  homePage.classList.add('hidden');
  setState(STATE.MODE_SELECT);
});

complaintInput.addEventListener('input', () => {
  // Always clickable — no disabled state
});
// Bubble click: fill textarea
document.getElementById('bubble-row').addEventListener('click', (e) => {
  const bubble = e.target.closest('.bubble');
  if (!bubble) return;
  complaintInput.value = bubble.dataset.text;
  complaintInput.focus();
});
btnMouth.addEventListener('click', () => {
  userComplaint = complaintInput.value.trim() || '今天真的烦死了';
  // Pop animation
  btnMouth.classList.remove('pop');
  void btnMouth.offsetWidth;
  btnMouth.classList.add('pop');
  inputArea.classList.add('hidden');
  setTimeout(() => setState(STATE.CHARACTER_SELECT), 300);
});

characterSelect.addEventListener('click', (e) => {
  const card = e.target.closest('.character-card');
  if (!card) return;
  selectedCharacter = card.dataset.character;
  $$('.character-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  setTimeout(() => { characterSelect.classList.add('hidden'); setState(STATE.GENERATING); }, 300);
});

modeSelect.addEventListener('click', (e) => {
  const card = e.target.closest('.mode-card');
  if (!card) return;
  selectedMode = card.dataset.mode;
  $$('.mode-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  if (selectedMode === 'mouthpiece') {
    // Existing 嘴替 flow
    setTimeout(() => { modeSelect.classList.add('hidden'); setState(STATE.CHARACTER_SELECT); }, 200);
  } else {
    // Venting modes
    setTimeout(() => setState(STATE.VENTING), 200);
  }
});

toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tool-btn');
  if (!btn) return;
  selectedTool = btn.dataset.tool;
  setState(STATE.DESTRUCTION);
});

$('#btn-start-input').addEventListener('click', () => { resultCta.classList.add('hidden'); setState(STATE.INPUT); });
$('#btn-continue-destroy').addEventListener('click', () => { resultCta.classList.add('hidden'); setState(STATE.TOOL_SELECT); });
$('#btn-save-paper').addEventListener('click', () => { if (typeof captureAndShare === 'function') captureAndShare('paper'); });
$('#btn-share-result').addEventListener('click', () => { if (typeof captureAndShare === 'function') captureAndShare('blindbox'); });
$('#btn-share-blindbox').addEventListener('click', () => { if (typeof captureAndShare === 'function') captureAndShare('blindbox'); });
$('#btn-retry').addEventListener('click', () => { blindboxReveal.classList.add('hidden'); setState(STATE.IDLE); });
$('#btn-close-share').addEventListener('click', () => { $('#share-modal').classList.add('hidden'); });

// === Init ===
console.log('🎭 发疯得福 initialized');
console.log('GSAP:', typeof gsap !== 'undefined', 'Howler:', typeof Howl !== 'undefined', 'html2canvas:', typeof html2canvas !== 'undefined');

// Start goofy BGM — attempt on load, guaranteed on first user interaction
(function startBGMImmediately() {
  // Try immediately (won't work on most mobile browsers, but harmless)
  tryStartBGM();
  // Guaranteed: start on first interaction anywhere
  function resumeOnInteract() {
    tryStartBGM();
  }
  ['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resumeOnInteract, { once: true });
  });
})();

setState(STATE.IDLE);
