/* lishui-kit · 渲染上下文
 *
 * 把站点提供的界面文案、内容库、分类表，与 kit 的译法、年代、条目派生助手绑成一个 ctx；
 * 页面与组件只认 ctx，不再各自拼装。框架无关：Astro 组件与纯 JS 模板都能用。
 *
 * 站点负责给数据：ui（界面串）、content（内容库）、categories（本站类别表）、sections（本站板块）。
 */

import {
  enumLabel, makeGloss, typeLabel, depthLabel, confLabel, rightsLabel, catLabel,
} from './labels.mjs';
import { timeText, axisYear } from './time.mjs';
import { searchText, filterAttrs, flags } from '../content/entry.mjs';

export function makeContext({
  site, lang, ui, content, categories = [], sections = [],
}) {
  const gloss = makeGloss({ glossary: content.glossary, terms: content.terms });
  const catOf = (entry) => categories.find((c) => c.key === entry.category) || categories[0] || null;

  const ctx = {
    site, lang, ui, content, categories, sections, gloss,
    sep: ui.labelSep,
    enumLabel: (group, value) => enumLabel(group, value, { ui, lang, gloss }),
    typeLabel: (entry) => typeLabel(entry, ctx),
    depthLabel: (entry) => depthLabel(entry, ctx),
    confLabel: (entry) => confLabel(entry, ctx),
    rightsLabel: (value) => rightsLabel(value, ctx),
    catOf,
    catLabel: (entry) => catLabel(entry, ctx, categories),
    catName: (cat) => (cat ? (lang === 'zh' ? cat.zh : cat.en) : ''),
    catDesc: (cat) => (cat?.desc ? (lang === 'zh' ? cat.desc.zh : cat.desc.en) : ''),
    tagLabel: (tag) => gloss(tag, lang),
    timeText: (entry) => timeText(entry, { lang, gloss }),
    axisYear: (entry) => axisYear(entry, { lang, gloss }),
  };

  ctx.searchText = (entry) => searchText(entry, ctx);
  ctx.filterAttrs = (entry) => filterAttrs(entry, ctx);
  ctx.flags = (entry) => flags(entry, ctx);
  return ctx;
}
