// === Audio Manager — synthesized sound effects via Web Audio API ===

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function noiseBuffer(duration) {
  const sr = audioCtx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// === Fire crackling ===
function playFireSound() {
  const now = audioCtx.currentTime;
  const dur = 0.8;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(dur);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
  gain.gain.setValueAtTime(0.4, now + 0.1);
  gain.gain.linearRampToValueAtTime(0.15, now + dur);
  gain.gain.linearRampToValueAtTime(0, now + dur + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + dur + 0.1);
}

// === Shredder grinding ===
function playShredSound() {
  const now = audioCtx.currentTime;
  const dur = 0.6;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(dur);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  // Modulate filter for grinding effect
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sawtooth';
  lfo.frequency.value = 30;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
  gain.gain.linearRampToValueAtTime(0.1, now + dur);
  gain.gain.linearRampToValueAtTime(0, now + dur + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now + dur + 0.1);
  lfo.start(now); lfo.stop(now + dur + 0.1);
}

// === Hydraulic press thud ===
function playPressSound() {
  const now = audioCtx.currentTime;
  // Deep thud
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(40, now + 0.2);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.8, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.4);

  // Metallic ring
  const metal = audioCtx.createOscillator();
  metal.type = 'square';
  metal.frequency.setValueAtTime(600, now);
  metal.frequency.linearRampToValueAtTime(300, now + 0.15);
  const mGain = audioCtx.createGain();
  mGain.gain.setValueAtTime(0, now);
  mGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  metal.connect(mGain);
  mGain.connect(audioCtx.destination);
  metal.start(now); metal.stop(now + 0.3);
}

// === Explosion burst ===
function playExplodeSound() {
  const now = audioCtx.currentTime;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.5);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.7, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now + 0.55);
}

// === Synthesized whistle (handsome card) ===
function playSynthWhistle() {
  const now = audioCtx.currentTime;
  [0, 0.18].forEach((startOffset, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(i === 0 ? 800 : 600, now + startOffset);
    osc.frequency.linearRampToValueAtTime(i === 0 ? 1100 : 900, now + startOffset + 0.15);
    gain.gain.setValueAtTime(0, now + startOffset);
    gain.gain.linearRampToValueAtTime(0.3, now + startOffset + 0.03);
    gain.gain.linearRampToValueAtTime(0, now + startOffset + 0.22);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now + startOffset); osc.stop(now + startOffset + 0.25);
  });
}

// === Goofy BGM — synthesized kazoo/cartoon style looping tune ===
let bgmNodes = [];
let bgmPlaying = false;

// Goofy melody — transposed down a fourth, slower, lower volume
const GOOFY_MELODY = [
  // Phrase A — bouncy intro
  [392, 0.5], [494, 0.5], [587, 1], [0, 0.25], [784, 0.25], [587, 0.5], [494, 0.5], [392, 1.5],
  [0, 0.5],
  // Phrase B — descending goof
  [587, 0.5], [659, 0.5], [587, 0.5], [494, 0.5], [392, 1], [330, 0.5], [294, 1], [247, 1.5],
  [0, 0.5],
  // Phrase C — staccato bounce
  [294, 0.25], [392, 0.25], [494, 0.25], [587, 0.25], [494, 0.25], [392, 0.25], [294, 0.25], [247, 0.25],
  [294, 0.5], [330, 0.5], [392, 1], [0, 0.25], [440, 0.25], [494, 1.5],
  [0, 0.5],
  // Phrase D — weird slide
  [587, 0.5], [554, 0.3], [523, 0.3], [494, 0.5], [440, 0.5], [392, 1],
  [330, 0.5], [370, 0.5], [392, 0.5], [440, 0.5], [494, 2],
  [0, 0.75],
  // Phrase E — silly tag
  [784, 0.15], [0, 0.1], [587, 0.15], [0, 0.1], [392, 0.25], [494, 0.25], [587, 0.25], [784, 0.5],
  [659, 0.25], [587, 0.25], [494, 0.5], [392, 2.5],
];

function playGoofyBGM() {
  if (bgmPlaying) return;
  bgmPlaying = true;
  const now = audioCtx.currentTime;
  const bpm = 105;
  const beatDur = 60 / bpm;

  function playLoop(loopStart) {
    if (!bgmPlaying) return;
    let t = loopStart;
    const baseVol = 0.07;

    // Kazoo-like: square wave with a bit of vibrato
    GOOFY_MELODY.forEach(([freq, beats]) => {
      if (freq === 0) { t += beats * beatDur; return; } // rest

      const dur = beats * beatDur * 0.85;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.value = freq;
      // Slight vibrato
      try {
        const vib = audioCtx.createOscillator();
        vib.type = 'sine';
        vib.frequency.value = 6;
        const vibGain = audioCtx.createGain();
        vibGain.gain.value = 3;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);
        vib.start(t); vib.stop(t + dur);
        bgmNodes.push(vib, vibGain);
      } catch(e) {}

      filter.type = 'bandpass';
      filter.frequency.value = freq * 1.5;
      filter.Q.value = 1.5;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(baseVol, t + 0.02);
      gain.gain.setValueAtTime(baseVol, t + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
      bgmNodes.push(osc, gain, filter);

      t += beats * beatDur;
    });

    // Percussion: varied "boink" / "plop" / "tick" patterns
    t = loopStart;
    for (let i = 0; i < GOOFY_MELODY.length; i++) {
      const [freq, beats] = GOOFY_MELODY[i];
      // Perc on most non-rest notes, with varying probability
      if (freq !== 0 && Math.random() > 0.25) {
        const pOsc = audioCtx.createOscillator();
        const pGain = audioCtx.createGain();
        const r = Math.random();
        if (r < 0.33) {
          // high "tick"
          pOsc.type = 'sine';
          pOsc.frequency.setValueAtTime(800, t);
          pOsc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
          pGain.gain.setValueAtTime(0, t);
          pGain.gain.linearRampToValueAtTime(0.06, t + 0.003);
          pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          pOsc.start(t); pOsc.stop(t + 0.08);
        } else if (r < 0.66) {
          // low "boink"
          pOsc.type = 'triangle';
          pOsc.frequency.setValueAtTime(180, t);
          pOsc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
          pGain.gain.setValueAtTime(0, t);
          pGain.gain.linearRampToValueAtTime(0.1, t + 0.005);
          pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          pOsc.start(t); pOsc.stop(t + 0.16);
        } else {
          // "plop"
          pOsc.type = 'sine';
          pOsc.frequency.setValueAtTime(300, t);
          pOsc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
          pGain.gain.setValueAtTime(0, t);
          pGain.gain.linearRampToValueAtTime(0.07, t + 0.008);
          pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          pOsc.start(t); pOsc.stop(t + 0.2);
        }
        pOsc.connect(pGain);
        pGain.connect(audioCtx.destination);
        bgmNodes.push(pOsc, pGain);
      }
      t += beats * beatDur;
    }

    // Schedule next loop
    const totalDur = GOOFY_MELODY.reduce((s, [, b]) => s + b * beatDur, 0);
    const nextStart = loopStart + totalDur;
    const timer = setTimeout(() => playLoop(nextStart), (totalDur * 1000) - 100);
    bgmNodes.push({ stop: () => clearTimeout(timer) });
  }

  playLoop(now + 0.1);
}

function stopGoofyBGM() {
  bgmPlaying = false;
  bgmNodes.forEach(n => {
    try {
      if (n.stop && typeof n.stop === 'function') n.stop();
      else if (typeof n.stop === 'function') n.stop();
    } catch(e) {}
  });
  bgmNodes = [];
}

// === BGM placeholder for user-picked audio ===
function playBGM(url) {
  stopBGM();
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.3;
    audio.play().catch(() => {});
    bgmNodes.push(audio);
  } catch (e) { /* ignore */ }
}
function stopBGM() {
  stopGoofyBGM();
  bgmNodes.forEach(n => { try { n.pause(); } catch(e) {} });
  bgmNodes = [];
}

// === Spin whoosh / fling ===
function playWhooshSound() {
  const now = audioCtx.currentTime;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.4);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now + 0.45);
}

// === Hammer impact ===
function playHammerImpactSound() {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.6, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.2);
  // Noise crack
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.1);
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0, now);
  nGain.gain.linearRampToValueAtTime(0.25, now + 0.003);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(nGain);
  nGain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now + 0.12);
}

// === Zombie growl ===
function playZombieGrowlSound() {
  const now = audioCtx.currentTime;
  [0, 0.12, 0.24].forEach(offset => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now + offset);
    osc.frequency.linearRampToValueAtTime(50, now + offset + 0.25);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.3);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + offset); osc.stop(now + offset + 0.35);
  });
}

// === Public API ===
const audioManager = {
  initialized: true,
  sfx: {
    fire:    { play: playFireSound, stop: () => {}, fade: () => {} },
    shred:   { play: playShredSound, stop: () => {}, fade: () => {} },
    press:   { play: playPressSound, stop: () => {}, fade: () => {} },
    explode: { play: playExplodeSound, stop: () => {}, fade: () => {} },
    whistle: { play: playSynthWhistle, stop: () => {}, fade: () => {} },
    whoosh:  { play: playWhooshSound, stop: () => {}, fade: () => {} },
    impact:  { play: playHammerImpactSound, stop: () => {}, fade: () => {} },
    growl:   { play: playZombieGrowlSound, stop: () => {}, fade: () => {} },
  },

  init() { /* Web Audio ready immediately */ },

  play(name) {
    const s = this.sfx[name];
    if (s && s.play) { try { s.play(); } catch (e) { /* ignore */ } }
  },

  stop(name) {
    const s = this.sfx[name];
    if (s && s.stop) { try { s.stop(); } catch (e) { /* ignore */ } }
  },

  fadeOut(name, duration) {
    const s = this.sfx[name];
    if (s && s.fade) { try { s.fade(0, duration); } catch (e) { /* ignore */ } }
  },

  // BGM hooks
  _bgmPlaying: false,
  playGoofyBGM() { this._bgmPlaying = true; playGoofyBGM(); },
  stopGoofyBGM() { this._bgmPlaying = false; stopGoofyBGM(); },
  playBGM(url) { stopBGM(); if (url) { playBGM(url); } },
  stopBGM,
  toggleGoofyBGM() {
    if (bgmPlaying) stopGoofyBGM();
    else playGoofyBGM();
  }
};
