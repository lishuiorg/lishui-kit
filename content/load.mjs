/* lishui-kit · 内容库装载
 *
 * 从内容库读取来源层与成果层，规范化成模板需要的形状。
 * 与框架无关：不认 Astro，也不认分类体系——分站的类别、分期、街镇
 * 都在站点层自行推导，这里只负责「把 Markdown 变成可渲染的条目」。
 *
 * 内容合库后按站分区：条目在 content/<siteId>/<dir> 与 content/en/<siteId>/<dir>，
 * 来源层 sources/ 全局共享，取值表由 schema/read.mjs 统一读取。
 *
 * 解析实现复用 ./frontmatter.mjs，与校验脚本共用一份，避免两处各写一遍。
 * 专名词表是例外：它不来自内容库，而是底座根目录的 glossary.csv，全站唯一一份。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { loadMarkdown, listMarkdown } from './frontmatter.mjs';
import { LANGS } from '../i18n/paths.mjs';
import { readGlossary } from '../i18n/glossary.mjs';
import { readSiteSchema, readTags, readTerms } from '../schema/read.mjs';

/** 来源层的三个子目录，对应三种归档深度。 */
export const SOURCE_DIRS = ['fulltext', 'excerpts', 'records'];

/** 内容库位置：按候选顺序取第一个含 schema/sites.json 的目录。 */
export function resolveContentDir(candidates) {
  for (const dir of candidates.filter(Boolean)) {
    if (existsSync(join(dir, 'schema', 'sites.json'))) return dir;
  }
  throw new Error(
    '找不到内容库。请设置 LISHUI_CONTENT_DIR，或把内容库放在候选路径之一。',
  );
}

/** Markdown 转 HTML，并给 h2/h3 加锚点、抽出目录。 */
export function renderMarkdown(body) {
  const html = marked.parse(body, { gfm: true, breaks: false });
  const toc = [];
  let n = 0;
  const withIds = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, level, inner) => {
    const id = `h-${++n}`;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    toc.push({ id, level: Number(level), text });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: withIds, toc };
}

/* ---------- 装载 ---------- */

/**
 * @param {object} opts
 * @param {string} opts.contentDir  内容库根目录
 * @param {string} opts.siteId      本站 site 字段取值，同时决定读哪一棵内容子树
 * @param {boolean} [opts.publishedOnly=true]  只取 status 为 published 的条目
 */
export function loadContent({ contentDir, siteId, publishedOnly = true }) {
  const { types, typeDirs, enums } = readSiteSchema(contentDir, siteId);
  const tags = readTags(contentDir);
  const terms = readTerms(contentDir);
  const glossary = readGlossary();

  const sources = new Map();
  for (const dir of SOURCE_DIRS) {
    for (const file of listMarkdown(join(contentDir, 'sources', dir))) {
      const { data } = loadMarkdown(file);
      if (data && data.id) sources.set(data.id, { ...data, dir, file });
    }
  }

  const entries = [];
  for (const [dirName, type] of Object.entries(typeDirs)) {
    for (const lang of LANGS) {
      const base = lang === 'zh'
        ? join(contentDir, 'content', siteId, dirName)
        : join(contentDir, 'content', 'en', siteId, dirName);
      for (const file of listMarkdown(base)) {
        const { data, body } = loadMarkdown(file);
        if (publishedOnly && data.status !== 'published') continue;
        const entry = { ...data, type, lang, dirName, slug: String(data.id).split(':').pop(), body, file };
        const { html, toc } = renderMarkdown(body);
        entry.html = html;
        entry.toc = toc;
        entry.sourcesResolved = (data.sources || []).map((s) => {
          const card = sources.get(s.ref) || { id: s.ref, title: s.ref, rights: 'unknown' };
          return { ...card, locator: s.locator || '', refNote: s.note || '' };
        });
        entries.push(entry);
      }
    }
  }

  const byId = new Map();
  for (const e of entries) {
    if (!byId.has(e.id)) byId.set(e.id, {});
    byId.get(e.id)[e.lang] = e;
  }

  for (const e of entries) {
    e.relatedResolved = (e.related || []).map((id) => byId.get(id)?.[e.lang]).filter(Boolean);
    e.placeRefResolved = (e.place_ref || []).map((id) => byId.get(id)?.[e.lang]).filter(Boolean);
  }

  /* 站点口径：来源层在库里是全局共享的一份，但站点页面上的「来源记录」数
     与「关于」页的授权/归档构成都是**本站**的，故只保留本站条目实际引用到的
     卡片。合库前该数等于本站 sources/ 目录的文件数（含少量无人引用的卡）；
     合库后按引用关系取，既不混入他站来源，也不再计入无人引用的卡。 */
  const cited = new Set();
  for (const e of entries) for (const s of e.sources || []) cited.add(s.ref);
  const siteSources = new Map([...sources].filter(([id]) => cited.has(id)));
  const sourcesAll = [...siteSources.values()]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  return {
    contentDir, siteId, types, typeDirs, enums, tags, terms, glossary,
    sources: siteSources, sourcesAll, entries, byId,
  };
}

/* ---------- 取用 ---------- */

export const forLang = (entries, lang) => entries.filter((e) => e.lang === lang);

export const ofSection = (entries, lang, dirName) =>
  entries.filter((e) => e.lang === lang && e.dirName === dirName);

/** 按年份升序；无年份的排在最后，按标题排。 */
export function byYear(a, b) {
  const ya = typeof a.time?.start === 'number' ? a.time.start : null;
  const yb = typeof b.time?.start === 'number' ? b.time.start : null;
  if (ya === null && yb === null) return String(a.title).localeCompare(String(b.title), 'zh');
  if (ya === null) return 1;
  if (yb === null) return -1;
  return ya - yb;
}

export const byUpdated = (a, b) =>
  String(b.updated || '').localeCompare(String(a.updated || ''))
  || String(a.title).localeCompare(String(b.title), 'zh');
