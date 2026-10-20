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

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Не загружен ${url}`);
  return response.json();
}

const modules = async () => (await json('content/modules.json')).modules;

function section(parent, title, value, className = 'session-part') {
  const part = document.createElement('section');
  part.className = className;
  part.append(node('h3', title));
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

function renderTeachingBlocks(parent, blocks = []) {
  const group = document.createElement('section');
  group.className = 'teaching-blocks';
  group.setAttribute('aria-label', 'Объяснение по блокам');
  blocks.forEach((block, index) => {
    const article = document.createElement('article');
    article.className = 'teaching-block';
    article.append(node('span', String(index + 1).padStart(2, '0'), 'teaching-block-number'));
    article.append(node('h3', block.heading));
    splitExplanationParagraphs(block.text).forEach((paragraph) => article.append(node('p', paragraph)));
    group.append(article);
  });
  parent.append(group);
}

function renderAdaptation(parent, adaptation) {
  if (!adaptation?.trigger) return;
  const panel = document.createElement('section');
  panel.className = 'session-adaptation';
  panel.append(node('h3', 'Если условие изменилось'));
  panel.append(node('p', `Сигнал: ${adaptation.trigger}`));
  panel.append(node('p', `Запасной ход: ${adaptation.alternative}`));
  if (adaptation.preserve?.length) section(panel, 'Сохрани обязательное', adaptation.preserve, 'session-adaptation-list');
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
      renderTeachingBlocks(card, session.teaching_blocks);
      const processVisual = processFigure(session.process_visual);
      if (processVisual) card.append(processVisual);

      if (session.worked_example) {
        const example = document.createElement('section');
        example.className = 'session-part worked-example';
        example.append(node('h3', 'Разбор инфографики'));
        splitExplanationParagraphs(session.worked_example.description).forEach((paragraph) => {
          example.append(node('p', paragraph));
        });
        card.append(example);
      }

      section(card, 'Практика с опорой', session.guided_practice);
      section(card, 'Самостоятельное задание', session.independent_brief);
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
  'design-practitioner-text': 'Профессиональная учебная книга',
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
    const title = source.url ? node('a', source.title) : node('strong', source.title);
    if (source.url) {
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
      if (source.url) {
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
      const data = await json(`content/modules/${encodeURIComponent(select.value)}.json`);
      root.replaceChildren(node('h2', data.title), node('p', data.description));
      data.sessions?.forEach((session) => {
        const article = document.createElement('article');
        article.className = 'print-brief';
        article.append(node('h3', session.title));
        renderTeachingBlocks(article, session.teaching_blocks);
        const processVisual = processFigure(session.process_visual, 'process-visual print-visual');
        if (processVisual) article.append(processVisual);
        article.append(node('p', `Самостоятельное задание: ${session.independent_brief}`), node('h4', 'Проверь себя'));
        const list = document.createElement('ul');
        (session.criteria ?? []).forEach((criterion) => list.append(node('li', criterion)));
        article.append(list);
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
