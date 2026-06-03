#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 */

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');
const SIZES = [16, 48, 128];

const BRAND = {
  gradientStart: '#ff0000',
  gradientEnd: '#cc0000',
  bars: '#ffffff',
};

function drawWaveform(ctx, size) {
  const BAR_COUNT = 5;
  const REL_HEIGHTS = [0.25, 0.55, 1.0, 0.55, 0.25];

  const waveW = size * 0.60;
  const barW = Math.max(2, Math.round(waveW / (BAR_COUNT * 2 - 1)));
  const gap = barW;
  const totalW = BAR_COUNT * barW + (BAR_COUNT - 1) * gap;
  const startX = (size - totalW) / 2;

  const maxBarH = size * 0.62;
  const centerY = size / 2;

  ctx.fillStyle = BRAND.bars;

  for (let i = 0; i < BAR_COUNT; i++) {
    const barH = maxBarH * REL_HEIGHTS[i];
    const x = startX + i * (barW + gap);
    const y = centerY - barH / 2;
    const r = barW / 2;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH - r);
    ctx.quadraticCurveTo(x + barW, y + barH, x + barW - r, y + barH);
    ctx.lineTo(x + r, y + barH);
    ctx.quadraticCurveTo(x, y + barH, x, y + barH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.22;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, BRAND.gradientStart);
  grad.addColorStop(1, BRAND.gradientEnd);

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

  ctx.fillStyle = grad;
  ctx.fill();

  if (size >= 48) {
    drawWaveform(ctx, size);
  } else {
    ctx.fillStyle = BRAND.bars;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.22, 0, Math.PI * 2);
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

console.log('\n All icons generated in public/icons/');
