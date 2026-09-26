/* lishui-kit · 专名词表
 *
 * 词表（专名中英译法）是全站唯一一份，放在底座根目录，不随内容库各存一份。
 * 渲染（content/load.mjs）与校验（validate/engine.mjs）共用这里的读取实现。
 *
 * 单独成模块而不是挂在 content/load.mjs 上，是为了让校验引擎保持零依赖：
 * load.mjs 需要 marked，校验脚本在 CI 上不装 npm 包。
 */

import { readCsv } from '../content/frontmatter.mjs';

/** 词表位置：底座根目录的 glossary.csv。 */
export const GLOSSARY_URL = new URL('../glossary.csv', import.meta.url);

/** 读取词表，返回 [{ zh, en, category, note }]。表头行跳过，缺中文或缺英文的行丢弃。 */
export function readGlossary() {
  return readCsv(GLOSSARY_URL)
    .slice(1)
    .map((r) => ({ zh: r[0], en: r[1], category: r[2] || '', note: r[3] || '' }))
    .filter((r) => r.zh && r.en);
}
