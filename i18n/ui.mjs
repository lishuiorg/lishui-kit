/* lishui-kit · 界面串合并
 *
 * 底座给默认值（./ui-default.mjs），站点给覆盖值，逐层深合并成一份完整的界面串。
 * 规则：
 *   1. 两边都是普通对象 → 逐键合并，站点有的以站点为准；
 *   2. 其余情况（字符串、数字、布尔、数组、null）→ 站点值整体替换默认值。
 *      数组不逐项合并：界面串里的数组是整段列表（如凡例、导航项），
 *      逐项合并会拼出一个两边都不是的列表。
 */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mergeUi(base, override) {
  if (!isPlainObject(base)) return override === undefined ? base : override;
  if (!isPlainObject(override)) return override === undefined ? base : override;
  const out = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(override)])) {
    if (!(key in override)) out[key] = base[key];
    else if (!(key in base)) out[key] = override[key];
    else out[key] = mergeUi(base[key], override[key]);
  }
  return out;
}
