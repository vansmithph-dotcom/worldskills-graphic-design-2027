import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCaseStudy, renderPracticeSteps } from '../assets/js/site.js';

function fakeElement(tag) {
  return {
    tag,
    className: '',
    textContent: '',
    attributes: {},
    children: [],
    append(...children) { this.children.push(...children); },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}

function withFakeDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: (tag) => fakeElement(tag) };
  try {
    return run();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

function flattenText(element) {
  return [element.textContent, ...(element.children ?? []).map(flattenText)].join(' ');
}

function findElement(element, predicate) {
  if (predicate(element)) return element;
  for (const child of element.children ?? []) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return null;
}

const completeCase = {
  status: 'training-simulation',
  title: 'Мастерская линогравюры: первый набор',
  brief: {
    client: 'Учебная мастерская «Линия»',
    audience: 'Новички 16–19 лет',
    task: 'Помочь понять содержимое набора за 10 секунд.',
    required_content: ['Название набора', 'Возраст 16+'],
    deliverables: ['Лицевая сторона коробки', 'Карточка безопасности'],
    constraints: ['Одна краска', 'Коробка 160 × 110 × 45 мм'],
    unknowns: ['Не задан тираж'],
    questions: ['Какой картон разрешает выбранная типография?']
  },
  decisions: [{
    stage: 'Иерархия лицевой стороны',
    choice: 'Крупно показать название и пиктограмму резца.',
    reason: 'Новичок должен быстро распознать назначение набора.',
    alternative: 'Сразу показать декоративный отпечаток.',
    test: 'Показать эскиз пяти участникам на 5 секунд.',
    result: 'Четверо назвали назначение; двое не заметили предупреждение.'
  }],
  revision: {
    finding: 'Предупреждение теряется рядом с декоративным отпечатком.',
    change: 'Перенести предупреждение в отдельную контрастную полосу.',
    outcome: 'Все участники нашли предупреждение при повторном просмотре.'
  },
  final_output: {
    artifact: 'Развёртка коробки и карточка безопасности.',
    spec: ['160 × 110 × 45 мм по учебному заданию'],
    files: ['box-front.pdf', 'safety-card.pdf', 'editable-source.ai'],
    checks: ['Проверить обязательные тексты', 'Собрать бумажный макет']
  },
  real_reference: {
    source_id: 'case-primary-test',
    observation: 'На проектной странице видна система маркировки упаковки.',
    limit: 'Публичная страница не раскрывает допечатные параметры.'
  },
  image: {
    src: 'assets/examples/identity-applications.svg',
    alt: 'Макет коробки, карточки безопасности и этикетки набора.',
    caption: 'Черновой комплект учебной мастерской.'
  }
};

test('case study renders a simulation label, complete brief, decision loop, outputs and accessible figure', () => {
  withFakeDocument(() => {
    const parent = fakeElement('article');
    const source = {
      id: 'case-primary-test',
      title: 'Официальная страница проекта упаковки',
      publisher: 'Design studio',
      version: 'опубликованная работа',
      url: 'https://example.org/project/packaging'
    };
    renderCaseStudy(parent, completeCase, new Map([[source.id, source]]));

    const text = flattenText(parent);
    for (const expected of [
      'Учебная симуляция', completeCase.title, completeCase.brief.client,
      completeCase.brief.audience, completeCase.brief.task,
      ...completeCase.brief.required_content, ...completeCase.brief.deliverables,
      ...completeCase.brief.constraints, ...completeCase.brief.unknowns,
      ...completeCase.brief.questions, completeCase.decisions[0].choice,
      completeCase.decisions[0].alternative, completeCase.decisions[0].test,
      completeCase.decisions[0].result, completeCase.revision.finding,
      completeCase.revision.change, completeCase.revision.outcome,
      completeCase.final_output.artifact, ...completeCase.final_output.spec,
      ...completeCase.final_output.files, ...completeCase.final_output.checks,
      completeCase.real_reference.observation, completeCase.real_reference.limit,
      source.title, source.publisher
    ]) assert.ok(text.includes(expected), `rendered case includes: ${expected}`);

    const figure = findElement(parent, (child) => child.tag === 'figure');
    assert.ok(figure, 'case includes its figure');
    assert.equal(figure.children[0].tag, 'img');
    assert.equal(figure.children[0].src, completeCase.image.src);
    assert.equal(figure.children[0].alt, completeCase.image.alt);
    assert.ok(text.includes(completeCase.image.caption));

    const link = findElement(parent, (child) => child.tag === 'a');
    assert.ok(link, 'case links to its public reference');
    assert.equal(link.href, source.url);
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noreferrer');
  });
});

test('case prose is inserted as text instead of interpreted as markup', () => {
  withFakeDocument(() => {
    const parent = fakeElement('article');
    const unsafeCase = structuredClone(completeCase);
    unsafeCase.brief.task = '<img src=x onerror=alert(1)>';
    renderCaseStudy(parent, unsafeCase, new Map());
    assert.ok(flattenText(parent).includes(unsafeCase.brief.task));
    assert.equal(parent.children.some((child) => child.tag === 'img'), false);
  });
});

test('practice steps render in order with time, artifact and self-check', () => {
  withFakeDocument(() => {
    const parent = fakeElement('article');
    const steps = [
      { minutes: 8, action: 'Отметь обязательные тексты.', output: 'Карта содержания.', checkpoint: 'Сверь каждую строку с брифом.' },
      { minutes: 12, action: 'Сделай два варианта иерархии.', output: 'Два чёрно-белых эскиза.', checkpoint: 'Проверь чтение с расстояния двух метров.' }
    ];
    renderPracticeSteps(parent, 'Практика по шагам', steps);
    const text = flattenText(parent);
    for (const expected of ['Практика по шагам', '8 мин', '12 мин', ...steps.flatMap((step) => [step.action, step.output, step.checkpoint])]) {
      assert.ok(text.includes(expected), `practice includes ${expected}`);
    }
    const orderedList = parent.children[0].children.find((child) => child.tag === 'ol');
    assert.ok(orderedList, 'steps use an ordered list');
    assert.equal(orderedList.children.length, 2);
    assert.ok(flattenText(orderedList.children[0]).indexOf(steps[0].action) < flattenText(orderedList.children[1]).indexOf(steps[1].action));
  });
});

test('screen and print routes share the case and practice renderers in the same order', async () => {
  const fs = await import('node:fs');
  const site = fs.readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
  const screen = site.slice(site.indexOf('async function modulePage()'), site.indexOf('async function timeline()'));
  const print = site.slice(site.indexOf('async function printPage()'), site.indexOf('const render ='));
  for (const [route, source] of [['screen', screen], ['print', print]]) {
    const caseIndex = source.indexOf('renderCaseStudy(');
    const guidedIndex = source.indexOf('renderPracticeSteps(');
    const independentIndex = source.indexOf('renderPracticeSteps(' , guidedIndex + 1);
    assert.ok(caseIndex >= 0 && guidedIndex > caseIndex, `${route} renders the case before guided practice`);
    assert.ok(independentIndex > guidedIndex, `${route} renders independent practice after guided practice`);
  }
  assert.match(print, /content\/sources\.json/);
});
