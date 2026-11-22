import Papa from 'papaparse'

const aliases = {
  question: ['question', 'question_text', 'ques'],
  option_a: ['option_a', 'option a', 'a', 'option1'],
  option_b: ['option_b', 'option b', 'b', 'option2'],
  option_c: ['option_c', 'option c', 'c', 'option3'],
  option_d: ['option_d', 'option d', 'd', 'option4'],
  correct_answer: ['correct_answer', 'correct answer', 'answer', 'answer_a_b_c_d', 'correct'],
  question_id: ['question_id', 'id', 'sn', 's_no', 'serial_number'],
  subject: ['subject', 'question_booklet', 'booklet'],
  topic: ['topic', 'chapter', 'subtopic', 'subtopics', 'subtopic_option', 'sub_topic', 'sub_topic_name'],
  speciality: ['speciality', 'specialty', 'specialisation', 'specialization'],
  difficulty: ['difficulty', 'level', 'difficulty_level', 'difficulty_level_1_2_3_4_5_most_difficult', 'difficulty_levels'],
  explanation: ['explanation', 'solution'],
  marks: ['marks', 'positive_marks'],
  negative_marks: ['negative_marks', 'negative marks', 'penalty'],
}
const MAX_QUESTIONS = 5000
const MAX_CELL_LENGTH = 20000

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function getField(row, key) {
  const keys = Object.keys(row)
  const match = keys.find(k => aliases[key].includes(normalizeHeader(k)) || aliases[key].includes(k.trim().toLowerCase()))
  return match ? String(row[match] ?? '').trim() : ''
}

function parseSheetUrl(input) {
  const url = new URL(input.trim())
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Please use a secure Google Sheets URL without embedded credentials.')
  if (!['docs.google.com', 'drive.google.com'].includes(url.hostname)) throw new Error('Please enter a Google Sheets URL.')
  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || url.pathname.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
  const id = match?.[1] || url.searchParams.get('id')
  if (!id) throw new Error('That does not look like a Google Sheets URL.')
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const gid = url.searchParams.get('gid') || hashParams.get('gid') || '0'
  if (!/^\d+$/.test(gid)) throw new Error('The selected Google Sheets tab identifier is invalid.')
  return { id, gid }
}

export function toCsvUrl(input) {
  const { id, gid } = parseSheetUrl(input)
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=out:csv&headers=1`
}

function toJsonpUrl(input, callback) {
  const { id, gid } = parseSheetUrl(input)
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=${encodeURIComponent(`responseHandler:${callback}`)}&headers=1`
}

function readSheetWithJsonp(input) {
  return new Promise((resolve, reject) => {
    const callback = `quizForgeSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => finish(new Error('Google Sheets took too long to respond. Check that the sheet is shared with anyone who has the link.')), 15000)

    function finish(error, payload) {
      window.clearTimeout(timeout)
      delete window[callback]
      script.remove()
      error ? reject(error) : resolve(payload)
    }

    window[callback] = payload => {
      if (!payload || payload.status !== 'ok' || !payload.table || !Array.isArray(payload.table.cols) || !Array.isArray(payload.table.rows)) {
        finish(new Error('Google could not read this sheet. Set General access to “Anyone with the link” and choose Viewer.'))
        return
      }
      finish(null, payload)
    }
    script.onerror = () => finish(new Error('Google denied access to this sheet. Set General access to “Anyone with the link” and choose Viewer, then try again.'))
    script.referrerPolicy = 'no-referrer'
    script.src = toJsonpUrl(input, callback)
    document.head.appendChild(script)
  })
}

function rowsFromJsonp(payload) {
  const columns = payload.table.cols.map((column, index) => column.label || column.id || `Column ${index + 1}`)
  return payload.table.rows.map(row => columns.reduce((result, column, index) => {
    const cell = row.c?.[index]
    result[column] = cell?.f ?? cell?.v ?? ''
    return result
  }, {}))
}

export function questionsFromRows(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_QUESTIONS) throw new Error(`This sheet is limited to ${MAX_QUESTIONS.toLocaleString()} questions per booklet.`)
  const questions = rows.map((row, index) => {
    const question = getField(row, 'question')
    const options = ['a', 'b', 'c', 'd'].map(letter => getField(row, `option_${letter}`))
    const correct = getField(row, 'correct_answer').toUpperCase().replace('OPTION ', '').trim()
    return {
      id: getField(row, 'question_id') || `Q${index + 1}`,
      question,
      options,
      correctAnswer: correct,
      // The booklet format does not need a Subject column. Every imported
      // Each imported sheet is presented as one Question Booklet. Subtopic,
      // Speciality, and Difficulty Level remain row-specific metadata.
      subject: 'Question Booklet',
      topic: getField(row, 'topic') || 'General',
      speciality: getField(row, 'speciality') || 'Not specified',
      difficulty: getField(row, 'difficulty') || 'Not specified',
      explanation: getField(row, 'explanation'),
      marks: Number(getField(row, 'marks') || 1),
      negativeMarks: Number(getField(row, 'negative_marks') || 0),
    }
  }).filter(q => q.question && q.options.every(Boolean)).map(question => ({
    ...question,
    question: question.question.slice(0, MAX_CELL_LENGTH),
    options: question.options.map(option => option.slice(0, MAX_CELL_LENGTH)),
    topic: question.topic.slice(0, 500),
    speciality: question.speciality.slice(0, 500),
    difficulty: question.difficulty.slice(0, 100),
    explanation: question.explanation.slice(0, MAX_CELL_LENGTH),
  }))
  const invalid = questions.filter(q => !['A', 'B', 'C', 'D'].includes(q.correctAnswer))
  if (!questions.length) throw new Error('No valid questions found. Check the required column names.')
  if (invalid.length) throw new Error(`${invalid.length} question(s) have an invalid correct_answer. Use A, B, C, or D.`)
  return questions
}

export async function importSheet(input) {
  const value = input.trim()
  const isDirectCsv = value.includes('output=csv') || value.includes('/export?format=csv')

  // Normal sharing links are imported with JSONP because Google’s CSV
  // response does not include the CORS header required by browser fetch().
  if (!isDirectCsv) {
    const payload = await readSheetWithJsonp(value)
    return questionsFromRows(rowsFromJsonp(payload))
  }

  // Rebuild direct CSV links from the validated Google Sheets id and gid.
  // This prevents a pasted URL containing `output=csv` from pointing the
  // importer at an unrelated origin.
  const csvUrl = toCsvUrl(value)
  let response
  try {
    response = await fetch(csvUrl)
  } catch {
    throw new Error('QuizForge could not connect to Google Sheets. Check your internet connection and try again.')
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Google denied access to this sheet. Set General access to “Anyone with the link” and choose Viewer, then try again.')
    }
    throw new Error(`Google Sheets returned an error (${response.status}). Make sure the link points to a Google Sheet that you can open without signing in.`)
  }
  const text = await response.text()
  if (/<!doctype html>|<html/i.test(text.slice(0, 500))) throw new Error('Google returned a web page instead of sheet data. Set General access to “Anyone with the link” and choose Viewer, then retry.')
  const headerLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = headerLine.split(';').length > headerLine.split(',').length ? ';' : ','
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter })
  if (parsed.errors.length && !parsed.data.length) throw new Error('Could not parse the spreadsheet CSV.')
  return questionsFromRows(parsed.data)
}
