export function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const difficultyLabels = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
}

export function formatDifficulty(value) {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(?:difficulty\s*)?([1-5])(?:\.0+)?$/i)
  return match ? difficultyLabels[match[1]] : raw || 'Not specified'
}

export function questionHistoryKey(question) {
  const bookletId = String(question?.bookletId || '')
  const rawId = String(question?.sourceQuestionId ?? question?.id ?? '')
  const sourceId = bookletId && rawId.startsWith(`${bookletId}:`) ? rawId.slice(bookletId.length + 1) : rawId
  return bookletId ? `${bookletId}:${sourceId}` : sourceId
}

export function buildTest(questions, config) {
  const selected = questions.filter(q =>
    (!config.subject || q.subject === config.subject) &&
    (!config.topics?.length || config.topics.includes(q.topic)) &&
    (!config.difficulty || config.difficulty === 'All' || (q.difficulty || 'Not specified').toLowerCase() === config.difficulty.toLowerCase())
  )
  const excludedQuestionKeys = new Set(config.excludeQuestionKeys || [])
  const fresh = selected.filter(question => !excludedQuestionKeys.has(questionHistoryKey(question)))
  const previouslyPractised = selected.filter(question => excludedQuestionKeys.has(questionHistoryKey(question)))
  const ordered = config.avoidPreviousQuestions === false
    ? (config.shuffleQuestions === false ? selected : shuffle(selected))
    : [
      ...(config.shuffleQuestions === false ? fresh : shuffle(fresh)),
      ...(config.shuffleQuestions === false ? previouslyPractised : shuffle(previouslyPractised)),
    ]
  const picked = ordered.slice(0, Math.min(config.count, selected.length))
  return picked.map(q => {
    const originalOptions = q.options.map((text, index) => ({ sourceKey: String.fromCharCode(65 + index), text }))
    const orderedOptions = config.shuffleOptions ? shuffle(originalOptions) : originalOptions
    // Keep the visible labels in their normal A–D order after shuffling.
    // `sourceKey` lets us remap the stored correct answer to the new label.
    const options = orderedOptions.map((option, index) => ({ key: String.fromCharCode(65 + index), text: option.text, sourceKey: option.sourceKey }))
    const correctAnswer = options.find(option => option.sourceKey === String(q.correctAnswer || '').trim().toUpperCase())?.key || q.correctAnswer
    return { ...q, correctAnswer, marks: config.marks ?? q.marks, negativeMarks: config.negative ?? q.negativeMarks, options }
  })
}
export function evaluate(test, answers, timings) {
  let score = 0, correct = 0, incorrect = 0, skipped = 0
  const review = test.map(q => {
    const answer = answers[q.id]
    const right = answer === q.correctAnswer
    if (!answer) skipped++
    else if (right) { correct++; score += Number(q.marks) || 1 }
    else { incorrect++; score -= Number(q.negativeMarks) || 0 }
    return { ...q, selectedAnswer: answer || null, isCorrect: right, timeSeconds: timings[q.id] || 0 }
  })
  const total = test.length
  const spent = Object.values(timings).reduce((a, b) => a + b, 0)
  return { score: Number(score.toFixed(2)), correct, incorrect, skipped, total, accuracy: total ? Math.round(correct / total * 100) : 0, timeSeconds: spent, averageSeconds: total ? Math.round(spent / total) : 0, review }
}

export function summarizeBy(review, field) {
  const grouped = new Map()
  review.forEach(question => {
    const label = question[field] || 'Uncategorized'
    const current = grouped.get(label) || { label, total: 0, correct: 0, incorrect: 0, skipped: 0, timeSeconds: 0 }
    current.total += 1
    current.timeSeconds += Number(question.timeSeconds) || 0
    if (!question.selectedAnswer) current.skipped += 1
    else if (question.isCorrect) current.correct += 1
    else current.incorrect += 1
    grouped.set(label, current)
  })
  return [...grouped.values()]
    .map(item => ({
      ...item,
      accuracy: item.total ? Math.round(item.correct / item.total * 100) : 0,
      averageSeconds: item.total ? Math.round(item.timeSeconds / item.total) : 0,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export function getMarksSummary(result) {
  const review = Array.isArray(result?.review) ? result.review : []
  const marksFor = question => Number.isFinite(Number(question?.marks)) ? Number(question.marks) : 1
  const negativeFor = question => Number.isFinite(Number(question?.negativeMarks)) ? Number(question.negativeMarks) : 0
  const maximumMarks = review.reduce((total, question) => total + marksFor(question), 0)
  const marksEarned = review.filter(question => question.isCorrect).reduce((total, question) => total + marksFor(question), 0)
  const negativeMarks = review.filter(question => question.selectedAnswer && !question.isCorrect).reduce((total, question) => total + negativeFor(question), 0)
  const skippedPotential = review.filter(question => !question.selectedAnswer).reduce((total, question) => total + marksFor(question), 0)
  return {
    maximumMarks,
    marksEarned,
    negativeMarks,
    netScore: Number((marksEarned - negativeMarks).toFixed(2)),
    skippedPotential,
    attempted: review.filter(question => question.selectedAnswer).length,
    correct: review.filter(question => question.isCorrect).length,
    incorrect: review.filter(question => question.selectedAnswer && !question.isCorrect).length,
    skipped: review.filter(question => !question.selectedAnswer).length,
  }
}

export function getAnalytics(result) {
  const review = Array.isArray(result?.review) ? result.review : []
  const topics = summarizeBy(review, 'topic')
  // Keep the result-level score data beside the topic rows that already render on the results screen.
  topics.marksSummary = getMarksSummary(result)
  return {
    topics,
    difficulties: summarizeBy(review, 'difficulty'),
  }
}
