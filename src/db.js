const DB_NAME = 'quizforge-local'
const DB_VERSION = 1
const STORES = ['banks', 'attempts', 'drafts']

export function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser does not support IndexedDB.'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('banks')) db.createObjectStore('banks', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('attempts')) db.createObjectStore('attempts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local database.'))
  })
}

export async function getAll(store) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function put(store, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve(value)
    tx.onerror = () => reject(tx.error)
  })
}

export async function remove(store, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(id)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearStore(store) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite')
    STORES.forEach(name => tx.objectStore(name).clear())
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function exportAll() {
  const [banks, attempts, drafts] = await Promise.all(STORES.map(getAll))
  return { app: 'QuizForge', schemaVersion: 1, exportedAt: new Date().toISOString(), banks, attempts, drafts, settings: getSettings() }
}

export function getSettings() {
  try { return JSON.parse(localStorage.getItem('quizforge-settings') || '{}') } catch { return {} }
}
export function saveSettings(settings) {
  try {
    localStorage.setItem('quizforge-settings', JSON.stringify(settings))
  } catch {
    throw new Error('Could not save your settings. Your browser storage may be full or unavailable.')
  }
}

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function isQuestion(value) {
  return isObject(value) && typeof value.id === 'string' && typeof value.question === 'string' && Array.isArray(value.options) && value.options.length === 4 && value.options.every(option => typeof option === 'string') && ['A', 'B', 'C', 'D'].includes(value.correctAnswer) && (typeof value.speciality === 'undefined' || typeof value.speciality === 'string')
}
function isBank(value) {
  return isObject(value) && typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.questions) && value.questions.every(isQuestion)
}
function isAttempt(value) {
  return isObject(value) && typeof value.id === 'string' && typeof value.completedAt === 'string' && isObject(value.result) && Array.isArray(value.result.review)
}
export async function importAll(data) {
  if (data?.app !== 'QuizForge' || data?.schemaVersion !== 1 || !Array.isArray(data.banks) || !Array.isArray(data.attempts) || !data.banks.every(isBank) || !data.attempts.every(isAttempt) || (data.drafts && (!Array.isArray(data.drafts) || !data.drafts.every(draft => isObject(draft) && typeof draft.id === 'string'))) || (data.settings && !isObject(data.settings))) {
    throw new Error('This backup is not a valid QuizForge version 1 backup.')
  }
  await clearAll()
  for (const bank of data.banks) await put('banks', bank)
  for (const attempt of data.attempts) await put('attempts', attempt)
  for (const draft of (data.drafts || [])) await put('drafts', draft)
  saveSettings(data.settings || {})
}
