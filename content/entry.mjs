/* lishui-kit · 条目派生
 *
 * 从条目字段派生出界面要用的东西：查找文本、筛选属性、可靠性标记。
 * 只认传入的 ctx（含 gloss、ui 与另一语言的条目），不认框架，也不认站点分类体系。
 */

/** 查找文本：条目自身字段 + 标签的英文写法 + 另一语言的标题，中英关键词都能命中。 */
export function searchText(entry, ctx) {
  const other = ctx.content.byId.get(entry.id)?.[ctx.lang === 'zh' ? 'en' : 'zh'];
  const parts = [
    entry.title, entry.subtitle, entry.summary, entry.era, entry.address,
    entry.protection_level, ...(entry.tags || []),
    ...(entry.tags || []).map((t) => ctx.gloss(t, ctx.lang)),
    ctx.typeLabel(entry), ctx.catLabel(entry),
    other?.title, other?.subtitle, other?.summary,
  ];
  return parts.filter(Boolean).join(' ');
}

/** 筛选用的 data-* 属性；组名与 client/filter.js 的约定一一对应。 */
export function filterAttrs(entry, ctx) {
  const attrs = {
    'data-searchable': '',
    'data-search-text': searchText(entry, ctx),
    'data-category': entry.category || '',
    'data-type': entry.type || '',
  };
  if (entry.time?.dynasty) attrs['data-dynasty'] = entry.time.dynasty;
  if (entry.town) attrs['data-town'] = entry.town;
  if (entry.tags?.length) attrs['data-tags'] = entry.tags.join(' ');
  return attrs;
}

/** 可靠性标记：可靠不显示，存疑与待核显形，未复核另标。 */
export function flags(entry, ctx) {
  const out = [];
  if (entry.confidence === 'medium' || entry.confidence === 'low') {
    out.push({
      level: entry.confidence,
      text: `${ctx.ui.detail.confidence}${ctx.ui.labelSep}${ctx.confLabel(entry)}`,
    });
  }
  if (entry.verified === false) {
    out.push({ level: 'low', text: ctx.lang === 'zh' ? '未复核' : 'unchecked' });
  }
  return out;
}
