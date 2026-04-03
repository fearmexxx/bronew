/**
 * Generates a unique, high-quality gradient/geometric avatar from a seed string.
 * Returns a data URL (PNG) that can be used directly in <img> tags.
 */
export function generateGeneratedAvatar(seed: string): string {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Use seed to generate deterministic colors
  const hash = hashString(seed);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 140) % 360;

  // Create Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, `hsl(${hue1}, 70%, 60%)`);
  gradient.addColorStop(1, `hsl(${hue2}, 80%, 40%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add Geometric Pattern Overlay
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = 'white';
  
  // Deterministic shapes based on hash
  for (let i = 0; i < 5; i++) {
    const shapeType = (hash >> i) % 3;
    const x = ((hash >> (i * 2)) % 100) / 100 * size;
    const y = ((hash >> (i * 3)) % 100) / 100 * size;
    const r = ((hash >> (i * 4)) % 30) / 100 * size + 20;

    ctx.beginPath();
    if (shapeType === 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (shapeType === 1) {
      ctx.rect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
    }
    ctx.fill();
  }

  // Add subtle grain/noise
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 1000; i++) {
    const nx = Math.random() * size;
    const ny = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'white' : 'black';
    ctx.fillRect(nx, ny, 1, 1);
  }

  return canvas.toDataURL('image/png');
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
