import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCourse } from '../scripts/validate-course.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function courseFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'accessible-course-'));
  fs.cpSync(path.join(sourceRoot, 'content'), path.join(root, 'content'), { recursive: true });
  fs.cpSync(path.join(sourceRoot, 'assets'), path.join(root, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, 'docs/curriculum-map.md'), path.join(root, 'docs/curriculum-map.md'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function moduleFiles(root) {
  return fs.readdirSync(path.join(root, 'content/modules')).filter((name) => name.endsWith('.json'));
}

function readJson(root, file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function writeJson(root, file, value) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

function assertSessionErrors(errors, sessions, fieldLabel) {
  for (const session of sessions) {
    assert.ok(errors.some((message) => message.includes(session.id) && message.includes(fieldLabel)), `${session.id} should report ${fieldLabel}`);
  }
}

test('validator accepts the current course fixture', (t) => {
  const root = courseFixture(t);
  assert.deepEqual(validateCourse(root, '2026-10-21').errors, []);
});

test('validator reports missing learning choices for every session', (t) => {
  const root = courseFixture(t);
  const sessions = [];
  for (const file of moduleFiles(root)) {
    const relative = `content/modules/${file}`;
    const module = readJson(root, relative);
    for (const session of module.sessions ?? []) {
      sessions.push(session);
      session.goal = '';
      session.challenge = '';
      session.adaptation = null;
    }
    writeJson(root, relative, module);
  }
  assert.equal(sessions.length, 28);
  const { errors } = validateCourse(root, '2026-10-21');
  assertSessionErrors(errors, sessions, 'цель');
  assertSessionErrors(errors, sessions, 'усложнение');
  assertSessionErrors(errors, sessions, 'резервный');
});

test('validator rejects incomplete adaptation fields with the session ID', (t) => {
  const root = courseFixture(t);
  const relative = 'content/modules/01-brief.json';
  const module = readJson(root, relative);
  const session = module.sessions[0];
  const cases = [
    [{ trigger: '', alternative: 'План', preserve: ['цель'] }, 'trigger'],
    [{ trigger: 'Сбой', alternative: '', preserve: ['цель'] }, 'alternative'],
    [{ trigger: 'Сбой', alternative: 'План', preserve: [] }, 'preserve']
  ];
  for (const [adaptation, field] of cases) {
    session.adaptation = adaptation;
    writeJson(root, relative, module);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(session.id) && message.includes(field)), `${session.id} should identify missing ${field}`);
  }
});

test('validator checks concept progression session references', (t) => {
  const root = courseFixture(t);
  const mapPath = path.join(root, 'docs/curriculum-map.md');
  const map = fs.readFileSync(mapPath, 'utf8').replace('01-brief-read', '99-missing-session');
  fs.writeFileSync(mapPath, map);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes('curriculum-map.md') && message.includes('99-missing-session')));
});

test('validator checks glossary fields and module references', (t) => {
  const root = courseFixture(t);
  const relative = 'content/glossary.json';
  const glossary = readJson(root, relative);
  glossary.terms[0].translation = '';
  glossary.terms[1].modules = ['99-missing-module'];
  writeJson(root, relative, glossary);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes(glossary.terms[0].term) && message.includes('translation')));
  assert.ok(errors.some((message) => message.includes(glossary.terms[1].term) && message.includes('99-missing-module')));
});

test('validator reports malformed session collections and blocks without throwing', (t) => {
  const cases = [
    { label: 'sessions collection', mutate(module) { module.sessions = {}; }, expected: 'требуется массив sessions' },
    { label: 'null session', mutate(module) { module.sessions = [null]; }, expected: 'запись занятия должна быть объектом' },
    { label: 'null teaching block', mutate(module) { module.sessions[0].teaching_blocks[0] = null; }, expected: 'блок объяснения должен быть объектом' },
    { label: 'numeric worked example path', mutate(module) { module.sessions[0].worked_example.image = 12; }, expected: 'требуется разобранный иллюстрированный пример' },
    { label: 'numeric process image path', mutate(module) { module.sessions[0].process_visual.image = 12; }, expected: 'отсутствует доступная поясняющая инфографика' }
  ];
  for (const entry of cases) {
    const root = courseFixture(t);
    const relative = 'content/modules/01-brief.json';
    const module = readJson(root, relative);
    entry.mutate(module);
    writeJson(root, relative, module);
    assert.doesNotThrow(() => validateCourse(root, '2026-10-21'), entry.label);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(entry.expected)), `${entry.label} should report ${entry.expected}`);
  }
});

test('validator reports directories used as image files without throwing', (t) => {
  const cases = [
    { label: 'process visual directory', mutate(session) { session.process_visual.image = 'assets/examples'; }, expected: 'не является файлом' },
    { label: 'worked example directory', mutate(session) { session.worked_example.image = 'assets/examples'; }, expected: 'не является файлом' }
  ];
  for (const entry of cases) {
    const root = courseFixture(t);
    const relative = 'content/modules/01-brief.json';
    const module = readJson(root, relative);
    entry.mutate(module.sessions[0]);
    writeJson(root, relative, module);
    assert.doesNotThrow(() => validateCourse(root, '2026-10-21'), entry.label);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(module.sessions[0].id) && message.includes(entry.expected)), `${entry.label} should report a regular-file error`);
  }
});

test('validator reports malformed catalog records without throwing', (t) => {
  const cases = [
    {
      label: 'module record',
      mutate(root) { const file = 'content/modules.json'; const data = readJson(root, file); data.modules.unshift(null); writeJson(root, file, data); },
      expected: 'должна быть объектом'
    },
    {
      label: 'source record',
      mutate(root) { const file = 'content/sources.json'; const data = readJson(root, file); data.sources.unshift(null); writeJson(root, file, data); },
      expected: 'должна быть объектом'
    },
    {
      label: 'glossary record',
      mutate(root) { const file = 'content/glossary.json'; const data = readJson(root, file); data.terms.unshift(null); writeJson(root, file, data); },
      expected: 'должна быть объектом'
    }
  ];
  for (const entry of cases) {
    const root = courseFixture(t);
    entry.mutate(root);
    assert.doesNotThrow(() => validateCourse(root, '2026-10-21'), entry.label);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(entry.expected)), `${entry.label} should report ${entry.expected}`);
  }
});

test('validator requires a separate image for each worked example and process diagram', (t) => {
  const root = courseFixture(t);
  const relative = 'content/modules/01-brief.json';
  const module = readJson(root, relative);
  module.sessions[0].worked_example.image = module.sessions[0].process_visual.image;
  writeJson(root, relative, module);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes(module.sessions[0].id) && message.includes('отличаться от схемы процесса')));
});

test('validator requires a self-contained case and timed practice for all 28 sessions', (t) => {
  const root = courseFixture(t);
  const sessions = [];
  for (const file of moduleFiles(root)) {
    const relative = `content/modules/${file}`;
    const module = readJson(root, relative);
    for (const session of module.sessions) {
      sessions.push(session);
      session.case_study = null;
    }
    writeJson(root, relative, module);
  }
  assert.equal(sessions.length, 28);
  const { errors } = validateCourse(root, '2026-10-21');
  assertSessionErrors(errors, sessions, 'case_study');
});

test('validator reports broken case fields, references, images and timed steps against the session ID', (t) => {
  const cases = [
    { label: 'brief task', mutate(session) { session.case_study.brief.task = ''; }, expected: 'brief.task' },
    { label: 'case reference', mutate(session) { session.case_study.real_reference.source_id = 'missing-source'; }, expected: 'missing-source' },
    { label: 'case image', mutate(session) { session.case_study.image.src = 'assets/case-studies/missing.svg'; }, expected: 'missing.svg' },
    { label: 'guided duration', mutate(session) { session.guided_steps[0].minutes = 0; }, expected: 'guided_steps[0].minutes' },
    { label: 'practice total', mutate(session) { session.independent_steps[0].minutes += 1; }, expected: 'суммируются' }
  ];
  for (const entry of cases) {
    const root = courseFixture(t);
    const relative = 'content/modules/01-brief.json';
    const module = readJson(root, relative);
    const session = module.sessions[0];
    entry.mutate(session);
    writeJson(root, relative, module);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(session.id) && message.includes(entry.expected)), `${entry.label} identifies ${session.id} and ${entry.expected}`);
  }
});

test('validator requires at least three guided and independent actions per session', (t) => {
  const root = courseFixture(t);
  const relative = 'content/modules/01-brief.json';
  const module = readJson(root, relative);
  const session = module.sessions[0];
  session.independent_steps = session.independent_steps.slice(0, 2);
  writeJson(root, relative, module);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes(session.id) && message.includes('independent_steps') && /не менее тр[её]х шагов/.test(message)));
});

test('validator rejects malformed or non-HTTPS external source URLs', (t) => {
  for (const url of ['not a URL', 'javascript:alert(1)']) {
    const root = courseFixture(t);
    const relative = 'content/sources.json';
    const catalog = readJson(root, relative);
    const source = catalog.sources.find((item) => item.access === 'external');
    source.url = url;
    writeJson(root, relative, catalog);
    const { errors } = validateCourse(root, '2026-10-21');
    assert.ok(errors.some((message) => message.includes(source.id) && /HTTPS.*коррект|коррект.*HTTPS/i.test(message)), `${url} must fail the source URL check`);
  }
});

test('validator keeps timed case practice inside the 168/60 hour allocations', (t) => {
  const root = courseFixture(t);
  const relative = 'content/modules/01-brief.json';
  const module = readJson(root, relative);
  const session = module.sessions[0];
  session.guided_steps[0].minutes = 100000;
  session.minutes += 100000 - session.guided_steps.reduce((sum, step) => sum + step.minutes, 0) - session.independent_steps.reduce((sum, step) => sum + step.minutes, 0);
  writeJson(root, relative, module);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes(session.id) && /168|guided.*allocat|guided.*час/i.test(message)));
});

test('timeline publishes the computed case-practice minutes and accounts for remaining course hours', (t) => {
  const root = courseFixture(t);
  const timeline = readJson(root, 'content/timeline.json');
  const totals = timeline.timedPractice;
  assert.deepEqual(totals, {
    guidedMinutes: 404,
    independentMinutes: 283,
    totalMinutes: 687,
    guidedRemainingMinutes: 9676,
    independentRemainingMinutes: 3317,
    remainingMinutes: 12993,
    includedInCourseHours: true,
    remainingUse: {
      guided: ['расширенная практика', 'разбор работ и обратная связь', 'циклы исправления и повторной проверки', 'длинные задания и учебные симуляции'],
      independent: ['завершение проектов', 'повторение с новым брифом', 'офлайн-проверки и портфолио', 'подготовка английского объяснения']
    }
  });
});

test('validator detects process-image aliases that resolve to the same file', (t) => {
  const root = courseFixture(t);
  const relative = 'content/modules/01-brief.json';
  const module = readJson(root, relative);
  const session = module.sessions[0];
  session.worked_example.image = session.process_visual.image.replace('assets/session-visuals/', 'assets/examples/../session-visuals/');
  assert.notEqual(session.worked_example.image, session.process_visual.image);
  writeJson(root, relative, module);
  const { errors } = validateCourse(root, '2026-10-21');
  assert.ok(errors.some((message) => message.includes(session.id) && message.includes('отличаться от схемы процесса')));
});
