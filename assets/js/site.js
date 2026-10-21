import { renderQuiz } from './quiz.js';

export function getSafeModuleId(requestedId, knownIds) {
  if (typeof requestedId !== 'string' || !/^\d{2}-[a-z0-9-]+$/.test(requestedId)) return null;
  return knownIds.includes(requestedId) ? requestedId : null;
}

const node = (tag, value = '', cls = '') => {
  const element = document.createElement(tag);
  element.textContent = value ?? '';
  if (cls) element.className = cls;
  return element;
};

const heading = (level, value) => node(`h${Math.max(1, Math.min(6, level))}`, value);

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Не загружен ${url}`);
  return response.json();
}

const modules = async () => (await json('content/modules.json')).modules;

function section(parent, title, value, className = 'session-part', headingLevel = 3) {
  const part = document.createElement('section');
  part.className = className;
  part.append(heading(headingLevel, title));
  if (Array.isArray(value)) {
    const list = document.createElement('ul');
    value.forEach((item) => list.append(node('li', item)));
    part.append(list);
  } else if (value) part.append(node('p', value));
  parent.append(part);
}

function processFigure(visual, className = 'process-visual') {
  if (!visual?.image) return null;
  const figure = document.createElement('figure');
  figure.className = className;
  const image = document.createElement('img');
  image.src = visual.image;
  image.alt = visual.alt ?? '';
  image.loading = 'lazy';
  const stepList = document.createElement('ol');
  stepList.className = 'process-step-list';
  (visual.steps ?? []).forEach((step, index) => {
    const item = document.createElement('li');
    const copy = document.createElement('div');
    item.append(
      node('span', String(index + 1), 'process-step-number'),
      copy
    );
    copy.append(node('strong', step), node('p', visual.details?.[index] ?? ''));
    stepList.append(item);
  });
  figure.append(image, stepList, node('figcaption', visual.caption ?? ''));
  return figure;
}

function splitExplanationParagraphs(text = '') {
  return String(text).split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function renderTeachingBlocks(parent, blocks = [], headingLevel = 3) {
  const group = document.createElement('section');
  group.className = 'teaching-blocks';
  group.setAttribute('aria-label', 'Объяснение по блокам');
  blocks.forEach((block, index) => {
    const article = document.createElement('article');
    article.className = 'teaching-block';
    article.append(node('span', String(index + 1).padStart(2, '0'), 'teaching-block-number'));
    article.append(heading(headingLevel, block.heading));
    splitExplanationParagraphs(block.text).forEach((paragraph) => article.append(node('p', paragraph)));
    group.append(article);
  });
  parent.append(group);
}


export function renderSessionGoal(parent, goal, headingLevel = 3) {
  if (typeof goal !== 'string' || !goal.trim()) return null;
  const panel = document.createElement('section');
  panel.className = 'session-goal';
  panel.append(heading(headingLevel, 'К концу занятия ты сможешь'), node('p', goal));
  parent.append(panel);
  return panel;
}

export function renderSessionChallenge(parent, challenge, headingLevel = 3) {
  if (typeof challenge !== 'string' || !challenge.trim()) return null;
  const panel = document.createElement('section');
  panel.className = 'session-challenge';
  panel.append(heading(headingLevel, 'Усложнение по желанию'), node('p', challenge));
  parent.append(panel);
  return panel;
}

export function renderSessionNotice(parent, notice) {
  if (typeof notice !== 'string' || !notice.trim()) return null;
  const panel = document.createElement('aside');
  panel.className = 'session-notice';
  panel.append(node('p', notice));
  parent.append(panel);
  return panel;
}

export function renderWorkedExample(parent, example, { eager = false, headingLevel = 3 } = {}) {
  if (!example?.description) return;
  const part = document.createElement('section');
  part.className = 'session-part worked-example';
  part.append(heading(headingLevel, 'Разобранный визуальный пример'));
  if (example.image) {
    part.append(node('p', 'На телефоне прокручивайте схему по горизонтали, чтобы прочитать подписи.', 'worked-example-scroll-hint'));
    const figure = document.createElement('figure');
    figure.className = 'worked-example-figure';
    const image = document.createElement('img');
    image.src = example.image;
    image.alt = example.alt ?? '';
    image.loading = eager ? 'eager' : 'lazy';
    figure.append(image);
    if (example.caption) figure.append(node('figcaption', example.caption));
    part.append(figure);
  }
  splitExplanationParagraphs(example.description).forEach((paragraph) => part.append(node('p', paragraph)));
  parent.append(part);
  return part;
}

function renderCaseField(parent, label, value, headingLevel = 5) {
  if (Array.isArray(value) ? value.length === 0 : !value) return;
  const field = document.createElement('div');
  field.className = 'case-study-field';
  field.append(heading(headingLevel, label));
  if (Array.isArray(value)) {
    const list = document.createElement('ul');
    value.forEach((item) => list.append(node('li', item)));
    field.append(list);
  } else field.append(node('p', value));
  parent.append(field);
}

function renderCaseGroup(parent, title, fields, headingLevel = 4) {
  const group = document.createElement('section');
  group.className = 'case-study-group';
  group.append(heading(headingLevel, title));
  fields.forEach(([label, value]) => renderCaseField(group, label, value, headingLevel + 1));
  parent.append(group);
  return group;
}

function renderCaseOrderedList(parent, title, items = [], headingLevel = 5) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const field = document.createElement('div');
  field.className = 'case-study-field';
  field.append(heading(headingLevel, title));
  const list = document.createElement('ol');
  list.className = 'case-study-ordered-list';
  items.forEach((item) => list.append(node('li', item)));
  field.append(list);
  parent.append(field);
  return field;
}

function dimensionLabel(size, keys) {
  if (!size || !keys.every((key) => Number.isFinite(size[key]))) return '';
  return `${keys.map((key) => size[key]).join(' × ')} мм`;
}

export function renderCaseStudy(parent, caseStudy, sourceById = new Map(), { eagerImages = false, headingLevel = 3 } = {}) {
  if (!caseStudy?.title) return null;
  const card = document.createElement('section');
  card.className = 'case-study';
  if (caseStudy.status === 'training-simulation') {
    card.append(node('p', 'Учебная симуляция · вымышленный заказ', 'case-study-status'));
  }
  card.append(heading(headingLevel, caseStudy.title));
  const renderGroup = (title, fields) => renderCaseGroup(card, title, fields, headingLevel + 1);

  const brief = caseStudy.brief ?? {};
  renderGroup('Бриф', [
    ['Клиент', brief.client],
    ['Аудитория', brief.audience],
    ['Задача', brief.task],
    ['Обязательное содержание', brief.required_content],
    ['Что нужно сдать', brief.deliverables],
    ['Ограничения учебного заказа', brief.constraints],
    ['Что пока неизвестно', brief.unknowns],
    ['Вопросы до начала работы', brief.questions]
  ]);

  if (caseStudy.input_asset) {
    const asset = caseStudy.input_asset;
    renderGroup('Локальный учебный исходник', [
      ['Файл', asset.file],
      ['Происхождение', asset.provenance],
      ['Условия использования', asset.rights],
      ['Размер исходника', asset.dimensions],
      ['Назначение и ограничения', asset.intended_use]
    ]);
  }

  if (caseStudy.supplier_spec) {
    const spec = caseStudy.supplier_spec;
    const panels = (spec.panels ?? []).map((panel) => `${panel.name}: ${panel.width_mm} мм`);
    renderGroup('Спецификация вымышленного поставщика', [
      ['Статус условий', spec.status === 'fictional-training-spec' ? 'Только для этого учебного заказа; это не стандарт WorldSkills и не спецификация реальной типографии.' : spec.status],
      ['Поставщик', spec.supplier],
      ['Изделие', spec.product],
      ['Размер готового изделия', dimensionLabel(spec.finished_size_mm, ['width', 'height', 'depth'])],
      ['Размер плоской заготовки', dimensionLabel(spec.blank_mm, ['width', 'height'])],
      ['Панели развёртки', panels],
      ['Вылет за рез', Number.isFinite(spec.bleed_mm) ? `${spec.bleed_mm} мм` : ''],
      ['Безопасная зона', Number.isFinite(spec.safe_zone_mm) ? `${spec.safe_zone_mm} мм` : ''],
      ['Материал', spec.stock],
      ['Формат печатного файла', spec.print_file],
      ['Цветовой профиль', spec.colour_profile],
      ['Страница и масштаб', spec.page_and_scale],
      ['Служебные линии', spec.technical_lines],
      ['Метки печати', spec.marks],
      ['Что подтвердить перед реальной печатью', spec.confirmation]
    ]);
  }

  if (caseStudy.dieline) {
    const dieline = caseStudy.dieline;
    const panelLabels = (dieline.panels ?? []).map((panel) => `${panel.name}: ${panel.width_mm} мм`);
    renderGroup('Развёртка и технические линии', [
      ['Последовательность панелей', panelLabels],
      ['Обозначение реза', dieline.line_legend?.cut],
      ['Обозначение сгиба', dieline.line_legend?.fold],
      ['Безопасное размещение текста', dieline.line_legend?.safe],
      ['Область вылета', dieline.line_legend?.bleed]
    ]);
  }

  if (caseStudy.prototype) {
    const prototype = caseStudy.prototype;
    renderGroup('Физический прототип и пользовательская проверка', [
      ['Масштаб сборки', Number.isFinite(prototype.scale) ? `1:${prototype.scale} (учебный масштаб)` : ''],
      ['Материалы', prototype.materials],
      ['Участники проверки', prototype.user_test?.participants ? `${prototype.user_test.participants.min}–${prototype.user_test.participants.max} человека` : ''],
      ['Как наблюдать', prototype.user_test?.observation_method],
      ['Пример наблюдения', prototype.sample_observation],
      ['Правка и её причина', prototype.revision ? `${prototype.revision.change} ${prototype.revision.reason}` : ''],
      ['Путь без принтера', prototype.fallback?.no_printer],
      ['Путь без цветной печати', prototype.fallback?.colour_printing],
      ['Ограничение чёрно-белой пробы', prototype.fallback?.colour_printing_limit]
    ]);
    const prototypeGroup = document.createElement('section');
    prototypeGroup.className = 'case-study-group case-study-prototype';
    prototypeGroup.append(heading(headingLevel + 1, 'Сборка и повторная проверка'));
    renderCaseOrderedList(prototypeGroup, 'Шаги сборки', prototype.assembly_steps, headingLevel + 2);
    renderCaseOrderedList(prototypeGroup, 'Задания участникам без подсказок', prototype.user_test?.prompts, headingLevel + 2);
    renderCaseOrderedList(prototypeGroup, 'Проверить при повторном тесте', prototype.retest?.checks, headingLevel + 2);
    card.append(prototypeGroup);
  }

  const decisions = document.createElement('section');
  decisions.className = 'case-study-group case-study-decisions';
  decisions.append(heading(headingLevel + 1, 'Ход решения и проверка'));
  const decisionList = document.createElement('ol');
  (caseStudy.decisions ?? []).forEach((decision) => {
    const item = document.createElement('li');
    item.className = 'case-study-decision';
    item.append(heading(headingLevel + 2, decision.stage));
    renderCaseField(item, 'Выбор', decision.choice, headingLevel + 3);
    renderCaseField(item, 'Почему', decision.reason, headingLevel + 3);
    renderCaseField(item, 'Альтернатива', decision.alternative, headingLevel + 3);
    renderCaseField(item, 'Как проверить', decision.test, headingLevel + 3);
    renderCaseField(item, 'Что показала проверка', decision.result, headingLevel + 3);
    decisionList.append(item);
  });
  decisions.append(decisionList);
  card.append(decisions);

  renderGroup('Пересмотр после проверки', [
    ['Наблюдение', caseStudy.revision?.finding],
    ['Изменение', caseStudy.revision?.change],
    ['Результат повторной проверки', caseStudy.revision?.outcome]
  ]);
  renderGroup('Итоговый комплект', [
    ['Артефакт', caseStudy.final_output?.artifact],
    ['Спецификация', caseStudy.final_output?.spec],
    ['Файлы', caseStudy.final_output?.files],
    ['Финальная проверка', caseStudy.final_output?.checks]
  ]);

  const reference = caseStudy.real_reference ?? {};
  const source = sourceById.get(reference.source_id);
  const sourceGroup = renderGroup('Реальная опубликованная работа для сравнения', [
    ['Что можно наблюдать на странице проекта', reference.observation],
    ['Чего эта страница не подтверждает', reference.limit]
  ]);
  if (source) {
    const citation = document.createElement('p');
    citation.className = 'case-study-source';
    const link = safeExternalUrl(source.url) ? node('a', source.title) : node('strong', source.title);
    if (link.tag === 'a') {
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
    }
    citation.append(link, node('span', `${source.publisher} · ${source.version}`, 'source-meta'));
    sourceGroup.append(citation);
  } else if (reference.source_id) {
    sourceGroup.append(node('p', `Источник ${reference.source_id} не найден в каталоге курса.`, 'case-study-source-missing'));
  }

  if (caseStudy.image?.src) {
    const figure = document.createElement('figure');
    figure.className = 'case-study-figure';
    const image = document.createElement('img');
    image.src = caseStudy.image.src;
    image.alt = caseStudy.image.alt ?? '';
    image.loading = eagerImages ? 'eager' : 'lazy';
    figure.append(image);
    if (caseStudy.image.caption) figure.append(node('figcaption', caseStudy.image.caption));
    card.append(figure);
  }

  parent.append(card);
  return card;
}

export function renderPracticeSteps(parent, title, steps = [], headingLevel = 3) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const sectionElement = document.createElement('section');
  sectionElement.className = 'session-part practice-steps';
  sectionElement.append(heading(headingLevel, title));
  const list = document.createElement('ol');
  list.className = 'practice-step-list';
  steps.forEach((step, index) => {
    const item = document.createElement('li');
    item.className = 'practice-step';
    item.append(heading(headingLevel + 1, `Шаг ${index + 1} · ${step.minutes} мин`));
    renderCaseField(item, 'Действие', step.action);
    renderCaseField(item, 'Результат шага', step.output);
    renderCaseField(item, 'Контрольная точка', step.checkpoint);
    list.append(item);
  });
  sectionElement.append(list);
  parent.append(sectionElement);
  return sectionElement;
}

function renderAdaptation(parent, adaptation, headingLevel = 3) {
  if (!adaptation?.trigger) return;
  const panel = document.createElement('section');
  panel.className = 'session-adaptation';
  panel.append(heading(headingLevel, 'Если условие изменилось'));
  panel.append(node('p', `Сигнал: ${adaptation.trigger}`));
  panel.append(node('p', `Запасной ход: ${adaptation.alternative}`));
  if (adaptation.preserve?.length) section(panel, 'Сохрани обязательное', adaptation.preserve, 'session-adaptation-list', headingLevel + 1);
  parent.append(panel);
}

async function home() {
  const all = await modules();
  const grid = document.querySelector('#module-grid');
  const template = document.querySelector('#module-card-template');
  grid.replaceChildren();
  all.forEach((module, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.href = `module.html?id=${encodeURIComponent(module.id)}`;
    card.querySelector('.module-index').textContent = String(index + 1).padStart(2, '0');
    card.querySelector('.module-hours').textContent = `${module.hours} ч`;
    card.querySelector('.module-card-title').textContent = module.title;
    card.querySelector('.module-card-summary').textContent = module.summary;
    grid.append(card);
  });
}

async function modulePage() {
  const all = await modules();
  const id = getSafeModuleId(new URLSearchParams(location.search).get('id'), all.map((module) => module.id));
  const root = document.querySelector('#module-content');
  if (!id) {
    document.title = 'Модуль не найден — Дизайн в деле';
    root.replaceChildren(node('p', 'Проверь ссылку: такого модуля в курсе нет.', 'notice notice-warning'));
    return;
  }

  const meta = all.find((module) => module.id === id);
  document.querySelector('#module-breadcrumb').textContent = meta.title;
  document.title = `${meta.title} — Дизайн в деле`;
  try {
    const [data, sourceData] = await Promise.all([
      json(`content/modules/${encodeURIComponent(id)}.json`),
      json('content/sources.json')
    ]);
    const sourceById = new Map(sourceData.sources.map((source) => [source.id, source]));
    root.replaceChildren(
      node('p', `Модуль ${id.slice(0, 2)} · ${meta.hours} ориентировочных часов`, 'eyebrow'),
      node('h1', data.title),
      node('p', data.description, 'module-description'),
      node('p', 'Каждое занятие включает объяснение по блокам, инфографику процесса и разобранный пример. Затем идут практика, критерии проверки, частые ошибки и запасной ход. Время занятия — ориентир на чтение и первую проверку; общие часы модуля включают работу с преподавателем, самостоятельную практику, обратную связь и повторные попытки.', 'course-time-note')
    );

    const chips = document.createElement('ul');
    chips.className = 'skill-chips';
    (data.skills ?? []).forEach((skill) => chips.append(node('li', skill)));
    root.append(chips);

    const list = document.createElement('section');
    list.className = 'session-list';
    (data.sessions ?? []).forEach((session, index) => {
      const card = document.createElement('article');
      card.className = 'session-card';
      const heading = document.createElement('header');
      heading.className = 'session-heading';
      heading.append(
        node('span', `Занятие ${String(index + 1).padStart(2, '0')} · ${session.minutes} мин`, 'card-kicker'),
        node('h2', session.title)
      );
      card.append(heading);
      renderSessionGoal(card, session.goal);
      renderSessionNotice(card, session.notice);
      renderTeachingBlocks(card, session.teaching_blocks);
      const processVisual = processFigure(session.process_visual);
      if (processVisual) card.append(processVisual);

      renderWorkedExample(card, session.worked_example);
      renderCaseStudy(card, session.case_study, sourceById);
      if (session.guided_steps?.length) renderPracticeSteps(card, 'Практика с опорой', session.guided_steps);
      else section(card, 'Практика с опорой', session.guided_practice);
      if (session.independent_steps?.length) renderPracticeSteps(card, 'Самостоятельное задание', session.independent_steps);
      else section(card, 'Самостоятельное задание', session.independent_brief);
      renderSessionChallenge(card, session.challenge);
      if (session.criteria?.length) section(card, 'Критерии самопроверки', session.criteria);
      renderAdaptation(card, session.adaptation);
      if (session.common_errors?.length) section(card, 'Частые ошибки', session.common_errors);
      if (session.revisit) section(card, 'Повторная попытка', session.revisit);
      if (session.quiz?.length) card.append(renderQuiz(session, index));
      renderSessionSources(card, session.sources, sourceById);
      const printLink = node('a', 'Открыть печатный чек-лист ↗', 'text-link');
      printLink.href = `print.html?id=${encodeURIComponent(id)}`;
      card.append(printLink);
      list.append(card);
    });
    root.append(list);
  } catch {
    root.replaceChildren(node('p', 'Материалы занятий этого модуля пока готовятся. Вернись на главную или выбери другой модуль.', 'notice notice-warning'));
  }
}

async function timeline() {
  const data = await json('content/timeline.json');
  const summary = document.querySelector('#timeline-summary');
  const list = document.querySelector('#timeline-phases');
  for (const [value, label] of [[data.totalHours, 'часов всего'], [data.guidedHours, 'занятия и практика'], [data.selfStudyHours, 'самостоятельно']]) {
    const item = document.createElement('div');
    item.append(node('strong', value), node('span', label));
    summary.append(item);
  }
  list.replaceChildren();
  data.phases.forEach((phase, index) => {
    const card = document.createElement('article');
    card.className = 'timeline-card';
    const body = document.createElement('div');
    body.className = 'timeline-body';
    body.append(node('p', phase.label, 'eyebrow'), node('h2', phase.focus));
    body.append(node('p', `Контрольная точка: ${phase.checkpoint}`, 'checkpoint'));
    const hours = document.createElement('div');
    hours.className = 'timeline-hours';
    hours.append(node('strong', `${phase.totalHours} ч`), node('span', `${phase.guidedHours} занятий · ${phase.selfStudyHours} самостоятельно`));
    card.append(node('span', String(index + 1).padStart(2, '0'), 'timeline-number'), body, hours);
    list.append(card);
  });
  const post = document.querySelector('#post-publication');
  for (const [title, value] of [['Сигнал', data.postPublication.trigger], ['Первая неделя', data.postPublication.week1], ['Следующие 2–4 недели', data.postPublication.weeks2to4], ['До конкурса', data.postPublication.untilContest]]) {
    const row = document.createElement('article');
    row.className = 'adaptation-step';
    row.append(node('h3', title), node('p', value));
    post.append(row);
  }
}

const evidenceLabels = {
  'official-competition-document': 'Официальный документ WorldSkills',
  'official-software-documentation': 'Официальная документация Adobe',
  'accessibility-standard': 'Стандарт доступности',
  'evidence-informed-education-guideline': 'Методические рекомендации',
  'peer-reviewed-theoretical-article': 'Рецензируемая теоретическая статья',
  'peer-reviewed-study': 'Рецензируемое исследование',
  'peer-reviewed-review': 'Рецензируемый научный обзор',
  'design-textbook': 'Учебная книга по дизайну',
  'design-practitioner-text': 'Профессиональные материалы по дизайну',
  'local-user-document': 'Локальный документ пользователя',
  'proposed-practice-project': 'Предложенный учебный проект'
};

function renderSessionSources(parent, sourceIds = [], sourceById = new Map()) {
  const records = sourceIds.map((id) => sourceById.get(id)).filter(Boolean);
  if (!records.length) return;
  const details = document.createElement('details');
  details.className = 'session-sources';
  details.append(node('summary', 'Проверяемые источники и границы их применения'));
  details.append(node('p', 'Объяснение и практика занятия доступны без этих внешних материалов. Источники помогают проверить теорию, конкурсные документы и команды программ; тип источника показывает, что именно он подтверждает.'));
  const list = document.createElement('ul');
  list.className = 'source-reference-list';
  records.forEach((source) => {
    const item = document.createElement('li');
    const evidence = node('span', `${evidenceLabels[source.evidenceType] ?? source.evidenceType} · ${source.publisher} · ${source.version}`, 'source-meta');
    const title = safeExternalUrl(source.url) ? node('a', source.title) : node('strong', source.title);
    if (title.tag === 'a') {
      title.href = source.url;
      title.target = '_blank';
      title.rel = 'noreferrer';
    }
    item.append(title, evidence, node('p', source.use));
    if (source.accessNote) item.append(node('p', `Доступ: ${source.accessNote}`, 'source-meta'));
    else if (source.reference) item.append(node('p', `Локальная ссылка: ${source.reference}. Файл не размещён в открытом курсе.`, 'source-meta'));
    list.append(item);
  });
  details.append(list);
  parent.append(details);
}

async function sourcePage() {
  const { sources } = await json('content/sources.json');
  const root = document.querySelector('#source-list');
  const groups = [
    ['Kazakhstan', 'Казахстанская временная основа'],
    ['WSI', 'Международные WorldSkills'],
    ['Adobe', 'Справка по программам'],
    ['academic', 'Академические исследования и учебные книги'],
    ['education', 'Методика обучения'],
    ['accessibility', 'Доступность цифровых материалов'],
    ['practice', 'Учебные проекты']
  ];
  for (const [scope, title] of groups) {
    const items = sources.filter((source) => source.scope === scope);
    if (!items.length) continue;
    const group = document.createElement('section');
    group.className = 'source-group';
    group.append(node('h2', title));
    items.forEach((source) => {
      const card = document.createElement('article');
      card.className = `source-card status-${source.status}`;
      const heading = document.createElement('div');
      heading.className = 'source-head';
      const status = source.status === 'active' ? 'Проверен' : source.status === 'check' ? 'Нужна проверка' : source.status === 'replaced' ? 'Заменён' : 'Архив';
      heading.append(node('h3', source.title), node('span', status, 'status-badge'));
      card.append(
        heading,
        node('p', `${source.publisher} · ${source.version}`, 'source-meta'),
        node('p', `Тип: ${evidenceLabels[source.evidenceType] ?? source.evidenceType}`, 'source-meta'),
        node('p', `Проверено: ${source.checkedAt}`, 'source-meta'),
        node('p', source.use)
      );
      if (source.accessNote) card.append(node('p', `Доступ: ${source.accessNote}`, 'source-meta'));
      if (safeExternalUrl(source.url)) {
        const link = node('a', 'Открыть источник ↗');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        card.append(link);
      }
      if (source.reference) card.append(node('p', `Локальная ссылка: ${source.reference}. Копия не размещена в публичном репозитории.`, 'source-meta'));
      group.append(card);
    });
    root.append(group);
  }
}

async function glossary() {
  const { terms } = await json('content/glossary.json');
  const root = document.querySelector('#glossary-list');
  const input = document.querySelector('#glossary-search');
  const paint = () => {
    const query = input.value.trim().toLocaleLowerCase('ru');
    root.replaceChildren();
    const found = terms.filter((term) => `${term.term} ${term.translation} ${term.definition}`.toLocaleLowerCase('ru').includes(query));
    found.forEach((term) => {
      const row = document.createElement('article');
      row.className = 'glossary-entry';
      row.append(node('h2', term.term), node('p', term.translation, 'translation'), node('p', term.definition));
      root.append(row);
    });
    if (!found.length) root.append(node('p', 'Нет совпадений. Попробуй другое слово.'));
  };
  input.addEventListener('input', paint);
  paint();
}

async function printPage() {
  const all = await modules();
  const select = document.querySelector('#print-module');
  all.forEach((module) => {
    const option = node('option', `${module.id.slice(0, 2)} · ${module.title}`);
    option.value = module.id;
    select.append(option);
  });
  const chosen = getSafeModuleId(new URLSearchParams(location.search).get('id'), all.map((module) => module.id));
  select.value = chosen ?? all[0].id;
  const root = document.querySelector('#print-content');
  const paint = async () => {
    try {
      const [data, sourceData] = await Promise.all([
        json(`content/modules/${encodeURIComponent(select.value)}.json`),
        json('content/sources.json')
      ]);
      const sourceById = new Map(sourceData.sources.map((source) => [source.id, source]));
      root.replaceChildren(node('h2', data.title), node('p', data.description));
      data.sessions?.forEach((session) => {
        const article = document.createElement('article');
        article.className = 'print-brief';
        article.append(node('h3', session.title));
        renderSessionGoal(article, session.goal, 4);
        renderSessionNotice(article, session.notice);
        renderTeachingBlocks(article, session.teaching_blocks, 4);
        const processVisual = processFigure(session.process_visual, 'process-visual print-visual');
        if (processVisual) article.append(processVisual);
        renderWorkedExample(article, session.worked_example, { eager: true, headingLevel: 4 });
        renderCaseStudy(article, session.case_study, sourceById, { eagerImages: true, headingLevel: 4 });
        if (session.guided_steps?.length) renderPracticeSteps(article, 'Практика с опорой', session.guided_steps, 4);
        else section(article, 'Практика с опорой', session.guided_practice, 'session-part', 4);
        if (session.independent_steps?.length) renderPracticeSteps(article, 'Самостоятельное задание', session.independent_steps, 4);
        else section(article, 'Самостоятельное задание', session.independent_brief, 'session-part', 4);
        renderSessionChallenge(article, session.challenge, 4);
        if (session.criteria?.length) section(article, 'Критерии самопроверки', session.criteria, 'session-part', 4);
        if (session.common_errors?.length) section(article, 'Частые ошибки', session.common_errors, 'session-part', 4);
        if (session.revisit) section(article, 'Повторная попытка', session.revisit, 'session-part', 4);
        renderAdaptation(article, session.adaptation, 4);
        root.append(article);
      });
    } catch {
      root.replaceChildren(node('p', 'Печатные материалы для этого модуля готовятся.'));
    }
  };
  select.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('id', select.value);
    history.replaceState(null, '', url);
    paint();
  });
  await paint();
}

const render = { home, module: modulePage, timeline, sources: sourcePage, glossary, print: printPage };
if (typeof document !== 'undefined' && render[document.body.dataset.page]) {
  render[document.body.dataset.page]().catch((error) => {
    console.error(error);
    document.querySelector('main')?.append(node('p', 'Не удалось загрузить материалы. Проверь соединение и попробуй ещё раз.', 'notice notice-warning'));
  });
}
