/* lishui-kit · 页面级自检
 *
 * 对构建产物做与内容无关的结构检查，各分站共用：
 *   1. 语言互指——每个页面都有另一种语言的对应链接，路径只差 /en 前缀；
 *   2. 元信息——canonical 与三支 hreflang 互指一致；
 *   3. 主题——<head> 里有防闪烁的内联主题脚本，页面上有切换按钮；
 *   4. 界面文字——英文页的标题、描述与主导航不得残留中文或全角冒号
 *      （正文引文与来源说明按原语言著录，不在检查范围内）。
 *
 * 用法：checkPages(dist) → { pages, problems: [{ file, msg }] }
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const CJK = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const FULLWIDTH_COLON = '：';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** 产物文件 → 站内路径（目录形式，首页为 /）。 */
function pathOf(root, file) {
  const rel = file.slice(root.length + 1).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return rel.endsWith('/index.html') ? `/${rel.slice(0, -10)}` : `/${rel}`;
}

const counterpartOf = (path) => (path.startsWith('/en/')
  ? path.slice(3)
  : `/en${path === '/' ? '/' : path}`);

const text = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : '';
};

export function checkPages(dist, { themeKey = 'lishui-theme' } = {}) {
  const root = resolve(dist);
  if (!existsSync(root)) throw new Error(`找不到构建产物目录：${root}`);

  const problems = [];
  const files = walk(root);
  const bad = (file, msg) => problems.push({ file: file.slice(root.length + 1), msg });

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const path = pathOf(root, file);
    const lang = path.startsWith('/en/') ? 'en' : 'zh';
    const other = counterpartOf(path);

    /* 404 页的 canonical 指回首页、不进索引，不参与镜像检查 */
    if (/(^|\/)404(\.html|\/)$/.test(path)) {
      if (!html.includes('<meta name="robots" content="noindex">')) {
        bad(file, '404 页缺少 noindex');
      }
      continue;
    }

    /* 1. 语言互指：另一种语言的链接指到镜像路径 */
    const switches = [...html.matchAll(/<a\s+href="([^"]*)"[^>]*data-lang-switch[^>]*>([^<]*)<\/a>/g)];
    if (switches.length !== 2) {
      bad(file, `语言切换链接应有 2 个，实为 ${switches.length} 个`);
    } else {
      const target = switches
        .map((m) => m[1].split('#')[0])
        .find((href) => href !== path);
      if (target !== other) bad(file, `语言切换指向 ${target}，应为 ${other}`);
    }

    /* 2. 元信息：canonical 与 hreflang 应落在镜像路径上 */
    const canonical = text(html, /<link rel="canonical" href="([^"]+)"/);
    if (!canonical.endsWith(path)) bad(file, `canonical 为 ${canonical}，与页面路径 ${path} 不一致`);
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
      .map((m) => [m[1], m[2]]);
    const alt = Object.fromEntries(alts);
    const expect = (href, label) => {
      if (!href) bad(file, `缺少 hreflang="${label}"`);
      else if (!href.endsWith(other) && !href.endsWith(path)) {
        bad(file, `hreflang="${label}" 指向 ${href}，既不是本页也不是镜像页`);
      }
    };
    expect(alt['zh-Hans'], 'zh-Hans');
    expect(alt.en, 'en');
    expect(alt['x-default'], 'x-default');

    /* 3. 主题：内联脚本防闪烁，按钮可切换 */
    if (!html.includes(`localStorage.getItem('${themeKey}')`)) bad(file, '缺少 <head> 内联主题脚本');
    if (!html.includes('data-theme-toggle')) bad(file, '缺少主题切换按钮');

    /* 4. 英文页的界面文字不得残留中文 */
    if (lang === 'en') {
      const chrome = [
        ['<title>', text(html, /<title>([\s\S]*?)<\/title>/)],
        ['description', text(html, /<meta name="description" content="([^"]*)"/)],
        ['主导航', [...html.matchAll(/<nav class="topnav"[^>]*>([\s\S]*?)<\/nav>/g)]
          .map((m) => m[1]).join('').replace(/<[^>]+>/g, ' ').trim()],
      ];
      for (const [label, value] of chrome) {
        if (CJK.test(value)) bad(file, `英文页${label}残留中文：${value.slice(0, 40)}`);
        if (value.includes(FULLWIDTH_COLON)) bad(file, `英文页${label}出现全角冒号`);
      }
    }
  }

  return { pages: files.length, problems };
}
