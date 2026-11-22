# QuizForge

A free, browser-based quiz and practice-test application. Import Google Sheets as question booklets, combine them into one question bank, build randomized tests, review performance, and export reports.

## Requirements
- Node.js 18+
- npm

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Google Sheets format
Required columns (case-insensitive):
`SN`, `Question`, `Option A`, `Option B`, `Option C`, `Option D`, `Answer`, `Difficulty Level`, `Subtopic`

Optional columns:
`Explanation`, `Marks`, `Negative Marks`

QuizForge treats every imported sheet as a **Question Booklet**. The **Question Bank** is the combined total of questions across all imported booklets. `Subtopic` powers topic filters and analytics, and `Difficulty Level` is read from each selected-sheet row.

Share the desired sheet/tab with **Anyone with the link → Viewer**, then paste the normal Google Sheets share URL into QuizForge. QuizForge reads the public view through Google’s Visualization datasource; publishing the sheet to the web is not required. A private Sheets URL will not work without an authenticated backend.

## Local data and privacy
Question booklets, attempts, settings, and unfinished quizzes are stored in this browser using IndexedDB and LocalStorage. Data is not synchronized between devices and can be lost if browser storage is cleared. Use Settings → Data management to export a JSON backup.

## GitHub Pages
1. Push this repository to GitHub with the repository name `quizforge`, or update `base` in `vite.config.js` to match your repository name.
2. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build source.
3. The included workflow builds and deploys on pushes to `main`.

For a custom domain or a repository named differently, update the Vite `base` path accordingly.

## SEO and deployment
The public home page includes descriptive metadata, Open Graph tags, SoftwareApplication and FAQ structured data, and helpful Google Sheets question-bank documentation. Quiz sessions, results, history, settings, and local management screens are marked `noindex` because they depend on browser-local data and are not useful public search pages.

Set `VITE_SITE_URL` to the canonical HTTPS address before building for production:
```bash
VITE_SITE_URL=https://your-domain.example npm run build
```
The build then emits `robots.txt` and `sitemap.xml` for that domain. Replace the example value with the real deployed URL; Google cannot reliably index a placeholder or localhost address. Keep HTTPS enabled at the hosting provider and submit the generated sitemap in Google Search Console.

## Important
QuizForge is designed for practice and self-assessment. Since scoring happens in the browser and public sheets may expose answer keys, it is not suitable for secure/high-stakes examinations.
