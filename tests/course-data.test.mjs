import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCourse } from '../scripts/validate-course.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('course_modules_keep_the_nine_module_ids_in_order', () => {
  const { modules } = readJson('content/modules.json');
  assert.deepEqual(modules.map(({ id }) => id), [
    '01-brief', '02-indesign', '03-illustrator', '04-photoshop',
    '05-print-production', '06-digital-design', '07-quality-handoff',
    '08-competition-english', '09-exams-selection'
  ]);
});

test('source_records_have_scope_status_and_safe_access_fields', () => {
  const { sources } = readJson('content/sources.json');
  assert.ok(sources.length >= 8);
  for (const source of sources) {
    for (const key of ['id', 'title', 'publisher', 'version', 'checkedAt', 'status', 'scope', 'modules', 'access', 'url', 'reference', 'evidenceType']) assert.ok(key in source, `${source.id} missing ${key}`);
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['active', 'check', 'replaced', 'archive'].includes(source.status));
    assert.ok(['Kazakhstan', 'WSI', 'Adobe', 'academic', 'education', 'accessibility', 'practice'].includes(source.scope));
    if (source.evidenceType.startsWith('peer-reviewed-') || ['design-textbook', 'design-practitioner-text'].includes(source.evidenceType)) assert.ok(source.accessNote?.length > 20, `${source.id} needs an access note`);
    if (source.access === 'external') { assert.ok(source.url); assert.equal(source.reference, null); }
    else { assert.equal(source.access, 'local-reference'); assert.equal(source.url, null); assert.ok(source.reference); }
  }
  assert.equal(sources.some(({ version, status }) => /WSSS\s*2019/i.test(version) && status === 'active'), false);
});

test('validator_reports_course_data_without_errors_on_checked_date', () => {
  const result = validateCourse(root, '2026-10-21');
  assert.deepEqual(result.errors, []);
});
