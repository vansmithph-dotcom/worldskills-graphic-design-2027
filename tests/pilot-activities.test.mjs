import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packPath = path.join(root, 'docs/pilot-activities.md');

test('pilot pack prepares three ready-to-run activities and marks student pilot pending', () => {
  const pack = fs.readFileSync(packPath, 'utf8');
  assert.match(pack, /пилот[^\n]{0,80}(ожидает|не проводился)/i);
  for (const id of ['01-symbol-context', '03-logo-typologies', '02-text-styles', '05-dieline']) assert.ok(pack.includes(id), 'pilot pack needs ' + id);
  for (const heading of ['Логотип и выбор концепции', 'Первая страница в InDesign', 'Упаковка и проверка печати']) assert.ok(pack.includes(heading), 'pilot pack needs ' + heading);
  for (const field of ['Цель', 'Длительность', 'Материалы', 'Порядок работы', 'Что наблюдать', 'Критерии', 'Запасной маршрут', 'Разбор']) assert.ok(pack.includes(field), 'pilot pack needs ' + field);
  assert.ok(pack.toLocaleLowerCase('ru').includes('временный код'));
  assert.ok(pack.toLocaleLowerCase('ru').includes('не вносите имена'));
  assert.match(pack, /цвет.{0,50}(не проверен|не является цветопробой)|цветопроб/i);
});

test('pilot pack embeds the relevant course process diagrams', () => {
  const pack = fs.readFileSync(packPath, 'utf8');
  const images = [...pack.matchAll(/!\[[^\]]*\]\((\.\.\/[^)]+\.svg)\)/g)].map((match) => match[1]);
  assert.ok(images.length >= 3, 'pilot activities should show their course process diagrams');
  for (const image of images) assert.ok(fs.existsSync(path.resolve(path.dirname(packPath), image)), 'missing pilot diagram ' + image);
});
