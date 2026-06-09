#!/usr/bin/env node

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');
const SIZES = [16, 48, 128];

const BRAND = {
  bgStart: '#ff0000', 
  bgEnd: '#cc0000', 
  bars: '#ffffff', 
};

function drawPulsePlay(ctx, size) {
  const w = size;
  const h = size;
  const cy = h / 2;

  ctx.strokeStyle = BRAND.bars;
  ctx.fillStyle = BRAND.bars;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // subtle white glow
  ctx.shadowColor = BRAND.bars;
  ctx.shadowBlur = size * 0.05;

  // Draw the pulse line
  ctx.beginPath();
  ctx.moveTo(w * 0.15, cy);
  ctx.lineTo(w * 0.30, cy);
  ctx.lineTo(w * 0.40, cy - h * 0.25); // peak up
  ctx.lineTo(w * 0.50, cy + h * 0.25); // peak down
  ctx.lineTo(w * 0.60, cy); // back to center, connecting to the play button
  ctx.stroke();

  // Draw and fill the play button
  ctx.beginPath();
  ctx.moveTo(w * 0.60, cy - h * 0.28); // top of play button
  ctx.lineTo(w * 0.88, cy); // tip of play button
  ctx.lineTo(w * 0.60, cy + h * 0.28); // bottom of play button
  ctx.closePath();
  
  ctx.stroke(); // stroke first to blend with pulse line thickness
  ctx.fill();   // then fill
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

  ctx.fillStyle = gradBg;
  ctx.fill();

  if (size >= 48) {
    drawPulsePlay(ctx, size);
  } else {
    // For very small icon (16x16), simplify to just a solid white play button
    ctx.fillStyle = BRAND.bars;
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
