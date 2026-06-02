#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 *
 * Programmatically generates SponsorPulse extension icons using the
 * native Node.js `canvas` API (via the `@napi-rs/canvas` package, which
 * is zero-config and pre-built — no native compilation needed).
 *
 * Run: node scripts/generate-icons.mjs
 */

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');

// Icon sizes required by Chrome Extension Manifest V3
const SIZES = [16, 48, 128];

// SponsorPulse brand colours
const BRAND = {
  gradientStart: '#6366f1', // indigo-500
  gradientEnd: '#8b5cf6',   // violet-500
  text: '#ffffff',
  shadow: 'rgba(99, 102, 241, 0.4)',
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.22; // rounded corners — ~22% of size

  // Background: rounded rect with gradient
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

  // Letter "SP" centred (only legible at 48+ px)
  if (size >= 48) {
    const label = size >= 128 ? 'SP' : 'S';
    ctx.fillStyle = BRAND.text;
    ctx.font = `bold ${Math.round(size * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtle shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = size * 0.06;
    ctx.fillText(label, size / 2, size / 2 + size * 0.02);
  } else {
    // 16px: just a dot / spark symbol
    ctx.fillStyle = BRAND.text;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

// Main
mkdirSync(OUTPUT_DIR, { recursive: true });

for (const size of SIZES) {
  const buffer = generateIcon(size);
  const outPath = join(OUTPUT_DIR, `icon${size}.png`);
  writeFileSync(outPath, buffer);
  console.log(`Generated ${outPath} (${size}×${size})`);
}

console.log('\n All icons generated in public/icons/');
