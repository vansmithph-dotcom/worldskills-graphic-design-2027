import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleData = (id) => JSON.parse(fs.readFileSync(path.join(root, `content/modules/${id}.json`), 'utf8'));
const textOf = (value) => typeof value === 'string'
  ? value
  : Array.isArray(value)
    ? value.map(textOf).join(' ')
    : value && typeof value === 'object'
      ? Object.values(value).map(textOf).join(' ')
      : '';

test('symbol_and_color_meanings_remain_contextual', () => {
  const lesson = moduleData('01-brief').sessions.find(({ id }) => id === '01-symbol-context');
  assert.ok(lesson, 'module 01 needs a symbol-context lesson');
  const text = textOf(lesson).toLocaleLowerCase('ru');
  for (const topic of ['звезд', 'контекст', 'аудитор', 'гипотез', 'цвет']) {
    assert.ok(text.includes(topic), `symbol lesson should explain ${topic}`);
  }
  assert.match(text, /провер(ить|я).{0,60}(люд|зрител|аудитор)/);
  assert.doesNotMatch(text, /звезда всегда означает/);
});

test('logo_learning_covers_concepts_wordmarks_and_identity_systems', () => {
  const lessons = moduleData('03-illustrator').sessions;
  const text = textOf(lessons).toLocaleLowerCase('ru');
  for (const topic of ['словесн', 'монограмм', 'изобразительн', 'абстракт', 'комбинирован', 'эмблем']) {
    assert.ok(text.includes(topic), `logo module should cover ${topic} marks`);
  }
  for (const topic of ['текст', 'форм', 'негативн', 'маленьк', 'монохром', 'айдентик', 'гайд']) {
    assert.ok(text.includes(topic), `logo module should cover ${topic}`);
  }
  const ideation = moduleData('01-brief').sessions.find(({ id }) => id === '01-rapid-ideation');
  assert.ok(ideation, 'module 01 needs a timed ideation practice');
  assert.equal(ideation.minutes, 15);
  assert.match(textOf(ideation).toLocaleLowerCase('ru'), /три.{0,40}(направлен|вариант|эскиз)/);
});

test('symbol_lessons_cite_current_research_and_official_scope', () => {
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  for (const id of ['semiotics-icons-metaphors-2023', 'symbol-semantics-design-studies-2026']) {
    const source = sources.find((item) => item.id === id);
    assert.ok(source, `missing source ${id}`);
    assert.equal(source.status, 'active');
    assert.equal(source.scope, 'academic');
    assert.equal(source.access, 'external');
    assert.match(source.url, /^https:\/\//);
    assert.equal(source.checkedAt, '2026-10-20');
  }
});

test('academic_materials_identify_evidence_level_and_access_limits', () => {
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  const validEvidence = new Set([
    'official-competition-document',
    'official-software-documentation',
    'accessibility-standard',
    'evidence-informed-education-guideline',
    'peer-reviewed-theoretical-article',
    'peer-reviewed-study',
    'peer-reviewed-review',
    'design-textbook',
    'design-practitioner-text',
    'local-user-document',
    'proposed-practice-project'
  ]);
  for (const source of sources) {
    assert.ok(validEvidence.has(source.evidenceType), `${source.id} needs an explicit evidenceType`);
    if (source.evidenceType.startsWith('peer-reviewed-') || ['design-textbook', 'design-practitioner-text'].includes(source.evidenceType)) {
      assert.ok(source.accessNote?.length > 20, `${source.id} needs an honest full-text access note`);
    }
  }
  const lesson = moduleData('01-brief').sessions.find(({ id }) => id === '01-visual-language');
  assert.ok(lesson?.sources?.includes('thinking-with-type-2024'), 'visual foundations should cite an academic design text');
  const logoSources = moduleData('03-illustrator').sessions
    .filter(({ id }) => ['03-logo-typologies', '03-identity-system'].includes(id))
    .flatMap(({ sources: ids = [] }) => ids);
  assert.ok(logoSources.includes('logo-selection-henderson-cote-1998'), 'logo foundations should cite peer-reviewed research');
});

test('every_session_is_self_contained_and_uses_its_own_process_infographic', () => {
  const files = fs.readdirSync(path.join(root, 'content/modules')).filter((file) => file.endsWith('.json'));
  assert.ok(files.length >= 9);
  const sessionVisuals = new Set();
  const sessionText = new Set();
  const sessionExamples = new Set();
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'content/modules', file), 'utf8'));
    assert.ok(Array.isArray(data.sessions), `${file} should use sessions rather than lessons`);
    assert.equal('lessons' in data, false, `${file} should use the requested session wording`);
    for (const session of data.sessions) {
      assert.ok(Array.isArray(session.teaching_blocks) && session.teaching_blocks.length >= 3, `${session.id} needs several readable teaching blocks`);
      const teachingText = session.teaching_blocks.map(({ heading, text }) => `${heading ?? ''} ${text ?? ''}`).join(' ');
      assert.ok(session.teaching_blocks.every(({ heading, text }) => heading && text?.length >= 300), `${session.id} needs detailed teaching blocks`);
      assert.ok(teachingText.length >= 2000, `${session.id} needs enough explanation to stand on its own`);
      assert.match(teachingText, /\n\n/, `${session.id} explanation needs paragraph breaks`);
      assert.doesNotMatch(teachingText, /в этой теме важно не просто повторить действие/i, `${session.id} contains generic filler`);
      assert.equal(sessionText.has(teachingText), false, `${session.id} repeats another session's teaching text`);
      sessionText.add(teachingText);
      const visual = session.process_visual;
      assert.ok(visual?.image && visual.alt && visual.caption && Array.isArray(visual.steps) && visual.steps.length >= 3, `${session.id} needs an explanatory process visual`);
      assert.ok(Array.isArray(visual.details) && visual.details.length === visual.steps.length && visual.details.every((detail) => detail.length >= 28), `${session.id} needs explanatory labels in its infographic`);
      for (const detail of visual.details) assert.ok(visual.alt.includes(detail), `${session.id} alternative text should explain: ${detail}`);
      assert.equal(sessionVisuals.has(visual.image), false, `${session.id} needs its own infographic`);
      sessionVisuals.add(visual.image);
      const visualPath = path.join(root, visual.image);
      assert.ok(fs.existsSync(visualPath), `${session.id} visual is missing: ${visual.image}`);
      const svg = fs.readFileSync(visualPath, 'utf8');
      assert.match(svg, /<title\b/i, `${session.id} visual needs a title`);
      assert.match(svg, /<desc\b/i, `${session.id} visual needs a description`);
      for (const detail of visual.details) assert.ok(svg.includes(detail), `${session.id} infographic should explain: ${detail}`);
      assert.ok(session.worked_example?.description, `${session.id} needs an explanation of its worked visual example`);
      assert.equal(session.worked_example.image, visual.image, `${session.id} worked example must point to its matching process infographic`);
      assert.equal(session.worked_example.alt, visual.alt, `${session.id} worked example must share the matching infographic alternative text`);
      const exampleText = session.worked_example.description.trim();
      const exampleParagraphs = exampleText.split(/\r?\n\s*\r?\n/);
      assert.ok(exampleText.length >= 400, session.id + ' worked example should be a complete, detailed walkthrough');
      assert.ok(exampleParagraphs.length >= 3, session.id + ' worked example should be divided into readable blocks');
      assert.doesNotMatch(exampleText, /^Шаг \d+\./m, session.id + ' should explain a worked case instead of repeating infographic steps');
      assert.ok(!visual.details.every((detail) => exampleText.includes(detail)), session.id + ' worked example should add reasoning beyond the infographic labels');
      assert.equal(sessionExamples.has(exampleText), false, session.id + ' should have a unique worked example');
      sessionExamples.add(exampleText);
      if (session.id === '02-preflight-package') {
        assert.match(visual.steps[0], /связан/i);
        assert.match(visual.details[0], /связан/i);
        assert.match(visual.steps[1], /preflight/i);
        assert.match(visual.details[1], /preflight/i);
      }
      if (session.id === '04-composite-output') {
        assert.match(visual.steps[0], /исходник/i);
        assert.match(visual.details[0], /перспектив/i);
        assert.match(visual.steps[1], /слоя/i);
        assert.match(visual.details[1], /слоя/i);
      }
      if (session.id === '03-logo-typologies') {
        for (const type of ['словесный', 'монограмм', 'изобразительный', 'абстрактный', 'комбинированный', 'эмблем']) {
          assert.ok(visual.details[1].toLowerCase().includes(type), 'logo taxonomy should include ' + type);
        }
      }
    }
  }
  const site = fs.readFileSync(path.join(root, 'assets/js/site.js'), 'utf8');
  assert.match(site, /Занятие/);
  const legacyTerm = ['Уро', 'к'].join('');
  assert.doesNotMatch(site, new RegExp(`${legacyTerm}\\s`, 'i'));
  assert.match(site, /renderSessionSources/);
  assert.match(site, /splitExplanationParagraphs/);
  assert.match(site, /process-step-list/);
  assert.match(site, /visual\.details\?\.\[index\]/);
  assert.doesNotMatch(site, /worked_example\.image/);
  const css = fs.readFileSync(path.join(root, 'assets/css/site.css'), 'utf8');
  assert.match(css, /@media\(max-width:900px\)[\s\S]*?\.process-visual img\{display:none\}[\s\S]*?\.process-step-list\{display:grid;/);
  assert.match(css, /\.worked-example\{display:block\}/);
});

test('curriculum_map_covers_every_session_output_criteria_and_source_status', () => {
  const map = fs.readFileSync(path.join(root, 'docs/curriculum-map.md'), 'utf8');
  const { modules } = JSON.parse(fs.readFileSync(path.join(root, 'content/modules.json'), 'utf8'));
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  for (const module of modules) {
    assert.ok(map.includes(module.title), `curriculum map is missing module ${module.title}`);
    const data = moduleData(module.id);
    assert.ok(map.includes(`module.html?id=${module.id}`), `curriculum map needs a module link for ${module.id}`);
    for (const session of data.sessions) {
      for (const required of [session.title, session.goal, session.guided_practice, session.independent_brief]) {
        assert.ok(map.includes(required), `${module.id}/${session.id} is missing from the curriculum map`);
      }
      for (const criterion of session.criteria) {
        const readable = criterion.trim().replace(/[.!?;:]+$/, '');
        assert.ok(map.includes(readable), `${module.id}/${session.id} criteria are missing from the curriculum map`);
      }
      const line = map.split('\n').find((item) => item.startsWith('### ') && item.includes(`[${session.title}](`));
      const number = session.minutes % 100;
      const last = session.minutes % 10;
      const suffix = number >= 11 && number <= 14 ? 'минут' : last === 1 ? 'минута' : last >= 2 && last <= 4 ? 'минуты' : 'минут';
      assert.ok(line?.trimEnd().endsWith(`— ${session.minutes} ${suffix}`), `${module.id}/${session.id} duration uses the correct Russian form`);
      for (const id of session.sources) {
        const source = sources.find((item) => item.id === id);
        assert.ok(source, `${session.id} references missing source ${id}`);
        assert.ok(map.includes(`${source.title} (${source.status}; ${source.evidenceType})`), `${session.id} source status is missing from the curriculum map`);
      }
    }
  }
});

test('academic_symbol_source_discloses_full_text_access_limits', () => {
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  const source = sources.find(({ id }) => id === 'symbol-semantics-design-studies-2026');
  assert.ok(source);
  assert.match(source.accessNote, /полный текст.*(подпис|доступ через организац)/i);
});

test('source_map_separates_official_requirements_practice_material_and_unverified_documents', () => {
  const map = fs.readFileSync(path.join(root, 'docs/source-map.md'), 'utf8');
  for (const phrase of [
    'международная карта навыков',
    'не местная схема оценки',
    'учебный проект',
    'не использован как проверенная основа',
    'WSK2026_ТО_04_Графический дизайн.doc',
    'не копируются в открытый репозиторий'
  ]) assert.ok(map.includes(phrase), `source map must state: ${phrase}`);
  assert.match(map, /OD01[^\n]+3\.10/);
  assert.match(map, /OD03[^\n]+11\.1/);
  assert.match(map, /OD04[^\n]+2\.2/);
});

test('public_course_copy_uses_sessions_instead_of_the_old_russian_label', () => {
  const publicRoots = [
    'README.md', 'index.html', 'module.html', 'sources.html', 'glossary.html', 'timeline.html', 'community.html', 'print.html',
    'content', 'assets/js', 'docs/course-method.md', 'docs/curriculum-map.md', 'docs/source-map.md', 'docs/source-update-checklist.md'
  ];
  const collect = (relative) => {
    const target = path.join(root, relative);
    if (fs.statSync(target).isFile()) return [target];
    return fs.readdirSync(target).flatMap((name) => collect(path.join(relative, name)));
  };
  const legacyLabel = ['у', 'р', 'о', 'к'].join('');
  for (const file of publicRoots.flatMap(collect)) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, new RegExp(legacyLabel, 'iu'), path.relative(root, file));
  }
});
