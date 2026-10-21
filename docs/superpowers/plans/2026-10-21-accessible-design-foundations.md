# Implementation Plan: доступная программа фундаментальных основ дизайна

**REQUIRED SUB-SKILL:** superpowers:executing-plans — выполнить в уже выбранном Native-режиме после согласования этого плана.

## Goal

Переработать опубликованный курс для 2–3 студентов колледжа так, чтобы они могли самостоятельно понимать незнакомый бриф, объяснять дизайн-решения, проверять результат и менять план при сбое. Сохранить девять модулей, 28 занятий, существующий временной маршрут 228 часов до 31 января 2027 года и маркировку местных и международных оснований. Не добавлять текст ради объёма. Закрыть обнаруженную проблему: цель занятия хранится в данных, но не видна студенту на странице и в печати.

## Architecture

Оставить текущую статическую архитектуру сайта и JSON-модели занятий. Добавить общие экранный/печатный блоки цели и необязательного усложнения; расширить каждую из 28 записей занятий двумя полями: challenge (короткое задание для желающих углубиться) и adaptation (trigger, alternative, preserve) для резервного маршрута. В существующую карту курса добавить матрицу понятий «вводится → закрепляется → переносится», глоссарий дополнить нужными терминами. Тексты улучшать адресно, сохраняя работающие примеры, практики и источники. Усилить лист пилотного наблюдения вопросами о понимании цели, термина и запасного шага.

## Tech Stack

HTML, CSS, vanilla JavaScript, JSON; Node.js built-in test runner (node --test); валидатор курса (node scripts/validate-course.mjs --strict-current); GitHub Pages для сайта. Без новых библиотек и платных программ.

## Spec

Исполнять согласованную спецификацию accessible-design-foundations-spec.md в docs/superpowers/specs. Решения для нового конкурсного брифа должны проходить цикл: понять задачу и аудиторию → определить сообщение → предложить несколько различных вариантов там, где решается концепция → сравнить по требованиям → обосновать выбор → проверить в контексте → исправить или перейти к резервному варианту → подготовить сдачу.

## Global Constraints

- Число модулей, занятий и суммарная нагрузка остаются 9, 28 и 228 часов (168 занятий с преподавателем и 60 самостоятельной работы).
- Казахстанские материалы 2026 года остаются временной местной опорой; документы WorldSkills International — международной; ни один источник не предсказывает правила Almaty 2027.
- Не подавать символические значения как универсальные: отделять наблюдение от гипотезы и проверять значение на аудитории.
- Не превращать обычную печать в цветопробу. Если цвет не проверен, обозначать это явно.
- Для схем сохранять доступный текстовый эквивалент; не кодировать смысл только цветом. Учитывать офлайн-работу и различие начального уровня.
- Сохранять существующие рабочие объяснения и актуальные проверенные источники; не менять статус официальных материалов без подтверждения.
- Не включать промышленный дизайн, платное ПО, покупки оборудования, LMS или публичный рейтинг студентов.

## Review Focus

Проверить: видна ли цель до начала каждой версии занятия; все ли 28 занятий дают понятное усложнение и выполнимый запасной маршрут; связывают ли задания фундаментальные понятия с логотипом, айдентикой, упаковкой, экраном и печатью; остаются ли схемы и инструкции понятными при печати без цвета, слабом интернете и разном уровне навыков; не выдаются ли проектные задания курса за правила конкурса; хватает ли пилотного наблюдения для исправления непонятных мест без публикации личных данных.

---

## Task 1: показать цель и усложнение в занятии и печатной версии

**Files**
- Modify: assets/js/site.js
- Modify: assets/css/site.css
- Modify: tests/site-structure.test.mjs

**Interfaces**
- Add a shared renderer for a non-empty session.goal, labelled «К концу занятия ты сможешь».
- Add a renderer for the student-optional session.challenge, labelled «Усложнение по желанию»; provide one suitable, non-empty challenge in every session record.
- Render the goal immediately after the session title in screen and print views; render the optional challenge after independent practice in both views. The print view must also include guided practice, independent task, criteria, common errors, and the adaptation block so students can work offline.
- Keep both blocks readable on narrow screens and in black-and-white print.

**TDD steps**
- [ ] Add regression tests proving the screen and print rendering paths call/display the goal and optional challenge; run node --test tests/site-structure.test.mjs and confirm the new tests fail.
- [ ] Implement the shared rendering and focused styles; do not change module data in this task.
- [ ] Run node --test tests/site-structure.test.mjs and confirm it passes.
- [ ] Open representative screen and print views at desktop, 320 px, and print preview; verify order, wrapping, focus/readability, and grayscale contrast.
- [ ] Commit as feat: show session goals and optional challenges.

## Task 2: сделать фундаментальные понятия сквозным маршрутом и укрепить занятия по брифу и айдентике

**Files**
- Modify: content/modules/01-brief.json
- Modify: content/modules/03-illustrator.json
- Modify: content/glossary.json
- Modify: docs/curriculum-map.md
- Modify: tests/curriculum-depth.test.mjs
- Modify: tests/modules-01-03.test.mjs

**Interfaces**
- Add a concept progression matrix to the curriculum map. Each row must identify the first session, a later practice session, and a changed-context transfer session by valid session ID.
- Add accurate, concise glossary entries as needed for wordmark, monogram, negative space, contrast, semiotics/visual sign, and optical correction; retain the existing English term, Russian translation, definition, and module-ID format.
- Audit all ten sessions in modules 01 and 03 against goal → term → reasoned example → supported practice → independent changed-context task → criteria/errors → fallback. Clarify logo constructions (wordmark, symbol, combination, monogram and relevant variants), symbol/context hypotheses, hierarchy, and the identity system where the current text does not already do so well.
- Add a meaningful optional challenge and a usable adaptation (trigger, alternative, preserve) to these ten sessions; keep challenges separate from required work and time scoring.
- Preserve current official-source labels and the distinction between professional books, academic research, local documents, and internal practice briefs.

**TDD steps**
- [ ] Add tests for valid IDs in each concept-matrix row, required glossary fields, and complete challenge/fallback data for modules 01 and 03; run focused tests and confirm failure.
- [ ] Update only gaps found in the audit; avoid broad rewrites of strong existing explanations and practices.
- [ ] Run node --test tests/curriculum-depth.test.mjs tests/modules-01-03.test.mjs and confirm it passes.
- [ ] Review each changed session against the audit checklist and inspect/regenerate only visuals whose instructional process or labels changed.
- [ ] Commit as feat: connect design foundations across logo sessions.

## Task 3: провести фундаментальные понятия через InDesign, изображение, упаковку и digital

**Files**
- Modify: content/modules/02-indesign.json
- Modify: content/modules/04-photoshop.json
- Modify: content/modules/05-print-production.json
- Modify: content/modules/06-digital-design.json
- Modify: tests/curriculum-depth.test.mjs
- Modify: tests/modules-04-06.test.mjs and/or relevant existing module tests

**Interfaces**
- Audit all eleven sessions using the same session-quality checklist.
- In InDesign, teach from zero with visible action → expected result → check → recovery; connect type, hierarchy, grid, multipage consistency, packaging layout, preflight, and handoff to real artifacts.
- In image and color work, connect choices to message, audience, legibility, context, source rights, and output limitations.
- In packaging/print, connect structure, dieline, hierarchy, production constraints, proofing, and a practical fallback when only ordinary monochrome printing is available. State that this fallback cannot verify color.
- In digital design, compare screen hierarchy and interactive PDF behavior with print use; identify when a proof must be repeated in the target context.
- Add challenge and adaptation with the agreed data shape to every session in these four modules.

**TDD steps**
- [ ] Extend focused module tests to require meaningful challenge and complete fallback fields in these four modules; run and confirm failure.
- [ ] Edit only sessions that fail the audit or lack the required fields; preserve lesson sources and provide a supported path for students new to InDesign.
- [ ] Run the focused module tests and confirm they pass.
- [ ] Check that time, tools, file formats, offline steps, and printer limits remain consistent with the existing course assumptions.
- [ ] Commit as feat: add guided practice and fallbacks to production modules.

## Task 4: связать контроль качества, конкурсную коммуникацию и отбор с переносом навыка

**Files**
- Modify: content/modules/07-quality-handoff.json
- Modify: content/modules/08-competition-english.json
- Modify: content/modules/09-exams-selection.json
- Modify: docs/pilot-observation-sheet.md
- Modify: docs/course-method.md
- Modify: relevant tests for modules 07–09 and the pilot sheet

**Interfaces**
- Audit all seven sessions for a clear result, independent decision-making, quality check, recovery route, and transfer to an unfamiliar brief.
- Add challenge and adaptation to every session in modules 07–09. Keep individual feedback private and selection criteria transparent.
- The pilot sheet records whether a student understood the goal and key term, started the task, checked the result, and used or needed the fallback. Use temporary codes only; publish no names, personal scores, or student artifacts without consent.
- Keep English practice focused on contest-relevant briefs, clarification requests, file requirements, and concise explanation of decisions; do not require fluency beyond the task.
- Clarify in the course method how the 2026 references differ from project assignments and how the program is checked after official 2027 requirements appear.

**TDD steps**
- [ ] Add tests for fields on modules 07–09 and for the pilot sheet’s privacy-safe observations; run and confirm failure.
- [ ] Make targeted content and sheet edits; preserve current exam load and calendar.
- [ ] Run relevant tests and confirm they pass.
- [ ] Review selection language for fair, observable criteria and ensure no public ranking or guessed 2027 competition conditions are added.
- [ ] Commit as feat: support transfer practice and private pilot review.

## Task 5: закрепить структуру, полноту и честность источников в автоматических проверках

**Files**
- Modify: scripts/validate-course.mjs
- Modify: existing course-data/depth tests
- Add or modify: tests/validate-course.test.mjs if no suitable validator test exists

**Interfaces**
- The strict validator rejects any of the 28 sessions missing a non-empty goal, challenge, or a complete adaptation object with non-empty trigger, alternative, and at least one preserve item.
- Validate the concept progression matrix against real session IDs and check glossary field/module references.
- Add a regression fixture using a temporary copy of course data: remove each required field in turn and assert that validation reports the specific session; assert the unmodified course remains valid.
- Keep freshness checks and source status rules intact. Do not treat longer text as proof of better instruction or loosen official-source checks merely to pass.

**TDD steps**
- [ ] Add validator tests for a valid course and missing/invalid session, matrix, and glossary fields; run and confirm failures for the new expectations.
- [ ] Implement the smallest validation changes and clear, actionable error messages.
- [ ] Run validator tests and all course-data tests; confirm pass.
- [ ] Run node scripts/validate-course.mjs --strict-current and confirm no errors or stale-source warnings.
- [ ] Commit as test: validate accessible session structure and progression.

## Task 6: провести пилотную и визуальную проверку, подготовить обновление ресурса

**Files**
- Review/modify only if necessary: all files from Tasks 1–5
- Update: repository README or release notes only if needed to describe the revised route and its provisional 2026 basis

**Interfaces**
- Run three representative pilot activities when the 2–3 students are available: logo/identity concept, a first-time InDesign task, and packaging/print review. Use the observation sheet to identify confusing instructions and revise those specific passages. If students cannot participate during implementation, prepare the three ready-to-run activities and mark the student pilot as pending; do not claim it was tested.
- Verify screen, 320 px mobile layout, and print preview in color and grayscale. Check text alternatives on individual diagrams, visible goals, optional challenges, cross-links, and every session’s fallback.
- Preserve the current nine modules, 28 sessions, and 228/168/60-hour route; the January 31 endpoint stays an approximate planning boundary.
- Run node --test and node scripts/validate-course.mjs --strict-current; inspect git diff --check and the final diff.
- Prepare the reviewed branch and update the existing GitHub course through the repository’s established review/publication path; after publication, check the live GitHub Pages version and verify that it shows the revised content.

**TDD / completion steps**
- [ ] If students are available, record pilot observations without personal identifiers; otherwise prepare the pilot pack and record the dependency as pending. Create a failing regression test for any reproducible gap before correcting it.
- [ ] Make targeted corrections and rerun the affected tests.
- [ ] Run the full test suite and strict validator; confirm both pass.
- [ ] Review the final screen/mobile/print result and the live published page.
- [ ] Commit remaining corrections as fix: address course pilot and visual review findings.
