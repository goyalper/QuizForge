import { jsPDF } from 'jspdf'
import { formatDifficulty, summarizeBy } from './quiz.js'

const COLORS = {
  navy: [32, 36, 58], primary: [85, 85, 217], green: [42, 159, 112], orange: [224, 143, 66], red: [202, 80, 72],
  muted: [115, 122, 146], line: [226, 229, 239], soft: [244, 245, 255], paleGreen: [233, 248, 240],
  paleOrange: [255, 245, 232], paleRed: [255, 239, 238], paleGray: [247, 248, 252], white: [255, 255, 255],
}

const formatDuration = seconds => {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  return `${Math.floor(total / 60)}m ${total % 60}s`
}
const truncate = (value, max) => {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}
const drawText = (doc, text, x, y, options = {}) => doc.text(String(text ?? ''), x, y, options)

function drawMetricCard(doc, x, y, width, label, value, tone) {
  doc.setFillColor(...COLORS.white); doc.setDrawColor(...COLORS.line); doc.roundedRect(x, y, width, 24, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...tone); drawText(doc, value, x + 5, y + 11)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted); drawText(doc, label.toUpperCase(), x + 5, y + 18)
}

function drawGroupChart(doc, x, y, width, title, items, accent) {
  const shown = items.slice(0, 7)
  const rowHeight = 10
  const height = 20 + Math.max(1, shown.length) * rowHeight + (items.length > shown.length ? 8 : 0)
  doc.setFillColor(...COLORS.white); doc.setDrawColor(...COLORS.line); doc.roundedRect(x, y, width, height, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...COLORS.navy); drawText(doc, title, x + 7, y + 11)
  if (!shown.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted); drawText(doc, 'No data available', x + 7, y + 25)
    return height
  }
  const labelWidth = Math.min(40, width * 0.32); const barX = x + 7 + labelWidth; const barWidth = width - labelWidth - 25
  shown.forEach((item, index) => {
    const rowY = y + 20 + index * rowHeight
    const label = title.toLowerCase().includes('difficulty') ? formatDifficulty(item.label) : item.label
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted); drawText(doc, truncate(label, 17), x + 7, rowY + 3)
    doc.setFillColor(...COLORS.paleGray); doc.roundedRect(barX, rowY - 2, barWidth, 4, 2, 2, 'F')
    doc.setFillColor(...accent); doc.roundedRect(barX, rowY - 2, Math.max(1, barWidth * item.accuracy / 100), 4, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...COLORS.navy); drawText(doc, `${item.accuracy}%`, x + width - 7, rowY + 3, { align: 'right' })
  })
  if (items.length > shown.length) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(...COLORS.muted); drawText(doc, `+ ${items.length - shown.length} more groups`, x + 7, y + height - 5)
  }
  return height
}

export function createReportDocument(attempt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210; const pageHeight = 297; const margin = 14; const contentWidth = pageWidth - margin * 2
  const result = attempt.result || {}; const review = Array.isArray(result.review) ? result.review : []
  const topics = summarizeBy(review, 'topic'); const difficulties = summarizeBy(review, 'difficulty')
  let page = 1; let y = 18

  function drawHeader() {
    doc.setFillColor(...COLORS.navy); doc.rect(0, 0, pageWidth, 12, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...COLORS.white); drawText(doc, 'QUIZFORGE  /  QUESTION BOOKLET PERFORMANCE', margin, 8)
    doc.setFont('helvetica', 'normal'); drawText(doc, 'LOCAL REPORT', pageWidth - margin, 8, { align: 'right' })
  }
  function drawFooter() {
    doc.setDrawColor(...COLORS.line); doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted)
    drawText(doc, `QuizForge - ${truncate(attempt.bankName || 'Question Booklet', 46)}`, margin, pageHeight - 7)
    drawText(doc, `Page ${page}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }
  function newPage() { drawFooter(); doc.addPage(); page += 1; y = 19; drawHeader() }
  function ensureSpace(height) { if (y + height > pageHeight - 20) newPage() }

  drawHeader()
  doc.setTextColor(...COLORS.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(23); drawText(doc, 'Test performance report', margin, 31)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...COLORS.muted)
  drawText(doc, truncate(attempt.bankName || 'Question Booklet', 80), margin, 39)
  drawText(doc, new Date(attempt.completedAt || Date.now()).toLocaleString(), pageWidth - margin, 39, { align: 'right' })

  doc.setFillColor(...COLORS.soft); doc.roundedRect(margin, 47, contentWidth, 54, 5, 5, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...COLORS.primary); drawText(doc, 'OVERALL ACCURACY', margin + 9, 59)
  doc.setFontSize(31); doc.setTextColor(...COLORS.navy); drawText(doc, `${result.accuracy || 0}%`, margin + 9, 79)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...COLORS.muted); drawText(doc, `${result.correct || 0} correct out of ${result.total || 0} questions`, margin + 9, 90)
  doc.setFillColor(...COLORS.white); doc.roundedRect(margin + 9, 94, 64, 3, 1.5, 1.5, 'F'); doc.setFillColor(...COLORS.primary); doc.roundedRect(margin + 9, 94, Math.max(1, 64 * (Number(result.accuracy) || 0) / 100), 3, 1.5, 1.5, 'F')
  const cardX = margin + 83; const cardWidth = 43
  drawMetricCard(doc, cardX, 55, cardWidth, 'Score', result.score ?? 0, COLORS.primary); drawMetricCard(doc, cardX + 46, 55, cardWidth, 'Time', formatDuration(result.timeSeconds), COLORS.orange)
  drawMetricCard(doc, cardX, 82, cardWidth, 'Avg / Q', `${result.averageSeconds || 0}s`, COLORS.green); drawMetricCard(doc, cardX + 46, 82, cardWidth, 'Booklet', result.total || 0, COLORS.navy)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...COLORS.navy); drawText(doc, 'Answer distribution', margin, 119)
  const distribution = [['Correct', result.correct || 0, COLORS.green, COLORS.paleGreen], ['Incorrect', result.incorrect || 0, COLORS.red, COLORS.paleRed], ['Skipped', result.skipped || 0, COLORS.muted, COLORS.paleGray]]
  distribution.forEach(([label, value, color, background], index) => {
    const x = margin + index * 61
    doc.setFillColor(...background); doc.roundedRect(x, 124, 56, 22, 3, 3, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...color); drawText(doc, value, x + 6, 138)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted); drawText(doc, label.toUpperCase(), x + 21, 138)
  })
  const chartWidth = (contentWidth - 8) / 2
  const topicChartHeight = drawGroupChart(doc, margin, 156, chartWidth, 'Subtopic accuracy', topics, COLORS.primary)
  const difficultyChartHeight = drawGroupChart(doc, margin + chartWidth + 8, 156, chartWidth, 'Difficulty accuracy', difficulties, COLORS.orange)
  const weakest = topics.length ? [...topics].sort((a, b) => a.accuracy - b.accuracy)[0] : null
  if (weakest) {
    const focusY = 156 + Math.max(topicChartHeight, difficultyChartHeight) + 8
    doc.setFillColor(...COLORS.paleOrange); doc.roundedRect(margin, focusY, contentWidth, 20, 4, 4, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...COLORS.orange); drawText(doc, `NEXT FOCUS  /  ${truncate(weakest.label, 35)}`, margin + 8, focusY + 9)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.navy); drawText(doc, `${weakest.accuracy}% accuracy across ${weakest.total} question${weakest.total === 1 ? '' : 's'}. Review this subtopic before your next booklet.`, margin + 8, focusY + 16)
  }

  newPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...COLORS.navy); drawText(doc, 'Detailed question review', margin, y); y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...COLORS.muted); drawText(doc, 'Every question includes its booklet context, selected answer, correct answer, timing, and explanation.', margin, y); y += 9
  review.forEach((question, index) => {
    const questionLines = doc.splitTextToSize(`${index + 1}. ${question.question || ''}`, contentWidth - 30)
    const detail = `${truncate(question.topic || 'General', 22)}  |  ${truncate(question.speciality || 'Not specified', 24)}  |  ${formatDifficulty(question.difficulty)}  |  ${question.timeSeconds || 0}s`
    const answerLine = `Your answer: ${question.selectedAnswer || 'Not attempted'}  |  Correct: ${question.correctAnswer || '-'}  |  ${question.isCorrect ? 'Correct' : question.selectedAnswer ? 'Incorrect' : 'Skipped'}`
    const explanationLines = question.explanation ? doc.splitTextToSize(`Explanation: ${question.explanation}`, contentWidth - 30) : []
    const boxHeight = 18 + questionLines.length * 4.5 + 7 + 4.5 + (explanationLines.length ? explanationLines.length * 4 + 4 : 0)
    ensureSpace(boxHeight + 5)
    const isCorrect = Boolean(question.isCorrect); const isSkipped = !question.selectedAnswer; const statusColor = isCorrect ? COLORS.green : isSkipped ? COLORS.muted : COLORS.red; const statusBackground = isCorrect ? COLORS.paleGreen : isSkipped ? COLORS.paleGray : COLORS.paleRed
    doc.setFillColor(...COLORS.white); doc.setDrawColor(...COLORS.line); doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'FD'); doc.setFillColor(...statusBackground); doc.roundedRect(margin + 6, y + 7, 14, 10, 3, 3, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...statusColor); drawText(doc, isCorrect ? 'OK' : isSkipped ? '--' : 'X', margin + 13, y + 13, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...COLORS.navy); doc.text(questionLines, margin + 27, y + 10, { lineHeightFactor: 1.18 })
    let contentY = y + 10 + questionLines.length * 4.5 + 4
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COLORS.muted); drawText(doc, detail, margin + 27, contentY); contentY += 5; doc.setTextColor(...COLORS.navy); drawText(doc, answerLine, margin + 27, contentY); contentY += 5
    if (explanationLines.length) { doc.setTextColor(...COLORS.muted); doc.text(explanationLines, margin + 27, contentY, { lineHeightFactor: 1.2 }) }
    y += boxHeight + 5
  })
  drawFooter()
  return doc
}

export function downloadReport(attempt) {
  createReportDocument(attempt).save(`quizforge-report-${Date.now()}.pdf`)
}
