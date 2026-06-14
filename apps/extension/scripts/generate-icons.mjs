#!/usr/bin/env node

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');
const SIZES = [16, 32, 48, 64, 128, 256, 512];

const BRAND = {
  bgStart: '#ff0000', 
  bgEnd: '#cc0000', 
  pulse: '#ffffff',
  play: '#ffffff',
  white: '#ffffff',
};

function drawPulsePlay(ctx, size) {
  const w = size;
  const h = size;
  const cy = h / 2;

  // Pulse Line (Cyan Glow)
  ctx.strokeStyle = BRAND.pulse;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // intense cyan glow
  ctx.shadowColor = BRAND.pulse;
  ctx.shadowBlur = size * 0.15;

  ctx.beginPath();
  ctx.moveTo(w * 0.15, cy);
  ctx.lineTo(w * 0.30, cy);
  ctx.lineTo(w * 0.40, cy - h * 0.25);
  ctx.lineTo(w * 0.50, cy + h * 0.25);
  ctx.lineTo(w * 0.60, cy);
  ctx.stroke();

  // Play Button (Electric Purple with glow)
  ctx.fillStyle = BRAND.play;
  ctx.strokeStyle = BRAND.white;
  ctx.lineWidth = Math.max(1, size * 0.02);
  
  ctx.shadowColor = BRAND.play;
  ctx.shadowBlur = size * 0.15;

  ctx.beginPath();
  ctx.moveTo(w * 0.60, cy - h * 0.28);
  ctx.lineTo(w * 0.88, cy);
  ctx.lineTo(w * 0.60, cy + h * 0.28);
  ctx.closePath();
  
  ctx.fill();
  
  // Subtle white stroke to make the play button pop against the dark bg
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.22;

  const gradBg = ctx.createLinearGradient(0, 0, size, size);
  gradBg.addColorStop(0, BRAND.bgStart);
  gradBg.addColorStop(1, BRAND.bgEnd);

  // Draw rounded rectangle background
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  // Apply drop shadow to the background canvas so it pops on the store
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.03;

  ctx.fillStyle = gradBg;
  ctx.fill();

  // The 128x128 icon polish: Inner stroke to guarantee definition on dark backgrounds
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = size >= 48 ? 2 : 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.stroke();

  if (size >= 48) {
    drawPulsePlay(ctx, size);
  } else {
    // For very small icon (16x16), simplify to just a solid cyan play button
    ctx.fillStyle = BRAND.pulse;
    ctx.shadowBlur = 0; 

    ctx.beginPath();
    ctx.moveTo(size * 0.3, size * 0.2);
    ctx.lineTo(size * 0.8, size * 0.5);
    ctx.lineTo(size * 0.3, size * 0.8);
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const size of SIZES) {
  const buffer = generateIcon(size);
  const outPath = join(OUTPUT_DIR, `icon${size}.png`);
  writeFileSync(outPath, buffer);
  console.log(`✓ ${outPath} (${size}×${size})`);
}

console.log('\n All modern pulse icons generated in public/icons/');
