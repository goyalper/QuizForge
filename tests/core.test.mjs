import assert from 'node:assert/strict'
import test from 'node:test'

import { questionsFromRows, toCsvUrl } from '../src/sheets.js'
import { buildTest, evaluate, formatDifficulty, summarizeBy } from '../src/quiz.js'

const jeeRow = (overrides = {}) => ({
  sn: '121',
  question: 'A particle has charge q. Which expression gives its potential energy?',
  'option A': 'qV',
  'option B': 'V/q',
  'option C': 'q/V',
  'option D': 'q + V',
  'answer(A,B,C,D)': 'A',
  'Difficulty level(1,2,3,4,5-most difficult)': '3',
  'subtopic option': 'Physics - Electrostatics',
  speciality: 'JEE Main - 2021, 2023 and 2025',
  ...overrides,
})

test('imports the 10-column JEE format and preserves metadata', () => {
  const [question] = questionsFromRows([jeeRow()])

  assert.equal(question.id, '121')
  assert.equal(question.subject, 'Question Booklet')
  assert.deepEqual(question.options, ['qV', 'V/q', 'q/V', 'q + V'])
  assert.equal(question.correctAnswer, 'A')
  assert.equal(question.difficulty, '3')
  assert.equal(question.topic, 'Physics - Electrostatics')
  assert.equal(question.speciality, 'JEE Main - 2021, 2023 and 2025')
})

test('rejects invalid answer keys instead of importing unsafe question data', () => {
  assert.throws(
    () => questionsFromRows([jeeRow({ 'answer(A,B,C,D)': 'E' })]),
    /invalid correct_answer/i,
  )
})

test('normalizes a Google Sheets URL to the validated CSV endpoint', () => {
  assert.equal(
    toCsvUrl('https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=42'),
    'https://docs.google.com/spreadsheets/d/sheet_123/gviz/tq?gid=42&tqx=out:csv&headers=1',
  )
  assert.throws(() => toCsvUrl('http://docs.google.com/spreadsheets/d/sheet_123'), /secure Google Sheets URL/i)
  assert.throws(() => toCsvUrl('https://example.com/spreadsheets/d/sheet_123'), /Google Sheets URL/i)
})

test('keeps visible answer labels A-D when options are shuffled', () => {
  const originalRandom = Math.random
  Math.random = () => 0

  try {
    const [question] = buildTest([{
      ...questionsFromRows([jeeRow()])[0],
      marks: 2,
      negativeMarks: 0.5,
    }], { count: 1, shuffleQuestions: false, shuffleOptions: true })

    assert.deepEqual(question.options.map(option => option.key), ['A', 'B', 'C', 'D'])
    assert.equal(
      question.options.find(option => option.text === 'qV').key,
      question.correctAnswer,
    )
  } finally {
    Math.random = originalRandom
  }
})

test('evaluates correct, incorrect, and skipped answers consistently', () => {
  const testQuestions = [
    { id: 'q1', correctAnswer: 'A', marks: 2, negativeMarks: 0.5 },
    { id: 'q2', correctAnswer: 'B', marks: 2, negativeMarks: 0.5 },
    { id: 'q3', correctAnswer: 'C', marks: 2, negativeMarks: 0.5 },
  ]
  const result = evaluate(testQuestions, { q1: 'A', q2: 'D' }, { q1: 5, q2: 7 })

  assert.equal(result.correct, 1)
  assert.equal(result.incorrect, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.score, 1.5)
  assert.equal(result.accuracy, 33)
  assert.equal(result.timeSeconds, 12)
})

test('uses distinct difficulty vocabulary and groups analytics', () => {
  assert.equal(formatDifficulty('1'), 'Beginner')
  assert.equal(formatDifficulty('5'), 'Expert')

  const [topic] = summarizeBy([
    { topic: 'Physics', selectedAnswer: 'A', isCorrect: true, timeSeconds: 4 },
    { topic: 'Physics', selectedAnswer: null, isCorrect: false, timeSeconds: 6 },
  ], 'topic')

  assert.deepEqual(topic, {
    label: 'Physics',
    total: 2,
    correct: 1,
    incorrect: 0,
    skipped: 1,
    timeSeconds: 10,
    accuracy: 50,
    averageSeconds: 5,
  })
})
