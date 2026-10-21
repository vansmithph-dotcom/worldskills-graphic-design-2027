import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSafeModuleId, renderSessionGoal, renderSessionChallenge, renderSessionNotice, renderWorkedExample } from '../assets/js/site.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','module.html','sources.html','glossary.html','community.html','print.html','timeline.html'];
test('pages_have_russian_language_and_landmarks',()=>{for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');assert.match(html,/<html[^>]*lang="ru"/i,page);assert.match(html,/<header[\s>]/i,`${page} header`);assert.match(html,/<nav[\s>]/i,`${page} nav`);assert.match(html,/<main[\s>]/i,`${page} main`);}});
test('print_page_loads_module_data_renderer',()=>{const html=fs.readFileSync(path.join(root,'print.html'),'utf8'),site=fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8');assert.match(html,/<script[^>]+src="assets\/js\/site\.js"/i);assert.match(html,/id="print-module"/);assert.match(html,/id="print-content"/);assert.match(site,/print:\s*printPage/);assert.match(site,/renderCaseStudy\(article, session\.case_study, sourceById, \{ eagerImages: true, headingLevel: 4 \}\)/);assert.match(site,/renderPracticeSteps\(article, 'Практика с опорой', session\.guided_steps, 4\)/);assert.match(site,/node\('h3', session\.title\)/);assert.match(site,/content\/sources\.json/);});
test('module_page_explains_session_blocks_and_module_time',()=>{const site=fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8');assert.match(site,/course-time-note/);assert.match(site,/Каждое занятие включает объяснение по блокам/);assert.match(site,/Занятие/);});
test('assets_use_relative_paths_and_all_local_links_resolve',()=>{for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){const value=m[1];if(/^(?:https?:|mailto:|tel:|#|javascript:)/i.test(value))continue;assert.equal(value.startsWith('/'),false,`${page} root-relative ${value}`);const clean=decodeURIComponent(value.split(/[?#]/)[0]);if(!clean)continue;const target=path.resolve(root,path.dirname(page),clean);assert.ok(target.startsWith(root),`${page} escapes via ${value}`);assert.ok(fs.existsSync(target),`${page} missing ${value}`);}}});
test('module_route_rejects_unknown_id',()=>{const known=['01-brief','02-indesign'];assert.equal(getSafeModuleId('01-brief',known),'01-brief');assert.equal(getSafeModuleId('../../README',known),null);assert.equal(getSafeModuleId('missing',known),null);});
test('home_and_timeline_link_course_path_and_render_all_phases',()=>{const home=fs.readFileSync(path.join(root,'index.html'),'utf8'),timelinePage=fs.readFileSync(path.join(root,'timeline.html'),'utf8'),site=fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8'),timeline=JSON.parse(fs.readFileSync(path.join(root,'content/timeline.json'),'utf8'));assert.match(home,/module\.html\?id=/);assert.match(home,/timeline\.html/);assert.match(timelinePage,/ориентир по материалам 2026/i);assert.match(site,/data\.phases\.forEach/);assert.match(site,/phase\.label/);assert.equal(timeline.phases.length,4);});

function fakeElement(tag) {
  return {
    tag,
    className: '',
    textContent: '',
    children: [],
    append(...children) { this.children.push(...children); }
  };
}

test('session_goal_and_optional_challenge_render_as_readable_blocks', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: (tag) => fakeElement(tag) };
  try {
    const parent = fakeElement('article');
    renderSessionGoal(parent, 'Проверить и обосновать иерархию сообщения.');
    renderSessionChallenge(parent, 'Повтори решение для аудитории с другим контекстом.');
    assert.deepEqual(parent.children.map((section) => section.className), ['session-goal', 'session-challenge']);
    assert.equal(parent.children[0].children[0].textContent, 'К концу занятия ты сможешь');
    assert.equal(parent.children[0].children[1].textContent, 'Проверить и обосновать иерархию сообщения.');
    assert.equal(parent.children[1].children[0].textContent, 'Усложнение по желанию');
    assert.equal(parent.children[1].children[1].textContent, 'Повтори решение для аудитории с другим контекстом.');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('worked_example_renders_its_own_accessible_illustration', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: (tag) => fakeElement(tag) };
  try {
    const parent = fakeElement('article');
    renderWorkedExample(parent, {
      image: 'assets/examples/logo-construction.svg',
      alt: 'Сравнение словесного знака и эмблемы.',
      caption: 'Шесть типов логотипа',
      description: 'Разбери, какую часть несёт название.'
    });
    const example = parent.children[0];
    assert.equal(example.children[0].textContent, 'Разобранный визуальный пример');
    const figure = example.children.find((child) => child.tag === 'figure');
    assert.ok(figure, 'the example includes a figure');
    assert.equal(figure.children[0].tag, 'img');
    assert.equal(figure.children[0].src, 'assets/examples/logo-construction.svg');
    assert.equal(figure.children[0].alt, 'Сравнение словесного знака и эмблемы.');
    assert.equal(figure.children[0].loading, 'lazy');
    assert.equal(figure.children[1].textContent, 'Шесть типов логотипа');
    assert.ok(example.children.some((child) => child.textContent === 'Разбери, какую часть несёт название.'));
    const printParent = fakeElement('article');
    renderWorkedExample(printParent, { image: 'assets/examples/logo-construction.svg', caption: 'Печатная подпись', alt: 'Логотипы.', description: 'Разбор.' }, { eager: true });
    assert.equal(printParent.children[0].children.find((child) => child.tag === 'figure').children[0].loading, 'eager');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('session_notice_is_visible_on_screen_and_print', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: (tag) => fakeElement(tag) };
  try {
    const parent = fakeElement('article');
    renderSessionNotice(parent, 'Это внутренний учебный проект, а не официальный формат WorldSkills.');
    assert.equal(parent.children[0].tag, 'aside');
    assert.equal(parent.children[0].className, 'session-notice');
    assert.match(parent.children[0].children[0].textContent, /не официальный формат/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
  const site = fs.readFileSync(path.join(root, 'assets/js/site.js'), 'utf8');
  const screen = site.slice(site.indexOf('async function modulePage()'), site.indexOf('async function timeline()'));
  const print = site.slice(site.indexOf('async function printPage()'), site.indexOf('const render ='));
  assert.match(screen, /renderSessionNotice\(card, session\.notice\)/);
  assert.match(print, /renderSessionNotice\(article, session\.notice\)/);
});

test('screen_and_print_render_goal_practice_challenge_and_fallback_in_order', () => {
  const site = fs.readFileSync(path.join(root, 'assets/js/site.js'), 'utf8');
  const screen = site.slice(site.indexOf('async function modulePage()'), site.indexOf('async function timeline()'));
  const print = site.slice(site.indexOf('async function printPage()'), site.indexOf('const render ='));
  for (const [name, source] of [['screen', screen], ['print', print]]) {
    const goal = source.indexOf('renderSessionGoal(');
    const teaching = source.indexOf('renderTeachingBlocks(');
    const independent = source.indexOf('Самостоятельное задание');
    const challenge = source.indexOf('renderSessionChallenge(');
    const adaptation = source.indexOf('renderAdaptation(');
    assert.ok(goal >= 0 && teaching > goal, name + ' shows goal before explanation');
    assert.ok(independent >= 0 && challenge > independent, name + ' places optional challenge after independent work');
    assert.ok(adaptation > challenge, name + ' provides the fallback after the challenge');
  }
  assert.match(print, /Практика с опорой/);
  assert.match(print, /Критерии самопроверки/);
  assert.match(print, /Частые ошибки/);
  assert.match(print, /renderWorkedExample\(article, session\.worked_example, \{ eager: true, headingLevel: 4 \}\)/);
});
