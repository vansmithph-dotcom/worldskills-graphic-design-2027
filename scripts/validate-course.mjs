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

function readLocalTextFile(rootDir, relativePath) {
  try {
    const root = fs.realpathSync(rootDir);
    const target = fs.realpathSync(path.resolve(root, relativePath));
    const relativeTarget = path.relative(root, target);
    if (relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) return { error: 'путь выходит за пределы проекта' };
    if (!fs.statSync(target).isFile()) return { error: 'указанный путь не является файлом' };
    return { text: fs.readFileSync(target, 'utf8'), canonicalPath: target };
  } catch (error) {
    return { error: error.message };
  }
}

function readLocalAsset(rootDir, relativePath) {
  try {
    const root = fs.realpathSync(rootDir);
    const target = fs.realpathSync(path.resolve(root, relativePath));
    const relativeTarget = path.relative(root, target);
    if (relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) return { error: 'путь выходит за пределы проекта' };
    if (!fs.statSync(target).isFile()) return { error: 'указанный путь не является файлом' };
    return { buffer: fs.readFileSync(target), canonicalPath: target, extension: path.extname(target).toLowerCase() };
  } catch (error) {
    return { error: error.message };
  }
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateTextList(value, minimum, label, sessionLabel, errors) {
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => !isText(item))) {
    errors.push(`${sessionLabel}: ${label} должен содержать не менее ${minimum} непустых пунктов.`);
    return false;
  }
  return true;
}

function validatePracticeSteps(steps, label, sessionLabel, errors) {
  if (!Array.isArray(steps) || steps.length < 3) {
    errors.push(`${sessionLabel}: ${label} должен содержать не менее трёх шагов.`);
    return 0;
  }
  let total = 0;
  for (const [index, step] of steps.entries()) {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      errors.push(`${sessionLabel}: ${label}[${index}] должен быть объектом.`);
      continue;
    }
    for (const field of ['action', 'output', 'checkpoint']) if (!isText(step[field])) errors.push(`${sessionLabel}: отсутствует ${label}[${index}].${field}.`);
    if (!Number.isInteger(step.minutes) || step.minutes <= 0) errors.push(`${sessionLabel}: ${label}[${index}].minutes должен быть положительным целым числом.`);
    else total += step.minutes;
  }
  return total;
}

function validateCaseStudy(rootDir, session, moduleId, sessionLabel, sourceById, errors) {
  const study = session.case_study;
  if (!study || typeof study !== 'object' || Array.isArray(study)) {
    errors.push(`${sessionLabel}: требуется самодостаточный case_study и тайминг практики.`);
    return;
  }
  if (study.status !== 'training-simulation') errors.push(`${sessionLabel}: case_study.status должен помечать материал как training-simulation.`);
  if (!isText(study.title)) errors.push(`${sessionLabel}: отсутствует case_study.title.`);

  const brief = study.brief;
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) errors.push(`${sessionLabel}: отсутствует case_study.brief.`);
  else {
    for (const field of ['client', 'audience', 'task']) if (!isText(brief[field])) errors.push(`${sessionLabel}: отсутствует case_study.brief.${field}.`);
    for (const field of ['required_content', 'deliverables', 'constraints', 'unknowns', 'questions']) validateTextList(brief[field], 2, `case_study.brief.${field}`, sessionLabel, errors);
  }

  const decisions = study.decisions;
  if (!Array.isArray(decisions) || decisions.length === 0) errors.push(`${sessionLabel}: case_study.decisions должен содержать хотя бы одно решение.`);
  else for (const [index, decision] of decisions.entries()) {
    const label = `case_study.decisions[${index}]`;
    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
      errors.push(`${sessionLabel}: ${label} должен быть объектом.`);
      continue;
    }
    for (const field of ['stage', 'choice', 'reason', 'alternative', 'test', 'result']) if (!isText(decision[field])) errors.push(`${sessionLabel}: отсутствует ${label}.${field}.`);
    if (isText(decision.result) && !/учебная симуляция/i.test(decision.result)) errors.push(`${sessionLabel}: ${label}.result должен явно маркировать пример как учебную симуляцию.`);
  }

  const revision = study.revision;
  if (!revision || typeof revision !== 'object' || Array.isArray(revision)) errors.push(`${sessionLabel}: отсутствует case_study.revision.`);
  else {
    for (const field of ['finding', 'change', 'outcome']) if (!isText(revision[field])) errors.push(`${sessionLabel}: отсутствует case_study.revision.${field}.`);
    if (isText(revision.finding) && !/симулированное/i.test(revision.finding)) errors.push(`${sessionLabel}: case_study.revision.finding должен помечать вывод как симулированное наблюдение.`);
  }

  const output = study.final_output;
  if (!output || typeof output !== 'object' || Array.isArray(output)) errors.push(`${sessionLabel}: отсутствует case_study.final_output.`);
  else {
    if (!isText(output.artifact)) errors.push(`${sessionLabel}: отсутствует case_study.final_output.artifact.`);
    for (const field of ['spec', 'files', 'checks']) validateTextList(output[field], 2, `case_study.final_output.${field}`, sessionLabel, errors);
  }

  const reference = study.real_reference;
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) errors.push(`${sessionLabel}: отсутствует case_study.real_reference.`);
  else {
    for (const field of ['source_id', 'observation', 'limit']) if (!isText(reference[field])) errors.push(`${sessionLabel}: отсутствует case_study.real_reference.${field}.`);
    const source = sourceById.get(reference.source_id);
    if (!source || source.status !== 'active') errors.push(`${sessionLabel}: источник кейса ${reference.source_id ?? '(пусто)'} отсутствует или не активен.`);
    else {
      if (!source.modules?.includes(moduleId)) errors.push(`${sessionLabel}: источник кейса ${reference.source_id} не привязан к модулю ${moduleId}.`);
      if (!Array.isArray(session.sources) || !session.sources.includes(reference.source_id)) errors.push(`${sessionLabel}: источник кейса ${reference.source_id} должен присутствовать в sources занятия.`);
      if (source.access === 'external' && !/^https:\/\//i.test(source.url ?? '')) errors.push(`${sessionLabel}: внешний источник кейса ${reference.source_id} должен использовать HTTPS.`);
    }
  }

  const image = study.image;
  if (!image || typeof image !== 'object' || Array.isArray(image) || !isText(image.src) || !isText(image.alt) || !isText(image.caption)) {
    errors.push(`${sessionLabel}: case_study.image должен содержать src, alt и caption.`);
  } else {
    const imageAsset = readLocalAsset(rootDir, image.src);
    if (imageAsset.error) errors.push(`${sessionLabel}: не найден визуальный кейс ${image.src}: ${imageAsset.error}.`);
    else if (imageAsset.extension === '.svg') {
      const svg = imageAsset.buffer.toString('utf8');
      if (!/<title\b/i.test(svg) || !/<desc\b/i.test(svg)) errors.push(`${sessionLabel}: SVG кейса должен иметь доступные title и desc.`);
    } else if (imageAsset.extension === '.png') {
      if (imageAsset.buffer.length < 8 || !imageAsset.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) errors.push(`${sessionLabel}: изображение кейса не является корректным PNG.`);
    } else errors.push(`${sessionLabel}: визуал кейса должен быть локальным SVG или PNG.`);
  }
}

export function validateCourse(rootDir, today = new Date()) {
  const errors = [];
  const warnings = [];
  const modulesDoc = readJson(rootDir, 'content/modules.json', errors);
  const sourcesDoc = readJson(rootDir, 'content/sources.json', errors);
  const timeline = readJson(rootDir, 'content/timeline.json', errors);
  const glossary = readJson(rootDir, 'content/glossary.json', errors);
  const moduleRecords = Array.isArray(modulesDoc?.modules) ? modulesDoc.modules : [];
  const validModuleIds = new Set(moduleRecords.filter((module) => module && typeof module === 'object' && !Array.isArray(module)).map(({ id }) => id).filter((id) => typeof id === 'string'));
  const todayDate = new Date(`${typeof today === 'string' ? today : today.toISOString().slice(0, 10)}T00:00:00Z`);

  if (modulesDoc) {
    if (!Array.isArray(modulesDoc.modules)) errors.push('content/modules.json: требуется массив modules.');
    const ids = moduleRecords.map((module) => module && typeof module === 'object' && !Array.isArray(module) ? module.id : null);
    if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) errors.push('Модули должны иметь девять ID в утверждённом порядке.');
    for (const [index, module] of moduleRecords.entries()) {
      if (!module || typeof module !== 'object' || Array.isArray(module)) {
        errors.push(`content/modules.json: запись модуля ${index + 1} должна быть объектом.`);
        continue;
      }
      if (!module.title || !module.summary || !(module.hours > 0)) errors.push(`Неполная запись модуля: ${module.id}`);
    }
  }
  if (sourcesDoc) {
    const ids = new Set(moduleRecords.filter((module) => module && typeof module === 'object' && !Array.isArray(module)).map((module) => module.id));
    if (!Array.isArray(sourcesDoc.sources) || sourcesDoc.sources.length < 8) errors.push('Ожидается каталог минимум из восьми источников.');
    for (const [index, source] of (Array.isArray(sourcesDoc.sources) ? sourcesDoc.sources : []).entries()) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        errors.push(`content/sources.json: запись источника ${index + 1} должна быть объектом.`);
        continue;
      }
      for (const key of ['id', 'title', 'publisher', 'version', 'checkedAt', 'status', 'scope', 'modules', 'access', 'url', 'reference', 'use', 'evidenceType']) if (!(key in source)) errors.push(`${source.id ?? 'source'}: отсутствует ${key}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt ?? '')) errors.push(`${source.id}: checkedAt должен иметь формат YYYY-MM-DD.`);
      if (!allowedStatus.has(source.status)) errors.push(`${source.id}: недопустимый статус ${source.status}.`);
      if (!allowedScope.has(source.scope)) errors.push(`${source.id}: недопустимая область ${source.scope}.`);
      if (!allowedEvidence.has(source.evidenceType)) errors.push(`${source.id}: неизвестный тип доказательности ${source.evidenceType}.`);
      if (scholarlyEvidence.has(source.evidenceType) && (!source.accessNote || source.accessNote.length < 20)) errors.push(`${source.id}: у академического источника должно быть указано состояние полного текста/доступа.`);
      if (!Array.isArray(source.modules) || source.modules.some((id) => !ids.has(id))) errors.push(`${source.id}: указан неизвестный модуль.`);
      if (source.access === 'external') {
        if (!source.url || source.reference !== null) errors.push(`${source.id}: внешний источник требует url и reference:null.`);
        if (source.url) {
          try {
            const externalUrl = new URL(source.url);
            if (externalUrl.protocol !== 'https:' || !externalUrl.hostname || externalUrl.username || externalUrl.password) errors.push(`${source.id}: внешний url должен быть корректным HTTPS-адресом без данных авторизации.`);
          } catch {
            errors.push(`${source.id}: внешний url должен быть корректным HTTPS-адресом.`);
          }
        }
      }
      else if (source.access === 'local-reference' && (source.url !== null || !source.reference)) errors.push(`${source.id}: локальная ссылка требует url:null и название reference.`);
      else if (!['external', 'local-reference'].includes(source.access)) errors.push(`${source.id}: неизвестный способ доступа.`);
      const date = new Date(`${source.checkedAt}T00:00:00Z`);
      if (Number.isNaN(date.valueOf())) errors.push(`${source.id}: неверная дата проверки.`);
      else if (date > todayDate) errors.push(`${source.id}: дата проверки находится в будущем.`);
      const ageDays = Math.floor((todayDate - date) / 86400000);
      if (ageDays > 31 && source.status === 'active') warnings.push(`${source.id}: источник проверен ${ageDays} дней назад; нужен просмотр.`);
    }
    if ((Array.isArray(sourcesDoc.sources) ? sourcesDoc.sources : []).some((source) => source && typeof source === 'object' && !Array.isArray(source) && /WSSS\s*2019/i.test(source.version) && source.status === 'active')) errors.push('Нельзя помечать WSSS 2019 действующим стандартом.');
  }
  const sourceById = new Map((Array.isArray(sourcesDoc?.sources) ? sourcesDoc.sources : []).filter((source) => source && typeof source === 'object' && !Array.isArray(source)).map((source) => [source.id, source]));
  const sessionIds = new Set();
  const caseTasks = new Map();
  let guidedPracticeMinutes = 0;
  let independentPracticeMinutes = 0;
  const moduleDir = path.join(rootDir, 'content/modules');
  let moduleFiles = [];
  try { moduleFiles = fs.readdirSync(moduleDir).filter((file) => file.endsWith('.json')); }
  catch (error) { errors.push(`content/modules: ${error.message}`); }
  if (moduleFiles.length !== expectedIds.length) errors.push(`Ожидается ${expectedIds.length} JSON-модулей занятий.`);
  for (const file of moduleFiles) {
    const data = readJson(rootDir, `content/modules/${file}`, errors);
    if (!data) continue;
    if (!Array.isArray(data.sessions)) {
      errors.push(`${file}: требуется массив sessions.`);
      continue;
    }
    if ('lessons' in data) errors.push(`${file}: поле lessons устарело; используйте sessions.`);
    for (const [sessionIndex, session] of data.sessions.entries()) {
      if (!session || typeof session !== 'object' || Array.isArray(session)) {
        errors.push(`${file}/session-${sessionIndex + 1}: запись занятия должна быть объектом.`);
        continue;
      }
      const sessionLabel = `${file}/${session.id ?? 'unknown-session'}`;
      if (session.id) sessionIds.add(session.id);
      if (!Number.isInteger(session.minutes) || session.minutes <= 0) errors.push(`${sessionLabel}: minutes должен быть положительным целым числом.`);
      if (typeof session.goal !== 'string' || !session.goal.trim()) errors.push(`${sessionLabel}: требуется непустая цель занятия.`);
      if (typeof session.challenge !== 'string' || !session.challenge.trim()) errors.push(`${sessionLabel}: требуется непустое усложнение по желанию.`);
      const adaptation = session.adaptation;
      if (!adaptation || typeof adaptation !== 'object' || Array.isArray(adaptation)) {
        errors.push(`${sessionLabel}: требуется резервный маршрут с trigger, alternative и preserve.`);
      } else {
        for (const field of ['trigger', 'alternative']) if (typeof adaptation[field] !== 'string' || !adaptation[field].trim()) errors.push(`${sessionLabel}: в резервном маршруте отсутствует ${field}.`);
        if (!Array.isArray(adaptation.preserve) || adaptation.preserve.length === 0 || adaptation.preserve.some((item) => typeof item !== 'string' || !item.trim())) errors.push(`${sessionLabel}: в резервном маршруте preserve должен содержать хотя бы одно непустое требование.`);
      }
      if (!Array.isArray(session.teaching_blocks) || session.teaching_blocks.length < 3) errors.push(`${sessionLabel}: требуется не менее трёх смысловых блоков.`);
      const blocks = Array.isArray(session.teaching_blocks) ? session.teaching_blocks : [];
      if (blocks.some((block) => !block || typeof block !== 'object' || Array.isArray(block))) errors.push(`${sessionLabel}: блок объяснения должен быть объектом.`);
      const validBlocks = blocks.filter((block) => block && typeof block === 'object' && !Array.isArray(block));
      const teachingText = validBlocks.map(({ heading, text }) => `${heading ?? ''} ${text ?? ''}`).join(' ');
      if (validBlocks.some(({ heading, text }) => !heading || typeof text !== 'string' || text.length < 300) || teachingText.length < 2000 || !teachingText.includes('\n\n')) errors.push(`${sessionLabel}: объяснение должно быть самодостаточным и состоять из содержательных блоков.`);
      const image = session.process_visual?.image;
      let visualCanonicalPath = null;
      if (typeof image !== 'string' || !image || !session.process_visual?.alt || !session.process_visual?.caption || !Array.isArray(session.process_visual?.steps) || session.process_visual.steps.length < 3 || !Array.isArray(session.process_visual?.details) || session.process_visual.details.length !== session.process_visual.steps.length || session.process_visual.details.some((detail) => typeof detail !== 'string' || detail.length < 28)) errors.push(`${file}/${session.id}: отсутствует доступная поясняющая инфографика.`);
      else {
        const visualFile = readLocalTextFile(rootDir, image);
        if (visualFile.error) errors.push(`${file}/${session.id}: не найден локальный визуальный материал ${image}: ${visualFile.error}.`);
        else {
          visualCanonicalPath = visualFile.canonicalPath;
          const svg = visualFile.text;
          if (!/<title\b/i.test(svg) || !/<desc\b/i.test(svg) || session.process_visual.details.some((detail) => !svg.includes(detail))) errors.push(`${file}/${session.id}: SVG должен иметь доступное описание и пояснения каждого этапа.`);
        }
      }
      if (!Array.isArray(session.sources) || session.sources.length === 0) errors.push(`${file}/${session.id}: занятие должно иметь источники.`);
      else for (const sourceId of session.sources) if (sourceById.get(sourceId)?.status !== 'active') errors.push(`${file}/${session.id}: источник ${sourceId} отсутствует или не активен.`);
      const example = session.worked_example;
      if (!example || typeof example !== 'object' || Array.isArray(example) || typeof example.image !== 'string' || !example.image || typeof example.alt !== 'string' || !example.alt.trim() || typeof example.caption !== 'string' || !example.caption.trim() || typeof example.description !== 'string' || !example.description.trim()) errors.push(`${sessionLabel}: требуется разобранный иллюстрированный пример с подписью, описанием и альтернативным текстом.`);
      else {
        const exampleFile = readLocalTextFile(rootDir, example.image);
        if (exampleFile.error) errors.push(`${sessionLabel}: не найден локальный пример ${example.image}: ${exampleFile.error}.`);
        else {
          if (visualCanonicalPath && exampleFile.canonicalPath === visualCanonicalPath) errors.push(`${sessionLabel}: иллюстрация примера должна отличаться от схемы процесса.`);
          const svg = exampleFile.text;
          if (!/<title\b/i.test(svg) || !/<desc\b/i.test(svg)) errors.push(`${sessionLabel}: SVG примера должен иметь доступные title и desc.`);
        }
      }
      validateCaseStudy(rootDir, session, data.id, sessionLabel, sourceById, errors);
      const caseTask = session.case_study?.brief?.task;
      if (isText(caseTask)) {
        if (caseTasks.has(caseTask)) errors.push(`${sessionLabel}: case_study.brief.task повторяет задание ${caseTasks.get(caseTask)}.`);
        else caseTasks.set(caseTask, session.id ?? sessionLabel);
      }
      const guidedSteps = validatePracticeSteps(session.guided_steps, 'guided_steps', sessionLabel, errors);
      const independentSteps = validatePracticeSteps(session.independent_steps, 'independent_steps', sessionLabel, errors);
      guidedPracticeMinutes += guidedSteps;
      independentPracticeMinutes += independentSteps;
      if (Number.isInteger(session.minutes) && guidedSteps + independentSteps !== session.minutes) errors.push(`${sessionLabel}: минуты guided_steps и independent_steps суммируются в ${guidedSteps + independentSteps}, а занятие указано как ${session.minutes}.`);
      if (timeline && guidedPracticeMinutes > timeline.guidedHours * 60) errors.push(`${sessionLabel}: короткая практика превышает распределение занятий и практики с преподавателем (${timeline.guidedHours} часов).`);
      if (timeline && independentPracticeMinutes > timeline.selfStudyHours * 60) errors.push(`${sessionLabel}: короткая самостоятельная практика превышает выделенные ${timeline.selfStudyHours} часов.`);
    }
  }
  if (!Array.isArray(glossary?.terms) || glossary.terms.length === 0) errors.push('content/glossary.json: требуется непустой массив terms.');
  for (const [index, entry] of (Array.isArray(glossary?.terms) ? glossary.terms : []).entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`content/glossary.json: запись глоссария ${index + 1} должна быть объектом.`);
      continue;
    }
    const label = entry.term || 'glossary entry';
    for (const field of ['term', 'translation', 'definition']) if (typeof entry[field] !== 'string' || !entry[field].trim()) errors.push(`${label}: в глоссарии отсутствует ${field}.`);
    if (!Array.isArray(entry.modules) || entry.modules.length === 0) errors.push(`${label}: в глоссарии modules должен содержать хотя бы один модуль.`);
    else for (const moduleId of entry.modules) if (!validModuleIds.has(moduleId)) errors.push(`${label}: неизвестный модуль ${moduleId} в глоссарии.`);
  }

  const curriculumMapPath = path.join(rootDir, 'docs/curriculum-map.md');
  try {
    const curriculumMap = fs.readFileSync(curriculumMapPath, 'utf8');
    const heading = '## Сквозной маршрут фундаментальных понятий';
    const headingIndex = curriculumMap.indexOf(heading);
    if (headingIndex < 0) errors.push('docs/curriculum-map.md: отсутствует сквозная матрица фундаментальных понятий.');
    else {
      const followingHeading = curriculumMap.slice(headingIndex + heading.length).search(/^## /m);
      const matrix = curriculumMap.slice(headingIndex + heading.length, followingHeading < 0 ? undefined : headingIndex + heading.length + followingHeading);
      const tableRows = matrix.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
      const separator = /^\|\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/;
      const dataRows = tableRows.filter((line, index) => index > 0 && !separator.test(line));
      if (tableRows.length < 3 || dataRows.length === 0) errors.push('docs/curriculum-map.md: матрица должна содержать таблицу с маршрутами понятий.');
      for (const [index, row] of dataRows.entries()) {
        const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
        if (cells.length !== 4) {
          errors.push(`docs/curriculum-map.md: строка матрицы ${index + 1} должна содержать понятие и три этапа.`);
          continue;
        }
        const route = cells.slice(1);
        for (const sessionId of route) if (!/^\d{2}-[a-z0-9-]+$/.test(sessionId) || !sessionIds.has(sessionId)) errors.push(`docs/curriculum-map.md: матрица ссылается на неизвестное занятие ${sessionId}.`);
        if (new Set(route).size !== route.length) errors.push(`docs/curriculum-map.md: строка матрицы ${index + 1} должна связывать три разных занятия.`);
      }
    }
  } catch (error) { errors.push(`docs/curriculum-map.md: ${error.message}`); }
  if (timeline) {
    const phases = timeline.phases ?? [];
    const sums = phases.reduce((acc, phase) => ({ total: acc.total + phase.totalHours, guided: acc.guided + phase.guidedHours, self: acc.self + phase.selfStudyHours }), { total: 0, guided: 0, self: 0 });
    if (timeline.totalHours !== 228 || timeline.guidedHours !== 168 || timeline.selfStudyHours !== 60) errors.push('Общие часы должны быть 228/168/60.');
    if (phases.length !== 4 || sums.total !== 228 || sums.guided !== 168 || sums.self !== 60) errors.push('Месячные фазы должны суммироваться в 228/168/60 часов.');
    if (phases.at(-1)?.endDate !== '2027-01-31' || timeline.firstPhaseEnd !== '2027-01-31') errors.push('Первый маршрут завершается 31 января 2027 года.');
    if (!timeline.postPublication?.trigger || !timeline.postPublication?.week1 || !timeline.postPublication?.weeks2to4 || !timeline.postPublication?.untilContest) errors.push('Постпубликационный этап требует событийного плана.');
    if ('date' in (timeline.postPublication ?? {}) || 'startDate' in (timeline.postPublication ?? {})) errors.push('Для этапа после публикации нельзя заранее задавать календарную дату.');
    const timedPractice = timeline.timedPractice;
    const guidedLimit = timeline.guidedHours * 60;
    const independentLimit = timeline.selfStudyHours * 60;
    const expectedAccounting = {
      guidedMinutes: guidedPracticeMinutes,
      independentMinutes: independentPracticeMinutes,
      totalMinutes: guidedPracticeMinutes + independentPracticeMinutes,
      guidedRemainingMinutes: guidedLimit - guidedPracticeMinutes,
      independentRemainingMinutes: independentLimit - independentPracticeMinutes,
      remainingMinutes: guidedLimit + independentLimit - guidedPracticeMinutes - independentPracticeMinutes
    };
    if (!timedPractice || typeof timedPractice !== 'object' || Array.isArray(timedPractice)) errors.push('content/timeline.json: требуется учёт таймингов занятий внутри общей нагрузки.');
    else {
      for (const [field, expected] of Object.entries(expectedAccounting)) if (timedPractice[field] !== expected) errors.push(`content/timeline.json: timedPractice.${field} должен быть ${expected}.`);
      if (timedPractice.includedInCourseHours !== true) errors.push('content/timeline.json: тайминги занятий должны быть включены в 228 часов курса.');
      for (const field of ['guided', 'independent']) if (!Array.isArray(timedPractice.remainingUse?.[field]) || timedPractice.remainingUse[field].length < 2 || timedPractice.remainingUse[field].some((item) => !isText(item))) errors.push(`content/timeline.json: timedPractice.remainingUse.${field} должен объяснять использование оставшегося времени.`);
    }
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
