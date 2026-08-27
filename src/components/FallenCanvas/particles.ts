// Система частиц для Canvas

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'smoke' | 'dust' | 'blood' | 'heal';
}

const particles: Particle[] = [];
const MAX_PARTICLES = 200;

export const spawnParticles = (
  x: number,
  y: number,
  count: number,
  color: string,
  type: Particle['type'] = 'spark'
) => {
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'smoke' ? 1 : 0),
      life: 30 + Math.random() * 30,
      maxLife: 60,
      color,
      size: type === 'smoke' ? 3 + Math.random() * 4 : 1 + Math.random() * 3,
      type,
    });
  }
};

export const updateParticles = () => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    if (p.type === 'smoke') {
      p.vy -= 0.05;
      p.size += 0.1;
    } else if (p.type === 'dust') {
      p.vy += 0.02;
    } else if (p.type === 'heal') {
      p.vy -= 0.1;
      p.vx *= 0.98;
    }
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
};

export const drawParticles = (ctx: CanvasRenderingContext2D) => {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    
    switch (p.type) {
      case 'spark':
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        break;
      case 'smoke':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'dust':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'blood':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'heal':
        ctx.fillStyle = p.color;
        ctx.font = `${p.size * 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('+', p.x, p.y);
        break;
    }
  }
  ctx.globalAlpha = 1;
};

export const clearParticles = () => {
  particles.length = 0;
};
