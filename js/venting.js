// === Venting Modes — Canvas-based发泄场景 ===

// ========== Image Preloading ==========
const VentImages = {};
(function preloadVentingImages() {
  const imgs = {
    earth:        'assets/img/earth.jpg',
    earthCracked: 'assets/img/earth-cracked.png',
    hammer:       'assets/img/hammer.png',
    fling:        'assets/img/fling-person.png',
    stickman:     'assets/img/stickman.png',
    zombie:       'assets/img/zombie.png',
    longpress:    'assets/img/longpress.png',
    tap:          'assets/img/tap.png',
    standAlone:   'assets/img/stand-alone.png',
    flyAlone:     'assets/img/fly-alone.png',
  };
  Object.entries(imgs).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    VentImages[key] = img;
  });
})();

// ========== Shared State ==========
let vCanvas, vCtx, vOpts, vRunning, vMode;
let vPhase = 'intro';
let vProgress = 0;
let vStartTime = 0;

// Input
let vPressStart = 0;
let vPressing = false;
let vPressX = 0, vPressY = 0;
let vAudioLevel = 0;

// Particles + state
let vParticles = [];
let vState = {};

// Mic
let vMicStream = null;
let vMicAnalyser = null;
let vMicData = null;

// ========== Entry Point ==========

window.startVentingMode = function(mode, opts) {
  vCanvas = document.getElementById('venting-canvas');
  if (!vCanvas) return;
  vCtx = vCanvas.getContext('2d');
  vOpts = opts;
  vMode = mode;
  vRunning = true;
  vPhase = 'intro';
  vProgress = 0;
  vStartTime = performance.now();
  vParticles = [];
  vState = {};
  vAudioLevel = 0;
  vPressing = false;

  const dpr = window.devicePixelRatio || 1;
  vCanvas.width = window.innerWidth * dpr;
  vCanvas.height = window.innerHeight * dpr;
  vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  initMode(mode);
  setupModeInputs(mode);
  updateVentHint();
  requestAnimationFrame(vLoop);
};

function updateVentHint() {
  const hints = {
    spin:    { text: '', showProgress: false },
    hammer:  { text: '', showProgress: false },
    zombie:  { text: '长按屏幕，吼叫助威！', showProgress: false },
  };
  const h = hints[vMode] || { text: '', showProgress: false };
  if (typeof updateVentingHint === 'function') {
    updateVentingHint(h.text, h.showProgress ? vProgress : undefined);
  }
}

// ========== Animation Loop ==========

function vLoop(now) {
  if (!vRunning) return;
  const dt = Math.min(0.1, (now - (vLoop._last || now)) / 1000);
  vLoop._last = now;
  const w = window.innerWidth, h = window.innerHeight;
  const elapsed = (now - vStartTime) / 1000;

  vCtx.clearRect(0, 0, w, h);
  vCtx.fillStyle = '#fafafa';
  vCtx.fillRect(0, 0, w, h);

  updateMode(dt, now, elapsed, w, h);
  updateParticles(dt);
  drawMode(vCtx, w, h, now, elapsed);
  drawParticles(vCtx);

  if (vPhase === 'intro' && elapsed > 0.8) { vPhase = 'active'; updateVentHint(); }
  if (vPhase === 'active' && vProgress >= 1) {
    vPhase = 'climax'; vStartTime = now; updateVentHint();
    // Spawn confetti for zombie climax
    if (vMode === 'zombie') {
      for (let i = 0; i < 100; i++) {
        vParticles.push({
          x: w * 0.2 + Math.random() * w * 0.6,
          y: h * 0.3 + Math.random() * h * 0.4,
          vx: (Math.random() - 0.5) * 500,
          vy: -300 - Math.random() * 600,
          life: 2.0 + Math.random() * 3.0,
          size: 5 + Math.random() * 10,
          color: `hsl(${Math.random() * 360}, 85%, ${55 + Math.random() * 35}%)`
        });
      }
    }
  }
  if (vPhase === 'climax' && (now - vStartTime) / 1000 > 2.0) {
    vPhase = 'outro'; vRunning = false;
    cleanupMode();
    if (vOpts && vOpts.onComplete) vOpts.onComplete();
    return;
  }
  requestAnimationFrame(vLoop);
}

// ========== Mode Init ==========

function initMode(mode) {
  switch (mode) {
    case 'spin':
      vState = {
        // Earth (button)
        earthCX: 0, earthCY: 0, earthR: 0,
        // Character oscillation
        swayAngle: 0, swaySpeed: 0, maxSway: 0,
        // Fling
        hasFlung: false,
        flyX: null, flyY: null, flyScale: 1,
        flyAngle: 0,
        // Phase
        showStand: false,
      };
      break;
    case 'hammer':
      vState = {
        earthCX: 0, earthCY: 0, earthR: 0,
        hammerY: -120, hammerTargetY: -120,
        hammerRotation: 0,
        earthCracked: false,
        hitCount: 0, hitsNeeded: 18,
        lastHitTime: 0,
        shakeX: 0, shakeY: 0,
        earthScale: 1,
        // Tap button area (set in draw)
        tapBtnX: 0, tapBtnY: 0, tapBtnW: 0, tapBtnH: 0,
      };
      break;
    case 'zombie':
      vState = {
        zombies: [], zombieCount: 4,
        earthCX: 0, earthCY: 0, earthR: 0,
        zombieReached: false, reachedTime: 0
      };
      break;
  }
}

// ========== Update ==========

function updateMode(dt, now, elapsed, w, h) {
  switch (vMode) {
    case 'spin': updateSpin(dt, now, w, h); break;
    case 'hammer': updateHammer(dt, now, w, h); break;
    case 'zombie': updateZombie(dt, now, w, h); break;
  }
}

// --- Spin ---
function triggerFling(s) {
  s.hasFlung = true;
  s.showStand = true;
  const charX = s.earthCX;
  const charY = s.earthCY - s.earthR * 0.45;
  s.flyAngle = -0.6;
  s.flyX = charX;
  s.flyY = charY;
  s.flyScale = 1;
  for (let i = 0; i < 30; i++) {
    const a = s.flyAngle + (Math.random() - 0.5) * 0.8;
    const sp = 200 + Math.random() * 500;
    vParticles.push({
      x: s.flyX, y: s.flyY,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 1.2 + Math.random() * 0.8,
      size: 2 + Math.random() * 6,
      color: `hsl(${30 + Math.random() * 40}, 90%, ${50 + Math.random() * 30}%)`
    });
  }
  if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  if (typeof audioManager !== 'undefined') audioManager.play('whoosh');
}

function updateSpin(dt, now, w, h) {
  const s = vState;
  s.earthCX = w / 2;
  s.earthCY = h * 0.38;
  s.earthR = Math.min(130, w * 0.32);

  if (vPhase === 'intro') {
    s.swayAngle += dt * 0.6;
    return;
  }

  if (vPhase === 'active') {
    if (vPressing) {
      const pressDur = (now - vPressStart) / 1000;
      s.swaySpeed += dt * (2.5 + pressDur * 0.9);
      s.maxSway = Math.max(s.maxSway, s.swaySpeed);
      s.swayAngle += s.swaySpeed * dt;
      vProgress = Math.min(1, pressDur / 3.0);
      // Pulsing vibration during spin — faster as speed increases
      const vibeInterval = Math.max(40, 300 - s.swaySpeed * 40);
      if (!s._lastVibe || now - s._lastVibe > vibeInterval) {
        s._lastVibe = now;
        if (navigator.vibrate) navigator.vibrate(8);
      }
      // Auto-fling when max speed reached
      if (vProgress >= 1 && !s.hasFlung) {
        triggerFling(s);
      }
    } else {
      // Released — fling if spinning fast enough
      if (s.swaySpeed > 3.5 && !s.hasFlung) {
        triggerFling(s);
      }
      if (!s.hasFlung) {
        s.swaySpeed = Math.max(0, s.swaySpeed - dt * 1.5);
      }
      s.swayAngle += s.swaySpeed * dt;
      if (s.hasFlung) {
        s.swaySpeed = Math.max(0.3, s.swaySpeed - dt * 0.6);
      }
    }
  }

  // Update flying — completion when fly image exits screen or shrinks away
  if (s.hasFlung && s.flyX !== null) {
    s.flyX += Math.cos(s.flyAngle) * 400 * dt;
    s.flyY += Math.sin(s.flyAngle) * 400 * dt - 80 * dt;
    s.flyScale = Math.max(0.02, s.flyScale - dt * 0.55);
    // Trail
    vParticles.push({
      x: s.flyX + (Math.random() - 0.5) * 10,
      y: s.flyY + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      life: 0.4 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 2.5,
      color: 'hsl(0, 0%, 70%)'
    });
    if (s.flyScale < 0.03 || s.flyX < -200 || s.flyX > w + 200 || s.flyY < -300) {
      vProgress = 1;
    }
  }
}

// --- Hammer ---
function updateHammer(dt, now, w, h) {
  const s = vState;
  // Hammer retract
  if (s.hammerY > s.hammerTargetY) {
    s.hammerY += (s.hammerTargetY - s.hammerY) * 15 * dt;
    if (Math.abs(s.hammerY - s.hammerTargetY) < 0.5) s.hammerY = s.hammerTargetY;
  }
  s.hammerRotation *= Math.exp(-10 * dt);
  s.shakeX *= Math.exp(-6 * dt);
  s.shakeY *= Math.exp(-6 * dt);
  s.earthScale += (1 - s.earthScale) * 4 * dt;
}

function hammerHit(w, h) {
  const s = vState;
  if (vPhase !== 'active' || s.earthCracked) return;
  // Ensure earth position is computed
  if (!s.earthCX) { s.earthCX = w / 2; s.earthCY = h * 0.42; s.earthR = Math.min(130, w * 0.32); }
  const now = performance.now();
  if (now - s.lastHitTime < 100) return;
  s.lastHitTime = now;

  s.hitCount++;
  vProgress = Math.min(1, s.hitCount / s.hitsNeeded);

  // Hammer strikes down
  s.hammerTargetY = s.earthCY - s.earthR * 0.5;
  s.hammerY = s.earthCY - s.earthR * 1.1;
  s.hammerRotation = 0.45;  // hammer head swings forward
  s.shakeX = (Math.random() - 0.5) * 14;
  s.shakeY = (Math.random() - 0.5) * 10;
  s.earthScale = 0.95;

  // Sparks
  for (let i = 0; i < 6; i++) {
    vParticles.push({
      x: s.earthCX + (Math.random() - 0.5) * 50,
      y: s.earthCY + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 250, vy: -100 - Math.random() * 200,
      life: 0.4 + Math.random() * 0.4,
      size: 1.5 + Math.random() * 3,
      color: `hsl(${30 + Math.random() * 20}, 100%, ${55 + Math.random() * 35}%)`
    });
  }
  if (navigator.vibrate) navigator.vibrate(12);
  if (typeof audioManager !== 'undefined') audioManager.play('impact');

  if (vProgress >= 1 && !s.earthCracked) {
    s.earthCracked = true;
    if (navigator.vibrate) navigator.vibrate([20, 40, 20, 40, 20]);
    if (typeof audioManager !== 'undefined') audioManager.play('explode');
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 150 + Math.random() * 500;
      vParticles.push({
        x: s.earthCX, y: s.earthCY,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.8 + Math.random() * 1.2,
        size: 3 + Math.random() * 8,
        color: Math.random() > 0.5
          ? `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
          : `hsl(200, ${30 + Math.random() * 40}%, ${40 + Math.random() * 30}%)`
      });
    }
  }
}

// --- Zombie ---
function updateZombie(dt, now, w, h) {
  const s = vState;
  // Earth at TOP
  const earthR = Math.min(150, w * 0.35);
  s.earthR = earthR;
  s.earthCX = w / 2;
  s.earthCY = h * 0.22;

  // Init zombies at bottom
  if (s.zombies.length === 0) {
    for (let i = 0; i < s.zombieCount; i++) {
      s.zombies.push({
        x: w * 0.15 + (i / (s.zombieCount - 1 || 1)) * w * 0.7,
        y: h + 40 + Math.random() * 60,
        baseX: w * 0.15 + (i / (s.zombieCount - 1 || 1)) * w * 0.7,
        size: 80 + Math.random() * 50,  // 2x bigger
        wobble: Math.random() * Math.PI * 2,
        speed: 70 + Math.random() * 90
      });
    }
  }

  if (vPhase === 'intro') {
    s.zombies.forEach(z => { z.wobble += dt * 2; });
    return;
  }

  if (vPhase === 'active') {
    // Decay audio level when not holding (for press-and-hold mode)
    if (!vPressing) {
      vAudioLevel = Math.max(0, vAudioLevel - dt * 0.35);
    }
    const speedMult = Math.min(1, vAudioLevel * 4);
    // Periodic zombie groan while approaching
    if (speedMult > 0.1 && (!s._lastGrowl || now - s._lastGrowl > 1500)) {
      s._lastGrowl = now;
      if (typeof audioManager !== 'undefined') audioManager.play('growl');
    }
    const earthBottom = s.earthCY + earthR * 0.5;
    let anyReached = false;

    s.zombies.forEach(z => {
      z.wobble += dt * (3 + speedMult * 8);
      z.x += (z.baseX + Math.sin(z.wobble * 0.5) * 20 - z.x) * 1.5 * dt;
      const spd = z.speed * speedMult * dt;
      if (z.y > earthBottom + 20) {
        z.y -= spd;  // move upward toward earth
      } else {
        anyReached = true;
      }
    });

    if (anyReached) {
      if (!s.zombieReached) {
        s.zombieReached = true;
        s.reachedTime = now;
        if (navigator.vibrate) navigator.vibrate([15, 50, 15, 50, 15]);
        if (typeof audioManager !== 'undefined') audioManager.play('growl');
      }
      if (now - s.reachedTime > 1500) vProgress = 1;
    } else {
      s.zombieReached = false;
    }

    if (speedMult < 0.05) {
      s.zombies.forEach(z => { z.y += (h + 40 - z.y) * 0.1 * dt; });
    }

    if (typeof updateVentingHint === 'function') {
      const volPct = Math.round(speedMult * 100);
      updateVentingHint(
        speedMult > 0.8 ? `吼得好！继续！ ${volPct}%` :
        speedMult > 0.4 ? `再大声点！ ${volPct}%` :
        speedMult > 0.1 ? `长按屏幕吼叫... ${volPct}%` :
        '长按屏幕，吼叫助威！',
        undefined
      );
    }
  }
}

// ========== Draw ==========

function drawMode(ctx, w, h, now, elapsed) {
  // Spin uses image-based climax, not text
  if ((vPhase === 'climax' || vPhase === 'outro') && vMode !== 'spin') { drawClimax(ctx, w, h, now); return; }
  if ((vPhase === 'climax' || vPhase === 'outro') && vMode === 'spin') {
    drawSpin(ctx, w, h, now);  // keep showing images
    return;
  }
  switch (vMode) {
    case 'spin': drawSpin(ctx, w, h, now); break;
    case 'hammer': drawHammer(ctx, w, h, now); break;
    case 'zombie': drawZombie(ctx, w, h, now); break;
  }
}

// --- Draw Spin ---
function drawSpin(ctx, w, h, now) {
  const s = vState;
  const cx = s.earthCX, cy = s.earthCY, r = s.earthR;

  // Earth image — no border
  const earthImg = VentImages.earth;
  if (earthImg && earthImg.complete && earthImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(earthImg, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    const grad = ctx.createRadialGradient(cx - 5, cy - 15, 5, cx, cy, r);
    grad.addColorStop(0, '#5b9bd5');
    grad.addColorStop(0.7, '#2d5f8a');
    grad.addColorStop(1, '#1a3a5c');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (!s.hasFlung) {
    // Propeller-style spin at fixed position, 3x bigger
    const charX = cx;
    const charY = cy - r * 0.25;
    ctx.save();
    ctx.translate(charX, charY);
    ctx.rotate(s.swayAngle);
    drawImageCentered(ctx, VentImages.fling, 0, 0, 180, 180);
    ctx.restore();
  }

  // After fling: 站立单独 keeps spinning in same position
  if (s.showStand) {
    const charX = cx;
    const charY = cy - r * 0.25;
    ctx.save();
    ctx.translate(charX, charY);
    ctx.rotate(s.swayAngle * 0.5);
    drawImageCentered(ctx, VentImages.standAlone, 0, 0, 180, 180);
    ctx.restore();
  }
  // 飞翔单独 flying away upper-right, shrinking
  if (s.hasFlung && s.flyX !== null) {
    const fw = 180 * s.flyScale;
    const fh = 180 * s.flyScale;
    if (fw > 2) {
      drawImageCentered(ctx, VentImages.flyAlone, s.flyX, s.flyY, fw, fh);
    }
  }

  // Instruction: 长按.png 3x bigger
  const lpImg = VentImages.longpress;
  const btnCX = cx;
  const btnCY = cy + r + 60;
  if (lpImg && lpImg.complete && lpImg.naturalWidth > 0) {
    drawImageCentered(ctx, lpImg, btnCX, btnCY, 200, 200);
  }
  ctx.fillStyle = '#555';
  ctx.font = '14px "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按地球，加速', btnCX, btnCY + 112);
}

// --- Draw Hammer ---
function drawHammer(ctx, w, h, now) {
  const s = vState;
  const cx = s.earthCX || w / 2;
  const cy = s.earthCY || h * 0.42;
  const r = s.earthR || 130;

  // Earth — use cracked image if destroyed
  ctx.save();
  ctx.translate(cx + s.shakeX, cy + s.shakeY);
  ctx.scale(s.earthScale, s.earthScale);

  const earthKey = s.earthCracked ? 'earthCracked' : 'earth';
  const earthImg = VentImages[earthKey];
  if (earthImg && earthImg.complete && earthImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(earthImg, -r, -r, r * 2, r * 2);
    ctx.restore();
  } else {
    const grad = ctx.createRadialGradient(0, -15, 5, 0, 0, r);
    grad.addColorStop(0, s.earthCracked ? '#8a8a8a' : '#5b9bd5');
    grad.addColorStop(1, '#1a3a5c');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();

  // Hammer — shifted left by one photo distance
  const hx = cx - 70;
  const hammerImg = VentImages.hammer;
  if (hammerImg && hammerImg.complete && hammerImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(hx, s.hammerY + 110);
    ctx.rotate(s.hammerRotation);
    ctx.drawImage(hammerImg, -45, -110, 90, 130);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(hx, s.hammerY);
    ctx.rotate(s.hammerRotation);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-5, 0, 10, 90);
    ctx.fillStyle = '#555';
    ctx.fillRect(-34, -24, 68, 34);
    ctx.restore();
  }

  // Tap button 2x bigger
  const tapImg = VentImages.tap;
  const btnCX = cx;
  const btnCY = cy + r + 82;
  if (tapImg && tapImg.complete && tapImg.naturalWidth > 0) {
    drawImageCentered(ctx, tapImg, btnCX, btnCY, 160, 160);
  }
  ctx.fillStyle = '#555';
  ctx.font = '14px "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('点击爆锤地球', btnCX, btnCY + 94);
}

// --- Draw Zombie ---
function drawZombie(ctx, w, h, now) {
  const s = vState;
  const earthR = s.earthR || 140;
  const ecx = s.earthCX || w / 2;
  const ecy = s.earthCY || h * 0.22;

  // Background — same as other modes
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Earth at top — no border
  const earthImg = VentImages.earth;
  if (earthImg && earthImg.complete && earthImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ecx, ecy, earthR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(earthImg, ecx - earthR, ecy - earthR, earthR * 2, earthR * 2);
    ctx.restore();
  } else {
    const grad = ctx.createRadialGradient(ecx - 5, ecy - 15, 8, ecx, ecy, earthR);
    grad.addColorStop(0, '#5b9bd5');
    grad.addColorStop(0.8, '#1a3a5c');
    grad.addColorStop(1, '#0a1a2a');
    ctx.beginPath();
    ctx.arc(ecx, ecy, earthR, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
  }

  // Buildings on earth
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(ecx - 50, ecy - 65, 9, 20);
  ctx.fillRect(ecx + 15, ecy - 78, 7, 32);
  ctx.fillRect(ecx + 40, ecy - 50, 6, 15);

  // Zombies from bottom
  s.zombies.forEach(z => {
    const zombieImg = VentImages.zombie;
    ctx.save();
    ctx.translate(z.x, z.y);
    if (zombieImg && zombieImg.complete && zombieImg.naturalWidth > 0) {
      const wobX = Math.sin(z.wobble) * 4;
      ctx.drawImage(zombieImg, -z.size / 2 + wobX, -z.size * 1.2, z.size, z.size * 2.0);
    } else {
      drawZombieFigure(ctx, 0, 0, now, z.wobble, z.size);
    }
    ctx.restore();
  });

  // Volume indicator
  const volH = vAudioLevel * 35;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(w - 32, 20, 16, 140);
  ctx.fillStyle = vAudioLevel > 0.7 ? '#f55' : vAudioLevel > 0.4 ? '#ea4' : '#4a4';
  ctx.fillRect(w - 30, 20 + 140 - volH * 4, 12, volH * 4);
}

// --- Climax ---
function drawClimax(ctx, w, h, now) {
  ctx.fillStyle = 'rgba(250,250,250,0.7)';
  ctx.fillRect(0, 0, w, h);

  if (vMode === 'hammer') {
    // Show cracked earth image
    const img = VentImages.earthCracked;
    if (img && img.complete && img.naturalWidth > 0) {
      const sz = Math.min(280, w * 0.65);
      ctx.drawImage(img, w / 2 - sz / 2, h / 2 - sz / 2, sz, sz);
    }
  } else if (vMode === 'zombie') {
    // Show text with confetti
    const alpha = vPhase === 'climax' ? Math.min(1, (now - vStartTime) / 1000) : 0;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.font = 'bold 28px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('僵尸统治世界！！', w / 2, h / 2);
  }
}

// ========== Drawing Helpers ==========

function drawImageCentered(ctx, img, cx, cy, w, h) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawStickFigureMini(ctx, x, y, r, now, isFrenzy) {
  const wb = isFrenzy ? Math.sin(now * 0.03) * 4 : 0;
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.3); ctx.lineTo(x + wb, y + r * 0.3); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + wb * 0.6, y - r * 0.65, r * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (isFrenzy) {
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${r * 0.35}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('×', x - r * 0.10, y - r * 0.58);
    ctx.fillText('×', x + r * 0.10, y - r * 0.58);
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(x - r * 0.10, y - r * 0.68, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.10, y - r * 0.68, r * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  const asw = isFrenzy ? Math.sin(now * 0.05) * r * 0.35 : 0;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.05); ctx.lineTo(x - r * 0.45 + asw, y + r * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.05); ctx.lineTo(x + r * 0.45 - asw, y + r * 0.2); ctx.stroke();
  const lsw = isFrenzy ? Math.cos(now * 0.05) * r * 0.3 : 0;
  ctx.beginPath(); ctx.moveTo(x + wb, y + r * 0.3); ctx.lineTo(x - r * 0.2 + lsw, y + r * 1.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + wb, y + r * 0.3); ctx.lineTo(x + r * 0.2 - lsw, y + r * 1.0); ctx.stroke();
}

function drawZombieFigure(ctx, x, y, now, wobble, sz) {
  sz = sz || 20;
  ctx.fillStyle = '#5a7a5a'; ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + Math.sin(wobble) * 3, y - sz * 0.1, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f44';
  ctx.beginPath(); ctx.arc(x - sz * 0.1, y - sz * 0.2, sz * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + sz * 0.1, y - sz * 0.2, sz * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a7a5a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - sz * 0.2, y + sz * 0.05); ctx.lineTo(x - sz * 0.6, y - sz * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sz * 0.2, y + sz * 0.05); ctx.lineTo(x + sz * 0.6, y - sz * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - sz * 0.12, y + sz * 0.3); ctx.lineTo(x - sz * 0.18, y + sz * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sz * 0.12, y + sz * 0.3); ctx.lineTo(x + sz * 0.18, y + sz * 0.7); ctx.stroke();
}

// ========== Particles ==========

function updateParticles(dt) {
  for (let i = vParticles.length - 1; i >= 0; i--) {
    const p = vParticles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) vParticles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  vParticles.forEach(p => {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.5));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * ctx.globalAlpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ========== Input Setup ==========

function setupModeInputs(mode) {
  if (vCanvas._cleanup) vCanvas._cleanup();
  vCanvas._cleanup = null;
  const cleanupFns = [];

  if (mode === 'spin') {
    // Long press on the earth button
    function hitTestEarth(touch) {
      const s = vState;
      const dx = touch.clientX - s.earthCX;
      const dy = touch.clientY - s.earthCY;
      return Math.sqrt(dx * dx + dy * dy) < (s.earthR || 130) + 10;
    }
    function onStart(e) {
      e.preventDefault();
      const t = e.touches ? e.touches[0] : e;
      if (!hitTestEarth(t)) return;
      vPressStart = performance.now();
      vPressing = true;
      vPressX = t.clientX; vPressY = t.clientY;
      if (vPhase === 'intro') { vPhase = 'active'; updateVentHint(); }
    }
    function onMove(e) {
      e.preventDefault();
      if (!vPressing) return;
      const t = e.touches ? e.touches[0] : e;
      vPressX = t.clientX; vPressY = t.clientY;
    }
    function onEnd(e) { e.preventDefault(); vPressing = false; }
    vCanvas.addEventListener('touchstart', onStart, { passive: false });
    vCanvas.addEventListener('touchmove', onMove, { passive: false });
    vCanvas.addEventListener('touchend', onEnd, { passive: false });
    vCanvas.addEventListener('mousedown', onStart);
    vCanvas.addEventListener('mousemove', onMove);
    vCanvas.addEventListener('mouseup', onEnd);
    cleanupFns.push(() => {
      vCanvas.removeEventListener('touchstart', onStart);
      vCanvas.removeEventListener('touchmove', onMove);
      vCanvas.removeEventListener('touchend', onEnd);
      vCanvas.removeEventListener('mousedown', onStart);
      vCanvas.removeEventListener('mousemove', onMove);
      vCanvas.removeEventListener('mouseup', onEnd);
    });
  }

  if (mode === 'hammer') {
    function onTap(e) {
      e.preventDefault();
      hammerHit(window.innerWidth, window.innerHeight);
      if (vPhase === 'intro') { vPhase = 'active'; updateVentHint(); }
    }
    vCanvas.addEventListener('touchstart', onTap, { passive: false });
    vCanvas.addEventListener('mousedown', onTap);
    cleanupFns.push(() => {
      vCanvas.removeEventListener('touchstart', onTap);
      vCanvas.removeEventListener('mousedown', onTap);
    });
  }

  if (mode === 'zombie') {
    startMicrophone();
    // Press-and-hold: hold screen to shout (works without HTTPS/mic)
    let zombieHoldRaf = null;
    function onZombieHoldStart(e) {
      e.preventDefault();
      vPressing = true;
      if (vPhase === 'intro') { vPhase = 'active'; updateVentHint(); }
      function rampUp() {
        if (!vRunning || vMode !== 'zombie') { zombieHoldRaf = null; return; }
        vAudioLevel = Math.min(1, vAudioLevel + 0.025);
        zombieHoldRaf = requestAnimationFrame(rampUp);
      }
      if (zombieHoldRaf) cancelAnimationFrame(zombieHoldRaf);
      rampUp();
    }
    function onZombieHoldEnd(e) {
      e.preventDefault();
      vPressing = false;
      if (zombieHoldRaf) { cancelAnimationFrame(zombieHoldRaf); zombieHoldRaf = null; }
    }
    vCanvas.addEventListener('touchstart', onZombieHoldStart, { passive: false });
    vCanvas.addEventListener('touchend', onZombieHoldEnd, { passive: false });
    vCanvas.addEventListener('touchcancel', onZombieHoldEnd, { passive: false });
    vCanvas.addEventListener('mousedown', onZombieHoldStart);
    vCanvas.addEventListener('mouseup', onZombieHoldEnd);
    cleanupFns.push(() => {
      vCanvas.removeEventListener('touchstart', onZombieHoldStart);
      vCanvas.removeEventListener('touchend', onZombieHoldEnd);
      vCanvas.removeEventListener('touchcancel', onZombieHoldEnd);
      vCanvas.removeEventListener('mousedown', onZombieHoldStart);
      vCanvas.removeEventListener('mouseup', onZombieHoldEnd);
      if (zombieHoldRaf) cancelAnimationFrame(zombieHoldRaf);
    });
    // Also add decay to updateZombie — when not holding, vAudioLevel fades
    if (!vAudioLevel._decayAdded) {
      vAudioLevel._decayAdded = true;
    }
    cleanupFns.push(() => { vAudioLevel._decayAdded = false; stopMicrophone(); });
  }

  vCanvas._cleanup = () => cleanupFns.forEach(fn => fn());
}

function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      vMicStream = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      vMicAnalyser = audioCtx.createAnalyser();
      vMicAnalyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(vMicAnalyser);
      vMicData = new Uint8Array(vMicAnalyser.frequencyBinCount);
      function readMic() {
        if (!vMicAnalyser || !vRunning || vMode !== 'zombie') return;
        vMicAnalyser.getByteFrequencyData(vMicData);
        vAudioLevel = Math.min(1, vMicData.reduce((a, b) => a + b, 0) / vMicData.length / 100);
        if (vAudioLevel > 0.15 && vPhase === 'intro') { vPhase = 'active'; updateVentHint(); }
        requestAnimationFrame(readMic);
      }
      readMic();
    }).catch(() => {});
}

function stopMicrophone() {
  if (vMicStream) { vMicStream.getTracks().forEach(t => t.stop()); vMicStream = null; }
  vMicAnalyser = null; vMicData = null;
}

function cleanupMode() {
  if (vCanvas._cleanup) { vCanvas._cleanup(); vCanvas._cleanup = null; }
  stopMicrophone();
  vParticles = [];
}
