#!/usr/bin/env node
/* lishui-kit · 分站脚手架
 *
 * 把一个新分站从「照着旧站复制 20 多个文件、再逐处改站名」变成「跑一条命令、
 * 再填本站特有的分类体系」。生成两处：
 *
 *   站点库  <root>/<repo>/            站点骨架（页面薄包装、视图包装、站点配置、CI）
 *   内容库  <content>/schema/sites/<id>.json    本站取值表骨架
 *           <content>/schema/sites.json          登记本站（缺登记校验直接报错）
 *           <content>/content[/en]/<id>/<dir>/   本站内容子树（带 .gitkeep 占位）
 *
 * 生成物必须能直接 `npm run check` 跑通：分类体系与界面串都填了占位文字，
 * 条目数为零也照样构建、自检通过。占位处一律带「待办」注释，照着改即可。
 *
 * 用法：
 *   node lishui-kit/scripts/scaffold-site.mjs \
 *     --id lishui-shan-shui \
 *     --name 溧水山水 \
 *     --name-en "Lishui Land and Water" \
 *     --host shanshui.lishui.org \
 *     --sections places:place,articles:article
 *
 * 参数：
 *   --id        本站内容侧 siteId，形如 lishui-<主题>（必填）
 *   --name      中文站名（必填）
 *   --name-en   英文站名（必填）
 *   --host      本站域名，不带协议（必填）
 *   --sections  板块清单，形如 <目录名>:<实体类型>，逗号分隔（默认 articles:article）
 *   --repo      站点库目录名（默认由域名首段推出，如 shanshui → site-shanshui）
 *   --root      工作区根目录（默认脚手架所在库的上一级）
 *   --content   内容库目录（默认 <root>/lishui）
 *   --og-cover  分享封面图，拷贝到 public/assets/img/og-cover.jpg（默认从同级分站取一张）
 *   --dry-run   只列出将生成的文件，不写盘
 *
 * 已有文件一律不覆盖：站点库目录非空、本站取值表已存在、或站点已登记，都直接报错退出。
 * 零依赖，只用 node:fs，与其余脚本一致。
 */

import {
  existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

/* ---------- 参数 ---------- */

const USAGE = '用法：node lishui-kit/scripts/scaffold-site.mjs --id lishui-<主题> --name <中文站名> --name-en <英文站名> --host <域名> [--sections dir:type,...] [--repo site-<名>] [--dry-run]';

function parseArgs(argv) {
  const out = { sections: 'articles:article' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    if (name === 'dry-run') { out.dryRun = true; continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) fail(`参数 ${key} 缺少取值`);
    out[name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] = value;
    i += 1;
  }
  return out;
}

function fail(msg) {
  console.error(`错误  ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));

for (const key of ['id', 'name', 'nameEn', 'host']) {
  if (!args[key]) fail(`缺少必填参数 --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
}
if (!/^lishui-[a-z0-9]+(-[a-z0-9]+)*$/.test(args.id)) {
  fail(`--id 应为 lishui-<主题> 形式（内容库命名规则），收到：${args.id}`);
}
if (!/^[a-z0-9.-]+$/.test(args.host)) fail(`--host 只接受小写字母、数字、点与连字符：${args.host}`);

const ROOT = resolve(args.root || DEFAULT_ROOT);
const CONTENT_DIR = resolve(args.content || join(ROOT, 'lishui'));
const REPO = args.repo || `site-${args.host.split('.')[0]}`;
const SITE_DIR = join(ROOT, REPO);
const HOST_DIR = args.host.split('.')[0];

/** 板块清单：目录名 → 实体类型。目录名即 URL 段，也是内容子树的目录名。 */
const sections = args.sections.split(',').map((pair) => {
  const [dir, type] = pair.split(':');
  const d = String(dir || '').trim();
  const t = String(type || '').trim();
  if (!/^[a-z][a-z0-9-]*$/.test(d)) fail(`板块目录名不合规（小写字母起头，可含数字与连字符）：${pair}`);
  if (!/^[a-z][a-z0-9-]*$/.test(t)) fail(`实体类型不合规（小写字母起头，可含数字与连字符）：${pair}`);
  return { dir: d, type: t };
});
if (sections.length === 0) fail('--sections 至少要有一个板块');
if (new Set(sections.map((s) => s.dir)).size !== sections.length) fail('--sections 的目录名有重复');

const types = [...new Set(sections.map((s) => s.type))];

/* ---------- 前置检查：一律不覆盖 ---------- */

if (existsSync(SITE_DIR) && readdirSync(SITE_DIR).length > 0) {
  fail(`站点库目录已存在且非空，不予覆盖：${SITE_DIR}`);
}
const schemaFile = join(CONTENT_DIR, 'schema', 'sites', `${args.id}.json`);
if (existsSync(schemaFile)) fail(`本站取值表已存在，不予覆盖：${schemaFile}`);
const registryFile = join(CONTENT_DIR, 'schema', 'sites.json');
if (!existsSync(registryFile)) {
  fail(`找不到内容库站点登记：${registryFile}（用 --content 指定内容库目录）`);
}
const registry = JSON.parse(readFileSync(registryFile, 'utf8'));
if (registry[args.id]) fail(`站点 ${args.id} 已在 schema/sites.json 登记，不予覆盖`);

/* ---------- 写盘 ---------- */

const written = [];
const skipped = [];

function emit(absPath, content) {
  written.push(absPath);
  if (args.dryRun) return;
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, 'utf8');
}

const inSite = (rel) => join(SITE_DIR, ...rel.split('/'));
const siteFile = (rel, content) => emit(inSite(rel), content);

/* ---------- 站点库：根文件 ---------- */

siteFile('.gitignore', 'node_modules/\ndist/\n.astro/\n.DS_Store\n');

siteFile('package.json', `${JSON.stringify({
  name: REPO,
  version: '0.1.0',
  private: true,
  type: 'module',
  description: `${args.name}站点库。用 Astro 读取 lishui 统一内容库，生成静态站点，部署到 ${args.host}。`,
  scripts: {
    dev: 'astro dev',
    build: 'astro build',
    preview: 'astro preview',
    validate: `node ../lishui/scripts/validate.mjs --site ${args.id}`,
    'check-links': 'node ../lishui-kit/scripts/check-links.mjs',
    'check-pages': 'node ../lishui-kit/scripts/check-pages.mjs',
    check: 'npm run validate && npm run build && npm run check-links && npm run check-pages',
  },
  dependencies: { 'lishui-kit': 'file:../lishui-kit' },
  devDependencies: { astro: '^5.0.0' },
  engines: { node: '>=20' },
}, null, 2)}\n`);

siteFile('astro.config.mjs', `/* 站点构建配置
 *
 * 通用部分（静态输出、产物目录格式、Vite 解析）在 lishui-kit/astro/astro-config.mjs，
 * 本站只填自己的域名。
 */

import { makeAstroConfig } from 'lishui-kit/astro/astro-config.mjs';
import { SITE } from './src/site/config.mjs';

export default makeAstroConfig({ site: SITE.origin });
`);

siteFile('.github/workflows/deploy.yml', `name: 构建并发布

on:
  push:
    branches: [main]
  workflow_dispatch:
  # 每日重建一次：内容库合并不会自动触发分站重建（见主规划 6.1），
  # 这条定时兜住内容更新与门户站点清单的变化。UTC 18:00 = 北京时间次日 02:00。
  schedule:
    - cron: '0 18 * * *'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    uses: lishuiorg/lishui-kit/.github/workflows/site-deploy.yml@main
    with:
      site: ${REPO}
      siteId: ${args.id}
`);

siteFile('public/.nojekyll', '');
siteFile('public/CNAME', `${args.host}\n`);
siteFile('public/robots.txt', `User-agent: *
Allow: /

Sitemap: https://${args.host}/sitemap.xml
`);

siteFile('public/assets/img/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${args.name}">
  <rect width="64" height="64" rx="14" fill="#0E7C63"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="round">
    <path d="M11 43c8.4 0 11.6-17 21-17s12.6 17 21 17"/>
    <path d="M11 53c8.4 0 11.6-10.4 21-10.4S44.6 53 53 53" opacity=".5"/>
  </g>
  <circle cx="32" cy="15" r="5.6" fill="none" stroke="#FFFFFF" stroke-width="4.6"/>
</svg>
`);

/* 分享封面图：站徽那份站群统一，封面图是各站各拍一张，脚手架没法凭空生成，
   故从同级已有分站借一张，让新站一上线就有可用的 og:image。 */
const ogTarget = inSite('public/assets/img/og-cover.jpg');
const ogSource = args.ogCover ? resolve(args.ogCover) : findSiblingCover(ROOT);
if (ogSource) {
  written.push(ogTarget);
  if (!args.dryRun) {
    mkdirSync(dirname(ogTarget), { recursive: true });
    copyFileSync(ogSource, ogTarget);
  }
} else {
  skipped.push('public/assets/img/og-cover.jpg（未找到可借用的封面图，请自行补一张 1200×630 的图，否则社交分享无图）');
}

function findSiblingCover(root) {
  let names = [];
  try { names = readdirSync(root); } catch { return null; }
  for (const name of names) {
    if (!name.startsWith('site-') || name === REPO) continue;
    const candidate = join(root, name, 'public', 'assets', 'img', 'og-cover.jpg');
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/* ---------- 站点库：站点配置 ---------- */

const catLines = sections.map(({ dir }, i) => `  {
    key: '${dir}',
    zh: '${args.name}·${dir}',
    en: '${args.nameEn} · ${dir}',
    glyph: 'm${(i % 10) + 1}',
    dirName: '${dir}',
    desc: {
      zh: '待填写：本站「${dir}」板块收什么、按什么口径分类。',
      en: 'To be written: what the ${dir} section of this site holds, and how it is classified.',
    },
  },`).join('\n');

const sectionLines = sections.map(({ dir }) => `  ${dir}: {
    zh: {
      title: '${args.name}·${dir}',
      lede: '待填写：本站「${dir}」板块的收录范围与取舍口径。',
      note: '待填写：这一板块的已知缺口或口径说明，没有就删掉这一行。',
    },
    en: {
      title: '${args.nameEn} · ${dir}',
      lede: 'To be written: what the ${dir} section covers and how it draws its limits.',
      note: 'To be written: known gaps or caveats for this section; delete this line if there are none.',
    },
  },`).join('\n');

siteFile('src/site/config.mjs', `/* 站点常量与本站分类体系
 *
 * 由 lishui-kit/scripts/scaffold-site.mjs 生成。这里只放本站特有的东西：
 * 站点身份、类别表、板块说明、编纂凡例。全站一致的常量（ARCHIVE／RULES／
 * LIST_PAGE_SIZE）从底座再导出，各 View 的 import 语句因此不用改。
 *
 * 待办（生成后逐条替换）：
 *   1. CATEGORIES 现在一个板块一个类别，是占位。本站若按年代、门类或单元类型
 *      再分类，改 content.mjs 的 deriveCategory，并把这里的类别表补齐；
 *   2. SECTIONS 的标题与说明是占位，写成本站的实际口径；
 *   3. RULES 用的是底座默认的旧志口径四条。若本站口径不同（如街镇站按官方
 *      文件口径表述），把下面那行改成自写版本，参考 site-jiezhen/src/site/config.mjs。
 */

export const SITE = {
  id: '${args.id}',
  name: '${args.name}',
  nameEn: '${args.nameEn}',
  host: '${args.host}',
  origin: 'https://${args.host}',
  portal: 'https://lishui.org',
  portalName: '溧水一方',
  portalNameEn: 'A Place Called Lishui',
  contentUpdated: '',
};

/** 列表页每页条数、来源层归档方式、编纂凡例：全站一致，取自底座。 */
export { LIST_PAGE_SIZE, ARCHIVE, RULES } from 'lishui-kit/site-defaults.mjs';

/* ---------- 本站类别 ---------- */

/* 占位：一个板块一个类别，类别 key 即板块目录名。
   真实分类体系（按年代、门类、单元类型……）改这里，并同步 content.mjs 的 deriveCategory。 */

export const CATEGORIES = [
${catLines}
];

/* ---------- 板块说明 ---------- */

export const SECTIONS = {
${sectionLines}
};
`);

siteFile('src/site/content.mjs', `/* 内容装载（站点层）
 *
 * 通用的装载与解析在 lishui-kit：来源层与成果层读取、front-matter 解析、
 * Markdown 渲染、来源与关联解析。这里只做本站特有的两件事：类别归属、条目路径。
 *
 * 待办：deriveCategory 现在是「一个板块一个类别」的占位实现。本站若按年代、
 * 门类或单元类型再分类，改这个函数，并把 config.mjs 的 CATEGORIES 补齐。
 * 本站若还要按某些字段做筛选（如所属镇街、名录批次），在这里推出派生字段，
 * 再在 model.mjs 的 listModel 里加筛选组，参考 site-jiezhen/src/site/。
 */

import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, forLang } from 'lishui-kit';
import { entryPath } from 'lishui-kit/i18n/paths.mjs';
import { SITE, CATEGORIES } from './config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = resolve(HERE, '..', '..');

/** 内容库位置：环境变量优先，其次站点库内的 content/ 子模块，最后同级目录。
    探测标志是内容库的站点登记 schema/sites.json——合库后它才是内容库的标志文件。 */
export function resolveContentDir() {
  const candidates = [
    process.env.LISHUI_CONTENT_DIR,
    join(SITE_ROOT, 'content'),
    resolve(SITE_ROOT, '..', 'lishui'),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, 'schema', 'sites.json'))) return dir;
  }
  throw new Error(
    '找不到内容库。请设置 LISHUI_CONTENT_DIR，或在站点库内放置 content/ 子模块，'
    + '或把 lishui 内容库放在同级目录。',
  );
}

/** 类别归属：占位实现，类别 key 即板块目录名。 */
function deriveCategory(entry) {
  return entry.dirName;
}

let cached = null;

export function siteContent() {
  if (cached) return cached;

  const content = loadContent({ contentDir: resolveContentDir(), siteId: SITE.id });
  for (const entry of content.entries) {
    entry.category = deriveCategory(entry);
    entry.path = entryPath(entry);
  }

  const updated = content.entries.map((e) => e.updated).filter(Boolean).sort().pop() || '';
  SITE.contentUpdated = updated;
  cached = { ...content, updated };
  return cached;
}

/* ---------- 取用 ---------- */

export const ofSection = (entries, lang, dirName) =>
  entries.filter((e) => e.lang === lang && e.dirName === dirName);

export const byTitle = (a, b) => String(a.title).localeCompare(String(b.title), 'zh');

/** 站点规模：条目数、类别数、来源记录数。 */
export function statsOf(content, lang) {
  const list = forLang(content.entries, lang);
  return {
    entries: list.length,
    categories: CATEGORIES.length,
    sources: content.sourcesAll.length,
  };
}
`);

const navLines = sections.map(({ dir }) => `  { section: '${dir}', key: '${dir}' },`).join('\n');

siteFile('src/site/context.mjs', `/* 渲染上下文（站点层）
 *
 * 界面串由 kit 的默认值与本站覆盖值合并而成：本站 ui.<lang>.json 只留
 * 措辞不同的覆盖键与本站独有的键，其余共用键都在 lishui-kit/i18n/ui-default.mjs。
 * 再把合并结果、内容库、本站分类表交给 kit 的 makeContext，补上本站主导航。
 * ctx 只建一次，页面模块共用。
 */

import uiZh from '../i18n/ui.zh.json';
import uiEn from '../i18n/ui.en.json';
import { makeContext, mergeUi, UI_DEFAULT } from 'lishui-kit';
import { SITE, CATEGORIES } from './config.mjs';
import { siteContent } from './content.mjs';

const UI = { zh: uiZh, en: uiEn };

const NAV = [
  { section: 'home', key: 'home' },
${navLines}
  { section: 'index', key: 'index' },
  { section: 'about', key: 'about' },
];

const cache = new Map();

export function ctxFor(lang) {
  if (cache.has(lang)) return cache.get(lang);

  const ui = mergeUi(UI_DEFAULT[lang], UI[lang]);
  const ctx = makeContext({
    site: SITE,
    lang,
    ui,
    content: siteContent(),
    categories: CATEGORIES,
  });
  ctx.nav = NAV.map((item) => ({ section: item.section, label: ui.nav[item.key] }));

  cache.set(lang, ctx);
  return ctx;
}
`);

siteFile('src/site/model.mjs', `/* 页面模型（站点层）
 *
 * 视图模板在 lishui-kit/astro/views/，各站共用一份；本站要算什么、按什么口径算，
 * 全集中在这里。新增分站改的就是这个文件，不必再复制视图。
 *
 * 每个函数返回的对象直接摊给对应的模板：ctx 与 lang 是必给的，
 * 其余是本站特有的那几处（规模条取哪几项、筛选组、分组维度、元信息行、排序口径）。
 *
 * 待办：listModel 现在只有标签一个筛选组。本站若另有可筛选字段（年代、门类、
 * 所属镇街、名录批次……），在 content.mjs 里推出派生字段，在这里加筛选组，
 * 参考 site-jiezhen/src/site/model.mjs 的七个筛选组。
 */

import { forLang } from 'lishui-kit';
import { sectionPath } from 'lishui-kit/i18n/paths.mjs';
import { ctxFor } from './context.mjs';
import { siteContent, statsOf, ofSection, byTitle } from './content.mjs';
import { CATEGORIES, SECTIONS, RULES } from './config.mjs';

/** 规模条三项。本站若还要显示别的数字，在 content.mjs 的 statsOf 里加。 */
const STAT_KEYS = ['entries', 'categories', 'sources'];
const statItems = (stats) => STAT_KEYS.map((key) => ({ key, value: stats[key] }));

/** 首页凡例四条，编号与文字取自本站 config。 */
const rulesOf = (lang) => RULES[lang].map(([no, title, text]) => ({ no, title, text }));

/** 板块图标：占位按板块声明顺序取用，可在 config.mjs 的 CATEGORIES 里逐条改。 */
const GLYPH_OF = Object.fromEntries(
  Object.keys(SECTIONS).map((dir, i) => [dir, 'm' + ((i % 10) + 1)]),
);

/** 首页：形态是「板块卡」，中部预览区放本站各板块。 */
export function homeModel(lang) {
  const ctx = ctxFor(lang);
  const content = siteContent();
  const { ui } = ctx;

  const boardItems = Object.keys(content.typeDirs).map((dir) => {
    const entries = ofSection(content.entries, lang, dir);
    const text = SECTIONS[dir][lang];
    return {
      href: sectionPath(dir, lang),
      glyph: GLYPH_OF[dir] || 'm1',
      name: ui.nav[dir],
      alt: '',
      desc: text.lede,
      count: entries.length,
      countUnit: ui.list.countUnit,
      browseAll: ui.home.browseAll,
      empty: entries.length === 0,
    };
  });

  return {
    ctx,
    lang,
    statItems: statItems(statsOf(content, lang)),
    rules: rulesOf(lang),
    boardItems,
  };
}

/** 列表页：一个板块的条目，按标签筛选。 */
export function listModel(lang, section) {
  const ctx = ctxFor(lang);
  const content = siteContent();
  const { ui } = ctx;

  const entries = ofSection(content.entries, lang, section).sort(byTitle);
  const tags = [...new Set(entries.flatMap((e) => e.tags || []))]
    .sort((a, b) => String(a).localeCompare(String(b), 'zh'));

  /* 取值一律用内容库的原始取值（data-filter="组:值"），界面文字在这里译好。 */
  const groups = tags.length > 0 ? [{
    key: 'tag',
    label: ui.list.filterTag,
    options: tags.map((value) => ({ value, label: ctx.tagLabel(value) })),
  }] : [];

  return { ctx, lang, section, entries, groups, text: SECTIONS[section][lang] };
}

/** 索引页：按类别分组，供「有没有写」的快速核对。 */
export function indexModel(lang) {
  const ctx = ctxFor(lang);
  const content = siteContent();
  const { ui } = ctx;

  const list = forLang(content.entries, lang).sort(byTitle);
  const cats = CATEGORIES.filter((c) => list.some((e) => e.category === c.key));

  const groups = [
    ...cats.map((cat) => ({ key: cat.key, name: ctx.catName(cat), range: '', items: [] })),
    { key: 'none', name: ui.list.filterAll, range: '', items: [] },
  ];
  for (const entry of list) {
    const group = groups.find((g) => g.key === entry.category) || groups[groups.length - 1];
    group.items.push(entry);
  }

  return {
    ctx,
    lang,
    groups,
    columns: ['entry', 'category', 'depth'],
    total: list.length,
  };
}

/** 详情页：同板块条目按标题排，元信息行取本站要印的字段。 */
export function detailModel(lang, entry) {
  const ctx = ctxFor(lang);
  const { ui } = ctx;
  const sep = ctx.sep;

  const siblings = ofSection(siteContent().entries, lang, entry.dirName).sort(byTitle);

  const metaBits = [
    \`\${ui.detail.category}\${sep}\${ctx.catLabel(entry)}\`,
    \`\${ui.detail.depth}\${sep}\${ctx.depthLabel(entry)}\`,
    entry.updated ? \`\${ui.detail.updated}\${sep}\${entry.updated}\` : '',
  ].filter(Boolean);

  const schemaType = entry.type === 'place' ? 'Place' : entry.type === 'article' ? 'Article' : 'CreativeWork';

  return { ctx, lang, entry, siblings, metaBits, schemaType };
}

/** 关于页：左栏放范围、来源、门禁，右栏放许可、双语、纠错、技术说明。 */
export function aboutModel(lang) {
  const ctx = ctxFor(lang);
  return {
    ctx,
    lang,
    statItems: statItems(statsOf(siteContent(), lang)),
    columns: {
      left: ['scope', 'source', 'gate'],
      right: ['license', 'bilingual', 'fix', 'tech'],
    },
  };
}
`);

/* ---------- 站点库：界面串 ---------- */

const navZh = Object.fromEntries(sections.map(({ dir }) => [dir, `${args.name}·${dir}`]));
const navEn = Object.fromEntries(sections.map(({ dir }) => [dir, `${args.nameEn} · ${dir}`]));
const typeZh = Object.fromEntries(types.filter((t) => t !== 'article').map((t) => [t, t]));
const typeEn = Object.fromEntries(types.filter((t) => t !== 'article').map((t) => [t, t]));

const uiZh = {
  nav: navZh,
  hero: {
    eyebrow: `${args.name} · 江苏南京溧水区`,
    title: '待填写：一句话说清本站收什么',
    lede: '待填写：两三句说清本站的收录范围、口径与双语情况。',
    searchPlaceholder: '查条目：待填写两个示例',
  },
  home: {
    categoriesTitle: '待填写：本站类别',
    categoriesNote: '待填写：类别是怎么分的、只作导航还是兼作筛选维度。',
    sectionsTitle: '本站板块',
    sectionsNote: '待填写：各板块各成页，分别收什么。',
  },
  list: {
    // 本站若加了别的筛选维度，在这里补 filterXxx 标签。
  },
  indexPage: {
    lede: '待填写：按什么分组总览全部条目，列出哪几列，供什么核对。',
  },
  about: {
    lede: `待填写：${args.name}是溧水一方的分站之一，一句话说清本站收录什么。`,
    scopeBody: '待填写：本站收哪几种实体、各收什么、只收什么状态的条目。',
    sourceBody: '待填写：来源分几级、各以什么为准、口径冲突时怎么处理。',
    gateBody: '待填写：入库前要过哪些校验，本站另外加了哪几条硬规则。',
    techBody: '待填写：本站怎么构建、有没有时间轴、筛选维度是什么。',
  },
  footer: {
    about: `待填写：${args.name}是溧水一方的分站之一，条目文字采用 CC BY 4.0 授权。`,
  },
};

const uiEn = {
  nav: navEn,
  hero: {
    eyebrow: `${args.nameEn} · Lishui District, Nanjing, Jiangsu`,
    title: 'To be written: one line saying what this site covers',
    lede: 'To be written: two or three sentences on what this site covers, on what terms, and in which languages.',
    searchPlaceholder: 'Search: to be written, two examples',
  },
  home: {
    categoriesTitle: 'To be written: the categories here',
    categoriesNote: 'To be written: how the categories are drawn, and whether they filter or only navigate.',
    sectionsTitle: 'Sections on this site',
    sectionsNote: 'To be written: what each section holds; each has its own pages.',
    rulesNote: 'Four rules, enforced by the content repository’s validation script before anything is stored.',
  },
  list: {},
  indexPage: {
    lede: 'To be written: what the index groups by, which columns it shows, and what it lets you check.',
  },
  about: {
    lede: `To be written: ${args.nameEn} is one of the sub-sites of A Place Called Lishui; one line on what it covers.`,
    scopeBody: 'To be written: which entity types are held, what each covers, and which status is included.',
    sourceBody: 'To be written: how sources are ranked, what governs each kind of figure, and how conflicts are shown.',
    gateBody: 'To be written: which checks an entry passes before it is stored, and what this site adds.',
    techBody: 'To be written: how the site is built, whether there is a timeline, and what the filters run on.',
  },
  footer: {
    about: `To be written: ${args.nameEn} is one of the sub-sites of A Place Called Lishui. Entry text is licensed CC BY 4.0.`,
  },
};
if (types.some((t) => t !== 'article')) {
  uiZh.type = typeZh;
  uiEn.type = typeEn;
}

siteFile('src/i18n/ui.zh.json', `${JSON.stringify(uiZh, null, 2)}\n`);
siteFile('src/i18n/ui.en.json', `${JSON.stringify(uiEn, null, 2)}\n`);

/* ---------- 站点库：视图包装 ---------- */

siteFile('src/views/HomeView.astro', `---
/* 首页：形态取底座的「板块卡」变体，本站要算的东西在 site/model.mjs。 */
import HomeBoardView from 'lishui-kit/astro/views/HomeBoardView.astro';
import { homeModel } from '../site/model.mjs';

const { lang } = Astro.props;
---

<HomeBoardView {...homeModel(lang)} />
`);

siteFile('src/views/ListView.astro', `---
/* 列表页：模板取自底座，本站的筛选组与排序口径在 site/model.mjs。 */
import ListView from 'lishui-kit/astro/views/ListView.astro';
import { listModel } from '../site/model.mjs';

const { lang, section } = Astro.props;
---

<ListView {...listModel(lang, section)} />
`);

siteFile('src/views/IndexView.astro', `---
/* 索引页：模板取自底座，本站的分组维度与列序在 site/model.mjs。 */
import IndexView from 'lishui-kit/astro/views/IndexView.astro';
import { indexModel } from '../site/model.mjs';

const { lang } = Astro.props;
---

<IndexView {...indexModel(lang)} />
`);

siteFile('src/views/DetailView.astro', `---
/* 详情页：模板取自底座，本站的元信息行与同板块排序见 site/model.mjs。 */
import DetailView from 'lishui-kit/astro/views/DetailView.astro';
import { detailModel } from '../site/model.mjs';

const { lang, entry } = Astro.props;
---

<DetailView {...detailModel(lang, entry)} />
`);

siteFile('src/views/AboutView.astro', `---
/* 关于页：模板取自底座，本站规模条取哪几项与两栏各放哪几节见 site/model.mjs。 */
import AboutView from 'lishui-kit/astro/views/AboutView.astro';
import { aboutModel } from '../site/model.mjs';

const { lang } = Astro.props;
---

<AboutView {...aboutModel(lang)} />
`);

/* ---------- 站点库：路由 ---------- */

siteFile('src/pages/index.astro', `---
import HomeView from '../views/HomeView.astro';
---

<HomeView lang="zh" />
`);

siteFile('src/pages/404.astro', `---
import NotFoundView from 'lishui-kit/astro/views/NotFoundView.astro';
import { ctxFor } from '../site/context.mjs';

const ctx = ctxFor('zh');
---

<NotFoundView ctx={ctx} lang="zh" />
`);

siteFile('src/pages/about/index.astro', `---
import AboutView from '../../views/AboutView.astro';
---

<AboutView lang="zh" />
`);

siteFile('src/pages/index/index.astro', `---
import IndexView from '../../views/IndexView.astro';
---

<IndexView lang="zh" />
`);

siteFile('src/pages/[dir]/[slug].astro', `---
/* 条目详情：中文在根路径，英文在 /en/ 下，路径由内容库的目录名与 id 尾段决定。 */
import DetailView from '../../views/DetailView.astro';
import { siteContent } from '../../site/content.mjs';
import { forLang } from 'lishui-kit';

export function getStaticPaths() {
  return forLang(siteContent().entries, 'zh').map((entry) => ({
    params: { dir: entry.dirName, slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
---

<DetailView lang="zh" entry={entry} />
`);

siteFile('src/pages/en/index.astro', `---
import HomeView from '../../views/HomeView.astro';
---

<HomeView lang="en" />
`);

siteFile('src/pages/en/404.astro', `---
import NotFoundView from 'lishui-kit/astro/views/NotFoundView.astro';
import { ctxFor } from '../../site/context.mjs';

const ctx = ctxFor('en');
---

<NotFoundView ctx={ctx} lang="en" />
`);

siteFile('src/pages/en/about/index.astro', `---
import AboutView from '../../../views/AboutView.astro';
---

<AboutView lang="en" />
`);

siteFile('src/pages/en/index/index.astro', `---
import IndexView from '../../../views/IndexView.astro';
---

<IndexView lang="en" />
`);

siteFile('src/pages/en/[dir]/[slug].astro', `---
/* 英文条目详情：与中文页一一对应，路径只多 /en 前缀。 */
import DetailView from '../../../views/DetailView.astro';
import { siteContent } from '../../../site/content.mjs';
import { forLang } from 'lishui-kit';

export function getStaticPaths() {
  return forLang(siteContent().entries, 'en').map((entry) => ({
    params: { dir: entry.dirName, slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
---

<DetailView lang="en" entry={entry} />
`);

for (const { dir } of sections) {
  siteFile(`src/pages/${dir}/index.astro`, `---
import ListView from '../../views/ListView.astro';
---

<ListView lang="zh" section="${dir}" />
`);
  siteFile(`src/pages/en/${dir}/index.astro`, `---
import ListView from '../../../views/ListView.astro';
---

<ListView lang="en" section="${dir}" />
`);
}

siteFile('src/pages/sitemap.xml.js', `/* 站点地图：构建时从内容库枚举全部路由，中英同页互标 hreflang。
 * 路由表不手工维护，与 src/pages/ 下的页面一一对应。 */

import { buildSitemap } from 'lishui-kit/seo/sitemap.mjs';
import { sectionPath } from 'lishui-kit/i18n/paths.mjs';
import { forLang } from 'lishui-kit';
import { SITE } from '../site/config.mjs';
import { siteContent } from '../site/content.mjs';

const LANGS = ['zh', 'en'];

export function GET() {
  const content = siteContent();
  const routes = [];

  for (const lang of LANGS) {
    routes.push({ path: sectionPath('home', lang), lastmod: content.updated, priority: '1.0' });
    for (const section of Object.keys(content.typeDirs)) {
      routes.push({ path: sectionPath(section, lang), lastmod: content.updated, priority: '0.8' });
    }
    routes.push({ path: sectionPath('index', lang), lastmod: content.updated, priority: '0.7' });
    routes.push({ path: sectionPath('about', lang), lastmod: content.updated, priority: '0.5' });
    for (const entry of forLang(content.entries, lang)) {
      routes.push({ path: entry.path, lastmod: entry.updated, priority: '0.6' });
    }
  }

  return new Response(buildSitemap({ origin: SITE.origin, routes }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
`);

/* ---------- 站点库：README ---------- */

siteFile('README.md', `# ${REPO} · ${args.name}站点库

溧水一方「${args.name}」分站的站点库。内容在 \`lishui\` 统一内容库的 \`content/${args.id}/\`，共享底座在 \`lishui-kit\`，本站只写${args.name}特有的部分。

- 域名：\`${args.host}\`（中文在根路径，英文在 \`/en/\` 下）
- 生成器：Astro 5（静态输出，产物是纯 HTML）
- 内容侧 siteId：\`${args.id}\`

本库由 \`lishui-kit/scripts/scaffold-site.mjs\` 生成，生成时填的都是占位文字。

## 三个库的关系

| 库 | 放什么 | 本站怎么用 |
| --- | --- | --- |
| \`lishui\` | 全部内容：来源层与成果层的 Markdown，按 \`content/<siteId>/\` 分区 | 构建时只读本站子树，一条都不复制进本站 |
| \`lishui-kit\` | 设计系统、知识组件、视图模板、多语言、校验引擎 | 以 \`file:../lishui-kit\` 依赖引入，不重写 |
| \`${REPO}\` | 本站的站点身份、类别与板块规则、页面薄包装 | 本库 |

内容库位置按 \`LISHUI_CONTENT_DIR\` → 本站 \`content/\` 子模块 → 同级目录 \`../lishui\` 依次查找。

## 目录

| 路径 | 放什么 |
| --- | --- |
| \`src/pages/\` | 路由。中文在根下，英文在 \`en/\` 下的对称路径 |
| \`src/pages/[dir]/[slug].astro\` | 条目详情页，路径由内容库的目录名与 ID 尾段决定 |
| \`src/pages/sitemap.xml.js\` | 站点地图，构建时从内容库枚举路由 |
| \`src/views/\` | 页面包装：各自 \`import\` 底座的一种视图变体，把本站模型摊给它 |
| \`src/site/config.mjs\` | 本站常量、类别表、板块说明、编纂凡例 |
| \`src/site/content.mjs\` | 读内容库并套上本站规则（类别归属与派生字段） |
| \`src/site/model.mjs\` | 每个页面要算什么：规模条、筛选组、分组维度、元信息行、排序口径 |
| \`src/site/context.mjs\` | 渲染上下文，由 kit 的 \`makeContext\` 生成，页面共用 |
| \`src/i18n/ui.zh.json\`、\`ui.en.json\` | 界面串。英文用 \`: \`、中文用 \`：\`（\`labelSep\`） |
| \`public/\` | 原样拷贝进产物的静态件：\`CNAME\`、\`robots.txt\`、\`.nojekyll\`、\`assets/img/\` |

## 命令

\`\`\`bash
npm install          # 首次；lishui-kit 以 file: 依赖装在 node_modules 下
npm run dev          # 本地开发，http://localhost:4321/
npm run build        # 生成 dist/
npm run validate     # 内容校验（调内容库的校验脚本，只跑本站规则）
npm run check        # 校验 + 构建 + 站内链接自检 + 页面自检，提交前跑这个
\`\`\`

## 生成后待办

1. **先跑一次 \`npm install\`**，把 \`package-lock.json\` 提交进库——CI 用的是 \`npm ci\`，没有锁文件会直接失败。
2. 改 \`src/site/config.mjs\`：类别表、板块说明是占位；编纂凡例若与底座默认的旧志口径不同，改为自写版本。
3. 改 \`src/site/content.mjs\` 的 \`deriveCategory\`：现在是「一个板块一个类别」的占位实现。
4. 改 \`src/i18n/ui.zh.json\`、\`ui.en.json\`：所有「待填写」都是占位。英文那份必须整段英文，页面自检会拦下残留中文。
5. 补 \`public/assets/img/og-cover.jpg\`（1200×630）：脚手架从同级分站借了一张，正式上线前换成本站自己的图。
6. 在内容库 \`content/${args.id}/\` 与 \`content/en/${args.id}/\` 下写条目，中英成对，缺任一份两份都不发布。
7. 内容库 \`schema/sites/${args.id}.json\` 的取值表按本站需要填；填了中文取值就要在 \`lishui-kit/glossary.csv\` 补英文译法，否则校验报错。
8. 门户 \`site-portal/sites.json\` 里把本站 \`status\` 从 \`building\` 改为 \`live\`，站群导航与底座回归才会带上本站。
`);

/* ---------- 内容库：站点登记与取值表 ---------- */

const enumKeys = [
  types.includes('place') ? ['placeType', '本站地点（place）的实体类型取值。'] : null,
  types.includes('article') ? ['genre', '本站文章（article）的体裁取值。'] : null,
  types.includes('place') ? ['protectionLevel', '本站地点的文保级别取值；不涉及就删掉这一项。'] : null,
].filter(Boolean);

const schema = {
  $comment: `${args.name}分站的专属取值表与 ID 规则。站群共用的八项取值（dynasty／precision／depth／status／confidence／rights／archive／sourceType）与 sourceIdPattern 在 lishui-kit/schema/enums.common.json，本文件只列本站特有的。取值表里的中文取值必须能在 lishui-kit/glossary.csv 或本库 schema/terms.en.json 查到英文译法，否则校验报错（英文页会漏出中文）。空数组表示本站暂不限定该字段，填入后即成为取值表。`,
  idPattern: `^ls:(${types.join('|')}):[a-z0-9]+(-[a-z0-9]+)*$`,
};
for (const [key] of enumKeys) schema[key] = [];
schema.$comment += enumKeys.length > 0
  ? ` 待填：${enumKeys.map(([k, note]) => `${k}（${note}）`).join('；')}`
  : '';

emit(schemaFile, `${JSON.stringify(schema, null, 2)}\n`);

/* 登记进内容库站点清单：缺登记校验直接报错，故必须写。
   schema/sites.json 是手写 JSON，用文本插入而非重新序列化，避免整份重排。 */
const registryText = readFileSync(registryFile, 'utf8');
const entryJson = `${JSON.stringify({
  types,
  typeDirs: Object.fromEntries(sections.map(({ dir, type }) => [dir, type])),
}, null, 2).split('\n').map((line, i) => (i === 0 ? line : `  ${line}`)).join('\n')}`;
const insertAt = registryText.lastIndexOf('}');
const registryNext = `${registryText.slice(0, insertAt).replace(/\s*$/, '')},\n  ${JSON.stringify(args.id)}: ${entryJson}\n}\n`;
if (!args.dryRun) writeFileSync(registryFile, registryNext, 'utf8');
written.push(registryFile);

/* 内容子树：先建好带 .gitkeep 的空目录，作者不必猜路径。 */
for (const { dir } of sections) {
  for (const base of [join(CONTENT_DIR, 'content'), join(CONTENT_DIR, 'content', 'en')]) {
    emit(join(base, args.id, dir, '.gitkeep'), '');
  }
}

/* ---------- 收尾 ---------- */

const rel = (p) => p.slice(ROOT.length + 1).split(sep).join('/');

console.log(args.dryRun ? '（演练，未写盘）将生成：' : '已生成：');
for (const p of written) console.log(`  ${rel(p)}`);
for (const note of skipped) console.log(`  跳过 ${note}`);
console.log('');
console.log(`站点库    ${rel(SITE_DIR)}`);
console.log(`内容子树  ${rel(join(CONTENT_DIR, 'content', args.id))}（${sections.map((s) => s.dir).join('、')}）`);
console.log(`内容登记  schema/sites.json 与 schema/sites/${args.id}.json`);
console.log('');
console.log('下一步：');
console.log(`  1. cd ${rel(SITE_DIR)} && npm install   # 生成 package-lock.json，CI 用 npm ci`);
console.log('  2. npm run check                        # 应为 0 错误、0 失效链接、0 页面问题');
console.log('  3. 按 README 的「生成后待办」逐条替换占位文字');
console.log('  4. 内容库提交 schema 与 content 子树，站点库提交骨架，两边各自推送');
