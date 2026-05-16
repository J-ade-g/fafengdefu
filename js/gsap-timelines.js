// === GSAP Timeline Builders ===

// Build text slam animation timeline
function buildTextSlamTimeline(lines, paperContentEl) {
  if (typeof gsap === 'undefined') return null;

  const tl = gsap.timeline();

  lines.forEach((line, i) => {
    const el = document.createElement('div');
    el.className = 'text-shard';
    el.textContent = line;
    paperContentEl.appendChild(el);

    const targetX = 15 + Math.random() * 60;
    const targetY = 18 + i * 32;
    const startX = (Math.random() - 0.5) * 350;
    const startY = -80 - Math.random() * 200;
    const startRot = (Math.random() - 0.5) * 50;
    const endRot = (Math.random() - 0.5) * 8;

    tl.fromTo(el,
      {
        x: startX, y: startY,
        rotation: startRot,
        opacity: 0,
        scale: 1.4
      },
      {
        x: targetX, y: targetY,
        rotation: endRot,
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: 'back.out(2.5)'
      },
      i * 0.06
    );
  });

  return tl;
}

// Build fold animation timeline
function buildFoldTimeline() {
  if (typeof gsap === 'undefined') return null;

  const paper = document.querySelector('#paper');
  const tl = gsap.timeline();

  tl.to('.fold-tl', { rotateX: 32, rotateY: 32, duration: 0.35, ease: 'power2.in' })
  .to('.fold-tr', { rotateX: 32, rotateY: -32, duration: 0.35, ease: 'power2.in' }, '-=0.12')
  .to('.fold-bl', { rotateX: -32, rotateY: 32, duration: 0.35, ease: 'power2.in' }, '-=0.12')
  .to('.fold-br', { rotateX: -32, rotateY: -30, duration: 0.35, ease: 'power2.in' }, '-=0.12')
  .to(paper, {
    scale: 0.72,
    rotate: -6,
    duration: 0.45,
    ease: 'power2.out'
  }, '-=0.1');

  return tl;
}

// Build blindbox card reveal timeline
function buildBlindboxReveal(cardEl) {
  if (typeof gsap === 'undefined') return null;

  return gsap.fromTo(cardEl, {
    rotateY: 90,
    scale: 0.7,
    opacity: 0
  }, {
    rotateY: 0,
    scale: 1,
    opacity: 1,
    duration: 0.7,
    ease: 'back.out(1.4)'
  });
}

// Build toolbar slide-in
function buildToolbarIn() {
  if (typeof gsap === 'undefined') return null;

  const toolbar = document.querySelector('#toolbar');
  return gsap.fromTo(toolbar, {
    y: 100, opacity: 0
  }, {
    y: 0, opacity: 1,
    duration: 0.35,
    ease: 'power2.out'
  });
}

// Build blindbox reveal entrance
function buildBlindboxEntrance() {
  if (typeof gsap === 'undefined') return null;

  const reveal = document.querySelector('#blindbox-reveal');
  const card = document.querySelector('#blindbox-card');

  const tl = gsap.timeline();

  tl.set(reveal, { opacity: 0 })
    .to(reveal, { opacity: 1, duration: 0.3 })
    .fromTo(card, {
      rotateY: 90, scale: 0.7, opacity: 0
    }, {
      rotateY: 0, scale: 1, opacity: 1,
      duration: 0.7, ease: 'back.out(1.4)'
    })
    .fromTo('.blindbox-actions', {
      y: 30, opacity: 0
    }, {
      y: 0, opacity: 1,
      duration: 0.4, ease: 'power2.out'
    }, '-=0.2');

  return tl;
}
