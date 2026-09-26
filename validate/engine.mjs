/* lishui-kit · 内容校验引擎
 *
 * 通用校验，各分站共用：
 *   1. 来源层——id 与文件名一致、授权状态入表、链接类来源必须有访问日期、
 *      出版者为中文时必须补英文名；
 *   2. 成果层——必填字段、schema 之外的字段、id 与路径一致、取值入表、
 *      来源可解析、关联可解析；
 *   3. 英文稿——展示字段不得残留中文；纪年必须能查到译法；
 *   4. 词表覆盖——取值表里的中文取值必须都能翻成英文，否则英文页会漏出中文；
 *   5. 双语配对——published 条目必须中英成对，共用同一 ID；
 *   6. 专名一致——中文标题里的专名，英文标题必须用 glossary.csv 的译法。
 *
 * 内容合库后按站分区：本站条目在 content/<siteId>/<dir>，来源层 sources/ 全局共享，
 * 取值表由 schema/read.mjs 统一读取（底座共用项 + 本站特有项）。缺站点登记或
 * 缺本站取值表一律抛错，不静默放行。
 *
 * 另有三项与「分站会越来越多」直接相关的加固：
 *   · 译法表重叠即报错——同一个中文词不得同时住在 glossary.csv 与 terms.en.json；
 *   · 跨站关联显式识别——指向他站条目的 related 单独提示，不混作「ID 写错」；
 *   · validateAll——编排器一次跑完全部站点。
 *
 * 分站专属规则（如「事件必须有时间字段」）由站点以 extra 回调注入。
 * 专名词表取自底座根目录的 glossary.csv，不随内容库各存一份。
 * 零依赖，CI 无需 npm install。
 */

import { join, basename, relative, sep } from 'node:path';
import { loadMarkdown, listMarkdown } from '../content/frontmatter.mjs';
import { readGlossary } from '../i18n/glossary.mjs';
import { flattenTerms } from '../i18n/labels.mjs';
import { readSiteRegistry, readSiteSchema, readTags, readTerms } from '../schema/read.mjs';

export const CJK = /[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F]/;

export const BASE_REQUIRED = [
  'id', 'type', 'lang', 'site', 'title', 'summary', 'status', 'depth', 'sources', 'updated',
];

export const BASE_ALLOWED = new Set([
  'id', 'type', 'lang', 'site', 'title', 'subtitle', 'summary', 'tags', 'status', 'verified',
  'confidence', 'depth', 'sources', 'related', 'updated',
  'time', 'place_ref', 'outcome',
  'place_type', 'era', 'protection_level', 'protection_batch', 'address', 'coordinates',
  'genre', 'period', 'citations',
]);

export const TIME_KEYS = new Set(['start', 'end', 'dynasty', 'era', 'precision', 'approx']);

export const SOURCE_DIRS = ['fulltext', 'excerpts', 'records'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* 整库 ID 索引：id → siteId。跨站关联的识别靠它。
   内容库整库校验时才需要，故按 repo 缓存，validateAll 只扫一次。 */
const idIndexCache = new Map();

function idIndex(repo) {
  if (idIndexCache.has(repo)) return idIndexCache.get(repo);
  const index = new Map();
  for (const [siteId, reg] of Object.entries(readSiteRegistry(repo))) {
    for (const dirName of Object.keys(reg.typeDirs || {})) {
      for (const file of listMarkdown(join(repo, 'content', siteId, dirName))) {
        try {
          const { data } = loadMarkdown(file);
          if (data && data.id && !index.has(data.id)) index.set(data.id, siteId);
        } catch (e) { /* 解析失败由本站校验逐条报出，这里只做索引 */ }
      }
    }
  }
  idIndexCache.set(repo, index);
  return index;
}

/**
 * @param {object} opts
 * @param {string} opts.repo         内容库根目录
 * @param {string} opts.siteId       本站 site 字段取值
 * @param {Record<string,string>} [opts.typeDirs]  覆盖站点登记的实体目录（默认取 schema/sites.json）
 * @param {string[]} [opts.requiredFields]
 * @param {Set<string>} [opts.allowedFields]
 * @param {Set<string>} [opts.glossaryTitleCategories]  需校验专名一致性的词条类别
 * @param {(ctx:object)=>void} [opts.extra]  分站专属规则
 * @param {boolean} [opts.quiet]
 */
export function validateContent({
  repo,
  siteId,
  typeDirs,
  requiredFields = BASE_REQUIRED,
  allowedFields = BASE_ALLOWED,
  glossaryTitleCategories = new Set(),
  extra = null,
  quiet = false,
} = {}) {
  const problems = [];
  const err = (file, msg) => problems.push({ level: 'error', file, msg });
  const warn = (file, msg) => problems.push({ level: 'warn', file, msg });
  const rel = (p) => relative(repo, p).split(sep).join('/');

  const { registry, typeDirs: registered, enums } = readSiteSchema(repo, siteId);
  const dirs = typeDirs || registered;
  const tags = readTags(repo);
  const terms = readTerms(repo);
  const flatTerms = flattenTerms(terms);
  const allowedTags = new Set(Object.values(tags).flat());
  const glossary = readGlossary();
  const glossaryZh = new Set(glossary.map((g) => g.zh));
  /* 年号词根：术语表的 eraRoot（尚未收进词表的年号）+ 词表里的年号。
     合库时已收进 glossary.csv 的年号不再在 eraRoot 里重复（重复即死值），
     故两处都要算，否则「明洪武十八年」这类纪年串会判成无译法。 */
  const eraRoots = [
    ...Object.keys(terms.eraRoot || {}),
    ...glossary.filter((g) => g.category === '年号').map((g) => g.zh),
  ];

  const oneOf = (list, v) => list.includes(v);
  const thisYear = new Date().getFullYear();

  /* --- 译法表重叠：同一个中文词不得同时住在两张表里 --- */

  /* glossary.csv 优先于 terms.en.json，同时收进两处的那一份改不生效，
     正是阶段一 4 条译法冲突的根因。出现即报错，避免同类问题随站点增加反复发生。 */
  for (const zh of Object.keys(flatTerms)) {
    if (glossaryZh.has(zh)) {
      err('schema/terms.en.json', `「${zh}」在 glossary.csv 里已有译法，本表重复且不生效，请二选一`);
    }
  }

  /* --- 译法表内部重叠：同一个中文词不得跨组重复 --- */

  /* 查词走 flattenTerms（拍平成单层映射），只有先出现的那一组生效，后一组永不命中。
     重复即死值，改后一组不生效；合并三库词表时一次查出 30 处，故设门禁防复发。 */
  const seenZh = new Map();
  for (const [g, group] of Object.entries(terms)) {
    if (!group || typeof group !== 'object') continue;
    for (const zh of Object.keys(group)) {
      if (seenZh.has(zh)) {
        err('schema/terms.en.json',
          `「${zh}」同时住在 ${seenZh.get(zh)} 与 ${g} 两组，查词只认先出现的 ${seenZh.get(zh)}，${g} 那份不生效，请二选一`);
      } else seenZh.set(zh, g);
    }
  }

  /* --- 词表覆盖：取值表里的中文取值必须能翻成英文 --- */

  const translatable = (zh) => glossaryZh.has(zh) || flatTerms[zh] !== undefined;
  /* 年号通用式：纪年串里含任一年号词根即视为可译（glossary.csv「年号通用式」规则）。 */
  const eraTranslatable = (v) => translatable(v) || eraRoots.some((r) => v.includes(r));
  const enumValues = [
    ...(enums.placeType || []), ...(enums.genre || []), ...(enums.protectionLevel || []),
    ...(enums.dynasty || []), ...(enums.itemType || []), ...(enums.level || []),
    ...(enums.unitType || []), ...allowedTags,
  ];
  for (const v of new Set(enumValues)) {
    if (CJK.test(v) && !translatable(v)) {
      err('schema/terms.en.json', `取值「${v}」没有英文译法，英文页会漏出中文（补 glossary.csv 或 terms.en.json）`);
    }
  }

  /* --- 来源层 --- */

  const sources = new Map();
  for (const dir of SOURCE_DIRS) {
    for (const file of listMarkdown(join(repo, 'sources', dir))) {
      const f = rel(file);
      let doc;
      try {
        doc = loadMarkdown(file);
      } catch (e) {
        err(f, `front-matter 解析失败：${e.message}`);
        continue;
      }
      const d = doc.data;
      const slug = basename(file, '.md');
      if (!d.id) { err(f, '缺少 id'); continue; }
      if (!new RegExp(enums.sourceIdPattern || '^src:').test(d.id)) {
        err(f, `id 格式不合规：${d.id}`);
      }
      if (d.id !== `src:${slug}`) err(f, `id 与文件名不一致：${d.id} ≠ src:${slug}`);
      if (sources.has(d.id)) err(f, `来源 id 重复：${d.id}`);
      if (!d.title) err(f, '缺少 title');
      if (!d.rights) err(f, '缺少 rights');
      else if (!oneOf(enums.rights, d.rights)) err(f, `rights 取值不在取值表内：${d.rights}`);
      if (d.type && !oneOf(enums.sourceType, d.type)) err(f, `type 取值不在取值表内：${d.type}`);
      if (d.archive && !oneOf(enums.archive, d.archive)) err(f, `archive 取值不在取值表内：${d.archive}`);
      if (d.accessed && !DATE_RE.test(String(d.accessed))) {
        err(f, `accessed 需为 YYYY-MM-DD：${d.accessed}`);
      }
      if ((d.archive === 'link' || d.archive === 'link-registered') && !d.accessed) {
        err(f, '链接类来源必须填 accessed');
      }
      if (!d.url && d.archive !== 'catalogued-only') {
        warn(f, '未填 url 且归档状态不是 catalogued-only，请在 note 说明');
      }
      if (!d.note) warn(f, '未填 note，来源的授权判断依据无处可查');
      /* 英文页的来源区显示出版者的英文名；note 与引文位置按约定保留原文献语言。 */
      if (CJK.test(String(d.publisher || '')) && !d.publisherEn) {
        err(f, 'publisher 为中文，需补 publisherEn，否则英文页来源区会漏出中文机构名');
      }
      sources.set(d.id, { ...d, file: f });
    }
  }

  /* --- 成果层 --- */

  const entries = [];
  for (const [dirName, type] of Object.entries(dirs)) {
    for (const lang of ['zh', 'en']) {
      const base = lang === 'zh'
        ? join(repo, 'content', siteId, dirName)
        : join(repo, 'content', 'en', siteId, dirName);
      for (const file of listMarkdown(base)) {
        const f = rel(file);
        let doc;
        try {
          doc = loadMarkdown(file);
        } catch (e) {
          err(f, `front-matter 解析失败：${e.message}`);
          continue;
        }
        entries.push({ ...doc, file: f, dir: dirName, type, lang, slug: basename(file, '.md') });
      }
    }
  }

  const byId = new Map();
  for (const e of entries) {
    const d = e.data;
    if (!d.id) { err(e.file, '缺少 id'); continue; }
    if (!byId.has(d.id)) byId.set(d.id, {});
    const slot = byId.get(d.id);
    if (slot[e.lang]) err(e.file, `同一语言出现重复条目：${d.id}`);
    slot[e.lang] = e;
  }

  /* 跨站关联识别：内容合库后 byId 只装本站条目，指向他站条目的关联会报「不存在」，
     容易被当成 ID 写错。这里单独判一次并给出明确提示。 */
  const index = idIndex(repo);
  const siteOf = (id) => {
    const owner = index.get(id);
    return owner && owner !== siteId ? owner : null;
  };

  for (const e of entries) {
    const d = e.data;
    const f = e.file;

    for (const k of requiredFields) {
      if (d[k] === undefined || d[k] === null || d[k] === '') err(f, `缺少必填字段：${k}`);
    }
    for (const k of Object.keys(d)) {
      if (!allowedFields.has(k)) err(f, `出现 schema 之外的字段：${k}`);
    }

    if (d.id) {
      if (!new RegExp(enums.idPattern).test(d.id)) err(f, `id 格式不合规：${d.id}`);
      const expected = `ls:${e.type}:${e.slug}`;
      if (d.id !== expected) err(f, `id 与路径不一致：${d.id} ≠ ${expected}`);
    }
    if (d.type && d.type !== e.type) err(f, `type 与所在目录不一致：${d.type} ≠ ${e.type}`);
    if (d.lang && d.lang !== e.lang) err(f, `lang 与所在路径不一致：${d.lang} ≠ ${e.lang}`);
    if (d.site && d.site !== siteId) err(f, `site 取值应为 ${siteId}：${d.site}`);

    if (typeof d.summary === 'string' && d.summary.length < 10) err(f, 'summary 过短，需 10 字以上');
    if (d.status && !oneOf(enums.status, d.status)) err(f, `status 取值不在取值表内：${d.status}`);
    if (d.depth && !oneOf(enums.depth, d.depth)) err(f, `depth 取值不在取值表内：${d.depth}`);
    if (d.confidence && !oneOf(enums.confidence, d.confidence)) {
      err(f, `confidence 取值不在取值表内：${d.confidence}`);
    }
    if (d.verified !== undefined && typeof d.verified !== 'boolean') err(f, 'verified 需为布尔值');
    if (d.updated && !DATE_RE.test(String(d.updated))) {
      err(f, `updated 需为 YYYY-MM-DD：${d.updated}`);
    }

    if (!Array.isArray(d.tags) || d.tags.length === 0) {
      warn(f, '未填 tags，条目将无法按标签筛选');
    } else {
      for (const t of d.tags) {
        if (!allowedTags.has(t)) err(f, `标签未入表：${t}（先加入 schema/tags.json 再使用）`);
      }
    }

    if (e.lang === 'en') {
      /* 这些字段直接印在英文页上，留中文即漏译。 */
      for (const k of ['title', 'subtitle', 'summary', 'outcome', 'protection_batch', 'address']) {
        if (typeof d[k] === 'string' && CJK.test(d[k])) {
          err(f, `${k} 中不应出现中文字符（英文稿的展示字段需完整英译）`);
        }
      }
      /* era 是中英共用字段：要么已英译，要么能查到译法（含年号通用式），否则英文页会漏出中文。 */
      for (const v of [d.era, d.time?.era]) {
        if (typeof v === 'string' && v && CJK.test(v) && !eraTranslatable(v)) {
          err(f, `era「${v}」既非英文也无译法（补 glossary.csv、terms.en.json 的年号词根，或改写为英文）`);
        }
      }
      /* 枚举取值同理：古迹类型、体裁、文保级别、朝代都要能翻。 */
      for (const v of [d.place_type, d.genre, d.protection_level, d.time?.dynasty, ...(d.tags || [])]) {
        if (typeof v === 'string' && v && CJK.test(v) && !translatable(v)) {
          err(f, `取值「${v}」没有英文译法，英文页会漏出中文`);
        }
      }
    }

    /* 来源引用 */
    if (!Array.isArray(d.sources) || d.sources.length === 0) {
      if (d.status === 'published') err(f, 'published 条目必须至少有一个来源');
    } else {
      for (const s of d.sources) {
        if (!s || typeof s !== 'object') { err(f, 'sources 条目需为对象'); continue; }
        if (!s.ref) { err(f, '来源引用缺少 ref'); continue; }
        const src = sources.get(s.ref);
        if (!src) { err(f, `引用了不存在的来源：${s.ref}`); continue; }
        if (src.rights === 'excerpt-only' || src.rights === 'link-only') {
          if (!s.locator) err(f, `引用摘录类来源必须填 locator：${s.ref}（${src.rights}）`);
        }
        if (src.rights === 'permission-required' && d.status === 'published') {
          err(f, `引用了授权未定的来源，不得发布：${s.ref}`);
        }
      }
    }

    /* 关联条目 */
    if (d.related !== undefined) {
      if (!Array.isArray(d.related)) err(f, 'related 需为数组');
      else for (const r of d.related) {
        if (!/^ls:[a-z]+:[a-z0-9]+(-[a-z0-9]+)*$/.test(r)) err(f, `related 取值格式不合规：${r}`);
        else if (!byId.has(r)) {
          const owner = siteOf(r);
          if (owner) {
            err(f, `related 指向其他分站的条目：${r} 属于 ${owner}。`
              + '内容合库后 related 只在本站范围内解析，跨站引用请改用绝对 URL');
          } else err(f, `关联的条目不存在：${r}`);
        }
      }
    }

    /* 时间字段 */
    if (d.time !== undefined) {
      const t = d.time;
      if (t === null || typeof t !== 'object') err(f, 'time 需为对象');
      else {
        for (const k of Object.keys(t)) {
          if (!TIME_KEYS.has(k)) err(f, `time 出现 schema 之外的字段：${k}`);
        }
        if (typeof t.start !== 'number') err(f, 'time.start 需为整数年份');
        if (t.end !== undefined && typeof t.end !== 'number') err(f, 'time.end 需为整数年份');
        if (typeof t.start === 'number' && typeof t.end === 'number' && t.end < t.start) {
          err(f, `time.end 早于 time.start：${t.end} < ${t.start}`);
        }
        if (t.dynasty !== undefined && !oneOf(enums.dynasty, t.dynasty)) {
          err(f, `朝代取值不在取值表内：${t.dynasty}`);
        }
        if (t.precision !== undefined && !oneOf(enums.precision, t.precision)) {
          err(f, `precision 取值不在取值表内：${t.precision}`);
        }
        if (t.approx !== undefined && typeof t.approx !== 'boolean') err(f, 'time.approx 需为布尔值');
      }
    }

    /* 分站专属规则 */
    if (extra) {
      extra({
        entry: e, data: d, file: f, sources, byId, enums, glossary, terms: flatTerms,
        registry, siteOf, err, warn, oneOf, CJK,
      });
    }
  }

  /* --- 双语配对 --- */

  for (const [id, slot] of byId) {
    const { zh, en } = slot;
    if (!zh && en) err(en.file, `缺少中文稿：${id}`);
    if (zh && !en) {
      if (zh.data.status === 'published') err(zh.file, `published 条目缺少英文稿：${id}`);
      else warn(zh.file, `尚无英文稿：${id}`);
    }
    if (zh && en) {
      if (zh.data.type !== en.data.type) err(en.file, '中英稿 type 不一致');
      const zhLen = zh.body.replace(/\s/g, '').length;
      const enLen = en.body.split(/\s+/).filter(Boolean).length;
      if (zhLen > 0 && enLen / zhLen < 0.2) {
        warn(en.file, `英文稿偏短（${enLen} 词 / 中文 ${zhLen} 字），计划口径为中文的 70% 至 80%`);
      }
    }
  }

  /* --- 专名一致性 --- */

  for (const [id, slot] of byId) {
    const { zh, en } = slot;
    if (!zh || !en) continue;
    const zhTitle = String(zh.data.title || '');
    const enDisplay = `${en.data.title || ''} ${en.data.subtitle || ''}`.toLowerCase();
    /* 词表三库合一份后，长词会被它包含的短词重复命中：「义气墩故事」同时含
       「义气墩」（历史库的墓葬词条），若逐条要求译法就会误报。重叠时只认最长
       的那个词条，短词被覆盖即跳过。覆盖者不限于本站要校验的类别——更专的词
       条（如上例的「义气墩故事」）即便不属于这些类别，也照样管住短词。 */
    const hits = [];
    for (const g of glossary) {
      if (g.category === '规则') continue;
      for (let at = zhTitle.indexOf(g.zh); at !== -1; at = zhTitle.indexOf(g.zh, at + 1)) {
        hits.push({ g, at, end: at + g.zh.length });
      }
    }
    const reported = new Set();
    for (const h of hits) {
      if (!glossaryTitleCategories.has(h.g.category) || reported.has(h.g)) continue;
      reported.add(h.g);
      const covered = hits.some((o) => o.at <= h.at && o.end >= h.end && o.end - o.at > h.end - h.at);
      if (covered) continue;
      if (!enDisplay.includes(h.g.en.toLowerCase())) {
        err(en.file, `专名不一致：中文标题含「${h.g.zh}」，英文标题与副标题未见「${h.g.en}」`);
      }
    }
    for (const line of en.body.split('\n')) {
      if (line.trim().startsWith('>')) continue;
      for (const g of glossary) {
        if (g.category === '规则') continue;
        if (g.zh.length >= 5 && line.includes(g.zh)) {
          warn(en.file, `正文出现未在引文中的中文专名「${g.zh}」，请确认是引原文还是漏译`);
        }
      }
    }
  }

  /* --- 输出 --- */

  const errors = problems.filter((p) => p.level === 'error');
  const warns = problems.filter((p) => p.level === 'warn');

  if (!quiet) {
    for (const p of problems) {
      console.log(`${p.level === 'error' ? '错误' : '警告'}  ${p.file}  ${p.msg}`);
    }
    console.log('');
    console.log(`[${siteId}] 条目 ${entries.length} 条（中 ${entries.filter((e) => e.lang === 'zh').length} / 英 ${entries.filter((e) => e.lang === 'en').length}），`
      + `来源记录 ${sources.size} 份，标签 ${allowedTags.size} 个，专名 ${glossary.length} 条`);
    console.log(`错误 ${errors.length} 项，警告 ${warns.length} 项`);
    if (errors.length === 0) console.log('校验通过。');
  }

  return { siteId, problems, errors, warns, entries, sources, enums, glossary, terms: flatTerms };
}

/**
 * 一次跑完全部站点。编排器（内容库 scripts/validate.mjs）把各站规则模块传进来，
 * 每站只套本站规则，互不干扰。
 * @param {object} opts
 * @param {string} opts.repo
 * @param {Array<{siteId?:string, SITE_ID?:string, run:Function}>} opts.sites
 * @param {boolean} [opts.quiet]
 */
export function validateAll({ repo, sites, quiet = false } = {}) {
  const results = sites.map((m) => {
    const siteId = m.siteId || m.SITE_ID || '(未命名)';
    return { siteId, result: m.run({ repo, quiet: true }) };
  });
  const problems = results.flatMap(({ siteId, result }) => (
    result.problems.map((p) => ({ ...p, siteId }))
  ));
  const errors = problems.filter((p) => p.level === 'error');
  const warns = problems.filter((p) => p.level === 'warn');

  if (!quiet) {
    for (const p of problems) {
      console.log(`${p.level === 'error' ? '错误' : '警告'}  [${p.siteId}]  ${p.file}  ${p.msg}`);
    }
    console.log('');
    for (const { siteId, result } of results) {
      console.log(`[${siteId}] 条目 ${result.entries.length} 条，来源引用 ${result.sources.size} 份`);
    }
    console.log(`合计错误 ${errors.length} 项，警告 ${warns.length} 项`);
    if (errors.length === 0) console.log('校验通过。');
  }

  return { results, problems, errors, warns };
}
