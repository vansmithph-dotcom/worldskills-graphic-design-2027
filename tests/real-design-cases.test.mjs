import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredModules = [
  '01-brief', '02-indesign', '03-illustrator', '04-photoshop',
  '05-print-production', '06-digital-design', '07-quality-handoff',
  '08-competition-english', '09-exams-selection'
];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function parseCaseRows(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\|\s*`?0\d-/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
}

test('real case register maps every course module to an active primary reference', () => {
  const markdown = fs.readFileSync(path.join(root, 'docs/real-design-cases.md'), 'utf8');
  const sources = readJson('content/sources.json').sources;
  const rows = parseCaseRows(markdown);
  assert.equal(rows.length, 9, 'the case register has one row per module');
  assert.deepEqual(rows.map(([moduleId]) => moduleId.replaceAll('`', '')), requiredModules);

  for (const [moduleCell, idCell, linkCell, observation, prompt, limit] of rows) {
    const moduleId = moduleCell.replaceAll('`', '');
    const sourceId = idCell.replaceAll('`', '');
    const source = sources.find((item) => item.id === sourceId);
    assert.ok(source, `${moduleId} source ${sourceId} exists in the catalog`);
    assert.equal(source.status, 'active', `${sourceId} is current and active`);
    assert.deepEqual(source.modules, [moduleId], `${sourceId} maps to exactly one module`);
    assert.match(source.url, /^https:\/\//, `${sourceId} uses a direct HTTPS page`);
    assert.ok(linkCell.includes(source.url), `${sourceId} link matches the source catalog`);
    assert.ok(source.publisher.trim().length > 2, `${sourceId} names the publisher`);
    assert.ok(source.accessNote?.trim().length >= 20, `${sourceId} explains the access state`);
    assert.ok(source.use?.trim().length >= 35, `${sourceId} explains its appropriate use`);
    for (const [field, value] of Object.entries({ observation, prompt, limit })) {
      assert.ok(value?.trim().length >= 30, `${moduleId} gives a concrete ${field}`);
    }
  }
});

test('case references are separated from competition standards and assignments', () => {
  const markdown = fs.readFileSync(path.join(root, 'docs/real-design-cases.md'), 'utf8');
  assert.match(markdown, /первоисточник автора, клиента, организации или WorldSkills/i);
  assert.match(markdown, /не являются стандартом и не подтверждают условия Almaty 2027/i);
  assert.match(markdown, /внешнее чтение не требуется/i);
  assert.match(markdown, /объясняют применение материалов в одном контексте/i);
});
