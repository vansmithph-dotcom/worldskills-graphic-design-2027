import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected={'04-photoshop':2,'05-print-production':3,'06-digital-design':2};
const data=id=>JSON.parse(fs.readFileSync(path.join(root,`content/modules/${id}.json`),'utf8'));
test('modules_04_06_have_expected_session_counts',()=>{for(const [id,count] of Object.entries(expected)){const m=data(id);assert.equal(m.id,id);assert.equal(m.sessions.length,count);}});
test('print_material_distinguishes_draft_and_color_proof',()=>{const text=JSON.stringify(data('05-print-production'));assert.match(text,/чернов(ая|ую) печат/i);assert.match(text,/цветопроб/i);assert.match(text,/не заменя/i);});
test('digital_enrichment_is_labeled',()=>{const m=data('06-digital-design');assert.ok(/международн.*углублен|учебн.*проект/i.test(JSON.stringify(m)));});
test('app_steps_name_checked_version_and_limit_claims_to_release_notes',()=>{for(const id of Object.keys(expected)){const m=data(id);assert.ok(m.software_version_check);assert.match(m.software_version_check.referenceVersion,/\d+\.\d+/);assert.equal(m.software_version_check.checkedAt,'2026-10-20');assert.match(m.software_version_check.note,/установленн/i);for(const session of m.sessions)assert.ok(Array.isArray(session.criteria),'criteria must be a list');}});

test('every_session_has_active_sources_examples_and_complete_quizzes',()=>{const sources=JSON.parse(fs.readFileSync(path.join(root,'content/sources.json'),'utf8')).sources;for(const id of Object.keys(expected)){for(const session of data(id).sessions){assert.ok(Array.isArray(session.criteria));assert.ok(session.worked_example.alt);assert.ok(session.sources.length);for(const sourceId of session.sources)assert.equal(sources.find(s=>s.id===sourceId)?.status,'active');assert.ok(session.quiz.length>=2&&session.quiz.length<=3);for(const item of session.quiz){assert.ok(item.options.some(x=>x.id===item.answer));assert.ok(item.explanation);assert.ok(item.common_error);}}}});
