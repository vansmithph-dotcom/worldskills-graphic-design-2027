# Concrete Worked Cases and Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Work in the already approved Native method. Each task has its own verification; keep commits reviewable.

**Goal:** Give all 28 sessions concrete, sourced design examples and detailed practice that produces a checkable artifact, while preserving the provisional WorldSkills framing and the current training-hour budget.

**Architecture:** Keep the course static and data-driven. Add structured case-study and practice-step fields to each session; render them on both the lesson and print pages; validate field completeness and source links. Use 9 sourced public case references (one per module) and original classroom simulations for all 28 sessions. The connecting simulated project is a beginner printmaking-kit identity and workshop campaign, allowing logo, packaging, editorial, photo, print, and digital outputs to build on one another; module 09 uses a separate unfamiliar brief to test transfer. Reuse/update existing worked-example SVGs where they fit and add an original visual only where a concrete result cannot be shown by an existing asset.

**Tech Stack:** Existing JSON, vanilla JavaScript, CSS, SVG, Node.js built-in test runner. No new runtime dependencies or paid tools.

**Spec:** `docs/superpowers/specs/2026-10-21-concrete-worked-cases-design.md`

## Global Constraints

- The 2026 competition documents remain provisional references; no session may describe a classroom case as a WorldSkills test project or as a confirmed Almaty 2027 condition.
- Published work links must lead to a primary page from the creator, client, institution, or competition organizer; attribute the work and explain only what the source supports.
- Each classroom simulation must be clearly labelled as fictional and self-contained; external browsing is optional for the student.
- Print dimensions, bleed, safe zones, colour profiles, PDF settings, and finishes are examples tied to a named simulated supplier brief, never universal rules.
- Every session must end in an artifact and a specific self-check; timed steps must fit within the existing 228-hour provisional program (168 guided, 60 independent), with remaining time continuing to support critique, feedback, and retry practice.
- All instructions and visual examples must remain usable offline, readable on a phone, available in the print page, and accessible by text/alt text.

## Review Focus

1. Missing or malformed nested case fields should identify the affected session in `tests/case-study-content.test.mjs` and `tests/validate-course.test.mjs`.
2. An inactive or mismatched source ID, or an unverified non-HTTPS case link, should fail in `tests/real-design-cases.test.mjs` and the course validator.
3. Generic duplicate briefs or outputs should fail specific-content assertions in `tests/case-study-content.test.mjs`.
4. Print settings without their simulated supplier context should fail print-case assertions in `tests/modules-04-06.test.mjs` and `tests/case-study-content.test.mjs`.
5. A learner without colour printing, reliable internet, or a named software feature should still have a usable fallback; check print/prototype data and screen/print rendering in the module tests and `tests/case-study-rendering.test.mjs`.

---

### Task 1: Add structured case and practice rendering

**Files:**
- Modify: `assets/js/site.js`
- Modify: `assets/css/site.css`
- Create: `tests/case-study-rendering.test.mjs`
- Modify: `tests/site-structure.test.mjs`

**Interfaces:**
- `renderCaseStudy(parent, caseStudy, sourceById)` renders `status`, `title`, structured `brief`, `decisions`, `revision`, `final_output`, `real_reference`, and the accessible case image.
- `renderPracticeSteps(parent, title, steps)` renders `minutes`, `action`, `output`, and `checkpoint` for each ordered step.
- The lesson and print views call the same builders; case prose is written through DOM text nodes. External links use HTTPS and safe link attributes.

- [ ] **Step 1: Add failing rendering tests.** Test a complete case fixture, a practice sequence, source attribution/link, and consistent screen/print ordering. Run `node --test tests/case-study-rendering.test.mjs tests/site-structure.test.mjs`; expected: new helper and integration assertions fail.
- [ ] **Step 2: Implement the render builders.** Render case and step data with visible headings, list structure, times, outputs, checks, image alternative, and the linked reference summary. Load source data on the print route if needed and pass it to the same builders.
- [ ] **Step 3: Add responsive and print styles.** Keep case details readable on a narrow screen and make output/checkpoint groups printable without splitting headings from content.
- [ ] **Step 4: Run focused tests and commit.** Run the two test files above and `git diff --check`; expected: fixture rendering passes in both routes and no content becomes markup.

### Task 2: Research and register nine real published cases

**Files:**
- Modify: `content/sources.json`
- Modify: `docs/source-map.md`
- Create: `docs/real-design-cases.md`
- Create: `tests/real-design-cases.test.mjs`

**Interfaces:**
- One source record per module supplies a primary HTTPS URL, creator/client/institution, project title, date/version when published, check date, evidence type, access note, and use limits.
- `docs/real-design-cases.md` maps all nine modules to one public case, visible design decisions, a student observation prompt, and what cannot be concluded from that source.

- [ ] **Step 1: Add failing source-register tests.** Assert nine module mappings, active source IDs, direct HTTPS links, attribution, observation prompts, and stated limits. Run `node --test tests/real-design-cases.test.mjs`; expected: fail until the register and source records exist.
- [ ] **Step 2: Verify candidate cases at primary pages.** Find a fitting public case for each module: brief/identity, editorial, logo, image treatment, print or packaging, digital design, handoff, English explanation, and competition process. Verify creator, title, and only the claims visible in the primary source; record date and access limits.
- [ ] **Step 3: Add nine sources and teaching notes.** Use existing evidence-type and scope vocabularies. State that external pages enrich the analysis but are not needed to complete an activity.
- [ ] **Step 4: Run source tests and commit.** Run `node --test tests/real-design-cases.test.mjs tests/source-labels.test.mjs` and `node scripts/validate-course.mjs`; expected: the register covers all modules and all new catalog records validate.

### Task 3: Build concrete cases for modules 01–03

**Files:**
- Modify: `content/modules/01-brief.json` (5 sessions)
- Modify: `content/modules/02-indesign.json` (4 sessions)
- Modify: `content/modules/03-illustrator.json` (5 sessions)
- Modify: relevant `assets/examples/*.svg`
- Create: `tests/case-study-content.test.mjs`
- Modify: `tests/modules-01-03.test.mjs`

**Interfaces:**
- Each of these 14 sessions produces a specific simulation brief, decisions and alternative, revision or audience test, final artifact, real-case source reference, and timed guided/independent steps.
- A linked classroom project connects the main identity and editorial deliverables; every session remains usable alone.

- [ ] **Step 1: Add failing coverage for these 14 session IDs.** Assert a distinct brief and output, actionable timed steps, a concrete decision/test, and a valid case source for each. Run `node --test tests/modules-01-03.test.mjs tests/case-study-content.test.mjs`; expected: fail because the case fields do not yet exist.
- [ ] **Step 2: Author module 01 cases.** Give brief analysis, audience, hierarchy, symbol, and rapid ideation exact sample information, required text, unresolved questions, sketch alternatives, and a testable rationale.
- [ ] **Step 3: Author modules 02–03 cases.** Show filled editorial/document specs, page and type-style decisions, vector construction, logo-type comparisons, a text-plus-symbol iteration, and identity applications with size and monochrome checks.
- [ ] **Step 4: Update matching original visuals.** Make each reused/added SVG show the artifacts and comparisons named in the case; retain descriptive `title`, `desc`, visible labels, and useful captions.
- [ ] **Step 5: Verify and commit.** Run the two targeted test files, `node scripts/validate-course.mjs`, and `git diff --check`; expected: all 14 cases pass their specific output and reference checks.

### Task 4: Build concrete cases for modules 04 and 06

**Files:**
- Modify: `content/modules/04-photoshop.json` (2 sessions)
- Modify: `content/modules/06-digital-design.json` (2 sessions)
- Modify: relevant `assets/examples/*.svg`
- Modify: `tests/case-study-content.test.mjs`
- Modify: `tests/modules-04-06.test.mjs`

**Interfaces:**
- Photo exercises produce a named source-image treatment or composite with layer decisions, visible comparisons, and output settings matched to the stated destination.
- Digital exercises produce a concrete screen or interactive PDF with actual content, a user check, accessibility checks, and a documented revision.

- [ ] **Step 1: Add failing output-specific tests.** Assert before/after decisions in the Photoshop cases and real screen/PDF content, format context, user checks, accessibility checks, and fallback in the digital cases. Expected: current generic prose fails.
- [ ] **Step 2: Author and illustrate Photoshop cases.** Specify source-image constraints, retouch/composite steps, comparison criteria, and output profile/settings for the named destination.
- [ ] **Step 3: Author and illustrate digital cases.** Provide actual page/PDF content, hierarchy/navigation, a user walkthrough, contrast and resize checks, and an observed revision.
- [ ] **Step 4: Verify and commit.** Run `node --test tests/modules-04-06.test.mjs tests/case-study-content.test.mjs` and the existing course validator; expected: all four cases pass and no general rule is inferred from a single example.

### Task 5: Deepen print production and physical prototyping

**Files:**
- Modify: `content/modules/05-print-production.json` (3 sessions)
- Modify: `assets/examples/print-preflight.svg`
- Create: `assets/examples/print-proof-cycle.svg` if the current visual cannot show the proof and correction clearly
- Modify: `tests/case-study-content.test.mjs`
- Modify: `tests/modules-04-06.test.mjs`

**Interfaces:**
- Dieline, prepress, and proof-cycle sessions share one simulated supplier specification and produce an annotated dieline, checked PDF/package, and recorded proof decision.
- The physical prototype guide states materials, dimensions, assembly steps, a 2–3-person test, observations, a revision, and retest. Colour-printing and no-printer routes preserve the learning target and state what they cannot validate.

- [ ] **Step 1: Add failing print/prototype tests.** Assert the named simulated supplier, example-specific dimensions/output settings, safe/bleed logic only when specified, actionable PDF checks, prototype test observations, and usable fallbacks. Expected: current generic text fails.
- [ ] **Step 2: Author the filled print specification and dieline.** Tie values to the fictional supplier brief, identify which specs must be confirmed with a real shop, and show trim/fold/cut/bleed/safe areas only as appropriate.
- [ ] **Step 3: Author prepress and proof cases.** Follow one file through packaging, export, PDF inspection, low-cost proof, measured correction, and final confirmation; include a plausible failure and fix.
- [ ] **Step 4: Author physical prototype and fallback routes.** Include paper assembly, a 2–3-person test prompt, observation-to-change example, one retest, print-shop option, and monochrome/no-printer substitute with limits.
- [ ] **Step 5: Verify and commit.** Run targeted tests, existing validator and SVG checks; expected: all three print sessions work offline and clearly mark sample values as project-specific.

### Task 6: Build concrete cases for modules 07–09

**Files:**
- Modify: `content/modules/07-quality-handoff.json` (2 sessions)
- Modify: `content/modules/08-competition-english.json` (2 sessions)
- Modify: `content/modules/09-exams-selection.json` (3 sessions)
- Modify: relevant `assets/examples/*.svg`
- Modify: `tests/modules-07-09.test.mjs`
- Modify: `tests/case-study-content.test.mjs`

**Interfaces:**
- Handoff sessions output a tested deliverable package and documented checklist; English sessions output a brief analysis, a timed design explanation, and a realistic clarification exchange.
- Diagnostic, internal selection, and full simulation use the transparent existing internal rubric and never present a classroom metric as official competition scoring.

- [ ] **Step 1: Add failing coverage for these seven IDs.** Assert package contents, English phrases in context, timed tasks, a plausible technical failure/recovery, and internal-only selection labels. Expected: current cases fail specificity checks.
- [ ] **Step 2: Author modules 07–08.** Give each a concrete file tree and error/fix example, plus a short English brief, complete explanation, and clarification exchange with a language scaffold.
- [ ] **Step 3: Author module 09.** Include a concrete unseen brief and evidence record, a worked sample against published internal criteria, and a timed simulation with an announced change and post-task review.
- [ ] **Step 4: Update original visuals and preserve safeguards.** Keep the published internal criteria, provisional 2026 labels, score thresholds, and current retest fairness protections intact.
- [ ] **Step 5: Verify and commit.** Run `node --test tests/modules-07-09.test.mjs tests/case-study-content.test.mjs`, the course validator, and `git diff --check`; expected: all seven cases pass and none imply official scoring.

### Task 7: Enforce full validation and reconcile course guidance/hours

**Files:**
- Modify: `scripts/validate-course.mjs`
- Modify: `tests/validate-course.test.mjs`
- Modify: `tests/case-study-content.test.mjs`
- Modify: `README.md`
- Modify: `docs/curriculum-map.md`
- Modify: `docs/course-method.md`
- Modify: `docs/source-map.md`
- Complete: `docs/real-design-cases.md`
- Modify: `content/timeline.json` only if the verified practice totals require recalculation
- Test: `tests/course-data.test.mjs`
- Test: `tests/timeline.test.mjs`

**Interfaces:**
- `validate-course.mjs` reports errors against the affected session for malformed case data, bad/inactive source mapping, inaccessible illustration, invalid practice steps, and totals beyond the stated time allocation.
- Student and teacher guidance distinguishes published work, classroom simulation, official standards, and provisional 2026 material.

- [ ] **Step 1: Add failing whole-course validation tests.** Assert required nested fields for all 28 sessions, reference/source agreement, URL and local image checks, at least three timed/actionable steps per sequence, meaningful distinct outputs, and aggregate minutes within the course allocation. Expected: validator allows missing fields until this change.
- [ ] **Step 2: Implement strict case/practice validation.** Reuse path containment and source-catalog checks; avoid network requests in the validator; give field-level diagnostics with session IDs.
- [ ] **Step 3: Update student/teacher documentation.** Explain the case-study blocks, rights-safe links, offline operation, simulated print specs, practice route, and how to adapt after official 2027 publication.
- [ ] **Step 4: Reconcile timed steps.** Sum guided and independent minutes; keep them within the 168 and 60-hour allocations and document how remaining time supports critique, feedback, and retries. Preserve 228 total hours or update `content/timeline.json`, README, and curriculum map together with an explicit explanation.
- [ ] **Step 5: Run tests and commit.** Run `node --test tests/validate-course.test.mjs tests/case-study-content.test.mjs tests/course-data.test.mjs tests/timeline.test.mjs` and `node scripts/validate-course.mjs`; expected: all 28 sessions validate and published time totals agree.

### Task 8: Whole-course verification, review, and publication

**Files:**
- Test: all `tests/*.test.mjs`
- Validate: `scripts/validate-course.mjs`
- Review: `module.html`, `print.html`, changed JSON/source files, and all changed SVGs
- Publish: create a new pull request after verification, merge after required checks pass, and verify the GitHub Pages deployment

**Interfaces:**
- Final deliverable is a static Pages-compatible course with validated cases and screen/print behavior; external references enrich the analysis but are not required for exercises.

- [ ] **Step 1: Run the full suite.** Run `node --test`; expected: all existing and new tests pass.
- [ ] **Step 2: Run strict validation and repository checks.** Run `node scripts/validate-course.mjs --strict-current` and `git diff --check`; expected: zero errors, zero stale-source warnings requiring review, and no whitespace errors.
- [ ] **Step 3: Review every case record.** Check all 28 sessions for distinct briefs, decisions, artifacts, timed practice, checklist, source, and fallback; manually compare claims with primary case pages.
- [ ] **Step 4: Review local screen and print views.** Open representative sessions from modules 01, 02, 03, 05, 06, 08, and 09 at desktop and phone widths; print-preview the full print/prototype workflow and a normal session.
- [ ] **Step 5: Publish the verified change.** Push the completed branch and open a focused pull request; after repository checks pass, merge it under the user's existing instruction to update the published resource.
- [ ] **Step 6: Verify deployment and report.** Confirm the Pages workflow succeeds and inspect representative live pages. Report case coverage, print/prototype examples, practice-hour totals, validation, and any source access limits.
