import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected={'04-photoshop':2,'05-print-production':3,'06-digital-design':2};
const data=id=>JSON.parse(fs.readFileSync(path.join(root,`content/modules/${id}.json`),'utf8'));
test('modules_04_06_have_expected_lesson_counts',()=>{for(const [id,count] of Object.entries(expected)){const m=data(id);assert.equal(m.id,id);assert.equal(m.lessons.length,count);}});
test('print_material_distinguishes_draft_and_color_proof',()=>{const text=JSON.stringify(data('05-print-production'));assert.match(text,/чернов(ая|ую) печат/i);assert.match(text,/цветопроб/i);assert.match(text,/не заменя/i);});
test('digital_enrichment_is_labeled',()=>{const m=data('06-digital-design');assert.ok(/международн.*углублен|учебн.*проект/i.test(JSON.stringify(m)));});
test('app_steps_name_checked_version_and_limit_claims_to_release_notes',()=>{for(const id of Object.keys(expected)){const m=data(id);assert.ok(m.software_version_check);assert.match(m.software_version_check.referenceVersion,/\d+\.\d+/);assert.equal(m.software_version_check.checkedAt,'2026-10-20');assert.match(m.software_version_check.note,/установленн/i);for(const lesson of m.lessons)assert.ok(Array.isArray(lesson.criteria),'criteria must be a list');}});

test('every_lesson_has_active_sources_examples_and_complete_quizzes',()=>{const sources=JSON.parse(fs.readFileSync(path.join(root,'content/sources.json'),'utf8')).sources;for(const id of Object.keys(expected)){for(const lesson of data(id).lessons){assert.ok(Array.isArray(lesson.criteria));assert.ok(lesson.worked_example.alt);assert.ok(lesson.sources.length);for(const sourceId of lesson.sources)assert.equal(sources.find(s=>s.id===sourceId)?.status,'active');assert.ok(lesson.quiz.length>=2&&lesson.quiz.length<=3);for(const item of lesson.quiz){assert.ok(item.options.some(x=>x.id===item.answer));assert.ok(item.explanation);assert.ok(item.common_error);}}}});
