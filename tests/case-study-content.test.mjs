import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = ['01-brief', '02-indesign', '03-illustrator'];

function load(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

const sourceCatalog = load('content/sources.json').sources;
const targets = modules.flatMap((moduleId) => {
  const module = load(`content/modules/${moduleId}.json`);
  return module.sessions.map((session) => ({ moduleId, session }));
});

function assertString(value, label, min = 20) {
  assert.equal(typeof value, 'string', `${label} is a string`);
  assert.ok(value.trim().length >= min, `${label} has enough concrete detail`);
}

function assertWellFormedSvg(svg, label) {
  assert.match(svg, /^<svg\b/, `${label} starts with an SVG root`);
  const stack = [];
  for (const match of svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b[^>]*>/g)) {
    const [tag, name] = match;
    if (tag.startsWith('</')) {
      assert.equal(stack.pop(), name, `${label} closes ${name} in nesting order`);
    } else if (!tag.endsWith('/>')) {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], `${label} closes every element`);
}

test('modules 01–03 provide a distinct complete worked case and artifact for all 14 sessions', () => {
  assert.equal(targets.length, 14);
  const tasks = new Set();
  const artifacts = new Set();
  const visualPaths = new Set();

  for (const { moduleId, session } of targets) {
    const label = `${moduleId}/${session.id}`;
    const study = session.case_study;
    assert.ok(study, `${label} has a case study`);
    assert.equal(study.status, 'training-simulation', `${label} is clearly a simulation`);
    assertString(study.title, `${label} title`, 10);

    const brief = study.brief;
    for (const field of ['client', 'audience', 'task']) assertString(brief?.[field], `${label} brief.${field}`);
    for (const field of ['required_content', 'deliverables', 'constraints', 'unknowns', 'questions']) {
      assert.ok(Array.isArray(brief?.[field]) && brief[field].length >= 2, `${label} brief.${field} has concrete items`);
      brief[field].forEach((value, index) => assertString(value, `${label} brief.${field}[${index}]`, 8));
    }
    tasks.add(brief.task.trim());

    assert.ok(Array.isArray(study.decisions) && study.decisions.length >= 1, `${label} includes an evaluated decision`);
    study.decisions.forEach((decision, index) => {
      for (const field of ['stage', 'choice', 'reason', 'alternative', 'test', 'result']) {
        assertString(decision[field], `${label} decision ${index + 1}.${field}`);
      }
      assert.match(decision.result, /учебная симуляция/i, `${label} presents invented test results as simulations`);
    });
    for (const field of ['finding', 'change', 'outcome']) assertString(study.revision?.[field], `${label} revision.${field}`);
    assert.match(study.revision.finding, /симулированное/i, `${label} does not present invented observations as real research`);

    const finalOutput = study.final_output;
    assertString(finalOutput?.artifact, `${label} final_output.artifact`);
    artifacts.add(finalOutput.artifact.trim());
    for (const field of ['spec', 'files', 'checks']) {
      assert.ok(Array.isArray(finalOutput[field]) && finalOutput[field].length >= 2, `${label} final_output.${field} has at least two items`);
      finalOutput[field].forEach((value, index) => assertString(value, `${label} final_output.${field}[${index}]`, 6));
    }

    const realReference = study.real_reference;
    const source = sourceCatalog.find((item) => item.id === realReference?.source_id);
    assert.ok(source, `${label} references an active source record`);
    assert.equal(source.status, 'active', `${label} source is active`);
    assert.ok(source.modules.includes(moduleId), `${label} source applies to its module`);
    assert.ok(session.sources.includes(source.id), `${label} also lists the case reference in session sources`);
    assertString(realReference.observation, `${label} real_reference.observation`);
    assertString(realReference.limit, `${label} real_reference.limit`);

    const image = study.image;
    assert.ok(image?.src, `${label} has an illustration`);
    assertString(image.alt, `${label} image alt text`, 12);
    assertString(image.caption, `${label} image caption`, 8);
    const imagePath = path.resolve(root, image.src);
    assert.ok(imagePath.startsWith(root + path.sep), `${label} illustration stays in the course`);
    assert.ok(fs.existsSync(imagePath), `${label} illustration file exists`);
    assertWellFormedSvg(fs.readFileSync(imagePath, 'utf8'), `${label} illustration`);
    assert.ok(!visualPaths.has(image.src), `${label} has an individual case illustration`);
    visualPaths.add(image.src);

    for (const [field, steps] of [['guided_steps', session.guided_steps], ['independent_steps', session.independent_steps]]) {
      assert.ok(Array.isArray(steps) && steps.length >= 2, `${label} has detailed ${field}`);
      steps.forEach((step, index) => {
        assert.ok(Number.isInteger(step.minutes) && step.minutes > 0, `${label} ${field}[${index}] has minutes`);
        assertString(step.action, `${label} ${field}[${index}].action`);
        assertString(step.output, `${label} ${field}[${index}].output`, 8);
        assertString(step.checkpoint, `${label} ${field}[${index}].checkpoint`, 8);
      });
    }
    const practiceMinutes = [...session.guided_steps, ...session.independent_steps].reduce((total, step) => total + step.minutes, 0);
    assert.equal(practiceMinutes, session.minutes, `${label} practice steps fit the stated first-pass time`);
  }

  assert.equal(tasks.size, 14, 'each session starts from its own concrete task and unknowns');
  assert.equal(artifacts.size, 14, 'each session produces a distinct artifact');
});

test('the cross-course project exercises real brief, editorial, logo and identity decisions', () => {
  const byId = new Map(targets.map(({ session }) => [session.id, session]));
  assert.match(byId.get('01-brief-read').case_study.brief.task, /«Первый оттиск»/);
  assert.match(byId.get('02-multipage').case_study.final_output.artifact, /8-страничн|восьмистраничн/i);
  assert.match(byId.get('03-logo-typologies').case_study.decisions[0].test, /прочит|запомн/i);
  assert.match(byId.get('03-identity-system').case_study.final_output.artifact, /айдентик|систем/i);
});
