// === Canvas Destruction System ===

const canvas = document.getElementById('destruction-canvas');
const ctx = canvas.getContext('2d');

let particles = null;
let animFrameId = null;
let lastTime = 0;

// Destruction state
let destructionType = null;
let isAutoMode = false;
let destructionComplete = false;
let resolvePromise = null;

// Fire state
let paperCanvas = null;     // original paper (gets holes punched out)
let paperCtx = null;
let charCanvas = null;      // charred edges around holes
let charCtx = null;
let fireTouchX = 0, fireTouchY = 0;
let fireTouching = false;
let fireCompleted = false;
let totalPaperPixels = 0;

// Burn texture brush (loaded from reference burned paper)
let burnBrush = null;
(function loadBurnBrush() {
  const img = new Image();
  img.onload = () => { burnBrush = img; };
  img.src = 'assets/img/burn-holes.png';
})();

// Shred state
let shredProgress = 0;
let shredDragging = false;
let shredStartY = 0;
let shredCurrentY = 0;

// Press state
let pressLevel = 0;
let pressTapsNeeded = 20;  // more taps = more satisfying build-up

// === Init ===
function initCanvas() {
  canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
  canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  particles = new ParticleSystem();
}

window.addEventListener('resize', initCanvas);
initCanvas();

// Stored paper snapshot from CSS fold (set by main.js before destruction)
let paperSnapshot = null;

function setPaperSnapshot(img) {
  paperSnapshot = img;
}

// === Main entry ===
async function startCanvasDestruction(tool, autoMode) {
  destructionType = tool;
  isAutoMode = autoMode;
  destructionComplete = false;
  fireCompleted = false;

  initCanvas();
  particles.clear();
  startRenderLoop();

  // Draw paper on canvas — ALWAYS use CSS snapshot (with text) when available
  if (paperSnapshot && paperSnapshot.complete && paperSnapshot.naturalWidth > 0) {
    console.log('Using paper snapshot for destruction');
    drawPaperFromSnapshot();
  } else {
    console.warn('No paper snapshot, using fallback drawing');
    drawPaperBundle();
  }

  // Setup based on tool
  switch (tool) {
    case 'fire':
      setupFire();
      break;
    case 'shred':
      setupShred();
      break;
    case 'press':
      setupPress();
      break;
  }

  updateHint(tool);

  if (autoMode) {
    // Auto-play the destruction — autoDestruct handles everything internally
    await autoDestruct(tool);
    return;
  } else {
    // Wait for user interaction
    bindDestructionEvents(tool);
  }

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}

// === Draw paper from CSS snapshot ===
function drawPaperFromSnapshot() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);

  // Match the CSS paper size & position: 88vw capped at 360px, ratio ~1.4
  const pw = Math.min(w * 0.88, 360);
  const ph = pw * 1.4;
  const x = (w - pw) / 2;
  const y = h * 0.12;  // matches CSS paper-stage top: 12%

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(w / 2, y + ph + 4, pw / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw the snapshot — the real paper with text on it
  ctx.drawImage(paperSnapshot, x, y, pw, ph);
}

// === Draw paper bundle (fallback, no snapshot) ===
function drawPaperBundle() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Folded paper bundle — a crumpled irregular shape
  const pw = 220, ph = 170;
  const x = cx - pw / 2, y = cy - ph / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + ph / 2 + 6, pw / 2 + 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main folded body — irregular polygon
  ctx.fillStyle = '#faf8f2';
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x + 35, y + 5);
  ctx.lineTo(x + pw - 28, y + 3);
  ctx.lineTo(x + pw - 5, y + 25);
  ctx.lineTo(x + pw - 8, y + ph - 32);
  ctx.lineTo(x + pw - 35, y + ph - 5);
  ctx.lineTo(x + 5, y + ph - 8);
  ctx.lineTo(x - 10, y + ph / 2 + 5);
  ctx.lineTo(x + 3, y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fold crease — diagonal from top-left to bottom-right
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + ph / 2 + 10);
  ctx.lineTo(x + pw - 10, y + 22);
  ctx.stroke();

  // Second crease
  ctx.beginPath();
  ctx.moveTo(x + 38, y + 10);
  ctx.lineTo(x + pw - 22, y + ph - 28);
  ctx.stroke();

  // Folded corner shadows (darker triangles)
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  ctx.beginPath();
  ctx.moveTo(x + 35, y + 5);
  ctx.lineTo(x + pw - 28, y + 3);
  ctx.lineTo(x + pw / 2, y + ph / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.beginPath();
  ctx.moveTo(x + 5, y + ph - 8);
  ctx.lineTo(x + pw - 35, y + ph - 5);
  ctx.lineTo(x + pw / 2, y + ph / 2);
  ctx.closePath();
  ctx.fill();

  // Visible text fragments on surface
  ctx.fillStyle = 'rgba(30,30,30,0.45)';
  ctx.font = '11px "PingFang SC", sans-serif';
  ctx.fillText('啊啊啊啊...', x + 35, y + 45);
  ctx.fillText('受不了了！', x + 40, y + 70);
  ctx.fillText('救命...', x + 55, y + 95);

  // Small text near edge
  ctx.font = '8px "PingFang SC", sans-serif';
  ctx.fillStyle = 'rgba(30,30,30,0.25)';
  ctx.fillText('不想上班', x + pw - 80, y + 50);

  ctx.restore();
}

// === Fire Setup ===
function setupFire() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  // Store original paper on its own canvas (holes will be punched here)
  paperCanvas = document.createElement('canvas');
  paperCanvas.width = canvas.width;
  paperCanvas.height = canvas.height;
  paperCtx = paperCanvas.getContext('2d');
  paperCtx.drawImage(canvas, 0, 0);

  // Char layer — starts empty, accumulates burn marks
  charCanvas = document.createElement('canvas');
  charCanvas.width = canvas.width;
  charCanvas.height = canvas.height;
  charCtx = charCanvas.getContext('2d');

  // Count paper pixels for completion threshold
  const imgData = paperCtx.getImageData(0, 0, paperCanvas.width, paperCanvas.height);
  totalPaperPixels = 0;
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] > 0) totalPaperPixels++;
  }
}

function updateFire() {
  if (!fireTouching || !charCtx || !paperCtx) return;

  const dpr = window.devicePixelRatio || 1;
  const tx = fireTouchX * dpr;
  const ty = fireTouchY * dpr;

  const outerSize = 32 + Math.random() * 20;   // charred edge
  const holeSize = outerSize * (0.35 + Math.random() * 0.25);  // varied hole size

  // Step 1: Punch irregular hole through paper
  paperCtx.globalCompositeOperation = 'destination-out';
  paperCtx.fillStyle = 'rgba(0,0,0,1)';

  // Irregular hole shape (not perfectly round)
  paperCtx.beginPath();
  const points = 8;
  for (let p = 0; p < points; p++) {
    const angle = (p / points) * Math.PI * 2;
    const r = holeSize * (0.7 + Math.random() * 0.6);
    const px = tx + Math.cos(angle) * r;
    const py = ty + Math.sin(angle) * r;
    if (p === 0) paperCtx.moveTo(px, py);
    else paperCtx.lineTo(px, py);
  }
  paperCtx.closePath();
  paperCtx.fill();

  // Second smaller hole nearby for irregularity
  if (Math.random() > 0.4) {
    paperCtx.beginPath();
    paperCtx.arc(tx + (Math.random()-0.5)*holeSize, ty + (Math.random()-0.5)*holeSize,
                 holeSize * (0.3 + Math.random()*0.4), 0, Math.PI * 2);
    paperCtx.fill();
  }

  // Step 2: Stamp burn texture + scorch marks on char canvas
  charCtx.globalCompositeOperation = 'source-over';

  // Stamp reference burn-hole texture at varying scales
  if (burnBrush && burnBrush.complete && burnBrush.naturalWidth > 0) {
    for (let s = 0; s < 2; s++) {
      const bw = outerSize * (2.5 + Math.random() * 2);
      const bh = bw * (burnBrush.naturalHeight / burnBrush.naturalWidth);
      charCtx.globalAlpha = 0.5 + Math.random() * 0.4;
      charCtx.drawImage(burnBrush,
        tx - bw/2 + (Math.random()-0.5)*bw*0.5,
        ty - bh/2 + (Math.random()-0.5)*bh*0.5,
        bw, bh);
    }
    charCtx.globalAlpha = 1.0;
  }

  // Multi-layer scorch gradient for realistic char
  for (let layer = 0; layer < 3; layer++) {
    const lr = outerSize * (0.5 + layer * 0.25);
    const alpha = 0.9 - layer * 0.3;
    const gradient = charCtx.createRadialGradient(tx, ty, lr * 0.3, tx, ty, lr);
    if (layer === 0) {
      gradient.addColorStop(0, `rgba(8,2,0,${alpha})`);
      gradient.addColorStop(0.5, `rgba(25,8,2,${alpha*0.8})`);
      gradient.addColorStop(1, 'rgba(50,18,5,0)');
    } else if (layer === 1) {
      gradient.addColorStop(0, 'rgba(20,5,0,0)');
      gradient.addColorStop(0.3, `rgba(40,12,4,${alpha})`);
      gradient.addColorStop(0.7, `rgba(60,25,10,${alpha*0.5})`);
      gradient.addColorStop(1, 'rgba(80,40,20,0)');
    } else {
      gradient.addColorStop(0, 'rgba(30,10,2,0)');
      gradient.addColorStop(0.5, `rgba(50,20,8,${alpha*0.4})`);
      gradient.addColorStop(1, 'rgba(90,45,25,0)');
    }
    charCtx.fillStyle = gradient;
    charCtx.beginPath();
    // Slightly irregular shape for scorch too
    const scorchPts = 6;
    for (let p = 0; p < scorchPts; p++) {
      const angle = (p / scorchPts) * Math.PI * 2;
      const r = lr * (0.8 + Math.random() * 0.4);
      if (p === 0) charCtx.moveTo(tx + Math.cos(angle) * r, ty + Math.sin(angle) * r);
      else charCtx.lineTo(tx + Math.cos(angle) * r, ty + Math.sin(angle) * r);
    }
    charCtx.closePath();
    charCtx.fill();
  }

  // Emit fire & ash particles
  particles.emit(fireTouchX, fireTouchY, 'fire', 5);
  particles.emit(fireTouchX, fireTouchY - 25, 'ash', 3);

  // Vibration
  if (navigator.vibrate) navigator.vibrate(25);

  // Check completion: count remaining paper pixels
  const imgData = paperCtx.getImageData(0, 0, paperCanvas.width, paperCanvas.height);
  let remaining = 0;
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] > 10) remaining++;
  }

  // Complete when 65% of paper remains (only 35% burned area needed)
  if (remaining < totalPaperPixels * 0.65) {
    completeFire();
  }
}

function completeFire() {
  if (fireCompleted) return;
  fireCompleted = true;
  fireTouching = false;
  unbindDestructionEvents();
  if (typeof audioManager !== 'undefined') { audioManager.stop('fire'); audioManager.play('explode'); }
  particles.emitBurst(
    canvas.width / (2 * (window.devicePixelRatio || 1)),
    canvas.height / (2 * (window.devicePixelRatio || 1)),
    'ash', 50
  );
  if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 30]);
  setTimeout(() => finishDestruction(), 800);
}

function renderFire(ctx) {
  if (!paperCanvas || !charCanvas) return;

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, w, h);

  // Layer 1: original paper
  ctx.drawImage(paperCanvas, 0, 0, w, h);

  // Layer 2: char marks (multiply blend for realistic burning)
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(charCanvas, 0, 0, w, h);

  // Back to normal blend for glow
  ctx.globalCompositeOperation = 'source-over';

  // Layer 3: burn glow
  if (fireTouching) {
    const gradient = ctx.createRadialGradient(fireTouchX, fireTouchY, 8, fireTouchX, fireTouchY, 60);
    gradient.addColorStop(0, 'rgba(255,120,20,0.5)');
    gradient.addColorStop(0.4, 'rgba(255,60,10,0.2)');
    gradient.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}

// === Shred Setup ===
function setupShred() {
  shredProgress = 0;
  const shredder = document.getElementById('shredder-slot');
  if (shredder) shredder.classList.remove('hidden');
}

function updateShred(y) {
  const h = canvas.height / (window.devicePixelRatio || 1);
  shredCurrentY = y;
  shredProgress = Math.max(0, Math.min(1, y / (h * 0.55)));  // need more drag → slower shred

  // Vibration — stronger buzz
  if (navigator.vibrate && shredProgress > 0.06) {
    navigator.vibrate(20);
  }

  if (shredProgress >= 0.92) {
    completeShred();
  }
}

function completeShred() {
  unbindDestructionEvents();
  if (typeof audioManager !== 'undefined') { audioManager.stop('shred'); audioManager.play('explode'); }
  // Keep shredder image visible during particle burst
  const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
  const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
  // Full-screen confetti burst
  particles.emitBurst(cx, cy + 40, 'shred', 120);
  particles.emitBurst(cx - 60, cy - 20, 'shred', 60);
  particles.emitBurst(cx + 60, cy - 20, 'shred', 60);
  if (navigator.vibrate) navigator.vibrate([25, 40, 25, 40, 25]);
  // Hide shredder after particles settle
  setTimeout(() => {
    const shredder = document.getElementById('shredder-slot');
    if (shredder) shredder.classList.add('hidden');
  }, 600);
  setTimeout(() => finishDestruction(), 1500);
}

function renderShred(ctx) {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const cx = w / 2;

  ctx.clearRect(0, 0, w, h);

  // Shredder mouth position: bottom of screen
  const shredMouthY = h - 125;

  // Paper dimensions matching CSS: 88vw capped at 360px, ratio 1.4
  const pw = Math.min(w * 0.88, 360);
  const ph = pw * 1.4;
  const px = (w - pw) / 2;
  // Paper moves from its original position (top 12%) down toward shredder
  const paperOrigY = h * 0.12;
  const paperTargetY = shredMouthY - ph * 0.3;
  const paperY = paperOrigY + shredProgress * (paperTargetY - paperOrigY);

  // Shadow
  const shadowAlpha = 0.15 - shredProgress * 0.1;
  if (shadowAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, paperY + ph + 4, pw / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Number of strips increases as paper goes deeper
  const strips = Math.max(1, Math.floor(4 + shredProgress * 14));
  const stripWidth = pw / strips;

  for (let i = 0; i < strips; i++) {
    const sx = px + i * stripWidth;
    // Strips wiggle more as they get closer to shredder
    const offset = Math.sin(i * 1.7 + shredProgress * 8) * (4 + shredProgress * 16);
    const stripH = ph;

    // Clip: strip is only visible above the shredder mouth
    const visibleTop = paperY;
    const visibleBottom = Math.min(paperY + stripH, shredMouthY);

    if (visibleBottom > visibleTop && paperSnapshot && paperSnapshot.complete) {
      // Draw this strip from the snapshot image
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx + offset, visibleTop, stripWidth - 1.5, visibleBottom - visibleTop);
      ctx.clip();
      // Draw paper snapshot, shifted so the correct part of the paper shows
      ctx.drawImage(paperSnapshot, px, paperY, pw, ph);
      ctx.restore();

      // Strip edge line
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + offset, visibleTop);
      ctx.lineTo(sx + offset, visibleBottom);
      ctx.stroke();
    }

    // Below mouth: tiny confetti pieces
    if (shredProgress > 0.3 && paperY + stripH >= shredMouthY) {
      const confettiW = stripWidth * 0.7;
      const confettiH = 4 + Math.random() * 8;
      ctx.fillStyle = '#f5f0e8';
      ctx.fillRect(sx + offset + 4, shredMouthY + 2 + Math.random() * 10, confettiW, confettiH);
    }
  }

  // Red glow at shredder mouth
  if (shredProgress > 0.4) {
    const glow = ctx.createLinearGradient(0, shredMouthY - 8, 0, shredMouthY + 4);
    glow.addColorStop(0, 'rgba(255,40,40,0)');
    glow.addColorStop(0.5, 'rgba(255,40,40,0.15)');
    glow.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, shredMouthY - 8, w, 12);
  }

  // Particles fly out across full screen
  if (shredProgress > 0.2) {
    const count = Math.floor(strips * 1.5);
    for (let i = 0; i < count; i++) {
      const sx = Math.random() * w;
      const sy = shredMouthY + Math.random() * 40;
      particles.emit(sx, sy, 'shred', 1);
    }
  }
}

// === Press Setup ===
function setupPress() {
  pressLevel = 0;
  const plate = document.getElementById('press-plate');
  if (plate) {
    plate.classList.remove('hidden');
    plate.style.top = '-80px';
  }
}

function updatePress() {
  pressLevel += 1 / pressTapsNeeded;

  // Vibration + sound
  if (navigator.vibrate) navigator.vibrate(30);
  if (typeof audioManager !== 'undefined') audioManager.play('press');

  // Update press plate position
  const plate = document.getElementById('press-plate');
  if (plate) {
    const maxTop = (canvas.height / (window.devicePixelRatio || 1)) * 0.35;
    const top = -80 + pressLevel * (maxTop + 80);
    plate.style.top = `${Math.min(maxTop, top)}px`;
  }

  if (pressLevel >= 1.0) {
    completePress();
  }
}

function completePress() {
  unbindDestructionEvents();
  if (typeof audioManager !== 'undefined') audioManager.play('explode');
  const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
  const cy = canvas.height / (2 * (window.devicePixelRatio || 1));

  // Explosion — more fragments!
  particles.emitBurst(cx, cy, 'explode', 150);
  particles.emitBurst(cx, cy, 'spark', 60);
  particles.emitBurst(cx, cy, 'shred', 80);
  if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 40, 100]);

  const plate = document.getElementById('press-plate');
  if (plate) plate.classList.add('hidden');

  setTimeout(() => finishDestruction(), 1000);
}

function renderPress(ctx) {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const cx = w / 2, cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Paper dimensions matching CSS
  const pw = Math.min(w * 0.88, 360);
  const origPh = pw * 1.4;

  // Compressed paper: widens horizontally, flattens vertically
  const compressedPw = pw + pressLevel * 50;
  const compressedPh = origPh * (1 - pressLevel * 0.88);
  const px = cx - compressedPw / 2;
  const py = cy - compressedPh / 2;

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${0.15 + pressLevel * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(cx, py + compressedPh + 3, compressedPw / 2, 4 - pressLevel * 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw the actual paper snapshot, squished
  if (paperSnapshot && paperSnapshot.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, compressedPw, Math.max(4, compressedPh));
    ctx.clip();
    // Draw snapshot stretched to match compressed dimensions
    ctx.drawImage(paperSnapshot, px, py, compressedPw, Math.max(4, compressedPh));
    ctx.restore();
  } else {
    // Fallback if no snapshot
    ctx.fillStyle = '#f0ece0';
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(px, py, compressedPw, Math.max(4, compressedPh));
    ctx.fill();
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, compressedPw, Math.max(4, compressedPh));

  // Crease marks intensify as pressed
  if (pressLevel > 0.3) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < pressLevel * 8; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * (compressedPw / 8), py);
      ctx.lineTo(px + i * (compressedPw / 8), py + Math.max(4, compressedPh));
      ctx.stroke();
    }
  }

  // (cracking text removed)
}

// === Auto destruction (for preset mode) ===
async function autoDestruct(tool) {
  const steps = tool === 'shred' ? 55 : 30;  // shred takes longer
  const dpr = window.devicePixelRatio || 1;
  const cx = canvas.width / (2 * dpr);
  const cy = canvas.height / (2 * dpr);

  // Initialize based on tool
  if (tool === 'fire') {
    fireTouching = true;
    fireTouchX = cx;
    fireTouchY = cy;
  }
  if (tool === 'shred') {
    const shredder = document.getElementById('shredder-slot');
    if (shredder) shredder.classList.remove('hidden');
  }
  if (tool === 'press') {
    const plate = document.getElementById('press-plate');
    if (plate) plate.classList.remove('hidden');
  }

  await sleep(200);

  // Step through the destruction
  for (let step = 0; step < steps; step++) {
    switch (tool) {
      case 'fire':
        fireTouchX = cx + (Math.random() - 0.5) * 100;
        fireTouchY = cy + (Math.random() - 0.5) * 60;
        fireTouching = true;
        updateFire();
        break;
      case 'shred':
        shredProgress = step / steps;
        break;
      case 'press':
        pressLevel = step / steps;
        const plate = document.getElementById('press-plate');
        if (plate) {
          const maxTop = (canvas.height / dpr) * 0.35;
          plate.style.top = `${-80 + (step / steps) * (maxTop + 80)}px`;
        }
        break;
    }

    await sleep(60);
  }

  // Run completion effect
  if (tool === 'fire') completeFire();
  else if (tool === 'shred') completeShred();
  else if (tool === 'press') completePress();

  // Wait for completion animation to finish
  await sleep(1200);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// === Hint text ===
function updateHint(tool) {
  const hint = document.getElementById('hint-text');
  const hints = {
    fire: '长按纸烧掉它，松手即焚 🔥',
    shred: '按住纸向下拖，塞进碎纸机 🔪',
    press: '疯狂点击屏幕，用液压机压扁它 🔨'
  };
  if (hint) hint.textContent = hints[tool] || '';
}

// === Event binding ===
function bindDestructionEvents(tool) {
  eventsActive = true;

  switch (tool) {
    case 'fire':
      canvas.addEventListener('touchstart', onFireStart);
      canvas.addEventListener('touchmove', onFireMove);
      canvas.addEventListener('touchend', onFireEnd);
      canvas.addEventListener('mousedown', onFireStartMouse);
      canvas.addEventListener('mousemove', onFireMoveMouse);
      canvas.addEventListener('mouseup', onFireEnd);
      break;

    case 'shred':
      canvas.addEventListener('touchstart', onShredStart);
      canvas.addEventListener('touchmove', onShredMove);
      canvas.addEventListener('touchend', onShredEnd);
      canvas.addEventListener('mousedown', onShredStartMouse);
      canvas.addEventListener('mousemove', onShredMoveMouse);
      canvas.addEventListener('mouseup', onShredEndMouse);
      break;

    case 'press':
      canvas.addEventListener('click', onPressClick);
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); updatePress(); });
      break;
  }
}

let eventsActive = false;

function unbindDestructionEvents() {
  eventsActive = false;
  // Reset interaction flags — events stay bound but become no-ops
  fireTouching = false;
  shredDragging = false;
}

// Fire events
function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
  };
}

function onFireStart(e) { e.preventDefault(); if (!eventsActive) return; const p = getEventPos(e); fireTouchX = p.x; fireTouchY = p.y; fireTouching = true; if (typeof audioManager !== 'undefined') audioManager.play('fire'); }
function onFireMove(e) { e.preventDefault(); if (!eventsActive) return; const p = getEventPos(e); fireTouchX = p.x; fireTouchY = p.y; }
function onFireEnd(e) { e.preventDefault(); if (fireTouching && eventsActive) completeFire(); fireTouching = false; }
function onFireStartMouse(e) { if (!eventsActive) return; const p = getEventPos(e); fireTouchX = p.x; fireTouchY = p.y; fireTouching = true; if (typeof audioManager !== 'undefined') audioManager.play('fire'); }
function onFireMoveMouse(e) { if (!fireTouching || !eventsActive) return; const p = getEventPos(e); fireTouchX = p.x; fireTouchY = p.y; }

// Shred events
function onShredStart(e) { e.preventDefault(); if (!eventsActive) return; const p = getEventPos(e); shredDragging = true; shredStartY = p.y; if (typeof audioManager !== 'undefined') audioManager.play('shred'); }
function onShredMove(e) { e.preventDefault(); if (!shredDragging || !eventsActive) return; const p = getEventPos(e); updateShred(p.y); }
function onShredEnd(e) { e.preventDefault(); if (shredProgress > 0.25) completeShred(); else { shredDragging = false; if (typeof audioManager !== 'undefined') audioManager.stop('shred'); } }
function onShredStartMouse(e) { if (!eventsActive) return; const p = getEventPos(e); shredDragging = true; shredStartY = p.y; if (typeof audioManager !== 'undefined') audioManager.play('shred'); }
function onShredEndMouse(e) { if (shredProgress > 0.25) completeShred(); else shredDragging = false; }
function onShredMoveMouse(e) { if (!shredDragging || !eventsActive) return; const p = getEventPos(e); updateShred(p.y); }

// Press events
function onPressClick(e) { if (!eventsActive) return; updatePress(); }

// === Finish ===
function finishDestruction() {
  destructionComplete = true;

  // Clear canvas after particles settle, then stop loop
  setTimeout(() => {
    stopRenderLoop();
  }, 800);

  if (resolvePromise) {
    resolvePromise();
    resolvePromise = null;
  }
}

// === Main render loop ===
let loopRunning = false;

function startRenderLoop() {
  if (loopRunning) return;
  loopRunning = true;
  lastTime = 0;
  animFrameId = requestAnimationFrame(renderLoop);
}

function stopRenderLoop() {
  loopRunning = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  // Clear canvas
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  if (particles) particles.clear();
}

function renderLoop(timestamp) {
  if (!loopRunning) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  if (destructionType && !destructionComplete) {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    switch (destructionType) {
      case 'fire':
        renderFire(ctx);
        break;
      case 'shred':
        renderShred(ctx);
        break;
      case 'press':
        renderPress(ctx);
        break;
    }

    // Always update and draw particles
    if (particles) {
      particles.update(dt);
      particles.draw(ctx);
    }

    // Fire continuous update
    if (destructionType === 'fire' && fireTouching) {
      updateFire();
    }
  }

  animFrameId = requestAnimationFrame(renderLoop);
}
