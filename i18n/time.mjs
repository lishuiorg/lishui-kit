/* lishui-kit · 年代表述
 *
 * 把 time 字段（start/end/precision/approx）写成中英两种自然语言。
 * 精度只有年、十年、世纪三档，负年份表示公元前。纯函数，模板与构建脚本共用。
 */

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function yearPhrase(n, precision, approx, lang) {
  const ap = approx ? (lang === 'zh' ? '约 ' : 'c. ') : '';
  if (n < 0) {
    const v = Math.abs(n);
    if (precision === 'century') {
      const c = Math.ceil(v / 100);
      return lang === 'zh' ? `${ap}公元前 ${c} 世纪` : `${ap}the ${ordinal(c)} century BCE`;
    }
    if (precision === 'decade') {
      const d = Math.floor(v / 10) * 10;
      return lang === 'zh' ? `${ap}公元前 ${d} 年代` : `${ap}the ${d}s BCE`;
    }
    return lang === 'zh' ? `${ap}公元前 ${v} 年` : `${ap}${v} BCE`;
  }
  if (precision === 'decade') {
    const d = Math.floor(n / 10) * 10;
    return lang === 'zh' ? `${ap}${d} 年代` : `${ap}the ${d}s`;
  }
  if (precision === 'century') {
    const c = Math.ceil(n / 100);
    return lang === 'zh' ? `${ap}${c} 世纪` : `${ap}the ${ordinal(c)} century`;
  }
  return `${ap}${n}`;
}

/** 时间字段的中英表述；没有年份时退回纪年（era）。 */
export function timeText(entry, { lang, gloss }) {
  const t = entry.time;
  if (!t || typeof t.start !== 'number') return entry.era ? gloss(entry.era, lang) : '';
  const a = yearPhrase(t.start, t.precision, t.approx, lang);
  if (typeof t.end === 'number' && t.end !== t.start) {
    const b = yearPhrase(t.end, t.precision, false, lang);
    return lang === 'zh' ? `${a} 至 ${b}` : `${a} to ${b}`;
  }
  return a;
}

/** 时间轴与索引表的年份短标：主行是年份，副行是朝代。 */
export function axisYear(entry, { lang, gloss }) {
  const t = entry.time;
  if (!t || typeof t.start !== 'number') {
    return { main: entry.era ? gloss(entry.era, lang) : '', sub: '' };
  }
  if (t.start < 0) {
    const v = Math.abs(t.start);
    const ap = t.approx ? (lang === 'zh' ? '约 ' : 'c. ') : '';
    return { main: lang === 'zh' ? `${ap}前 ${v}` : `${ap}${v} BCE`, sub: '' };
  }
  const ap = t.approx ? (lang === 'zh' ? '约 ' : 'c. ') : '';
  return { main: `${ap}${t.start}`, sub: t.dynasty ? gloss(t.dynasty, lang) : '' };
}
