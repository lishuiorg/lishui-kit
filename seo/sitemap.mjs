/* lishui-kit · 站点地图
 *
 * 站群共用：两种语言的同一页面互标 hreflang，中文为 x-default。
 * 站点把路由表交进来，路由项形如 { path, lastmod, priority }，
 * path 是站内绝对路径（中文无前缀、英文带 /en 前缀）。
 *
 * 生成逻辑只认「中文在根路径、英文在 /en/ 下」这一条约定，
 * 因此与具体分站的板块结构无关。
 */

import { DEFAULT_LANG, otherLang } from '../i18n/paths.mjs';

const LANGS = [DEFAULT_LANG, otherLang(DEFAULT_LANG)];

/** 去掉语言前缀，得到中英共用的键。 */
function keyOf(path, lang) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return clean;
  return clean.startsWith('/en/') ? clean.slice(3) : clean;
}

export function buildSitemap({ origin, routes = [] }) {
  const pairs = new Map();
  for (const route of routes) {
    const lang = route.path.startsWith('/en/') || route.path === '/en' ? 'en' : DEFAULT_LANG;
    const key = keyOf(route.path, lang);
    if (!pairs.has(key)) pairs.set(key, {});
    pairs.get(key)[lang] = route;
  }

  const rows = [];
  for (const [key, pair] of pairs) {
    const lastmod = LANGS.map((l) => pair[l]?.lastmod).filter(Boolean).sort().pop();
    for (const lang of LANGS) {
      const route = pair[lang];
      if (!route) continue;
      const zhPath = pair[DEFAULT_LANG]?.path || key;
      const enPath = pair.en?.path || `/en${key === '/' ? '/' : key}`;
      rows.push([
        '  <url>',
        `    <loc>${origin}${route.path}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        `    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${origin}${zhPath}"/>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${origin}${enPath}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${zhPath}"/>`,
        `    <priority>${route.priority || '0.6'}</priority>`,
        '  </url>',
      ].filter(Boolean).join('\n'));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...rows,
    '</urlset>',
    '',
  ].join('\n');
}

/** 爬虫规则：只放行，并指向站点地图。 */
export const buildRobots = ({ origin, sitemapPath = '/sitemap.xml' }) => [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${origin}${sitemapPath}`,
  '',
].join('\n');
