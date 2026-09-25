/* lishui-kit · 分页算式
 *
 * 长列表的页码与区间计算。纯函数、不碰 DOM：既给 client/filter.js 用，
 * 也能单独跑一遍验算。
 *
 * 分页只用于列表页。时间轴与索引页按期分组，条目要一次看全，
 * 也不该让分期计数只算当页，故不参与分页（见 client/filter.js）。
 */

/** 总页数：条目为 0 时也算一页，免得出现「第 1 / 0 页」。 */
export const pageCount = (total, pageSize) =>
  Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));

/** 把页码夹进有效范围；页码非法时退回第一页。 */
export function clampPage(page, total, pageSize) {
  const n = Math.trunc(Number(page));
  const max = pageCount(total, pageSize);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

/** 当页条目的起止序号（1 起、闭区间）；无命中时给 0–0。 */
export function pageRange(page, total, pageSize) {
  if (total <= 0) return { from: 0, to: 0 };
  const size = Math.max(1, pageSize);
  const p = clampPage(page, total, size);
  return { from: (p - 1) * size + 1, to: Math.min(total, p * size) };
}

/** 页码窗口：首末页恒在，当前页前后各 span 页，断开处插 '…'。 */
export function pageWindow(totalPages, current, span = 1) {
  const total = Math.max(1, Math.trunc(totalPages) || 1);
  const cur = Math.min(Math.max(1, Math.trunc(current) || 1), total);
  if (total <= 1) return [1];

  const nums = new Set([1, total, cur]);
  for (let i = 1; i <= span; i++) {
    if (cur - i >= 1) nums.add(cur - i);
    if (cur + i <= total) nums.add(cur + i);
  }

  const out = [];
  let prev = 0;
  for (const n of [...nums].sort((a, b) => a - b)) {
    if (prev && n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}
