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

test('production_sessions_offer_optional_depth_and_a_specific_fallback',()=>{for(const id of ['02-indesign','04-photoshop','05-print-production','06-digital-design']){for(const session of data(id).sessions){assert.ok(typeof session.challenge==='string'&&session.challenge.trim().length>20,session.id+' needs an optional challenge');const {trigger,alternative,preserve}=session.adaptation??{};assert.ok(typeof trigger==='string'&&trigger.trim().length>10,session.id+' needs an adaptation trigger');assert.ok(typeof alternative==='string'&&alternative.trim().length>20,session.id+' needs a concrete fallback');assert.ok(Array.isArray(preserve)&&preserve.length>0,session.id+' needs requirements to preserve');}}});

test('photoshop_practice_names_image_source_and_usage_rights',()=>{for(const session of data('04-photoshop').sessions){const text=JSON.stringify(session).toLocaleLowerCase('ru');assert.match(text,/источник|происхожд/);assert.match(text,/лиценз|разреш[её]н.*использован/);}});

test('photoshop cases use the local training image and produce destination-specific layered outputs',()=>{
  const imagePath=path.join(root,'assets/case-studies/linocut-stilllife.png');
  assert.ok(fs.existsSync(imagePath),'offline Photoshop source image exists');
  for(const session of data('04-photoshop').sessions){
    const study=session.case_study;
    assert.ok(study,`${session.id} has a worked case`);
    assert.equal(study.status,'training-simulation');
    assert.equal(study.input_asset?.file,'assets/case-studies/linocut-stilllife.png');
    assert.match(study.input_asset?.provenance,/создано.*курса|учебн.*изображен/i);
    assert.match(study.input_asset?.rights,/учебный исходник|платформы-генератора/i);
    assert.ok(study.decisions.some(x=>/сло|маск/i.test(x.choice)),'case explains its layer or mask strategy');
    assert.ok(study.decisions.some(x=>/до и после|сравни/i.test(x.test)),'case compares visible image treatment');
    assert.ok(study.final_output.files.some(x=>/\.psd/i.test(x)),'editable master is delivered');
    assert.ok(study.final_output.files.some(x=>/\.jpe?g|\.png/i.test(x)),'destination copy is delivered');
    assert.match(study.final_output.spec.join(' '),/sRGB|профил/i,'export specification is explicit');
    assert.match(study.decisions[0].result,/учебная симуляция/i);
  }
});

test('digital cases contain real screen or PDF copy, a user check, accessibility checks and a fallback',()=>{
  const screen=data('06-digital-design').sessions.find(x=>x.id==='06-screen-hierarchy').case_study;
  const pdf=data('06-digital-design').sessions.find(x=>x.id==='06-interactive-pdf').case_study;
  assert.ok(screen&&pdf,'both digital cases are present');
  assert.match(screen.brief.required_content.join(' '),/Первый оттиск/);
  assert.match(screen.final_output.spec.join(' '),/ширин|контраст|WCAG/i);
  assert.match(screen.decisions[0].test,/пользоват|человек|наблюдател|читател/i);
  assert.match(pdf.brief.required_content.join(' '),/оглавлен/i);
  assert.match(pdf.final_output.spec.join(' '),/переход|навигац|ссыл|кнопк/i);
  assert.match(pdf.final_output.checks.join(' '),/офлайн|без сет[ьи]/i);
  assert.match(pdf.final_output.checks.join(' '),/клавиатур|порядок чтени|тегир/i);
  for(const session of data('06-digital-design').sessions){
    assert.equal(session.case_study.status,'training-simulation');
    assert.ok(session.adaptation.alternative.length>20,'session keeps a usable alternate route');
  }
});
