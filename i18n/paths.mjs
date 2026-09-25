/* lishui-kit · 路径规则
 *
 * 中文在根路径，英文在 /en/ 下；两种语言的页面路径一一对应，
 * 语言切换只换前缀，不跳回首页。
 * 纯函数，不依赖框架，构建脚本与模板共用。
 */

export const LANGS = ['zh', 'en'];
export const DEFAULT_LANG = 'zh';

/** 另一种语言的代码。 */
export const otherLang = (lang) => (lang === DEFAULT_LANG ? 'en' : DEFAULT_LANG);

/** 给路径套上语言前缀。 */
export function localizePath(path, lang) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return clean.startsWith('/en/') ? clean.slice(3) : clean;
  return clean.startsWith('/en/') ? clean : `/en${clean === '/' ? '/' : clean}`;
}

/** 语言切换目标：同一页面在另一种语言下的路径。 */
export const altPath = (path, lang) => localizePath(path, otherLang(lang));

/** 条目的页面路径，如 /events/sui-zhixian-591/ 或 /en/events/sui-zhixian-591/。 */
export function entryPath({ dirName, slug, lang }) {
  const base = `/${dirName}/${slug}/`;
  return lang === DEFAULT_LANG ? base : `/en${base}`;
}

/** 列表页路径；section 为 'home' 时即首页。 */
export function sectionPath(section, lang) {
  const base = section === 'home' ? '/' : `/${section}/`;
  return localizePath(base, lang);
}

/** 绝对地址。 */
export const absolute = (origin, path) => `${origin}${path}`;
