import fs from 'node:fs';
import path from 'node:path';

const allowedStatus = new Set(['active', 'check', 'replaced', 'archive']);
const allowedScope = new Set(['Kazakhstan', 'WSI', 'Adobe', 'academic', 'education', 'accessibility', 'practice']);
const allowedEvidence = new Set([
  'official-competition-document', 'official-software-documentation', 'accessibility-standard',
  'evidence-informed-education-guideline', 'peer-reviewed-theoretical-article',
  'peer-reviewed-study', 'peer-reviewed-review', 'design-textbook',
  'design-practitioner-text', 'local-user-document', 'proposed-practice-project'
]);
const scholarlyEvidence = new Set(['peer-reviewed-theoretical-article', 'peer-reviewed-study', 'peer-reviewed-review', 'design-textbook', 'design-practitioner-text']);
const expectedIds = ['01-brief', '02-indesign', '03-illustrator', '04-photoshop', '05-print-production', '06-digital-design', '07-quality-handoff', '08-competition-english', '09-exams-selection'];

function readJson(rootDir, file, errors) {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { errors.push(`${file}: ${error.message}`); return null; }
}

export function validateCourse(rootDir, today = new Date()) {
  const errors = [];
  const warnings = [];
  const modulesDoc = readJson(rootDir, 'content/modules.json', errors);
  const sourcesDoc = readJson(rootDir, 'content/sources.json', errors);
  const timeline = readJson(rootDir, 'content/timeline.json', errors);
  const todayDate = new Date(`${typeof today === 'string' ? today : today.toISOString().slice(0, 10)}T00:00:00Z`);

  if (modulesDoc) {
    const ids = modulesDoc.modules?.map((module) => module.id);
    if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) errors.push('Модули должны иметь девять ID в утверждённом порядке.');
    for (const module of modulesDoc.modules ?? []) if (!module.title || !module.summary || !(module.hours > 0)) errors.push(`Неполная запись модуля: ${module.id}`);
  }
  if (sourcesDoc) {
    const ids = new Set((modulesDoc?.modules ?? []).map((module) => module.id));
    if (!Array.isArray(sourcesDoc.sources) || sourcesDoc.sources.length < 8) errors.push('Ожидается каталог минимум из восьми источников.');
    for (const source of sourcesDoc.sources ?? []) {
      for (const key of ['id', 'title', 'publisher', 'version', 'checkedAt', 'status', 'scope', 'modules', 'access', 'url', 'reference', 'use', 'evidenceType']) if (!(key in source)) errors.push(`${source.id ?? 'source'}: отсутствует ${key}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt ?? '')) errors.push(`${source.id}: checkedAt должен иметь формат YYYY-MM-DD.`);
      if (!allowedStatus.has(source.status)) errors.push(`${source.id}: недопустимый статус ${source.status}.`);
      if (!allowedScope.has(source.scope)) errors.push(`${source.id}: недопустимая область ${source.scope}.`);
      if (!allowedEvidence.has(source.evidenceType)) errors.push(`${source.id}: неизвестный тип доказательности ${source.evidenceType}.`);
      if (scholarlyEvidence.has(source.evidenceType) && (!source.accessNote || source.accessNote.length < 20)) errors.push(`${source.id}: у академического источника должно быть указано состояние полного текста/доступа.`);
      if (!Array.isArray(source.modules) || source.modules.some((id) => !ids.has(id))) errors.push(`${source.id}: указан неизвестный модуль.`);
      if (source.access === 'external' && (!source.url || source.reference !== null)) errors.push(`${source.id}: внешний источник требует url и reference:null.`);
      else if (source.access === 'local-reference' && (source.url !== null || !source.reference)) errors.push(`${source.id}: локальная ссылка требует url:null и название reference.`);
      else if (!['external', 'local-reference'].includes(source.access)) errors.push(`${source.id}: неизвестный способ доступа.`);
      const date = new Date(`${source.checkedAt}T00:00:00Z`);
      if (Number.isNaN(date.valueOf())) errors.push(`${source.id}: неверная дата проверки.`);
      else if (date > todayDate) errors.push(`${source.id}: дата проверки находится в будущем.`);
      const ageDays = Math.floor((todayDate - date) / 86400000);
      if (ageDays > 31 && source.status === 'active') warnings.push(`${source.id}: источник проверен ${ageDays} дней назад; нужен просмотр.`);
    }
    if ((sourcesDoc.sources ?? []).some(({ version, status }) => /WSSS\s*2019/i.test(version) && status === 'active')) errors.push('Нельзя помечать WSSS 2019 действующим стандартом.');
  }
  const sourceById = new Map((sourcesDoc?.sources ?? []).map((source) => [source.id, source]));
  const moduleDir = path.join(rootDir, 'content/modules');
  let moduleFiles = [];
  try { moduleFiles = fs.readdirSync(moduleDir).filter((file) => file.endsWith('.json')); }
  catch (error) { errors.push(`content/modules: ${error.message}`); }
  if (moduleFiles.length !== expectedIds.length) errors.push(`Ожидается ${expectedIds.length} JSON-модулей занятий.`);
  for (const file of moduleFiles) {
    const data = readJson(rootDir, `content/modules/${file}`, errors);
    if (!data) continue;
    if (!Array.isArray(data.sessions)) errors.push(`${file}: требуется массив sessions.`);
    if ('lessons' in data) errors.push(`${file}: поле lessons устарело; используйте sessions.`);
    for (const session of data.sessions ?? []) {
      if (!Array.isArray(session.teaching_blocks) || session.teaching_blocks.length < 3) errors.push(`${file}/${session.id}: требуется не менее трёх смысловых блоков.`);
      const blocks = session.teaching_blocks ?? [];
      const teachingText = blocks.map(({ heading, text }) => `${heading ?? ''} ${text ?? ''}`).join(' ');
      if (blocks.some(({ heading, text }) => !heading || typeof text !== 'string' || text.length < 300) || teachingText.length < 2000 || !teachingText.includes('\n\n')) errors.push(`${file}/${session.id}: объяснение должно быть самодостаточным и состоять из содержательных блоков.`);
      const image = session.process_visual?.image;
      if (!image || !session.process_visual?.alt || !session.process_visual?.caption || !Array.isArray(session.process_visual?.steps) || session.process_visual.steps.length < 3 || !Array.isArray(session.process_visual?.details) || session.process_visual.details.length !== session.process_visual.steps.length || session.process_visual.details.some((detail) => typeof detail !== 'string' || detail.length < 28)) errors.push(`${file}/${session.id}: отсутствует доступная поясняющая инфографика.`);
      else {
        const imagePath = path.resolve(rootDir, image);
        if (!imagePath.startsWith(path.resolve(rootDir) + path.sep) || !fs.existsSync(imagePath)) errors.push(`${file}/${session.id}: не найден локальный визуальный материал ${image}.`);
        else {
          const svg = fs.readFileSync(imagePath, 'utf8');
          if (!/<title\b/i.test(svg) || !/<desc\b/i.test(svg) || session.process_visual.details.some((detail) => !svg.includes(detail))) errors.push(`${file}/${session.id}: SVG должен иметь доступное описание и пояснения каждого этапа.`);
        }
      }
      if (!Array.isArray(session.sources) || session.sources.length === 0) errors.push(`${file}/${session.id}: занятие должно иметь источники.`);
      else for (const sourceId of session.sources) if (sourceById.get(sourceId)?.status !== 'active') errors.push(`${file}/${session.id}: источник ${sourceId} отсутствует или не активен.`);
      if (!session.worked_example?.image || !session.worked_example?.alt || !session.worked_example?.description) errors.push(`${file}/${session.id}: требуется разобранный иллюстрированный пример.`);
    }
  }
  if (timeline) {
    const phases = timeline.phases ?? [];
    const sums = phases.reduce((acc, phase) => ({ total: acc.total + phase.totalHours, guided: acc.guided + phase.guidedHours, self: acc.self + phase.selfStudyHours }), { total: 0, guided: 0, self: 0 });
    if (timeline.totalHours !== 228 || timeline.guidedHours !== 168 || timeline.selfStudyHours !== 60) errors.push('Общие часы должны быть 228/168/60.');
    if (phases.length !== 4 || sums.total !== 228 || sums.guided !== 168 || sums.self !== 60) errors.push('Месячные фазы должны суммироваться в 228/168/60 часов.');
    if (phases.at(-1)?.endDate !== '2027-01-31' || timeline.firstPhaseEnd !== '2027-01-31') errors.push('Первый маршрут завершается 31 января 2027 года.');
    if (!timeline.postPublication?.trigger || !timeline.postPublication?.week1 || !timeline.postPublication?.weeks2to4 || !timeline.postPublication?.untilContest) errors.push('Постпубликационный этап требует событийного плана.');
    if ('date' in (timeline.postPublication ?? {}) || 'startDate' in (timeline.postPublication ?? {})) errors.push('Для этапа после публикации нельзя заранее задавать календарную дату.');
  }
  return { errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\//, ''))) {
  const strict = process.argv.includes('--strict-current');
  const result = validateCourse(process.cwd(), new Date());
  for (const message of result.errors) console.error(`ERROR: ${message}`);
  for (const message of result.warnings) console.warn(`${strict ? 'ERROR' : 'CHECK'}: ${message}`);
  if (result.errors.length || (strict && result.warnings.length)) process.exitCode = 1;
  else console.log(`OK: каталог и календарь корректны; ${result.warnings.length} источников требуют просмотра.`);
}
