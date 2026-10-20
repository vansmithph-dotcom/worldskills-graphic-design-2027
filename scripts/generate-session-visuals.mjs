import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.join(root, 'content/modules');
const outputDir = path.join(root, 'assets/session-visuals');
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

function wrap(text, maxChars = 19, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines;
}

function renderVisual(session) {
  const steps = session.process_visual.steps;
  const details = session.process_visual.details;
  const count = steps.length;
  const width = 1280;
  const cardWidth = count <= 3 ? 330 : 270;
  const gap = count <= 3 ? 50 : 30;
  const groupWidth = count * cardWidth + (count - 1) * gap;
  const left = (width - groupWidth) / 2;
  const cards = steps.map((step, index) => {
    const x = left + index * (cardWidth + gap);
    const accent = ['#256b62', '#cb6a43', '#5e6ba7', '#b38a32'][index % 4];
    const lines = wrap(step, count <= 3 ? 25 : 19, 2);
    const label = lines.map((line, lineIndex) => `<text x="${x + cardWidth / 2}" y="${248 + lineIndex * 28}" text-anchor="middle" class="step-label">${escapeXml(line)}</text>`).join('\n');
    const detailLines = wrap(details[index], count <= 3 ? 36 : 29, 3);
    const detail = detailLines.map((line, lineIndex) => `<text x="${x + cardWidth / 2}" y="${316 + lineIndex * 19}" text-anchor="middle" class="step-detail">${escapeXml(line)}</text>`).join('\n');
    const arrow = index < count - 1
      ? `<path d="M ${x + cardWidth + 10} 280 H ${x + cardWidth + gap - 12}" class="arrow"/><path d="M ${x + cardWidth + gap - 24} 270 L ${x + cardWidth + gap - 12} 280 L ${x + cardWidth + gap - 24} 290" class="arrow-head"/>`
      : '';
    return `<g aria-label="Этап ${index + 1}: ${escapeXml(step)} ${escapeXml(details[index])}">
      <rect x="${x}" y="158" width="${cardWidth}" height="250" rx="18" class="step-card"/>
      <path d="M ${x + 18} 158 H ${x + cardWidth - 18} Q ${x + cardWidth} 158 ${x + cardWidth} 176 V 168 H ${x} V 176 Q ${x} 158 ${x + 18} 158 Z" fill="${accent}"/>
      <circle cx="${x + 42}" cy="204" r="19" fill="${accent}"/>
      <text x="${x + 42}" y="211" text-anchor="middle" class="step-number">${index + 1}</text>
      ${label}
      ${detail}
      <text x="${x + cardWidth / 2}" y="386" text-anchor="middle" class="micro">СДЕЛАЙ · ПРОВЕРЬ · ПРОДОЛЖАЙ</text>
    </g>${arrow}`;
  }).join('\n');
  const desc = `${session.process_visual.alt} ${steps.map((step, index) => `Этап ${index + 1}: ${step}. ${details[index]}`).join(' ')} ${session.process_visual.caption}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 520" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(session.title)} — порядок действий</title>
  <desc id="desc">${escapeXml(desc)}</desc>
  <style>
    .bg{fill:#f7f4ed}.eyebrow{font:700 13px Arial,sans-serif;letter-spacing:2px;fill:#256b62}.title{font:700 27px Arial,sans-serif;fill:#172c38}.step-card{fill:#fff;stroke:#d6d5cc;stroke-width:2}.step-number{font:700 16px Arial,sans-serif;fill:#fff}.step-label{font:700 18px Arial,sans-serif;fill:#172c38}.step-detail{font:400 14px Arial,sans-serif;fill:#42535b}.micro{font:700 9px Arial,sans-serif;letter-spacing:1px;fill:#647078}.arrow{stroke:#79848a;stroke-width:3;stroke-linecap:round}.arrow-head{fill:none;stroke:#79848a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.caption{font:400 15px Arial,sans-serif;fill:#42535b}
  </style>
  <rect class="bg" x="0" y="0" width="${width}" height="520" rx="22"/>
  <text x="54" y="52" class="eyebrow">ПРОЦЕСС ЗАНЯТИЯ</text>
  <text x="54" y="100" class="title">${escapeXml(session.title)}</text>
  ${cards}
  <path d="M 54 438 H 1226" stroke="#d6d5cc" stroke-width="2"/>
  <text x="54" y="475" class="caption">${escapeXml(session.process_visual.caption)}</text>
</svg>
`;
}

fs.mkdirSync(outputDir, { recursive: true });
const files = fs.readdirSync(modulesDir).filter((name) => name.endsWith('.json')).sort();
let written = 0;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(modulesDir, file), 'utf8'));
  for (const session of data.sessions ?? []) {
    if (!session.process_visual?.image || !Array.isArray(session.process_visual.steps) || session.process_visual.steps.length < 3 || !Array.isArray(session.process_visual.details) || session.process_visual.details.length !== session.process_visual.steps.length) {
      throw new Error(`${file}/${session.id}: incomplete process_visual data`);
    }
    const expected = `assets/session-visuals/${session.id}.svg`;
    if (session.process_visual.image !== expected) throw new Error(`${file}/${session.id}: expected image path ${expected}`);
    fs.writeFileSync(path.join(root, expected), renderVisual(session), 'utf8');
    written += 1;
  }
}
console.log(`Generated ${written} original process infographics in assets/session-visuals.`);
