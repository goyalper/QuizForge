import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function seoFiles(siteUrl) {
  const canonicalUrl = siteUrl ? `${siteUrl}/` : '/'
  return {
    name: 'quizforge-seo-files',
    transformIndexHtml(html) {
      return html.replaceAll('__QUIZFORGE_SITE_URL__', canonicalUrl)
    },
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist')
      mkdirSync(dist, { recursive: true })
      const sitemapLine = siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml` : ''
      const privatePaths = ['/quiz/', '/results/', '/history', '/performance', '/settings', '/banks', '/import', '/configure/', '/manage/']
      writeFileSync(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n${privatePaths.map(path => `Disallow: ${path}`).join('\n')}${sitemapLine}\n`)
      if (!siteUrl) return
      const today = new Date().toISOString().slice(0, 10)
      const publicPages = [
        { path: '/', changefreq: 'weekly', priority: '1.0' },
        { path: '/guides/google-sheets-quiz-maker/', changefreq: 'monthly', priority: '0.8' },
      ]
      const urls = publicPages.map(page => `<url><loc>${siteUrl}${page.path}</loc><lastmod>${today}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`).join('')
      writeFileSync(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/+$/, '')
  const repositoryName = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || 'quizforge'
  return {
    plugins: [react(), seoFiles(siteUrl)],
    // GitHub Pages project-site deployments use the repository name.
    base: process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : '/',
  }
})
