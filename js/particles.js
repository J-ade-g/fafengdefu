// === Particle System ===

const PARTICLE_CONFIG = {
  fire: {
    colors: ['#ff4500', '#ff6b35', '#ff8c00', '#ffcc00', '#ff3300', '#ffdd00'],
    vxRange: [-50, 50],     // wider spread
    vyRange: [-180, -60],   // higher flames
    sizeRange: [5, 14],     // fatter particles
    decay: 1.2,             // longer life (was 1.8)
    gravity: -35            // stronger upward drift
  },
  ash: {
    colors: ['#555', '#666', '#777', '#888', '#444'],
    vxRange: [-15, 15], vyRange: [-50, -20],
    sizeRange: [2, 5], decay: 0.5, gravity: 5,
    sway: true
  },
  shred: {
    colors: ['#faf8f2', '#e8e4d8', '#ddd', '#f0ece0'],
    vxRange: [-40, 40], vyRange: [60, 200],
    sizeRange: [1, 3], decay: 0.9, gravity: 120,
    rect: true
  },
  spark: {
    colors: ['#ffd700', '#ffec8b', '#fff8dc', '#ffaa00', '#fff'],
    vxRange: [-100, 100], vyRange: [-100, 100],
    sizeRange: [1, 3], decay: 3.0, gravity: 0
  },
  explode: {
    colors: ['#faf8f2', '#ccc', '#e8e4d8', '#999', '#fff', '#bbb'],
    vxRange: [-200, 200], vyRange: [-200, 200],
    sizeRange: [2, 10], decay: 1.2, gravity: 80,
    rect: true
  }
};

class Particle {
  constructor(x, y, type) {
    const cfg = PARTICLE_CONFIG[type];
    this.x = x;
    this.y = y;
    this.type = type;
    this.life = 1.0;
    this.decay = cfg.decay + (Math.random() - 0.5) * cfg.decay * 0.4;
    this.gravity = cfg.gravity;
    this.sway = cfg.sway || false;
    this.isRect = cfg.rect || false;

    this.vx = cfg.vxRange[0] + Math.random() * (cfg.vxRange[1] - cfg.vxRange[0]);
    this.vy = cfg.vyRange[0] + Math.random() * (cfg.vyRange[1] - cfg.vyRange[0]);

    this.size = cfg.sizeRange[0] + Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0]);
    this.color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];

    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
    this.swayOff = Math.random() * Math.PI * 2;
    this.swaySpeed = 2 + Math.random() * 3;
  }

  update(dt) {
    this.life -= this.decay * dt;
    this.vx *= 0.995;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.sway) {
      this.x += Math.sin(this.swayOff + this.life * this.swaySpeed) * 15 * dt;
    }

    this.rotation += this.rotSpeed * dt;
  }

  get alpha() {
    // Fade in then out
    if (this.life > 0.7) return (1 - this.life) / 0.3;
    return Math.max(0, this.life / 0.7);
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isRect) {
      const w = this.size * 3;
      const h = this.size;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  get alive() { return this.life > 0; }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, type, count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, type));
    }
  }

  emitBurst(x, y, type, count = 50) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        type
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  clear() {
    this.particles.length = 0;
  }

  get count() { return this.particles.length; }
}
