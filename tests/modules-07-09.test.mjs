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
test('internal_selection_discloses_the_whole_rubric_and_uses_only_published_criteria',()=>{const module=read('content/modules/09-exams-selection.json'),session=module.sessions.find(x=>x.id==='09-internal-selection'),rubric=read('content/rubrics/internal-selection-project.json');for(const item of rubric.weights)assert.ok(session.criteria.some(text=>text.includes(item.criterion)&&text.includes(`${item.percent}%`)),`criterion must be published: ${item.criterion}`);for(const gate of rubric.gates)assert.ok(session.criteria.some(text=>text.includes(gate)),`gate must be published: ${gate}`);assert.ok(session.criteria.some(text=>text.includes(rubric.projectThreshold.score)&&text.includes('не официальный порог')));assert.doesNotMatch(session.independent_brief,/с учётом прогресса|дисциплины сдачи и пробелов/i);assert.match(session.independent_brief,/только по опубликованной рубрике/i);assert.match(session.independent_brief,/прогресс.*(?:план|обучен)|пробел.*(?:план|обучен)/i);});
test('internal_selection_publishes_anchors_close_score_rule_and_retest_method',()=>{const rubric=read('content/rubrics/internal-selection-project.json'),module=read('content/modules/09-exams-selection.json'),session=module.sessions.find(x=>x.id==='09-internal-selection'),map=fs.readFileSync(path.join(root,'docs/curriculum-map.md'),'utf8'),scale=rubric.scoringScale;assert.deepEqual(scale.map(x=>x.percentOfWeight),[0,25,50,75,100]);for(const anchor of scale){assert.ok(anchor.label&&anchor.evidence,`score ${anchor.percentOfWeight} needs a plain-language anchor`);}assert.equal(rubric.selectionPolicy.closeScorePoints,3);assert.match(rubric.selectionPolicy.retestScoring,/50\/50/);assert.match(rubric.selectionPolicy.belowThreshold,/следующ(?:ем|его) учебн/);assert.match(rubric.selectionPolicy.technicalConditions,/повторн/);const text=[session.notice,session.explanation,session.independent_brief,...session.criteria,...session.teaching_blocks.map(x=>x.text)].join('\n');for(const phrase of ['0%, 25%, 50%, 75% или 100%','3 баллов','50% первого результата','70/100','не автоматический отказ'])assert.ok(text.includes(phrase),`session must publish ${phrase}`);for(const phrase of ['0%, 25%, 50%, 75% или 100%','3 баллов','50% первого результата','70/100'])assert.ok(map.includes(phrase),`curriculum map must publish ${phrase}`);});

test('below-threshold retest is developmental only and never changes selection score',()=>{const rubric=read('content/rubrics/internal-selection-project.json'),module=read('content/modules/09-exams-selection.json'),session=module.sessions.find(x=>x.id==='09-internal-selection'),map=fs.readFileSync(path.join(root,'docs/curriculum-map.md'),'utf8'),text=[rubric.selectionPolicy.developmentalRetest?.purpose,rubric.selectionPolicy.developmentalRetest?.participants,rubric.selectionPolicy.developmentalRetest?.scoreEffect,rubric.selectionPolicy.belowThreshold,session.independent_brief,...session.criteria,...session.teaching_blocks.map(x=>x.text),map].join('\n');assert.ok(rubric.selectionPolicy.developmentalRetest,'rubric should define a separate developmental retest');assert.match(text,/учебн.{0,80}повторн.{0,100}не меня(?:ет|ть) конкурсн.{0,40}(?:балл|оценку|рекомендац)/is);assert.match(text,/всем участник.{0,100}результат.{0,40}ниже 70/is);assert.match(text,/50% первого результата/is,'selection-stage close-score retest remains separately scored');});
test('checklist_covers_source_and_export_files',()=>{const m=read('content/modules/07-quality-handoff.json');const text=JSON.stringify(m).toLowerCase();for(const word of ['источник','экспорт','ссылк','шрифт','названи'])assert.ok(text.includes(word),`missing ${word}`);});

test('every_session_has_scaffold_active_sources_alt_text_and_two_checks',()=>{const sources=read('content/sources.json').sources;for(const id of Object.keys(expected)){for(const session of read(`content/modules/${id}.json`).sessions){for(const key of ['goal','explanation','worked_example','guided_practice','independent_brief','criteria','common_errors','sources','revisit','quiz','teaching_blocks','process_visual'])assert.ok(session[key],`missing ${key}`);assert.ok(Array.isArray(session.criteria));assert.ok(session.worked_example.alt);for(const sourceId of session.sources)assert.equal(sources.find(s=>s.id===sourceId)?.status,'active');assert.ok(session.quiz.length>=2&&session.quiz.length<=3);}}});

test('quality_english_and_selection_sessions_offer_optional_depth_and_a_specific_fallback',()=>{for(const id of Object.keys(expected)){for(const session of read('content/modules/'+id+'.json').sessions){assert.ok(typeof session.challenge==='string'&&session.challenge.trim().length>20,session.id+' needs an optional challenge');const {trigger,alternative,preserve}=session.adaptation??{};assert.ok(typeof trigger==='string'&&trigger.trim().length>10,session.id+' needs an adaptation trigger');assert.ok(typeof alternative==='string'&&alternative.trim().length>20,session.id+' needs a concrete fallback');assert.ok(Array.isArray(preserve)&&preserve.length>0,session.id+' needs preserved requirements');}}});

test('pilot_sheet_tracks_goal_term_start_check_and_fallback_without_identifiers',()=>{const sheet=fs.readFileSync(path.join(root,'docs/pilot-observation-sheet.md'),'utf8');for(const phrase of ['временный код','цель занятия своими словами','новый термин','начал первое действие','проверил результат','запасной ход','имена, контакты'])assert.ok(sheet.toLocaleLowerCase('ru').includes(phrase),`pilot sheet needs ${phrase}`);assert.match(sheet,/не записывайте имена/i);assert.match(sheet,/не публикуйте/i);});

test('course_method_keeps_2026_references_provisional_and_updates_after_official_2027_publication',()=>{const text=fs.readFileSync(path.join(root,'docs/course-method.md'),'utf8');assert.match(text,/2026[^\n]{0,200}(временн|предварит)|временн[^\n]{0,200}2026/i);assert.match(text,/после (?:официальной )?публикации[^\n]{0,160}2027/i);assert.match(text,/внутренн[^\n]{0,180}(?:учебн|проектн)[^\n]{0,180}не официальн/i);});

test('modules 07–09 have distinct cases with complete time-boxed artifacts and active professional references',()=>{
  const sources=read('content/sources.json').sources;
  const sessions=Object.keys(expected).flatMap(id=>read(`content/modules/${id}.json`).sessions);
  assert.equal(sessions.length,7);
  const tasks=new Set();
  const artifacts=new Set();
  for(const session of sessions){
    const study=session.case_study;
    assert.ok(study,`${session.id} has a concrete case`);
    assert.equal(study.status,'training-simulation');
    assert.ok(study.brief.client&&study.brief.audience&&study.brief.task);
    assert.ok(study.brief.required_content.length>=3);
    assert.ok(study.brief.unknowns.length>=2);
    assert.ok(study.decisions[0].alternative&&study.decisions[0].test);
    assert.match(study.decisions[0].result,/учебная симуляция/i);
    assert.match(study.revision.finding,/симулированное/i);
    assert.ok(study.final_output.files.length>=2);
    assert.ok(study.final_output.checks.length>=2);
    assert.ok(study.image.alt&&fs.existsSync(path.join(root,study.image.src)),`${session.id} has a local accessible case illustration`);
    const source=sources.find(item=>item.id===study.real_reference.source_id);
    assert.equal(source?.status,'active');
    assert.ok(source.modules.includes(session.id.slice(0,2)+'-'+({ '07':'quality-handoff','08':'competition-english','09':'exams-selection' })[session.id.slice(0,2)]));
    assert.ok(session.guided_steps&&session.independent_steps);
    assert.equal([...session.guided_steps,...session.independent_steps].reduce((sum,step)=>sum+step.minutes,0),session.minutes);
    tasks.add(study.brief.task);
    artifacts.add(study.final_output.artifact);
  }
  assert.equal(tasks.size,7);
  assert.equal(artifacts.size,7);
});

test('handoff cases include a complete file tree and a real reopen test',()=>{
  const sessions=read('content/modules/07-quality-handoff.json').sessions;
  for(const session of sessions){
    const study=session.case_study;
    const files=study.final_output.files.join(' ');
    assert.match(files,/\.zip|handoff|package/i);
    assert.match(files,/\.pdf/i);
    assert.match(files,/\.ai|\.psd|\.indd/i);
    assert.match(study.decisions[0].test,/без сети|копи|другом компьютере|открой/i);
    assert.match(study.final_output.checks.join(' '),/связ|откро|откры/i);
  }
});

test('English cases teach exact brief terms and a usable short explanation and clarification',()=>{
  const sessions=read('content/modules/08-competition-english.json').sessions;
  const brief=sessions.find(x=>x.id==='08-brief-english').case_study;
  const explain=sessions.find(x=>x.id==='08-explain-ask').case_study;
  const terms=brief.brief.required_content.join(' ');
  for(const term of ['MUST','SHOULD','MAY','Do not','mm'])assert.ok(terms.includes(term),`English brief includes ${term}`);
  const script=explain.final_output.spec.join(' ');
  for(const phrase of ['The brief asks us to','I chose','because','I checked','Could you clarify'])assert.ok(script.includes(phrase),`speaking scaffold includes ${phrase}`);
  assert.match(explain.decisions[0].test,/секунд|таймер|врем/i);
  assert.match(explain.final_output.checks.join(' '),/симптом|проверк|вопрос/i);
});

test('selection and simulation cases preserve internal-only status and include an announced change',()=>{
  const module=read('content/modules/09-exams-selection.json');
  const selection=module.sessions.find(x=>x.id==='09-internal-selection');
  const simulation=module.sessions.find(x=>x.id==='09-full-simulation');
  assert.equal(selection.status,'internal-practice');
  assert.match(selection.case_study.decisions[0].result,/учебная симуляция.*72\.5\/100/is);
  assert.match(selection.case_study.final_output.checks.join(' '),/не официальный|неофициальн/i);
  const change=simulation.case_study.brief.required_content.join(' ');
  assert.match(change,/минута 10|10-й минут|на 10-й минут/i);
  assert.match(change,/изображени.*отмен|нет прав|права.*не подтверждены|без фотограф/i);
  assert.match(simulation.case_study.decisions[0].test,/время|таймер|минут/i);
  assert.match(simulation.case_study.final_output.checks.join(' '),/измен|верси|сдач/i);
  assert.match(simulation.case_study.brief.constraints.join(' '),/не.*Almaty 2027|не.*официальн/i);
});
