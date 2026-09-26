/* lishui-kit · 专名与枚举标签
 *
 * 英文页上的中文取值要翻成英文，来源有两处，按优先级：
 *   1. 底座 glossary.csv —— 专名（地名、水系、古迹……）的权威译法，全网络唯一一份；
 *   2. 内容库 schema/terms.en.json —— 枚举值（古迹类型、文保级别、朝代……）的译法。
 * 两处都查不到就原样返回，由校验脚本在入库前拦下，不让中文漏到英文页。
 *
 * 同一个中文词不得同时出现在两处：底座那份优先，内容库那份会被遮蔽而失效，
 * 改了不生效。历史遗留的重复条目已在阶段一清理，新增译法请只写一处。
 */

/** 把词表拍平成 中文 → 英文 的单层映射，方便一次查完。 */
export function flattenTerms(terms = {}) {
  const out = {};
  for (const group of Object.values(terms)) {
    if (!group || typeof group !== 'object') continue;
    for (const [zh, en] of Object.entries(group)) {
      if (zh && en && out[zh] === undefined) out[zh] = en;
    }
  }
  return out;
}

/** 生成 gloss 函数：中文原样返回，英文按词表查。 */
export function makeGloss({ glossary = [], terms = {} } = {}) {
  const flat = flattenTerms(terms);
  const byZh = new Map(glossary.map((g) => [g.zh, g.en]));
  return function gloss(zh, lang) {
    if (!zh) return '';
    if (lang === 'zh') return zh;
    const hit = byZh.get(zh);
    if (hit) return hit;
    return flat[zh] || zh;
  };
}

/** 词表里查不到的中文取值，用于校验门禁。 */
export function untranslated(values, { glossary = [], terms = {} } = {}) {
  const flat = flattenTerms(terms);
  const known = new Set([...glossary.map((g) => g.zh), ...Object.keys(flat)]);
  const CJK = /[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F]/;
  return values.filter((v) => typeof v === 'string' && v && CJK.test(v) && !known.has(v));
}

/* ---------- 枚举标签 ---------- */

export const enumLabel = (group, value, { ui, lang, gloss }) => {
  if (!value) return '';
  const table = ui && ui[group];
  if (lang === 'zh') return (table && table[value]) || value;
  if (table && table[value]) return table[value];
  return gloss(value, lang);
};

export const typeLabel = (entry, ctx) => enumLabel('type', entry.type, ctx);
export const depthLabel = (entry, ctx) => enumLabel('depth', entry.depth, ctx);
export const confLabel = (entry, ctx) => enumLabel('confidence', entry.confidence, ctx);
export const rightsLabel = (value, ctx) => enumLabel('rights', value, ctx);

/** 分类名：分类表由站点提供，每项形如 { key, zh, en }。 */
export function catLabel(entry, ctx, categories = []) {
  const c = categories.find((x) => x.key === entry.category) || categories[0];
  if (!c) return entry.category || '';
  return ctx.lang === 'zh' ? c.zh : c.en;
}
