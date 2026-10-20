import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer } from '../assets/js/quiz.js';

test('correct_answer_returns_correct', () => assert.deepEqual(gradeAnswer('cmyk', 'cmyk'), { state: 'correct' }));
test('wrong_answer_returns_incorrect', () => assert.deepEqual(gradeAnswer('rgb', 'cmyk'), { state: 'incorrect' }));
test('empty_answer_returns_unanswered', () => assert.deepEqual(gradeAnswer('', 'cmyk'), { state: 'unanswered' }));
