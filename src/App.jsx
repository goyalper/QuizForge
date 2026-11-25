import { useEffect, useRef, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, ChartNoAxesCombined, Clock3, Copy, FileSpreadsheet, FileText, GraduationCap, Heart, LayoutDashboard, Moon, Plus, Search, Settings, Sparkles, Sun, Trash2, Pencil, Upload, Download, RotateCcw, RefreshCw, CheckCircle2, CircleHelp, ArrowRight, Play, X, Menu } from 'lucide-react'
import { clearAll, clearStore, exportAll, getAll, getSettings, importAll, put, remove, saveSettings } from './db'
import { importSheet } from './sheets'
import { buildTest, detailedSolutionSearchUrl, evaluate, formatDifficulty, getAnalytics, questionHistoryKey } from './quiz'
import { downloadReport } from './pdf'
import './not-found.css'
import './loader.css'
import './donation.css'
import './question-metadata.css'
import './ai-generator.css'
import './sample-import.css'

const fmt = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
const bookletGroups = (settings, banks) => [...new Set(['General', ...(settings?.questionBookletGroups || []), ...banks.map(booklet => booklet.group || 'General')].map(group => group.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
const sampleBooklets = [
  {
    id: 'jee-main',
    title: 'JEE Main Aspirants',
    description: 'Physics, Chemistry, and Mathematics practice.',
    name: 'JEE Main Sample Question Booklet',
    url: 'https://docs.google.com/spreadsheets/d/1F0VmbXZs4_9_NuU2tEtqAM5iUf_uPsZR/edit?usp=sharing',
  },
  {
    id: 'neet',
    title: 'NEET Aspirants',
    description: 'Biology, Physics, and Chemistry practice.',
    name: 'NEET Sample Question Booklet',
    url: 'https://docs.google.com/spreadsheets/d/1l6lTP3IN_fy69XkodbzLPi_UN64Our-1/edit?usp=sharing',
  },
  {
    id: 'reet',
    title: 'REET Aspirants',
    description: 'Teacher eligibility and Rajasthan exam practice.',
    name: 'REET Sample Question Booklet',
    url: 'https://docs.google.com/spreadsheets/d/1y1ma6ehphzq2MVjZYffSU0B-byv0JqID/edit?usp=sharing',
  },
  {
    id: 'rpsc-ia-programmer',
    title: 'RPSC IA & Programmer',
    description: 'Information assistant and programmer practice.',
    name: 'RPSC IA and Programmer Sample Question Booklet',
    url: 'https://docs.google.com/spreadsheets/d/1rBBq-FnvXSnuhzLvthQERWQydYdyVDcP/edit?usp=sharing',
  },
]

function Logo({withText = false, className = ''}) {
  return <div className={`quizforge-logo ${withText ? 'quizforge-logo-with-text' : ''} ${className}`.trim()}>
    <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt={withText ? 'QuizForge' : ''} aria-hidden={!withText}/>
    {withText && <span>Quiz<span className="brand-accent">Forge</span></span>}
  </div>
}

function App() {
  const [banks, setBanks] = useState([])
  const [attempts, setAttempts] = useState([])
  const [settings, setSettings] = useState(getSettings())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const navigate = useNavigate()
  const dark = settings.theme === 'dark'

  async function refresh() {
    const [b, a] = await Promise.all([getAll('banks'), getAll('attempts')])
    setBanks(b.sort((x, y) => y.createdAt.localeCompare(x.createdAt)))
    setAttempts(a.sort((x, y) => y.completedAt.localeCompare(x.completedAt)))
    setLoading(false)
  }
  useEffect(() => { refresh().catch(e => { setNotice(e.message); setLoading(false) }) }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  function updateSettings(next) {
    try { saveSettings(next); setSettings(next) }
    catch (error) { setNotice(error.message || 'Could not save your settings.') }
  }
  function toast(message) { setNotice(message); window.setTimeout(() => setNotice(''), 4200) }

  async function addBank(bank) { await put('banks', bank); await refresh(); toast('Question booklet imported successfully.'); navigate('/banks') }
  async function updateBank(bank) { await put('banks', bank); await refresh() }
  async function deleteBank(bankId) { await remove('banks', bankId); await refresh(); toast('Question booklet deleted.'); navigate('/banks') }
  async function refreshBank(bankId) {
    const bank = banks.find(item => item.id === bankId)
    if (!bank?.sourceUrl) throw new Error('This question booklet has no source link. Import the sheet again to enable refresh.')
    const questions = await importSheet(bank.sourceUrl)
    await put('banks', {...bank, subjects: ['Question Booklet'], questions, updatedAt: new Date().toISOString()})
    await refresh()
    toast('Question booklet refreshed from the selected sheet.')
  }
  async function finishAttempt(attempt) { await put('attempts', attempt); await refresh(); navigate(`/results/${attempt.id}`) }

  const context = { banks, attempts, settings, updateSettings, refresh, addBank, updateBank, deleteBank, refreshBank, finishAttempt, toast, navigate }
  return <div className="app-shell">
    <SEO />
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><NavLink to="/" className="brand-link" aria-label="Go to QuizForge dashboard" onClick={() => setMobileNav(false)}><Logo withText/></NavLink><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>
        <SideLink to="/" icon={<LayoutDashboard size={18}/>} label="Dashboard" close={() => setMobileNav(false)}/>
        <SideLink to="/banks" icon={<BookOpen size={18}/>} label="Question booklets" close={() => setMobileNav(false)}/>
        <SideLink to="/import" icon={<FileSpreadsheet size={18}/>} label="Import questions" close={() => setMobileNav(false)}/>
        <SideLink to="/history" icon={<Clock3 size={18}/>} label="Test history" close={() => setMobileNav(false)}/>
        <SideLink to="/performance" icon={<ChartNoAxesCombined size={18}/>} label="Performance" close={() => setMobileNav(false)}/>
        <SideLink to="/ai-generator" icon={<Sparkles size={18}/>} label="AI question generator" close={() => setMobileNav(false)}/>
        <SideLink to="/donate" icon={<Heart size={18}/>} label="Support QuizForge" close={() => setMobileNav(false)}/>
        <SideLink to="/tutorial" icon={<FileText size={18}/>} label="Tutorial" close={() => setMobileNav(false)}/>
        <SideLink to="/feedback" icon={<FileText size={18}/>} label="Feedback" close={() => setMobileNav(false)}/>
        <SideLink to="/about" icon={<CircleHelp size={18}/>} label="About QuizForge" close={() => setMobileNav(false)}/>
      </nav>
      <div className="sidebar-bottom"><SideLink to="/settings" icon={<Settings size={18}/>} label="Settings" close={() => setMobileNav(false)}/><div className="privacy-note"><span className="privacy-dot"/> Your data stays in this browser</div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <Topbar dark={dark} settings={settings} updateSettings={updateSettings} setMobileNav={setMobileNav}/>
      {loading ? <WorkspaceLoader/> : <div className="page-wrap"><Routes>
        <Route path="/" element={<Dashboard {...context}/>}/>
        <Route path="/import" element={<ImportPage {...context}/>}/>
        <Route path="/banks" element={<BanksPage {...context}/>}/>
        <Route path="/configure/:bankId" element={<ConfigurePage {...context}/>}/>
        <Route path="/manage/:bankId" element={<ManageQuestionsPage {...context}/>}/>
        <Route path="/quiz/:sessionId" element={<QuizPage {...context}/>}/>
        <Route path="/results/:attemptId" element={<ResultPage {...context}/>}/>
        <Route path="/history" element={<HistoryPage {...context}/>}/>
        <Route path="/performance" element={<PerformancePage {...context}/>}/>
        <Route path="/ai-generator" element={<AiQuestionGeneratorPage {...context}/>}/>
        <Route path="/donate" element={<DonationPage {...context}/>}/>
        <Route path="/settings" element={<SettingsPage {...context}/>}/>
        <Route path="/about" element={<><AboutPage {...context}/><PrivacyDetails/><SecurityGuidance/><SecurityVisual/><LegalDisclaimer/><DeveloperSection /></>}/>
        <Route path="/tutorial" element={<TutorialPage {...context}/>}/>
        <Route path="/feedback" element={<FeedbackPage {...context}/>}/>
        <Route path="*" element={<NotFoundPage navigate={navigate}/>}/>
      </Routes></div>}
      <SiteFooter />
    </main>
    {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
  </div>
}

function SEO() {
  const location = useLocation()
  useEffect(() => {
    const isPublicHome = location.pathname === '/'
    const isAboutPage = location.pathname === '/about'
    const isTutorialPage = location.pathname === '/tutorial'
    const isDonationPage = location.pathname === '/donate'
    const isAiGeneratorPage = location.pathname === '/ai-generator'
    const isNotFound = ![ '/', '/about', '/tutorial', '/donate', '/ai-generator', '/import', '/banks', '/history', '/performance', '/settings', '/feedback' ].includes(location.pathname) && ![ '/configure/', '/manage/', '/quiz/', '/results/' ].some(prefix => location.pathname.startsWith(prefix))
    const isPublicPage = isPublicHome || isAboutPage || isTutorialPage || isDonationPage
    const title = isNotFound ? 'Page not found — QuizForge' : isPublicHome ? 'QuizForge — Create practice quizzes from Google Sheets' : isAboutPage ? 'About QuizForge — Privacy-first quiz practice' : isTutorialPage ? 'QuizForge Tutorial — Build a question booklet from Google Sheets' : isDonationPage ? 'Support QuizForge — Donate securely' : isAiGeneratorPage ? 'AI Question Generator — QuizForge' : 'QuizForge — Practice smarter'
    const description = isPublicHome
      ? 'Create randomized practice quizzes from Google Sheets with QuizForge. Import question booklets, filter by subtopic and difficulty, and get detailed performance reports.'
      : isAboutPage
        ? 'Learn how QuizForge turns Google Sheets into organized, privacy-first practice tests with analytics and professional PDF reports.'
      : isTutorialPage
        ? 'Learn how to build a question booklet in Google Sheets, share it correctly, import it into QuizForge, and create your first practice test.'
      : isDonationPage
        ? 'Support QuizForge with an optional UPI donation. Scan the QR code or use the Pay now button to contribute.'
      : isAiGeneratorPage
        ? 'Customize a ready-to-copy NTA JEE Main prompt for Physics, Chemistry, and Mathematics questions, then import the generated question booklet into QuizForge.'
      : isNotFound
        ? 'The QuizForge page you are looking for could not be found.'
      : 'QuizForge practice workspace for question booklets, randomized tests, and detailed performance reports.'
    document.title = title
    const setMeta = (attribute, name, content) => {
      let meta = document.head.querySelector(`meta[${attribute}="${name}"]`)
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, name); document.head.appendChild(meta) }
      meta.setAttribute('content', content)
    }
    setMeta('name', 'description', description)
    setMeta('name', 'robots', isPublicPage ? 'index,follow,max-image-preview:large' : 'noindex,nofollow')
    setMeta('name', 'googlebot', isPublicPage ? 'index,follow,max-image-preview:large' : 'noindex,nofollow')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    const canonical = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
    let canonicalLink = document.head.querySelector('link[rel="canonical"]')
    if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink) }
    canonicalLink.href = canonical
    setMeta('property', 'og:url', canonical)
    let structuredData = document.getElementById('quizforge-structured-data')
    if (isPublicPage) {
      if (!structuredData) { structuredData = document.createElement('script'); structuredData.id = 'quizforge-structured-data'; structuredData.type = 'application/ld+json'; document.head.appendChild(structuredData) }
      const schema = [
        { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'QuizForge', applicationCategory: 'EducationalApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description },
      ]
      if (isAboutPage) schema.push({ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About QuizForge', description, mainEntity: { '@type': 'SoftwareApplication', name: 'QuizForge', applicationCategory: 'EducationalApplication' } })
      if (isTutorialPage) schema.push({ '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to build and use a QuizForge question booklet', description, step: [
        { '@type': 'HowToStep', name: 'Create the Google Sheet', text: 'Create a sheet with SN, Question, Option A, Option B, Option C, Option D, Answer, Difficulty Level, Subtopic, and Speciality columns.' },
        { '@type': 'HowToStep', name: 'Share the sheet', text: 'Set General access to Anyone with the link and choose Viewer, then copy the normal Google Sheets URL.' },
        { '@type': 'HowToStep', name: 'Import the booklet', text: 'Open QuizForge, choose Import questions, paste the link, preview the questions, and save the booklet in a group.' },
        { '@type': 'HowToStep', name: 'Configure a test', text: 'Choose a booklet or the whole question bank, set filters and test settings, and start the practice test.' },
      ] })
      if (isDonationPage) schema.push({ '@context': 'https://schema.org', '@type': 'DonateAction', name: 'Support QuizForge', description, recipient: { '@type': 'Organization', name: 'QuizForge' } })
      if (isPublicHome) schema.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
          { '@type': 'Question', name: 'Can QuizForge import a Google Sheet?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Share the Google Sheet with anyone who has the link as a Viewer, then paste the normal Google Sheets URL into QuizForge.' } },
          { '@type': 'Question', name: 'Do I need to publish my Google Sheet to the web?', acceptedAnswer: { '@type': 'Answer', text: 'No. QuizForge reads a view-only Google Sheets link through Google’s Visualization datasource.' } },
          { '@type': 'Question', name: 'What question bank columns does QuizForge support?', acceptedAnswer: { '@type': 'Answer', text: 'Use SN, Question, Option A, Option B, Option C, Option D, Answer, Difficulty Level, Subtopic, and Speciality. Explanation, Marks, and Negative Marks are optional.' } },
        ] })
      structuredData.textContent = JSON.stringify(schema)
    } else if (structuredData) structuredData.remove()
  }, [location.pathname])
  return null
}

function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer-inner"><Logo withText className="footer-logo"/><nav className="site-footer-links" aria-label="Footer navigation"><NavLink to="/tutorial">Tutorial</NavLink><NavLink to="/feedback">Feedback</NavLink><NavLink to="/about">About</NavLink><NavLink to="/donate">Donate</NavLink><a href="https://www.linkedin.com/in/umesh-goyal-a1215123a/" target="_blank" rel="noreferrer">Developer LinkedIn ↗</a></nav><div className="footer-legal"><span>Made with <span className="footer-heart" aria-label="love">♥</span> in India</span><span>© {new Date().getFullYear()} QuizForge</span></div></div></footer>
}

function getPageCrumb(pathname) {
  if (pathname === '/') return {parent: 'Dashboard', child: 'Overview', to: '/'}
  if (pathname === '/import') return {parent: 'Question booklets', child: 'Import questions', to: '/banks'}
  if (pathname === '/banks') return {parent: 'Question booklets', child: 'Your library', to: '/banks'}
  if (pathname.startsWith('/configure/')) return {parent: 'Question booklets', child: 'Configure test', to: '/banks'}
  if (pathname.startsWith('/manage/')) return {parent: 'Question booklet', child: 'Manage questions', to: '/banks'}
  if (pathname.startsWith('/quiz/')) return {parent: 'Practice test', child: 'Quiz', to: '/'}
  if (pathname.startsWith('/results/')) return {parent: 'Results', child: 'Performance report', to: '/history'}
  if (pathname === '/history') return {parent: 'History', child: 'Test history', to: '/history'}
  if (pathname === '/performance') return {parent: 'Performance', child: 'Analytics', to: '/performance'}
  if (pathname === '/ai-generator') return {parent: 'AI tools', child: 'Question generator', to: '/ai-generator'}
  if (pathname === '/donate') return {parent: 'Support QuizForge', child: 'Donate', to: '/donate'}
  if (pathname === '/settings') return {parent: 'Settings', child: 'Preferences', to: '/settings'}
  if (pathname === '/about') return {parent: 'About QuizForge', child: 'Our purpose', to: '/about'}
  if (pathname === '/tutorial') return {parent: 'Tutorial', child: 'Build a question booklet', to: '/tutorial'}
  if (pathname === '/feedback') return {parent: 'Feedback', child: 'Send your feedback', to: '/feedback'}
  return {parent: 'QuizForge', child: 'Page not found', to: '/'}
}

function Topbar({dark, settings, updateSettings, setMobileNav}) {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const crumb = getPageCrumb(location.pathname)
  useEffect(() => {
    const threshold = location.pathname === '/' ? 330 : 90
    const updateScrollState = () => setScrolled(window.scrollY > threshold)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, {passive: true})
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [location.pathname])
  const showWelcome = location.pathname === '/' && !scrolled
  return <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb" aria-live="polite">{showWelcome ? <span className="welcome-message"><span aria-hidden="true">👋</span> Welcome to Quiz Forge Learner</span> : <><NavLink to={crumb.to}>{crumb.parent}</NavLink><span>/</span><strong>{crumb.child}</strong></>}</div><div className="top-actions"><span className="local-badge"><span/> Local mode</span><button className="icon-btn" title="Toggle theme" onClick={() => updateSettings({...settings, theme: dark ? 'light' : 'dark'})}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
}

function SideLink({to, icon, label, close}) {
  return <NavLink to={to} end={to === '/'} onClick={close} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>{icon}<span>{label}</span></NavLink>
}
function WorkspaceLoader() {
  return <div className="workspace-loader" role="status" aria-live="polite"><div className="loader-visual"><div className="loader-orbit loader-orbit-one"/><div className="loader-orbit loader-orbit-two"/><div className="loader-star loader-star-one">✦</div><div className="loader-star loader-star-two">✦</div><div className="loader-logo-wrap"><Logo/><span className="loader-spark">✦</span></div></div><h1>Getting things ready<span className="loader-dots" aria-hidden="true">...</span></h1><p>Preparing your QuizForge workspace</p><div className="loader-progress" aria-hidden="true"><span/></div><small>Your question booklets stay in this browser.</small></div>
}
function PageTitle({eyebrow, title, description, action}) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
function Dashboard({banks, attempts, navigate}) {
  const average = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.result.accuracy, 0) / attempts.length) : 0
  const questionCount = banks.reduce((total, booklet) => total + booklet.questions.length, 0)
  return <>
    <section className="hero-card"><div className="hero-copy"><div className="hero-kicker"><span className="sparkle">✦</span> GOOGLE SHEETS QUIZ MAKER</div><h1>Create practice quizzes<br/>from <em>Google Sheets.</em></h1><p>Import question booklets, build randomized practice tests, and use detailed analytics to turn every study session into measurable progress.</p><div className="hero-actions"><button className="btn btn-primary" onClick={() => navigate(banks.length ? `/configure/${banks[0].id}` : '/import')}><Play size={16} fill="currentColor"/> Start a test <ArrowRight size={16}/></button><button className="btn btn-secondary" onClick={() => navigate('/import')}><Plus size={17}/> Import booklet</button></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card"><div className="art-card-top"><span className="art-dot"/><span className="art-dot"/><span className="art-dot"/></div><div className="art-question">Which concept helps objects take many forms?</div><div className="art-option selected"><span>A</span> Polymorphism <CheckCircle2 size={15}/></div><div className="art-option"><span>B</span> Encapsulation</div><div className="art-option"><span>C</span> Compilation</div><div className="art-progress"><span/></div><div className="art-caption">A little progress, every day.</div></div><div className="floating-score"><span>✦</span><div><b>Keep it up!</b><small>Consistency wins</small></div></div></div></section>
    <div className="section-heading"><div><h2>Your overview</h2><p>A snapshot of your learning activity.</p></div></div>
    <div className="stats-grid">
      <Stat icon={<BookOpen/>} label="Question bank" value={questionCount} note={`${banks.length} question booklet${banks.length===1?'':'s'}`} color="purple"/>
      <Stat icon={<FileText/>} label="Tests completed" value={attempts.length} note="Your practice history" color="blue"/>
      <Stat icon={<ChartNoAxesCombined/>} label="Average accuracy" value={`${average}%`} note={attempts.length ? 'Across completed tests' : 'Complete a test to see this'} color="green"/>
      <Stat icon={<Clock3/>} label="Practice time" value={formatDuration(attempts.reduce((s,a) => s + a.result.timeSeconds, 0))} note="Time spent practicing" color="orange"/>
    </div>
    <div className="content-grid"><section className="panel"><div className="panel-head"><div><h3>Your question booklets</h3><p>Pick up where you left off.</p></div><button className="text-btn" onClick={() => navigate('/banks')}>View all <ArrowRight size={14}/></button></div>{banks.length ? banks.slice(0,4).map(bank => <BankRow key={bank.id} bank={bank} onClick={() => navigate(`/configure/${bank.id}`)}/>) : <Empty icon={<FileSpreadsheet/>} title="No question booklets yet" text="Import a Google Sheet to create your first practice test." action="Import booklet" onClick={() => navigate('/import')}/>}</section>
      <section className="panel"><div className="panel-head"><div><h3>Recent activity</h3><p>Your latest practice sessions.</p></div><button className="text-btn" onClick={() => navigate('/history')}>See history <ArrowRight size={14}/></button></div>{attempts.length ? attempts.slice(0,4).map(a => <div className="activity-row" key={a.id}><div className="activity-icon"><FileText size={17}/></div><div className="activity-main"><b>{a.bankName}</b><small>{new Date(a.completedAt).toLocaleDateString()} · {a.result.total} questions</small></div><strong>{a.result.accuracy}%</strong></div>) : <Empty icon={<Clock3/>} title="Nothing here yet" text="Your completed tests will appear here."/>}</section></div>
    <section className="seo-content" aria-labelledby="seo-overview-title"><div className="seo-intro"><div className="eyebrow">PRACTICE WITH PURPOSE</div><h2 id="seo-overview-title">A simple question bank and quiz maker for focused study</h2><p>QuizForge helps students, teachers, interview candidates, and self-learners turn a structured Google Sheet into reusable practice tests. Choose one question booklet or combine every booklet into a single question bank.</p></div><div className="seo-grid"><article><h3>Import a question booklet</h3><p>Share your Google Sheet as <strong>Anyone with the link → Viewer</strong>, paste the normal Sheets URL, and preview the questions before saving them locally.</p></article><article><h3>Practice with useful filters</h3><p>Select subtopics and difficulty levels from the imported sheet, then set question count, time limit, marks, and negative marking.</p></article><article><h3>Review detailed performance</h3><p>After a test, review correct, incorrect, and skipped questions with subtopic analytics, difficulty analytics, timing, explanations, and a downloadable PDF report.</p></article></div><section className="seo-format"><h2>Google Sheets question bank format</h2><p>Use one header row with these required columns. Header matching is case-insensitive.</p><div className="seo-table-wrap"><table><thead><tr><th>Column</th><th>Purpose</th></tr></thead><tbody><tr><td>SN</td><td>Question number or ID</td></tr><tr><td>Question</td><td>Question text</td></tr><tr><td>Option A–D</td><td>Four answer choices</td></tr><tr><td>Answer</td><td>Correct option: A, B, C, or D</td></tr><tr><td>Difficulty Level</td><td>Difficulty value, including 1–5</td></tr><tr><td>Subtopic</td><td>Topic used for filtering and analytics</td></tr></tbody></table></div><p className="seo-note">Explanation, Marks, and Negative Marks are optional. QuizForge stores imported data in this browser and does not require an account.</p></section><section className="seo-faq"><h2>Frequently asked questions</h2><details><summary>Can QuizForge import a Google Sheet?</summary><p>Yes. Share the Google Sheet with anyone who has the link as a Viewer, then paste the normal Google Sheets URL into QuizForge.</p></details><details><summary>Do I need to publish my Google Sheet to the web?</summary><p>No. QuizForge reads a view-only Google Sheets link through Google’s Visualization datasource. A private Sheet still requires an authenticated backend.</p></details><details><summary>What question bank columns does QuizForge support?</summary><p>Use SN, Question, Option A, Option B, Option C, Option D, Answer, Difficulty Level, and Subtopic. Explanation, Marks, and Negative Marks are optional.</p></details></section></section><div className="footnote"><span className="privacy-dot"/> Your data is stored locally in this browser. No account needed.</div>
  </>
}

function AboutPage({navigate}) {
  return <div className="about-page"><PageTitle eyebrow="ABOUT QUIZFORGE" title="Practice smarter from the question bank you already own." description="QuizForge turns Google Sheets into organized, privacy-first practice tests with useful analytics and professional reports." action={<button className="btn btn-primary" onClick={()=>navigate('/import')}><Plus size={16}/> Try QuizForge</button>}/><section className="about-hero panel"><div className="about-hero-copy"><div className="hero-kicker">OUR PURPOSE</div><h2>Make deliberate practice easier to start, easier to manage, and easier to learn from.</h2><p>Most people already have questions in spreadsheets, notes, or classroom files. QuizForge gives those questions a focused practice experience without forcing you into a new content system, a complicated LMS, or an account-first workflow.</p></div><figure className="about-hero-visual"><img src="https://images.unsplash.com/photo-1759984782211-3a02ca78e6ac?auto=format&fit=crop&w=1200&q=82" alt="Student studying with a laptop and handwritten notes" loading="lazy" decoding="async"/><figcaption>Sheets → Practice → Progress</figcaption></figure></section><section className="about-section"><div className="about-section-heading"><div className="eyebrow">WHY QUIZFORGE</div><h2>A practical layer between your question bank and your next breakthrough.</h2><p>QuizForge is designed around the moments that matter: getting started quickly, staying in control of your material, and knowing what to improve next.</p></div><div className="about-value-grid"><article className="about-card"><div className="about-icon"><FileSpreadsheet size={20}/></div><h3>Bring the Sheet you already use</h3><p>Import a structured Google Sheet as a question booklet in minutes. Your existing content remains the source you control.</p></article><article className="about-card"><div className="about-icon"><BookOpen size={20}/></div><h3>Practice with control</h3><p>Group booklets, combine them into a whole question bank, filter by subtopic and difficulty, and shuffle every attempt.</p></article><article className="about-card"><div className="about-icon"><ChartNoAxesCombined size={20}/></div><h3>Turn attempts into insight</h3><p>Review correct, incorrect, and skipped answers with timing, subtopic analytics, difficulty analytics, and explanations.</p></article><article className="about-card"><div className="about-icon"><CheckCircle2 size={20}/></div><h3>Share a professional result</h3><p>Generate polished PDF reports for personal tracking, tutoring records, classroom feedback, or internal training evidence.</p></article></div></section><section className="about-visual-story"><figure><img src="https://images.unsplash.com/photo-1758685848174-e061c6486651?auto=format&fit=crop&w=1200&q=82" alt="Teacher working on a laptop in a classroom" loading="lazy" decoding="async"/><figcaption>One question bank can support a whole learning workflow.</figcaption></figure><div><div className="eyebrow">FROM CONTENT TO CONFIDENCE</div><h2>Keep the content familiar. Improve the practice around it.</h2><p>Students can work from their own notes. Teachers and tutors can maintain a trusted master Sheet. Coaches can deliver practice packs without building a learning platform from scratch. QuizForge adds the structure, feedback, and polish around content people already understand.</p></div></section><section className="about-section about-workflow"><div className="about-section-heading"><div className="eyebrow">HOW IT WORKS</div><h2>From spreadsheet to focused test in four steps.</h2></div><div className="about-steps"><div><span>01</span><h3>Prepare</h3><p>Use the question-bank columns for question text, four options, answer, difficulty, and subtopic.</p></div><div><span>02</span><h3>Import</h3><p>Share the Sheet as Viewer access, paste the normal Google Sheets link, and preview the questions.</p></div><div><span>03</span><h3>Configure</h3><p>Choose a booklet or the whole bank, then set filters, question count, time, marks, and shuffling.</p></div><div><span>04</span><h3>Improve</h3><p>Use answer review and analytics to focus your next practice session on the areas that need it most.</p></div></div></section><section className="about-section"><div className="about-section-heading"><div className="eyebrow">BUILT FOR REAL PRACTICE</div><h2>Useful for independent learners and the people who support them.</h2></div><div className="about-audience-grid"><article><h3>Students and exam aspirants</h3><p>Turn chapter-wise, subject-wise, or large competitive-exam question banks into timed mock tests and weak-area review.</p></article><article><h3>Teachers and tutors</h3><p>Keep a master Sheet, create differentiated practice, and export clean reports without setting up an LMS.</p></article><article><h3>Homeschooling families</h3><p>Maintain private subject booklets, adapt difficulty by learner, and keep printable progress records.</p></article><article><h3>Corporate training teams</h3><p>Use sensitive onboarding, compliance, product, or skills content in a zero-friction browser workflow.</p></article><article><h3>Course creators and coaches</h3><p>Give learners a polished practice experience from a simple question-bank Sheet instead of building quiz infrastructure from scratch.</p></article><article><h3>Language and knowledge learners</h3><p>Use vocabulary, grammar, interview, technical, medical, or personal knowledge banks for active recall.</p></article></div></section><section className="about-trust panel"><div className="about-trust-visual"><img src="https://images.unsplash.com/photo-1667372283496-893f0b1e7c16?auto=format&fit=crop&w=700&q=82" alt="Padlock and data layers representing browser privacy" loading="lazy" decoding="async"/></div><div><div className="eyebrow">PRIVACY BY DESIGN</div><h2>Your practice data stays close to you.</h2><p>QuizForge stores question booklets, attempts, settings, and unfinished quizzes in the browser using IndexedDB and LocalStorage. There is no account requirement and no cloud dashboard collecting your test history. Because the app is local-first, export a backup before clearing browser data, and remember that refreshing a booklet from its Google Sheet replaces local question edits.</p></div></section><p className="about-image-credit">Visuals: Unsplash images by Julio Lopez, Vitaly Gariev, and Growtika. Used under the Unsplash License.</p><section className="about-cta"><h2>Ready to turn your question bank into better practice?</h2><p>Start with the Sheet you already have.</p><button className="btn btn-primary" onClick={()=>navigate('/import')}><Upload size={16}/> Import a question booklet</button></section></div>
}

function PrivacyDetails() {
  return <section className="about-privacy-details"><div className="about-section-heading"><div className="eyebrow">YOUR PRIVACY, IN PLAIN LANGUAGE</div><h2>You stay in control of your learning data.</h2><p>QuizForge is designed to be useful without asking for a login. Here is what that means in practice.</p></div><div className="privacy-detail-grid"><article className="privacy-detail-card"><h3>What is stored locally</h3><p>Imported question booklets, booklet groups, local question edits, unfinished tests, completed attempts, settings, and generated report data are stored in this browser profile.</p></article><article className="privacy-detail-card"><h3>What leaves the browser</h3><p>When you import a booklet, QuizForge requests the shared, view-only Google Sheet link from Google. Google processes that request under its own services and policies.</p></article><article className="privacy-detail-card"><h3>No account or study profile</h3><p>QuizForge does not require a sign-in and does not send your scores, answers, timing, or analytics to a QuizForge account or dashboard.</p></article><article className="privacy-detail-card"><h3>Your controls</h3><p>Use Settings to export a backup, reset history, restore a backup, or delete all local QuizForge data. Clear browser site data also removes locally stored information.</p></article><article className="privacy-detail-card"><h3>Shared-device reminder</h3><p>Anyone who can access the same browser profile may be able to use its local QuizForge data. Use a separate browser profile or clear local data on shared devices.</p></article><article className="privacy-detail-card"><h3>Keep Sheet content appropriate</h3><p>Only share a Sheet you are comfortable making available through its link. Use Viewer access, avoid passwords or sensitive personal information in questions, and export reports carefully.</p></article></div><div className="privacy-disclosure"><b>Important:</b> Refreshing a question booklet replaces its local question edits with the current Sheet contents. Backups are downloaded to your device, so protect them like any other file containing learning records.</div></section>
}

function SecurityGuidance() {
  return <section className="security-guidance"><div className="about-section-heading"><div className="eyebrow">USER SECURITY</div><h2>Simple habits keep your question bank safer.</h2><p>Privacy is strongest when the Sheet, browser, device, and exported files are protected together.</p></div><div className="security-guidance-grid"><article className="security-guidance-card"><span>01</span><h3>Share only what you intend to share</h3><p>For QuizForge imports, use <b>Anyone with the link → Viewer</b>. Do not place passwords, API keys, private student records, or other sensitive information in a publicly accessible question Sheet.</p></article><article className="security-guidance-card"><span>02</span><h3>Use a trusted device and browser</h3><p>Keep your operating system and browser updated, use a screen lock, and avoid importing private material on public computers or shared browser profiles.</p></article><article className="security-guidance-card"><span>03</span><h3>Protect backups and reports</h3><p>Exported JSON backups and PDF reports may contain your questions and performance history. Store them in a private folder and do not upload or share them casually.</p></article><article className="security-guidance-card"><span>04</span><h3>Check links before you paste</h3><p>Only import a Google Sheet you recognize. QuizForge never needs your Google password; if a page asks for credentials unexpectedly, close it and verify the address before continuing.</p></article></div><div className="security-note"><b>Security boundary:</b> QuizForge protects its local-first workflow, but browser extensions, malware, compromised devices, Google account settings, and publicly shared Sheets are outside the app’s control.</div></section>
}

function SecurityVisual() {
  return <section className="security-visual panel"><figure><img src="https://images.unsplash.com/photo-1667372283496-893f0b1e7c16?auto=format&fit=crop&w=900&q=82" alt="Padlock representing protected personal data" loading="lazy" decoding="async"/></figure><div><div className="eyebrow">LOCAL BY DESIGN</div><h2>Your practice stays on your device.</h2><p>QuizForge runs in your browser, keeping your question booklets, answers, and progress in local browser storage so you can stay informed and in control.</p></div></section>
}

function LegalDisclaimer() {
  return <section className="legal-disclaimer" aria-labelledby="legal-disclaimer-title"><div className="eyebrow">PRIVACY AND LOCAL STORAGE</div><h2 id="legal-disclaimer-title">QuizForge is a static, local-first web app.</h2><p>QuizForge runs in your browser and does not require an account. It does not collect, sell, or send your question booklets, answers, scores, attempts, settings, or reports to a QuizForge server.</p><p>Your QuizForge data is stored locally on your device using browser storage. This means we cannot view it, access it, or recover it for you. When you import a booklet, your browser reads the public, view-only Google Sheet link directly; Google’s own services and policies apply to that request.</p><p>Please keep your browser and device secure and export backups when needed. To the maximum extent permitted by applicable law, QuizForge and its developer are not responsible for data loss, device or browser problems, third-party service issues, or content and decisions based on user-provided questions and results.</p><small>This is a plain-language product notice, not legal advice. It does not remove any rights or protections that applicable law does not allow to be excluded.</small></section>
}

function DeveloperSection() {
  return <section id="developer-profile" className="developer-section panel"><div className="developer-avatar">UG</div><div className="developer-copy"><div className="eyebrow">MEET THE DEVELOPER</div><h2>Umesh Kumar Goyal</h2><p className="developer-role">Backend Developer · Kota, Rajasthan</p><p>Umesh is a computer science engineer who works across backend development, web applications, databases, and practical business tools. QuizForge brings together his interest in question-based learning, web development, analytics, and simple workflows that help people turn their own content into useful practice.</p><div className="developer-tags"><span>Java</span><span>PHP</span><span>Python</span><span>MySQL</span><span>Web Development</span><span>LinkedIn</span></div><div className="developer-projects"><div><b>Selected experience</b><small>Web development internship, customer support systems, supply-chain tools, and business operations software.</small></div><div><b>Selected projects</b><small>Quiz application, e-commerce web app, and practical business tools.</small></div><div><b>Education</b><small>B.Tech in Computer Science & Engineering.</small></div></div><div className="developer-actions"><a className="btn btn-primary btn-small" href="https://www.linkedin.com/in/umesh-goyal-a1215123a/" target="_blank" rel="noreferrer">View LinkedIn profile ↗</a><a className="btn btn-secondary btn-small" href="mailto:goyal.busi@gmail.com">Contact developer</a></div></div></section>
}

function TutorialPage({navigate,toast}) {
  const [copied,setCopied] = useState(false)
  const headers = 'SN\tQuestion\tOption A\tOption B\tOption C\tOption D\tAnswer\tDifficulty Level\tSubtopic\tSpeciality'
  async function copyHeaders() {
    try {
      await navigator.clipboard.writeText(headers)
      setCopied(true)
      toast('Question booklet headers copied.')
      window.setTimeout(() => setCopied(false), 2400)
    } catch { toast('Copy failed. Select the header row manually.') }
  }
  return <div className="tutorial-page"><PageTitle eyebrow="QUIZFORGE TUTORIAL" title="Build your first question booklet from Google Sheets." description="Follow this guide to prepare your questions, upload the Sheet, import it into QuizForge, and create a focused practice test." action={<div className="page-actions"><button className="btn btn-secondary" onClick={()=>navigate('/about')}>About QuizForge</button><button className="btn btn-primary" onClick={()=>navigate('/import')}><Upload size={16}/> Import a booklet</button></div>}/><section className="tutorial-hero panel"><div><div className="eyebrow">THE COMPLETE WORKFLOW</div><h2>Sheet → Question booklet → Practice test → Analytics</h2><p>You keep ownership of the question content in Google Sheets. QuizForge adds the organization, test experience, feedback, and report around it.</p></div><div className="tutorial-flow"><span>1<br/><small>Build</small></span><i>→</i><span>2<br/><small>Share</small></span><i>→</i><span>3<br/><small>Import</small></span><i>→</i><span>4<br/><small>Practice</small></span></div></section><section className="tutorial-section"><div className="tutorial-section-heading"><div className="eyebrow">STEP 1</div><h2>Create the Google Sheet question bank</h2><p>Start with a blank Google Sheet or your existing question bank. Put one question per row and keep the first row as the header row.</p></div><div className="tutorial-template panel"><div className="panel-head"><div><h3>Required header row</h3><p>Copy this tab-separated row directly into cell A1.</p></div><button className="btn btn-secondary btn-small" onClick={copyHeaders}>{copied?'Copied':'Copy headers'}</button></div><code>{headers.split('\t').join('  |  ')}</code><div className="tutorial-table-wrap"><table><thead><tr><th>SN</th><th>Question</th><th>Option A</th><th>Option B</th><th>Option C</th><th>Option D</th><th>Answer</th><th>Difficulty Level</th><th>Subtopic</th></tr></thead><tbody><tr><td>1</td><td>What is 2 + 2?</td><td>3</td><td>4</td><td>5</td><td>6</td><td>B</td><td>1</td><td>Arithmetic</td></tr><tr><td>2</td><td>Which is a planet?</td><td>Moon</td><td>Sun</td><td>Earth</td><td>Cloud</td><td>C</td><td>2</td><td>Science</td></tr></tbody></table></div><div className="tutorial-note"><b>Optional columns:</b> Explanation, Marks, and Negative Marks. Answers must be the option letter A, B, C, or D. Difficulty values 1–5 display as Beginner, Basic, Intermediate, Advanced, and Expert.</div></div></section><section className="tutorial-section tutorial-two-column"><article className="tutorial-step-card"><div className="tutorial-step-number">02</div><h3>Fill in each question row</h3><ol><li>Write the full question in <b>Question</b>.</li><li>Fill all four choices in <b>Option A</b> through <b>Option D</b>.</li><li>Put only the correct option letter in <b>Answer</b>.</li><li>Use a clear <b>Subtopic</b> such as Algebra, Biology, or Grammar.</li><li>Use a numeric difficulty from 1 to 5 or a readable label.</li></ol></article><article className="tutorial-step-card"><div className="tutorial-step-number">03</div><h3>Check the Sheet before sharing</h3><ul><li>Remove blank question rows.</li><li>Make sure every question has four options.</li><li>Check that each answer is A, B, C, or D.</li><li>Keep the header names in the first row.</li><li>Use one tab at a time; the selected tab is imported.</li></ul></article></section><section className="tutorial-section"><div className="tutorial-section-heading"><div className="eyebrow">STEP 2</div><h2>Share the Google Sheet correctly</h2><p>QuizForge reads a public, view-only Sheet link. You do not need to publish the Sheet to the web.</p></div><div className="tutorial-checklist panel"><div className="tutorial-check"><span>1</span><div><b>Open Share</b><p>In Google Sheets, click the <b>Share</b> button.</p></div></div><div className="tutorial-check"><span>2</span><div><b>Change General access</b><p>Choose <b>Anyone with the link</b>.</p></div></div><div className="tutorial-check"><span>3</span><div><b>Choose Viewer</b><p>Keep the permission as <b>Viewer</b>; QuizForge only needs to read the tab.</p></div></div><div className="tutorial-check"><span>4</span><div><b>Copy the normal link</b><p>Copy a URL like <code>https://docs.google.com/spreadsheets/d/…</code> and keep the tab’s <b>gid</b> if you are using a specific tab.</p></div></div></div><div className="tutorial-warning"><b>Important:</b> A private Sheet, a link that requires sign-in, or a link shared as Editor-only to a restricted audience cannot be read by QuizForge.</div></section><section className="tutorial-section"><div className="tutorial-section-heading"><div className="eyebrow">STEP 3</div><h2>Import the question booklet into QuizForge</h2><p>Once the Sheet is shared, the rest of the workflow happens inside the website.</p></div><div className="tutorial-steps-grid"><article><span>01</span><h3>Open Import questions</h3><p>Use the sidebar or the Import booklet button on the dashboard.</p></article><article><span>02</span><h3>Paste the Sheet URL</h3><p>Paste the normal Google Sheets link and choose Import booklet and preview.</p></article><article><span>03</span><h3>Review the preview</h3><p>Confirm that the question text, options, answer, subtopic, and difficulty look correct.</p></article><article><span>04</span><h3>Name and group it</h3><p>Save the booklet with a useful name and place it in a reusable group such as JEE, Biology, or Interview Prep.</p></article></div></section><section className="tutorial-section"><div className="tutorial-section-heading"><div className="eyebrow">STEP 4</div><h2>Use the booklet to build a test</h2></div><div className="tutorial-use panel"><div><h3>Choose your scope</h3><p>Select a single question booklet or choose <b>Whole question bank</b> to combine every imported booklet.</p></div><div><h3>Focus the practice</h3><p>Select subtopics and difficulty levels detected from the selected scope. Numeric difficulty levels use the QuizForge vocabulary.</p></div><div><h3>Set the test rules</h3><p>Choose question count, duration, positive marks, negative marks, question shuffling, and option shuffling.</p></div><div><h3>Start and learn</h3><p>Answer the test, review the correct answer after submission, inspect analytics, and download the detailed PDF report.</p></div></div><div className="tutorial-actions"><button className="btn btn-primary" onClick={()=>navigate('/import')}><Upload size={16}/> Start by importing a booklet</button><button className="btn btn-secondary" onClick={()=>navigate('/banks')}>View question booklets</button></div></section><section className="tutorial-section tutorial-help"><div className="tutorial-section-heading"><div className="eyebrow">TROUBLESHOOTING</div><h2>If QuizForge cannot read your Sheet</h2></div><details><summary>“Could not read this sheet”</summary><p>Open Google Sheets sharing, set General access to Anyone with the link, choose Viewer, and paste the normal Sheet URL again. Publishing to the web is not required.</p></details><details><summary>“No valid questions found”</summary><p>Check that the first row contains the required headers, all four option columns are filled, and every answer is exactly A, B, C, or D.</p></details><details><summary>Subtopics or difficulty values are missing</summary><p>Use the exact headers Subtopic and Difficulty Level. Remove blank cells if you want every question to appear in the corresponding filter.</p></details></section></div>
}

function AiQuestionGeneratorPage({navigate,toast}) {
  const promptRef = useRef(null)
  const [batchSize,setBatchSize] = useState(50)
  const [startSn,setStartSn] = useState(1)
  const [subjectFocus,setSubjectFocus] = useState('Physics, Chemistry, and Mathematics (equal 1:1:1 split)')
  const [outputFormat,setOutputFormat] = useState('Semicolon-delimited CSV')
  const generatedPrompt = `Act as a senior NTA JEE Main paper setter and subject matter expert in Physics, Chemistry, and Mathematics. Generate ${batchSize} unique, conceptually sound, and mathematically verified multiple-choice questions (MCQs) aligned with the latest NTA JEE Main syllabus and exam pattern for ${subjectFocus}.

STRICT OUTPUT SCHEMA & COLUMN RULES
Output the data strictly as a clean ${outputFormat === 'Semicolon-delimited CSV' ? 'semicolon-delimited CSV' : 'Markdown table'} with the following 10 exact column headers in order:
1. sn: Sequential integer starting from ${startSn}.
2. question: Clear, exam-grade JEE Main MCQ with standard ASCII/LaTeX notation for formulas, units, and boundary conditions.
3. option A: First option (concise numerical value, algebraic expression, or statement).
4. option B: Second option.
5. option C: Third option.
6. option D: Fourth option.
7. answer(A,B,C,D): Single uppercase letter (A, B, C, or D) representing the verified correct answer. Maintain an even distribution across A, B, C, and D.
8. Difficulty level(1,2,3,4,5-most difficult): Single integer from 1 to 5 (1 = Direct formula/definition, 2 = Single-concept application, 3 = Standard JEE Main multi-step problem, 4 = Mixed-concept analytical problem, 5 = High-difficulty multi-concept numerical/assertion problem).
9. subtopic option: Formatted strictly as Subject - Chapter/Topic, such as Physics - Rotational Motion, Chemistry - Coordination Compounds, or Mathematics - Definite Integration.
10. speciality: Historical JEE Main recurrence trend for that chapter/concept formatted strictly as JEE Main - year, year and year, for example JEE Main - 2021, 2023 and 2025.

QUALITY & ACCURACY CONSTRAINTS
- Verify all calculations, signs, units, and constants (for example, g = 10 m/s^2 and R = 8.314 J/mol.K) before finalizing the answer key.
- Design distractors based on common student calculation errors, such as missing a factor of 2, sign inversion, or unit mismatch.
- Do not repeat concepts or problems within the batch.
- Output ONLY the table or CSV with no introductory or concluding text so it can be pasted directly into Excel.
- For semicolon-delimited CSV, use semicolons between all 10 columns and do not use semicolons inside cell values.`
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      toast('AI question-generation prompt copied.')
    } catch {
      promptRef.current?.select()
      toast('Copy was unavailable. The prompt is selected—press Ctrl+C to copy it.')
    }
  }
  function resetPrompt() {
    setBatchSize(50); setStartSn(1); setSubjectFocus('Physics, Chemistry, and Mathematics (equal 1:1:1 split)'); setOutputFormat('Semicolon-delimited CSV')
  }
  return <div className="ai-generator-page"><PageTitle eyebrow="AI QUESTION GENERATOR" title="Generate JEE Main question batches." description="Customize the NTA JEE Main prompt, copy it into your preferred AI tool, then import the generated question booklet into QuizForge." action={<div className="page-actions"><button className="btn btn-secondary" onClick={resetPrompt}><RotateCcw size={15}/> Reset</button><button className="btn btn-primary" onClick={copyPrompt}><Copy size={15}/> Copy prompt</button></div>}/><div className="ai-generator-layout"><section className="panel ai-settings-panel"><div className="panel-head"><div><h3>Prompt settings</h3><p>These values replace the placeholders in your JEE Main prompt.</p></div><span className="ai-badge"><Sparkles size={13}/> NTA JEE Main</span></div><div className="form-grid"><div><label>Batch size</label><input type="number" min="1" max="500" value={batchSize} onChange={e=>setBatchSize(Math.max(1,Math.min(500,Number(e.target.value)||1)))}/><small>Questions to request</small></div><div><label>Starting SN</label><input type="number" min="1" value={startSn} onChange={e=>setStartSn(Math.max(1,Number(e.target.value)||1))}/><small>First serial number</small></div></div><label>Subject focus</label><textarea className="ai-settings-textarea" value={subjectFocus} onChange={e=>setSubjectFocus(e.target.value)} rows="3" placeholder="Physics, Chemistry, and Mathematics (equal 1:1:1 split)"/><small className="ai-field-note">Example: Physics - Electrostatics &amp; Current Electricity</small><label>Output format</label><select className="ai-wide-input" value={outputFormat} onChange={e=>setOutputFormat(e.target.value)}><option>Semicolon-delimited CSV</option><option>Markdown table</option></select><div className="ai-schema-note"><b>JEE Main question-bank columns</b><span>SN · Question · Option A · Option B · Option C · Option D · Answer · Difficulty Level · Subtopic · Speciality</span></div></section><section className="panel ai-prompt-panel"><div className="panel-head"><div><h3>Your generated prompt</h3><p>Copy this prompt into ChatGPT, Gemini, Claude, or another AI tool.</p></div><button className="btn btn-secondary btn-small" onClick={copyPrompt}><Copy size={14}/> Copy</button></div><textarea ref={promptRef} className="ai-prompt-textarea" value={generatedPrompt} readOnly aria-label="Generated NTA JEE Main question prompt"/><p className="ai-privacy-note"><Sparkles size={14}/> QuizForge does not call an AI service or upload your question data. You choose where to paste this prompt.</p></section></div><section className="panel ai-next-steps"><div className="ai-next-icon"><FileSpreadsheet size={20}/></div><div><h3>After the AI creates the questions</h3><p>Paste the semicolon-delimited output into Google Sheets, keep the 10 headers in order, share the sheet as <b>Anyone with the link → Viewer</b>, and import it as a Question Booklet.</p></div><button className="btn btn-primary btn-small" onClick={()=>navigate('/tutorial')}>See the Sheet tutorial <ArrowRight size={14}/></button></section></div>
}

function FeedbackPage() {
  const [form,setForm] = useState({name:'',email:'',type:'Product feedback',rating:'',message:''})
  function update(field,value) { setForm(current => ({...current,[field]:value})) }
  function submit(e) {
    e.preventDefault()
    const subject = encodeURIComponent(`[QuizForge feedback] ${form.type}`)
    const body = encodeURIComponent(`Name: ${form.name || 'Not provided'}\nEmail: ${form.email || 'Not provided'}\nFeedback type: ${form.type}\nRating: ${form.rating || 'Not provided'}\n\n${form.message}`)
    window.location.href = `mailto:goyal.busi@gmail.com?subject=${subject}&body=${body}`
  }
  return <div className="feedback-page"><PageTitle eyebrow="FEEDBACK" title="Help make QuizForge better." description="Share a bug, idea, question, or experience. Your default email app will open with the feedback addressed to the developer."/><div className="feedback-layout"><section className="panel feedback-panel"><div className="feedback-intro"><div className="feedback-mark"><FileText size={22}/></div><div><h2>Send your feedback</h2><p>Tell us what worked, what felt confusing, or what you would like to see next.</p></div></div><form className="feedback-form" onSubmit={submit}><label>Your name <span className="optional">(optional)</span></label><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Your name"/><label>Your email <span className="optional">(optional)</span></label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="you@example.com"/><div className="feedback-form-grid"><div><label>Feedback type</label><select value={form.type} onChange={e=>update('type',e.target.value)}><option>Product feedback</option><option>Bug report</option><option>Feature request</option><option>Question</option><option>Other</option></select></div><div><label>Rating <span className="optional">(optional)</span></label><select value={form.rating} onChange={e=>update('rating',e.target.value)}><option value="">Choose a rating</option><option>5 - Excellent</option><option>4 - Good</option><option>3 - Okay</option><option>2 - Needs improvement</option><option>1 - Poor</option></select></div></div><label>Your message</label><textarea required value={form.message} onChange={e=>update('message',e.target.value)} placeholder="Write your feedback here…"/><button className="btn btn-primary full-btn" type="submit">Open email to send feedback <ArrowRight size={16}/></button></form><p className="feedback-note">The form prepares an email to <a href="mailto:goyal.busi@gmail.com">goyal.busi@gmail.com</a>. Your email app must be configured on this device.</p></section><aside className="panel feedback-side"><div className="help-icon"><CheckCircle2 size={22}/></div><h3>What feedback helps most?</h3><ul><li>A specific step that was difficult to understand</li><li>A Google Sheets import error or unexpected result</li><li>A feature that would make practice easier</li><li>A short description of your use case</li></ul><div className="info-box">QuizForge is local-first. Please do not include private question-bank content or sensitive personal information in your message.</div></aside></div></div>
}

function DonationPage({toast}) {
  const upiId = '7297010496-1@okbizaxis'
  const paymentReference = useRef(`QF${Date.now()}${Math.random().toString(36).slice(2, 8)}`).current
  const paymentParams = new URLSearchParams({pa: upiId, pn: 'Vasu Goyal', tr: paymentReference, tn: 'QuizForge support', cu: 'INR'}).toString()
  const upiLink = `upi://pay?${paymentParams}`
  const androidIntentLink = `intent://pay?${paymentParams}#Intent;scheme=upi;action=android.intent.action.VIEW;end`
  const googlePayLink = `gpay://upi/pay?${paymentParams}`
  const phonePeLink = `intent://pay?${paymentParams}#Intent;scheme=upi;package=com.phonepe.app;end`
  const paytmLink = `intent://pay?${paymentParams}#Intent;scheme=upi;package=net.one97.paytm;end`
  const primaryPaymentLink = /Android/i.test(navigator.userAgent) ? androidIntentLink : upiLink
  const [copied, setCopied] = useState(false)
  function openPayment(event) {
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      event.preventDefault()
      toast('UPI payments open from a phone. On desktop, scan the QR code instead.')
    }
  }
  async function copyPaymentId() {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      toast('UPI payment ID copied.')
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      toast('Could not copy the UPI ID. Please scan the QR code instead.')
    }
  }
  function openSpecificApp(event) {
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      event.preventDefault()
      toast('Payment app buttons open from a phone. Use the QR code or any UPI app option here.')
    }
  }
  return <div className="donation-page"><PageTitle eyebrow="SUPPORT QUIZFORGE" title="Help keep learning simple." description="QuizForge is free to use. If it helps your practice, an optional donation supports its maintenance and future improvements." action={<a className="btn btn-primary" href={primaryPaymentLink} onClick={openPayment}><Heart size={16} fill="currentColor"/> Pay with UPI</a>}/><section className="donation-layout"><section className="donation-copy"><div className="donation-intro"><div className="donation-icon"><Heart size={22} fill="currentColor"/></div><div><h2>Support the project</h2><p>Every contribution helps keep QuizForge lightweight, privacy-first, and useful for learners.</p></div></div><div className="donation-points"><div><b>Free and local-first</b><span>No subscription or account is required to practice.</span></div><div><b>Small contributions matter</b><span>Your support helps with hosting, maintenance, and improvements.</span></div><div><b>Use any UPI app</b><span>Open the Android UPI chooser, use Google Pay, PhonePe, or Paytm.</span></div></div><div className="donation-actions"><a className="btn btn-primary pay-now-button" href={primaryPaymentLink} onClick={openPayment}><Heart size={16} fill="currentColor"/> Pay with any UPI app</a><button className="btn btn-secondary" type="button" onClick={copyPaymentId}><Copy size={15}/> {copied ? 'Copied' : 'Copy payment ID'}</button></div><div className="donation-app-options"><span className="donation-app-label">Choose a payment app</span><a className="payment-app-button googlepay" href={googlePayLink} onClick={openSpecificApp}><img src={`${import.meta.env.BASE_URL}google-pay.svg`} alt="Google Pay logo"/><span>Google Pay</span></a><a className="payment-app-button phonepe" href={phonePeLink} onClick={openSpecificApp}><img src={`${import.meta.env.BASE_URL}phonepe.svg`} alt="PhonePe logo"/><span>PhonePe</span></a><a className="payment-app-button paytm" href={paytmLink} onClick={openSpecificApp}><img src={`${import.meta.env.BASE_URL}paytm.svg`} alt="Paytm logo"/><span>Paytm</span></a></div><p className="donation-note">On Android, the first button opens the standard UPI app chooser. If your browser asks to open a payment app, approve that handoff. Direct app buttons require the app to be installed. On desktop, scan the QR code.</p></section><aside className="panel donation-card"><div className="donation-card-head"><div><h3>Scan &amp; pay</h3><p>Use Google Pay, Paytm, PhonePe, or another UPI app.</p></div><span className="donation-badge"><Heart size={13} fill="currentColor"/></span></div><div className="donation-qr-wrap"><div className="donation-qr-crop"><img src={`${import.meta.env.BASE_URL}donation-qr.png`} alt="UPI QR code for supporting QuizForge" loading="lazy" decoding="async"/></div></div><p className="donation-scan-label">Scan this QR code with your UPI app</p></aside></section></div>
}

function NotFoundPage({navigate}) {
  return <section className="not-found-page" aria-labelledby="not-found-title"><div className="not-found-copy"><div className="eyebrow">OOPS, WRONG TURN</div><h1 id="not-found-title">This page wandered off.</h1><p>We looked everywhere, but this QuizForge page does not exist. Let’s get you back to your question bank.</p><div className="not-found-actions"><button className="btn btn-primary" onClick={()=>navigate('/')}>Back to dashboard <ArrowRight size={16}/></button><button className="btn btn-secondary" onClick={()=>navigate(-1)}>Go back</button></div></div><div className="not-found-art" aria-hidden="true"><svg viewBox="0 0 440 280" role="presentation"><path className="not-found-ground" d="M45 224c65-19 111-1 176-4 69-3 117-27 174-4"/><circle className="not-found-planet" cx="220" cy="133" r="73"/><path className="not-found-planet-ring" d="M111 151c40 29 121 43 205 5 21-9 37-20 49-32"/><circle className="not-found-eye" cx="193" cy="126" r="5"/><circle className="not-found-eye" cx="247" cy="126" r="5"/><path className="not-found-smile" d="M194 151c15 15 36 15 51 0"/><path className="not-found-patch" d="M176 102c13-14 30-20 46-19"/><g className="not-found-rocket"><path d="M327 64c-17 9-27 27-29 47 20 1 38-8 48-25 7-12 7-25 6-32-7 1-16 4-25 10Z"/><path d="M299 111l-18 5 12-18M325 91l5 18 10-15"/><circle cx="332" cy="79" r="6"/><path d="M297 113c-7 7-9 15-8 23 8-2 15-6 19-13"/></g><g className="not-found-star star-one"><path d="M82 74v24M70 86h24"/></g><g className="not-found-star star-two"><path d="M356 170v18M347 179h18"/></g><g className="not-found-spark"><path d="M121 190l5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z"/></g><text className="not-found-number" x="220" y="246" textAnchor="middle">404</text></svg></div></section>
}

function Stat({icon,label,value,note,color}) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div> }
function Empty({icon,title,text,action,onClick}) { return <div className="empty-state"><div className="empty-icon">{icon}</div><b>{title}</b><p>{text}</p>{action && <button className="btn btn-primary btn-small" onClick={onClick}>{action}</button>}</div> }
function BankRow({bank,onClick}) { return <button className="bank-row" onClick={onClick}><div className="bank-icon"><BookOpen size={18}/></div><div className="bank-main"><b>{bank.name}</b><small>Question Booklet · {bank.questions.length} questions</small></div><span className="bank-tag">{bank.questions.length} Qs</span><ArrowRight size={16} className="muted-arrow"/></button> }

function ImportPage({addBank,toast,settings,updateSettings,banks}) {
  const [url,setUrl] = useState('')
  const [name,setName] = useState('')
  const [importSource,setImportSource] = useState('')
  const [group,setGroup] = useState('General')
  const [newGroup,setNewGroup] = useState('')
  const [creatingGroup,setCreatingGroup] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [preview,setPreview] = useState(null)
  const groups = bookletGroups(settings, banks)
  function createGroup() {
    const value = newGroup.trim()
    if (!value) return
    const existing = groups.find(item => item.toLowerCase() === value.toLowerCase())
    if (existing) { setGroup(existing); setNewGroup(''); setCreatingGroup(false); return }
    updateSettings({...settings, questionBookletGroups: [...(settings?.questionBookletGroups || []), value]})
    setGroup(value)
    setNewGroup('')
    setCreatingGroup(false)
    toast(`Group “${value}” created.`)
  }
  async function importFrom(sourceUrl, defaultName) {
    const source = sourceUrl.trim()
    if (!source) return setError('Paste a Google Sheets URL before importing.')
    setBusy(true); setError(''); setPreview(null); setUrl(source); setImportSource(source)
    try {
      const questions = await importSheet(source)
      setPreview(questions)
      if (!name.trim()) setName(defaultName)
    } catch (err) { setError(err.message || 'Could not import this question booklet.') } finally { setBusy(false) }
  }
  async function handleImport(e) {
    e.preventDefault()
    await importFrom(url, name.trim() || 'My question booklet')
  }
  async function importSample(sample) {
    setName(sample.name)
    await importFrom(sample.url, sample.name)
  }
  async function save() {
    const subjects = [...new Set(preview.map(q => q.subject))]
    await addBank({id:uid(),name:name.trim() || 'My question booklet',group:group.trim() || 'General',sourceUrl:importSource || url.trim(),createdAt:new Date().toISOString(),subjects,questions:preview})
  }
  return <><PageTitle eyebrow="QUESTION BOOKLETS" title="Add a question booklet." description="Import a Google Sheet as a question booklet inside your combined question bank."/>
    <div className="import-layout"><section className="panel import-panel"><div className="step-label"><span>01</span> CONNECT YOUR QUESTION BOOKLET</div><h2>Paste your Google Sheets link</h2><p className="muted-text">QuizForge reads a view-only copy and saves the questions locally in this browser. You do not need to publish the sheet to the web.</p><form onSubmit={handleImport}><label>Google Sheets URL</label><div className="input-with-icon"><FileSpreadsheet size={18}/><input required type="url" value={url} onChange={e => { setUrl(e.target.value); setImportSource('') }} placeholder="https://docs.google.com/spreadsheets/d/..."/></div><label>Give this question booklet a name <span className="optional">(optional)</span></label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Java Collections Booklet"/><label>Save booklet in a group</label><div className="group-input-row"><select value={group} onChange={e=>setGroup(e.target.value)}><option value="General">General</option>{groups.filter(item => item !== 'General').map(item => <option key={item} value={item}>{item}</option>)}</select><button type="button" className="btn btn-secondary btn-small" onClick={() => setCreatingGroup(value => !value)}>Make a group</button></div>{creatingGroup && <div className="create-group-row"><input autoFocus value={newGroup} onChange={e => setNewGroup(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createGroup() } }} placeholder="New group name"/><button type="button" className="btn btn-primary btn-small" onClick={createGroup}>Create</button></div>}<button className="btn btn-primary full-btn" disabled={busy}>{busy ? 'Reading spreadsheet…' : <><Upload size={16}/> Import booklet and preview</>}</button></form>{error && <div className="error-box"><CircleHelp size={17}/>{error}</div>}</section>
      <aside className="panel help-panel"><div className="help-icon"><FileSpreadsheet size={22}/></div><h3>Before you import</h3><ol><li>Open your Google Sheet and click <b>Share</b>.</li><li>Under General access, choose <b>Anyone with the link</b>.</li><li>Set the role to <b>Viewer</b>.</li><li>Copy the share link and paste it here.</li></ol><div className="info-box">Use headers such as <b>SN, Question, Option A-D, Answer, Difficulty Level, Subtopic, Speciality</b>. QuizForge labels the subject as Question Booklet and keeps Subtopic and Speciality as question metadata.</div><a href="https://support.google.com/docs/answer/2494822" target="_blank" rel="noreferrer">Google Sheets sharing help ↗</a></aside></div>
    <section className="panel sample-import-panel"><div className="panel-head"><div><h3>Try a sample question booklet</h3><p>Choose an exam and import its public, view-only Google Sheet directly.</p></div><span className="sample-count">{sampleBooklets.length} samples</span></div><div className="sample-import-grid">{sampleBooklets.map(sample => <article className="sample-import-card" key={sample.id}><div className="sample-import-icon"><FileSpreadsheet size={18}/></div><div className="sample-import-copy"><h4>{sample.title}</h4><p>{sample.description}</p><small>Saved as “{sample.name}”</small></div><div className="sample-import-actions"><button type="button" className="btn btn-primary btn-small" onClick={() => importSample(sample)} disabled={busy}><Upload size={14}/> {busy ? 'Importing…' : 'Import sample'}</button><button type="button" className="text-btn" onClick={() => { setUrl(sample.url); setName(sample.name); setImportSource(''); setError(''); setPreview(null) }}>Use link</button></div></article>)}</div><p className="sample-import-note">Samples remain in Google Sheets. QuizForge reads them as Viewer and stores your imported copy only in this browser.</p></section>
    {preview && <section className="panel preview-panel"><div className="panel-head"><div><h3>Question booklet preview</h3><p>{preview.length} valid questions found. Check a few before saving.</p></div><span className="success-pill"><CheckCircle2 size={14}/> Ready to save</span></div><div className="preview-list">{preview.slice(0,4).map((q,i)=><div className="preview-question" key={q.id+i}><b>{i+1}. {q.question}</b><small>{q.topic} · {q.speciality || 'Not specified'} · {formatDifficulty(q.difficulty)} · Answer: {q.correctAnswer}</small></div>)}</div><button className="btn btn-primary" onClick={save}>Save question booklet <ArrowRight size={16}/></button></section>}
  </>
}

function BanksPage({banks,navigate,toast,settings,updateSettings,updateBank,deleteBank,refresh}) {
  const [query,setQuery] = useState('')
  const [group,setGroup] = useState('All')
  const [newGroup,setNewGroup] = useState('')
  const [creatingGroup,setCreatingGroup] = useState(false)
  const [managingGroups,setManagingGroups] = useState(false)
  const [editingGroup,setEditingGroup] = useState(null)
  const [groupEditName,setGroupEditName] = useState('')
  const [editingBooklet,setEditingBooklet] = useState(null)
  const [bookletName,setBookletName] = useState('')
  const [bookletGroup,setBookletGroup] = useState('General')
  const groups=bookletGroups(settings, banks)
  const filtered = banks.filter(b => `${b.name} ${b.subjects.join(' ')} ${b.group||'General'}`.toLowerCase().includes(query.toLowerCase()) && (group==='All'||(b.group||'General')===group))
  const questionCount = banks.reduce((total, booklet) => total + booklet.questions.length, 0)
  function createGroup() {
    const value = newGroup.trim()
    if (!value) return
    const existing = groups.find(item => item.toLowerCase() === value.toLowerCase())
    if (existing) { setGroup(existing); setNewGroup(''); setCreatingGroup(false); return }
    updateSettings({...settings, questionBookletGroups: [...(settings?.questionBookletGroups || []), value]})
    setGroup(value)
    setNewGroup('')
    setCreatingGroup(false)
    toast(`Group “${value}” created.`)
  }
  function openBookletEdit(bank) {
    setEditingBooklet(bank)
    setBookletName(bank.name)
    setBookletGroup(bank.group || 'General')
  }
  async function saveBookletEdit() {
    if (!editingBooklet || !bookletName.trim()) return
    await updateBank({...editingBooklet, name: bookletName.trim(), group: bookletGroup || 'General', updatedAt: new Date().toISOString()})
    setEditingBooklet(null)
    toast('Question booklet updated.')
  }
  async function removeBooklet(bank) {
    if (!window.confirm(`Delete “${bank.name}”? Its question booklet and local copy will be removed.`)) return
    await deleteBank(bank.id)
  }
  function startGroupEdit(value) {
    if (value === 'General') return
    setEditingGroup(value)
    setGroupEditName(value)
  }
  async function saveGroupEdit() {
    if (!editingGroup || !groupEditName.trim() || editingGroup === 'General') return
    const value = groupEditName.trim()
    const duplicate = groups.find(item => item !== editingGroup && item.toLowerCase() === value.toLowerCase())
    if (duplicate) return toast(`The group “${duplicate}” already exists.`)
    await Promise.all(banks.filter(bank => (bank.group || 'General') === editingGroup).map(bank => put('banks', {...bank, group: value, updatedAt: new Date().toISOString()})))
    const nextGroups = [...new Set([...(settings?.questionBookletGroups || []).filter(item => item !== editingGroup), value])]
    updateSettings({...settings, questionBookletGroups: nextGroups})
    await refresh()
    setEditingGroup(null)
    setGroup(value)
    toast('Group renamed.')
  }
  async function removeGroup(value) {
    if (value === 'General') return toast('General is the default group and cannot be deleted.')
    if (!window.confirm(`Delete the “${value}” group? Its booklets will move to General.`)) return
    await Promise.all(banks.filter(bank => (bank.group || 'General') === value).map(bank => put('banks', {...bank, group: 'General', updatedAt: new Date().toISOString()})))
    updateSettings({...settings, questionBookletGroups: (settings?.questionBookletGroups || []).filter(item => item !== value)})
    await refresh()
    if (group === value) setGroup('All')
    toast(`Group “${value}” deleted.`)
  }
  return <><PageTitle eyebrow="YOUR LIBRARY" title="Question booklets" description={`Your ${banks.length} imported booklet${banks.length===1?'':'s'} contain ${questionCount} questions in the combined question bank.`} action={<div className="page-actions"><button className="btn btn-secondary" onClick={() => setManagingGroups(value => !value)}><Pencil size={15}/> Manage groups</button><button className="btn btn-secondary" onClick={() => setCreatingGroup(value => !value)}>＋ Make a group</button><button className="btn btn-primary" onClick={() => navigate('/import')}><Plus size={16}/> Import booklet</button></div>}/>{creatingGroup && <section className="panel group-create-panel"><div><h3>Make a group</h3><p>Create a reusable group for your question booklets.</p></div><div className="create-group-row"><input autoFocus value={newGroup} onChange={e=>setNewGroup(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();createGroup()}}} placeholder="e.g. Java, GK, Interview Prep"/><button className="btn btn-primary btn-small" onClick={createGroup}>Create group</button></div></section>}{managingGroups && <section className="panel group-manager-panel"><div className="panel-head"><div><h3>Manage groups</h3><p>Rename or delete groups without deleting their booklets.</p></div></div>{groups.map(item=><div className="group-manager-row" key={item}>{editingGroup===item ? <><input value={groupEditName} onChange={e=>setGroupEditName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveGroupEdit()}}}/><button className="btn btn-primary btn-small" onClick={saveGroupEdit}>Save</button><button className="text-btn" onClick={()=>setEditingGroup(null)}>Cancel</button></> : <><div><b>{item}</b><small>{banks.filter(bank=>(bank.group||'General')===item).length} booklet{banks.filter(bank=>(bank.group||'General')===item).length===1?'':'s'}</small></div><span className="flex-spacer"/>{item !== 'General' && <><button className="text-btn" onClick={()=>startGroupEdit(item)}><Pencil size={14}/> Rename</button><button className="text-btn danger-text" onClick={()=>removeGroup(item)}><Trash2 size={14}/> Delete</button></>}</>}</div>)}</section>}{editingBooklet && <section className="panel group-create-panel booklet-edit-panel"><div><h3>Edit question booklet</h3><p>Update its name or move it to another group.</p></div><div className="booklet-edit-fields"><input value={bookletName} onChange={e=>setBookletName(e.target.value)} placeholder="Question booklet name"/><select value={bookletGroup} onChange={e=>setBookletGroup(e.target.value)}>{groups.map(item=><option key={item}>{item}</option>)}</select><button className="btn btn-primary btn-small" onClick={saveBookletEdit}>Save</button><button className="text-btn" onClick={()=>setEditingBooklet(null)}>Cancel</button></div></section>}<div className="library-tools"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your question booklets…"/></div><select className="group-select" value={group} onChange={e=>setGroup(e.target.value)}><option>All</option>{groups.map(item=><option key={item}>{item}</option>)}</select></div>{filtered.length ? <div className="bank-grid">{filtered.map(bank=><div className="bank-card" key={bank.id}><div className="bank-card-top"><div className="bank-icon large"><BookOpen size={21}/></div><span className="bank-tag">{bank.questions.length} questions</span></div><h3>{bank.name}</h3><p><span className="group-pill">{bank.group||'General'}</span> · Question Booklet</p><div className="bank-card-bottom"><span>Added {new Date(bank.createdAt).toLocaleDateString()}</span><div className="bank-card-actions"><button className="btn btn-primary btn-small" onClick={()=>navigate(`/configure/${bank.id}`)}>Create test <ArrowRight size={14}/></button><button className="btn btn-secondary btn-small" onClick={()=>navigate(`/manage/${bank.id}`)}>Questions</button><button className="icon-btn card-action" title="Edit booklet" onClick={()=>openBookletEdit(bank)}><Pencil size={15}/></button><button className="icon-btn card-action danger-text" title="Delete booklet" onClick={()=>removeBooklet(bank)}><Trash2 size={15}/></button></div></div></div>)}</div>:<Empty icon={<BookOpen/>} title="No question booklets found" text="Import a Google Sheet to get started." action="Import booklet" onClick={()=>navigate('/import')}/>}</>
}

function ManageQuestionsPage({banks,navigate,toast,updateBank}) {
  const {bankId} = useParams()
  const bank = banks.find(item => item.id === bankId)
  const [query,setQuery] = useState('')
  const [draft,setDraft] = useState(null)
  const [busy,setBusy] = useState(false)
  if (!bank) return <Empty icon={<BookOpen/>} title="Question booklet not found" text="It may have been removed from this browser." action="Go to question booklets" onClick={()=>navigate('/banks')}/>
  const filtered = bank.questions.filter(question => `${question.question} ${question.topic} ${question.speciality || ''} ${question.difficulty}`.toLowerCase().includes(query.toLowerCase()))
  const editingExisting = draft && bank.questions.some(question => question.id === draft.id)
  function newQuestion() { return {id:uid(),question:'',options:['','','',''],correctAnswer:'A',subject:'Question Booklet',topic:'General',speciality:'Not specified',difficulty:'Not specified',explanation:'',marks:1,negativeMarks:0} }
  function openEditor(question) { setDraft(question ? {...question,options:[...question.options]} : newQuestion()) }
  function updateDraft(field,value) { setDraft(current => ({...current,[field]:value})) }
  function updateOption(index,value) { setDraft(current => ({...current,options:current.options.map((option,item)=>item===index?value:option)})) }
  async function saveQuestion() {
    if (!draft || !draft.question.trim() || draft.options.some(option => !option.trim())) return toast('Add the question and all four answer options before saving.')
    if (!['A','B','C','D'].includes(draft.correctAnswer)) return toast('Choose the correct answer option.')
    setBusy(true)
    try {
      const questions = editingExisting ? bank.questions.map(question => question.id === draft.id ? {...draft,question:draft.question.trim(),options:draft.options.map(option=>option.trim())} : question) : [...bank.questions,{...draft,question:draft.question.trim(),options:draft.options.map(option=>option.trim())}]
      await updateBank({...bank,questions,updatedAt:new Date().toISOString()})
      setDraft(null)
      toast(editingExisting ? 'Question updated.' : 'Question added to the booklet.')
    } finally { setBusy(false) }
  }
  async function deleteQuestion(question) {
    if (!window.confirm('Delete this question from the local booklet?')) return
    await updateBank({...bank,questions:bank.questions.filter(item=>item.id!==question.id),updatedAt:new Date().toISOString()})
    toast('Question deleted.')
  }
  return <><PageTitle eyebrow="QUESTION BOOKLET" title={`Manage ${bank.name}`} description={`${bank.questions.length} questions · ${bank.group || 'General'} group`} action={<div className="page-actions"><button className="btn btn-secondary" onClick={()=>navigate('/banks')}>Back to booklets</button><button className="btn btn-primary" onClick={()=>openEditor()}><Plus size={16}/> Add question</button></div>}/><div className="info-box question-crud-note">These changes are stored locally in this browser. Refreshing from the Google Sheet replaces local question edits with the sheet contents.</div>{draft && <section className="panel question-editor"><div className="panel-head"><div><h3>{editingExisting?'Edit question':'Add question'}</h3><p>Update the question, options, metadata, and scoring.</p></div><button className="icon-btn" onClick={()=>setDraft(null)}><X size={17}/></button></div><label>Question</label><textarea value={draft.question} onChange={e=>updateDraft('question',e.target.value)} placeholder="Write the question"/><div className="question-option-grid">{draft.options.map((option,index)=><div key={index}><label>Option {String.fromCharCode(65+index)}</label><input value={option} onChange={e=>updateOption(index,e.target.value)} placeholder={`Option ${String.fromCharCode(65+index)}`}/></div>)}</div><div className="form-grid"><div><label>Correct answer</label><select value={draft.correctAnswer} onChange={e=>updateDraft('correctAnswer',e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></div><div><label>Subtopic</label><input value={draft.topic || ''} onChange={e=>updateDraft('topic',e.target.value)} placeholder="Subtopic"/></div><div><label>Speciality</label><input value={draft.speciality || ''} onChange={e=>updateDraft('speciality',e.target.value)} placeholder="Speciality"/></div><div><label>Difficulty level</label><input value={draft.difficulty || ''} onChange={e=>updateDraft('difficulty',e.target.value)} placeholder="1 to 5 or a label"/></div><div><label>Positive marks</label><input type="number" min="0" step="0.25" value={draft.marks} onChange={e=>updateDraft('marks',Number(e.target.value))}/></div><div><label>Negative marks</label><input type="number" min="0" step="0.25" value={draft.negativeMarks} onChange={e=>updateDraft('negativeMarks',Number(e.target.value))}/></div></div><label>Explanation <span className="optional">(optional)</span></label><textarea value={draft.explanation || ''} onChange={e=>updateDraft('explanation',e.target.value)} placeholder="Explain the correct answer"/><div className="editor-actions"><button className="btn btn-secondary" onClick={()=>setDraft(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={saveQuestion}>{busy?'Saving…':'Save question'}</button></div></section>}<section className="panel question-crud-list"><div className="panel-head"><div><h3>Questions in this booklet</h3><p>Edit or delete any locally stored question.</p></div><span className="bank-tag">{filtered.length} shown</span></div><div className="library-tools"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questions, subtopics, speciality, or difficulty…"/></div></div>{filtered.length ? filtered.map((question,index)=><div className="question-crud-row" key={`${question.id}-${index}`}><div className="question-crud-copy"><b>{index+1}. {question.question}</b><small><span className="group-pill">{question.topic || 'General'}</span><span className="group-pill speciality-pill">{question.speciality || 'Not specified'}</span> · {formatDifficulty(question.difficulty)} · Answer {question.correctAnswer}</small></div><div className="question-crud-actions"><button className="icon-btn card-action" title="Edit question" onClick={()=>openEditor(question)}><Pencil size={15}/></button><button className="icon-btn card-action danger-text" title="Delete question" onClick={()=>deleteQuestion(question)}><Trash2 size={15}/></button></div></div>) : <Empty icon={<Search/>} title="No matching questions" text="Try another search term."/>}</section></>
}

function ConfigurePage({banks,attempts,navigate,toast,refreshBank}) {
  const {bankId} = useParams()
  const [selectedBookletId,setSelectedBookletId] = useState(bankId)
  const [topics,setTopics] = useState([])
  const [difficulty,setDifficulty] = useState('All')
  const [count,setCount] = useState(20)
  const [duration,setDuration] = useState(30)
  const [marks,setMarks] = useState(1)
  const [negative,setNegative] = useState(0)
  const [shuffleQuestions,setShuffleQuestions] = useState(true)
  const [shuffleOptions,setShuffleOptions] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const selectedBooklet = banks.find(booklet=>booklet.id===selectedBookletId)
  const wholeBankSelected = selectedBookletId === 'all'
  useEffect(() => {
    setSelectedBookletId(bankId)
    setTopics([])
    setDifficulty('All')
  }, [bankId])
  const shouldRefreshLegacy = Boolean(selectedBooklet?.sourceUrl && selectedBooklet.questions?.some(question => question.topic === 'Uncategorized' || question.difficulty === 'Mixed'))
  useEffect(() => {
    if (!shouldRefreshLegacy || !selectedBooklet) return
    let cancelled = false
    setRefreshing(true)
    refreshBank(selectedBooklet.id).catch(error => { if (!cancelled) toast(error.message || 'Could not refresh this question booklet.') }).finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
  }, [selectedBookletId])
  if (!wholeBankSelected && !selectedBooklet) return <Empty icon={<BookOpen/>} title="Question booklet not found" text="It may have been removed from this browser." action="Go to question booklets" onClick={()=>navigate('/banks')}/>

  const groupedBooklets=banks.reduce((groups,booklet)=>{const key=booklet.group||'General';(groups[key] ||= []).push(booklet);return groups},{})
  const allQuestions=banks.flatMap(booklet=>booklet.questions.map(question=>({...question,id:`${booklet.id}:${question.id}`,bookletName:booklet.name,bookletId:booklet.id})))
  const activeQuestions=wholeBankSelected ? allQuestions : selectedBooklet.questions.map(question=>({...question,bookletName:selectedBooklet.name,bookletId:selectedBooklet.id}))
  const activeName=wholeBankSelected ? 'Whole Question Bank' : selectedBooklet.name
  const scoped=activeQuestions.filter(q=>(!topics.length||topics.includes(q.topic))&&(difficulty==='All'||(q.difficulty||'Not specified').toLowerCase()===difficulty.toLowerCase()))
  const practisedQuestionKeys = new Set(attempts.flatMap(attempt => attempt.result?.review || []).map(questionHistoryKey).filter(Boolean))
  const availableTopics=[...new Set(activeQuestions.map(q=>q.topic).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
  const difficultyOptions=[...new Set(activeQuestions.map(q=>q.difficulty).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
  const allQuestionCount=allQuestions.length
  function changeBooklet(value) { setSelectedBookletId(value); setTopics([]); setDifficulty('All') }
  function start() {
    const config={subject:'Question Booklet',scope:wholeBankSelected?'whole-bank':'booklet',selectedBookletId,selectedBookletName:activeName,topics,difficulty,count:Math.min(Number(count),scoped.length),duration:Number(duration),marks:Number(marks),negative:Number(negative),shuffleQuestions,shuffleOptions}
    const questions=buildTest(activeQuestions,{...config,excludeQuestionKeys:[...practisedQuestionKeys]})
    if(!questions.length) return toast('No questions match these filters.')
    const session={id:uid(),bankId:selectedBookletId,bankName:activeName,questions,config,answers:{},timings:{},current:0,startedAt:Date.now(),remainingSeconds:duration*60}
    sessionStorage.setItem(`quizforge-session-${session.id}`,JSON.stringify(session))
    navigate(`/quiz/${session.id}`)
  }
  async function reloadSheet() {
    if (!selectedBooklet) return
    setRefreshing(true)
    try { await refreshBank(selectedBooklet.id) } catch (error) { toast(error.message || 'Could not refresh this question booklet.') } finally { setRefreshing(false) }
  }
  return <><PageTitle eyebrow="CONFIGURE YOUR TEST" title="Make it your test." description="Choose a question booklet or the whole question bank." action={<button className="btn btn-secondary" onClick={reloadSheet} disabled={refreshing || wholeBankSelected || !selectedBooklet?.sourceUrl}><RefreshCw size={15} className={refreshing?'spin':''}/> {wholeBankSelected?'Select a booklet to refresh':refreshing?'Refreshing sheet…':'Refresh from sheet'}</button>}/><div className="configure-layout"><section className="panel config-panel"><div className="config-section"><h3>What do you want to practice?</h3><label>Question booklet</label><select value={selectedBookletId} onChange={e=>changeBooklet(e.target.value)}><option value="all">Whole question bank ({allQuestionCount} questions)</option>{Object.entries(groupedBooklets).sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=><optgroup key={group} label={group}>{items.map(booklet=><option key={booklet.id} value={booklet.id}>{booklet.name} ({booklet.questions.length} questions)</option>)}</optgroup>)}</select><small className="config-dynamic-note">Choose one booklet, or include every booklet in the whole question bank.</small><label>Subtopics</label><div className="chip-list">{availableTopics.map(t=><button key={t} className={`chip ${topics.includes(t)?'selected':''}`} onClick={()=>setTopics(old=>old.includes(t)?old.filter(x=>x!==t):[...old,t])}>{t}</button>)}</div><small className="config-dynamic-note">{availableTopics.length} subtopic{availableTopics.length===1?'':'s'} detected from the selected scope.</small><label>Difficulty level</label><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>All</option>{difficultyOptions.map(level=><option key={level} value={level}>{formatDifficulty(level)}</option>)}</select><small className="config-dynamic-note">Difficulty values are taken from the selected booklet or the whole question bank.</small></div><div className="config-section"><h3>Question booklet settings</h3><div className="form-grid"><div><label>Number of questions</label><input type="number" min="1" max={Math.max(1,scoped.length)} value={count} onChange={e=>setCount(e.target.value)}/><small>{scoped.length} questions available</small></div><div><label>Duration (minutes)</label><input type="number" min="1" max="300" value={duration} onChange={e=>setDuration(e.target.value)}/></div><div><label>Marks for correct answer</label><input type="number" min="0" step="0.25" value={marks} onChange={e=>setMarks(e.target.value)}/></div><div><label>Negative marks</label><input type="number" min="0" step="0.25" value={negative} onChange={e=>setNegative(e.target.value)}/></div></div><div className="toggle-row"><div><b>Shuffle question booklet</b><small>Randomize the selected questions for every attempt</small></div><input type="checkbox" checked={shuffleQuestions} onChange={e=>setShuffleQuestions(e.target.checked)}/></div><div className="toggle-row"><div><b>Shuffle answer options</b><small>Randomize A-D option positions for every attempt</small></div><input type="checkbox" checked={shuffleOptions} onChange={e=>setShuffleOptions(e.target.checked)}/></div></div><button className="btn btn-primary full-btn" disabled={!scoped.length||Number(count)<1||Number(duration)<1} onClick={start}><Play size={16} fill="currentColor"/> Start test ({Math.min(Number(count),scoped.length)} questions)</button></section><aside className="panel test-summary"><div className="summary-mark"><GraduationCap size={25}/></div><h3>{wholeBankSelected?'Whole question bank':'Question booklet'}</h3><div className="summary-booklet-name">{activeName}</div><div className="summary-number">{Math.min(Number(count)||0,scoped.length)}</div><p>questions in this test</p><div className="summary-line"><span>Available questions</span><b>{scoped.length}</b></div><div className="summary-line"><span>Selected scope</span><b>{wholeBankSelected?'All booklets':'1 booklet'}</b></div><div className="summary-line"><span>Time limit</span><b>{duration} min</b></div><div className="summary-line"><span>Positive marks</span><b>+{marks}</b></div><div className="summary-line"><span>Negative marks</span><b>−{negative}</b></div></aside></div></>
}

function QuizPage({banks,finishAttempt,toast}) {
  const {sessionId}=useParams()
  const navigate=useNavigate()
  const [session,setSession]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(`quizforge-session-${sessionId}`))}catch{return null}})
  const [remaining,setRemaining]=useState(session?.remainingSeconds??0)
  const [lastTick,setLastTick]=useState(Date.now())
  const [marked,setMarked]=useState([])
  const [startedQuestion,setStartedQuestion]=useState(Date.now())
  const [confirm,setConfirm]=useState(false)
  useEffect(()=>{if(!session)return;const timer=setInterval(()=>{setRemaining(r=>{if(r<=1){clearInterval(timer);return 0}return r-1})},1000);return()=>clearInterval(timer)},[sessionId])
  useEffect(()=>{if(remaining===0&&session) submit(true)},[remaining])
  useEffect(()=>{if(session){session.remainingSeconds=remaining;sessionStorage.setItem(`quizforge-session-${sessionId}`,JSON.stringify(session))}},[remaining])
  if(!session) return <Empty icon={<CircleHelp/>} title="Test session unavailable" text="This test may have expired or the browser session was cleared." action="Return to dashboard" onClick={()=>navigate('/')}/>
  const q=session.questions[session.current]
  function saveTime() {
    const elapsed=Math.max(0,Math.round((Date.now()-startedQuestion)/1000))
    session.timings[q.id]=(session.timings[q.id]||0)+elapsed
    setStartedQuestion(Date.now())
  }
  function update(patch) { const next={...session,...patch};setSession(next);sessionStorage.setItem(`quizforge-session-${sessionId}`,JSON.stringify(next)) }
  function answer(value) { update({answers:{...session.answers,[q.id]:value}}) }
  function move(index) { saveTime();update({current:Math.max(0,Math.min(index,session.questions.length-1))}) }
  async function submit(auto=false) {
    if(!session||session.submitted)return
    saveTime()
    const result=evaluate(session.questions,session.answers,session.timings)
    const attempt={id:uid(),bankId:session.bankId,bankName:session.bankName,completedAt:new Date().toISOString(),startedAt:new Date(session.startedAt).toISOString(),config:session.config,result}
    session.submitted=true
    sessionStorage.removeItem(`quizforge-session-${sessionId}`)
    await finishAttempt(attempt)
    if(auto) toast('Time is up. Your test was submitted automatically.')
  }
  const answered=Object.keys(session.answers).length
  return <div className="exam-shell"><div className="exam-top"><div><div className="eyebrow">PRACTICE TEST</div><h2>{session.bankName}</h2></div><div className={`timer ${remaining<60?'urgent':''}`}><Clock3 size={17}/><span>{fmt(remaining)}</span></div></div><div className="exam-layout"><section className="panel question-panel"><div className="question-meta"><span>QUESTION {session.current+1} OF {session.questions.length}</span><span className="question-meta-tags"><span className="speciality-tag">{q.speciality || 'Not specified'}</span><span className="difficulty-tag">{formatDifficulty(q.difficulty)}</span></span></div><div className="question-progress"><span style={{width:`${((session.current+1)/session.questions.length)*100}%`}}/></div><h2 className="question-text">{q.question}</h2><div className="option-list">{q.options.map(o=><button key={o.key} className={`answer-option ${session.answers[q.id]===o.key?'chosen':''}`} onClick={()=>answer(o.key)}><span className="option-key">{o.key}</span><span>{o.text}</span>{session.answers[q.id]===o.key&&<CheckCircle2 size={18}/>}</button>)}</div><div className="question-actions"><button className="btn btn-secondary" onClick={()=>{saveTime();setMarked(old=>old.includes(q.id)?old.filter(x=>x!==q.id):[...old,q.id])}}>{marked.includes(q.id)?'Unmark review':'Mark for review'}</button><button className="text-btn" onClick={()=>{const next={...session.answers};delete next[q.id];update({answers:next})}}>Clear response</button><span className="flex-spacer"/><button className="btn btn-secondary" disabled={session.current===0} onClick={()=>move(session.current-1)}>Previous</button><button className="btn btn-primary" onClick={()=>session.current===session.questions.length-1?setConfirm(true):move(session.current+1)}>{session.current===session.questions.length-1?'Review & submit':'Save & next'} <ArrowRight size={15}/></button></div></section><aside className="panel question-nav"><h3>Question palette</h3><p>{answered} of {session.questions.length} answered</p><div className="palette">{session.questions.map((item,i)=><button key={item.id+i} className={`${i===session.current?'current':''} ${session.answers[item.id]?'answered':''} ${marked.includes(item.id)?'marked':''}`} onClick={()=>move(i)}>{i+1}</button>)}</div><div className="legend"><span><i className="legend-answered"/> Answered</span><span><i className="legend-marked"/> Review</span><span><i className="legend-empty"/> Not answered</span></div><button className="btn btn-primary full-btn" onClick={()=>setConfirm(true)}>Submit test</button></aside></div>{confirm&&<div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={()=>setConfirm(false)}><X/></button><h2>Submit your test?</h2><p>You have answered {answered} of {session.questions.length} questions. You can still go back and review your responses.</p><div className="modal-actions"><button className="btn btn-secondary" onClick={()=>setConfirm(false)}>Continue test</button><button className="btn btn-primary" onClick={()=>submit(false)}>Submit now</button></div></div></div>}</div>
}

function ResultPage({attempts,navigate}) {
  const {attemptId}=useParams()
  const [revealedAnswers,setRevealedAnswers]=useState({})
  const attempt=attempts.find(a=>a.id===attemptId)
  if(!attempt)return <Empty icon={<FileText/>} title="Result not found" text="This result may have been cleared from local history." action="View history" onClick={()=>navigate('/history')}/>
  const r=attempt.result
  const analytics=getAnalytics(r)
  const weakest=analytics.topics.length ? [...analytics.topics].sort((a,b)=>a.accuracy-b.accuracy)[0] : null
  function toggleAnswer(key) { setRevealedAnswers(current=>({...current,[key]:!current[key]})) }
  return <><PageTitle eyebrow="TEST COMPLETE" title="Here's how you did." description={`${attempt.bankName} · ${new Date(attempt.completedAt).toLocaleString()}`} action={<button className="btn btn-secondary" onClick={()=>downloadReport(attempt)}><Download size={16}/> Download detailed PDF</button>}/><section className="result-hero panel"><div className="score-ring" style={{'--score':`${r.accuracy}%`}}><div><strong>{r.accuracy}%</strong><small>accuracy</small></div></div><div className="result-main"><span className="success-pill"><CheckCircle2 size={14}/> Test submitted</span><h2>{r.score} <small>marks</small></h2><p>Question Booklet · You answered {r.correct} out of {r.total} questions correctly.</p></div><div className="result-mini"><div><b>{r.total}</b><small>Total questions</small></div><div><b>{fmt(r.timeSeconds)}</b><small>Time taken</small></div><div><b>{r.averageSeconds}s</b><small>Avg. per question</small></div></div></section><div className="stats-grid result-stats"><Stat icon={<CheckCircle2/>} label="Correct" value={r.correct} note="Right answers" color="green"/><Stat icon={<X/>} label="Incorrect" value={r.incorrect} note="Wrong answers" color="orange"/><Stat icon={<CircleHelp/>} label="Skipped" value={r.skipped} note="Not attempted" color="purple"/><Stat icon={<Clock3/>} label="Average time" value={`${r.averageSeconds}s`} note="Per question" color="blue"/></div><section className="analytics-grid"><AnalyticsBars title="Subtopic analytics" caption="Accuracy and time by selected subtopic." items={analytics.topics} accent="topic"/><AnalyticsBars title="Difficulty analytics" caption="How you performed at each difficulty level." items={analytics.difficulties} accent="difficulty"/></section>{weakest&&<section className="insight-panel"><div className="insight-icon"><ChartNoAxesCombined size={18}/></div><div><b>Next best focus: {weakest.label}</b><p>{weakest.accuracy}% accuracy across {weakest.total} question{weakest.total===1?'':'s'}. Review the explanations for the missed questions before your next booklet.</p></div></section>}<section className="panel review-panel"><div className="panel-head"><div><h3>Answer review</h3><p>Reveal the answer or open a targeted Google search for a detailed explanation.</p></div></div>{r.review.map((q,i)=>{const answerKey=`${q.id}-${i}`;const correctOption=q.options?.find(option=>typeof option==='object'&&option.key===q.correctAnswer);const correctIndex=['A','B','C','D'].indexOf(q.correctAnswer);const correctText=correctOption?.text || (correctIndex>=0&&typeof q.options?.[correctIndex]==='string'?q.options[correctIndex]:'');const solutionUrl=detailedSolutionSearchUrl(q);return <div className="review-item" key={answerKey}><div className={`review-status ${q.isCorrect?'right':q.selectedAnswer?'wrong':'skipped'}`}>{q.isCorrect?<CheckCircle2 size={16}/>:<X size={16}/>}</div><div className="review-content"><b>{i+1}. {q.question}</b><p><span className="review-tag">{q.topic||'General'}</span><span className="review-tag speciality-review-tag">{q.speciality||'Not specified'}</span><span className="review-tag">{formatDifficulty(q.difficulty)}</span> · Your answer: <strong>{q.selectedAnswer||'Not attempted'}</strong> · {q.timeSeconds}s</p><div className="review-actions"><button className="text-btn reveal-answer-btn" onClick={()=>toggleAnswer(answerKey)}>{revealedAnswers[answerKey]?'Hide correct answer':'Show correct answer'}</button><a className="text-btn solution-search-link" href={solutionUrl} target="_blank" rel="noreferrer"><Search size={14}/> Find detailed solution</a></div>{revealedAnswers[answerKey]&&<div className="correct-answer-box"><CheckCircle2 size={15}/> <span>Correct answer: <strong>{q.correctAnswer || 'Not recorded'}{correctText&&` — ${correctText}`}</strong></span></div>}{q.explanation&&<small>{q.explanation}</small>}</div></div>})}</section><button className="btn btn-primary" onClick={()=>navigate('/')}>Back to dashboard <ArrowRight size={16}/></button></>
}

function MarksBreakdown({summary}) {
  const total = summary.correct + summary.incorrect + summary.skipped || 1
  const correctEnd = summary.correct / total * 100
  const incorrectEnd = correctEnd + summary.incorrect / total * 100
  const scoreEfficiency = summary.maximumMarks ? Math.max(0, Math.min(100, summary.netScore / summary.maximumMarks * 100)) : 0
  const formatMarks = value => Number.isInteger(value) ? value : Number(value.toFixed(2))
  return <section className="marks-analysis" aria-label="Marks and answer breakdown"><div className="marks-analysis-heading"><div><h3>Marks analysis</h3><p>Score, negative marking, and answer distribution.</p></div><span>{summary.attempted}/{total} attempted</span></div><div className="marks-analysis-body"><div className="answer-donut" style={{'--correct-end':`${correctEnd}%`,'--incorrect-end':`${incorrectEnd}%`}}><div><strong>{formatMarks(summary.netScore)}</strong><small>net marks</small></div></div><div className="answer-legend"><span><i className="legend-correct"/> {summary.correct} correct</span><span><i className="legend-incorrect"/> {summary.incorrect} incorrect</span><span><i className="legend-skipped"/> {summary.skipped} skipped</span></div></div><div className="score-efficiency"><div><span>Score efficiency</span><strong>{Math.round(scoreEfficiency)}% of {formatMarks(summary.maximumMarks)} marks</strong></div><div className="score-efficiency-track"><i style={{width:`${scoreEfficiency}%`}}/></div></div><div className="marks-metric-grid"><div><small>Maximum marks</small><b>{formatMarks(summary.maximumMarks)}</b></div><div><small>Marks earned</small><b className="marks-positive">+{formatMarks(summary.marksEarned)}</b></div><div><small>Negative marks</small><b className="marks-negative">−{formatMarks(summary.negativeMarks)}</b></div><div><small>Skipped potential</small><b>{formatMarks(summary.skippedPotential)}</b></div></div></section>
}

function AnalyticsBars({title,caption,items,accent}) {
  const marksSummary = accent === 'topic' ? items.marksSummary : null
  return <section className="panel analytics-panel">{marksSummary && <MarksBreakdown summary={marksSummary}/>}<div className="panel-head"><div><h3>{title}</h3><p>{caption}</p></div><span className={`analytics-count ${accent}`}>{items.length} group{items.length===1?'':'s'}</span></div>{items.length ? items.map(item=><div className="analytics-row" key={item.label}><div className="analytics-row-head"><b>{accent==='difficulty'?formatDifficulty(item.label):item.label}</b><strong>{item.accuracy}%</strong></div><div className="bar-track"><i className={accent} style={{width:`${item.accuracy}%`}}/></div><small>{item.correct} correct · {item.incorrect} incorrect · {item.skipped} skipped · {item.averageSeconds}s avg.</small></div>) : <div className="analytics-empty">No analytics available yet.</div>}</section>
}
function HistoryPage({attempts,navigate}) { return <><PageTitle eyebrow="YOUR ACTIVITY" title="Test history" description="Every completed practice session saved in this browser."/><section className="panel">{attempts.length?attempts.map(a=><button className="history-row" key={a.id} onClick={()=>navigate(`/results/${a.id}`)}><div className="activity-icon"><FileText size={18}/></div><div className="activity-main"><b>{a.bankName}</b><small>{new Date(a.completedAt).toLocaleString()} · {a.result.total} questions · {fmt(a.result.timeSeconds)}</small></div><strong>{a.result.accuracy}%</strong><ArrowRight size={16}/></button>):<Empty icon={<Clock3/>} title="No tests completed" text="Your completed tests will appear here."/ >}</section></> }
function PerformancePage({attempts}) {
  const avg=attempts.length?Math.round(attempts.reduce((s,a)=>s+a.result.accuracy,0)/attempts.length):0
  const best=attempts.length?Math.max(...attempts.map(a=>a.result.accuracy)):0
  return <><PageTitle eyebrow="YOUR PROGRESS" title="Performance" description="A simple view of how your practice is adding up."/><div className="stats-grid"><Stat icon={<ChartNoAxesCombined/>} label="Average accuracy" value={`${avg}%`} note="Across all tests" color="green"/><Stat icon={<CheckCircle2/>} label="Best accuracy" value={`${best}%`} note="Your highest result" color="purple"/><Stat icon={<FileText/>} label="Tests completed" value={attempts.length} note="Total attempts" color="blue"/><Stat icon={<Clock3/>} label="Practice time" value={formatDuration(attempts.reduce((s,a)=>s+a.result.timeSeconds,0))} note="Across all attempts" color="orange"/></div><section className="panel"><div className="panel-head"><div><h3>Recent test scores</h3><p>Accuracy across your latest attempts.</p></div></div>{attempts.length?attempts.slice(0,10).map(a=><div className="bar-row" key={a.id}><span>{a.bankName}</span><div className="bar-track"><i style={{width:`${a.result.accuracy}%`}}/></div><b>{a.result.accuracy}%</b></div>):<Empty icon={<ChartNoAxesCombined/>} title="Your progress starts here" text="Complete a test to see your performance."/ >}</section></>
}
function SettingsPage({settings,updateSettings,refresh,toast,attempts,banks}) {
  const fileRef=useRef(null)
  const questionCount=banks.reduce((total,booklet)=>total+booklet.questions.length,0)
  async function exportData() {
    const data=await exportAll()
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`quizforge-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Your backup has been downloaded.')
  }
  async function restore(e) {
    const file=e.target.files?.[0];if(!file)return
    if (file.size > 10 * 1024 * 1024) { toast('This backup is larger than 10 MB and was not opened.'); e.target.value=''; return }
    try {const data=JSON.parse(await file.text());if(!window.confirm('Restoring this backup will replace the QuizForge data currently stored in this browser. Continue?'))return;await importAll(data);updateSettings(data.settings||{});await refresh();toast('Backup restored successfully.')}
    catch(err){toast(err.message||'Could not restore this backup.')} finally {e.target.value=''}
  }
  async function resetHistory() {
    if(!window.confirm('Delete all completed and unfinished test history? Your question booklets and preferences will be kept.'))return
    await clearStore('attempts');await clearStore('drafts');await refresh();toast('Test history has been reset.')
  }
  async function resetAll() {
    if(!window.confirm('This permanently deletes all QuizForge data stored in this browser, including question booklets, history, unfinished tests, and preferences. Export a backup first if you may need it. Continue?'))return
    await clearAll();Object.keys(sessionStorage).filter(k=>k.startsWith('quizforge-session-')).forEach(k=>sessionStorage.removeItem(k));localStorage.removeItem('quizforge-settings');updateSettings({});await refresh();toast('QuizForge has been reset. You have a fresh start.')
  }
  return <><PageTitle eyebrow="PREFERENCES" title="Settings" description="Manage how QuizForge looks and how your local data is stored."/><div className="settings-stack"><section className="panel settings-panel"><h3>Appearance</h3><p>Choose the look that feels right for you.</p><div className="setting-row"><div><b>Dark mode</b><small>Use a darker color scheme.</small></div><input type="checkbox" checked={settings.theme==='dark'} onChange={e=>updateSettings({...settings,theme:e.target.checked?'dark':'light'})}/></div></section><section className="panel settings-panel"><h3>Data management</h3><p>Your data belongs to this browser profile. It is not synced to a server.</p><div className="data-summary"><div><b>{questionCount}</b><small>Questions in bank</small></div><div><b>{banks.length}</b><small>Question booklets</small></div><div><b>{attempts.length}</b><small>Completed tests</small></div></div><div className="setting-row"><div><b>Export my data</b><small>Download question booklets, history, and settings as a JSON backup.</small></div><button className="btn btn-secondary btn-small" onClick={exportData}><Download size={15}/> Export</button></div><div className="setting-row"><div><b>Restore from backup</b><small>Replace this browser's QuizForge data using a backup file.</small></div><button className="btn btn-secondary btn-small" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Restore</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={restore}/></div><div className="setting-row"><div><b>Reset performance history</b><small>Delete completed and unfinished tests, but keep question booklets.</small></div><button className="btn btn-danger-outline btn-small" onClick={resetHistory}><RotateCcw size={15}/> Reset history</button></div><div className="setting-row danger-row"><div><b>Fresh start — delete everything</b><small>Remove all question booklets, attempts, drafts, and preferences from this browser.</small></div><button className="btn btn-danger btn-small" onClick={resetAll}><Trash2 size={15}/> Complete reset</button></div></section><div className="privacy-callout"><CheckCircle2 size={18}/><div><b>Private by design</b><p>QuizForge stores your information in this browser using IndexedDB and LocalStorage. It does not create an account or send your test history to a server. Clearing browser data can erase it, so export backups regularly.</p></div></div></div></>
}
function formatDuration(seconds) { const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60);return h?`${h}h ${m}m`:`${m}m` }

export default App
