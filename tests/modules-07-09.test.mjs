import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected={'07-quality-handoff':2,'08-competition-english':2,'09-exams-selection':3};
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
test('modules_07_09_have_expected_session_counts',()=>{for(const [id,count] of Object.entries(expected)){const m=read(`content/modules/${id}.json`);assert.equal(m.id,id);assert.equal(m.sessions.length,count);}});
test('local_and_international_weights_never_merge',()=>{const local=read('content/rubrics/kazakhstan-2026-provisional.json'),international=read('content/rubrics/wsi-2026-international.json'),internal=read('content/rubrics/internal-selection-project.json');assert.equal(local.weights,null);assert.deepEqual(international.weights.map(x=>x.percent),[10,10,10,35,35]);assert.equal(international.scope,'WSI');assert.equal(internal.scope,'internal-selection-project');assert.equal(internal.isOfficial,false);});
test('selection_task_is_internal_not_official',()=>{const m=read('content/modules/09-exams-selection.json');const session=m.sessions.find(x=>/отбор/i.test(x.title));assert.ok(session);assert.equal(session.status,'internal-practice');assert.match(session.notice,/не официальн/i);});
test('checklist_covers_source_and_export_files',()=>{const m=read('content/modules/07-quality-handoff.json');const text=JSON.stringify(m).toLowerCase();for(const word of ['источник','экспорт','ссылк','шрифт','названи'])assert.ok(text.includes(word),`missing ${word}`);});

test('every_session_has_scaffold_active_sources_alt_text_and_two_checks',()=>{const sources=read('content/sources.json').sources;for(const id of Object.keys(expected)){for(const session of read(`content/modules/${id}.json`).sessions){for(const key of ['goal','explanation','worked_example','guided_practice','independent_brief','criteria','common_errors','sources','revisit','quiz','teaching_blocks','process_visual'])assert.ok(session[key],`missing ${key}`);assert.ok(Array.isArray(session.criteria));assert.ok(session.worked_example.alt);for(const sourceId of session.sources)assert.equal(sources.find(s=>s.id===sourceId)?.status,'active');assert.ok(session.quiz.length>=2&&session.quiz.length<=3);}}});
