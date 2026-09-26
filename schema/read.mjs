/* lishui-kit · 内容库取值表读取
 *
 * 内容合库后，取值表分三处：
 *   lishui-kit/schema/enums.common.json   站群共用的八项 + sourceIdPattern
 *   lishui/schema/sites.json              内容侧站点登记：siteId → types / typeDirs
 *   lishui/schema/sites/<siteId>.json     本站特有的取值表与 idPattern
 * 装载（content/load.mjs）与校验（validate/engine.mjs）共用这里的读取实现。
 *
 * 缺站点登记或缺本站取值表一律抛错，不静默降级：新增分站忘了声明时，
 * 校验必须失败，而不是悄悄放行全部取值（集中方案阶段三加固 ③）。
 *
 * 只用 node:fs，保持校验引擎零依赖，CI 无需 npm install。
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** 底座共用取值表。 */
export const COMMON_ENUMS_URL = new URL('./enums.common.json', import.meta.url);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const strip = (o) => { const { $comment, ...rest } = o; return rest; };

/** 站点登记：siteId → { types, typeDirs }。 */
export function readSiteRegistry(contentDir) {
  const p = join(contentDir, 'schema', 'sites.json');
  if (!existsSync(p)) {
    throw new Error(
      `内容库缺少 schema/sites.json：${contentDir}\n`
      + '（内容合库后，站点登记由该文件持有；探测内容库位置也以它为准）',
    );
  }
  return strip(readJson(p));
}

/**
 * 本站的取值表：底座的共用项与本站特有项合并后的结果。
 * @returns {{ registry:object, types:string[], typeDirs:Record<string,string>, enums:object }}
 */
export function readSiteSchema(contentDir, siteId) {
  const registry = readSiteRegistry(contentDir);
  const reg = registry[siteId];
  if (!reg) {
    throw new Error(
      `schema/sites.json 未登记站点 ${siteId}。新增分站必须先在此登记 types 与 typeDirs。`,
    );
  }
  const p = join(contentDir, 'schema', 'sites', `${siteId}.json`);
  if (!existsSync(p)) {
    throw new Error(
      `缺少 schema/sites/${siteId}.json：本站取值表未声明，校验不予放行。`
      + '（忘声明就构建失败，而不是悄悄放行全部取值）',
    );
  }
  return {
    registry: reg,
    types: reg.types,
    typeDirs: reg.typeDirs,
    enums: { ...strip(readJson(COMMON_ENUMS_URL)), ...strip(readJson(p)) },
  };
}

/** 站群标签表：三库合并去重后的单一份，分组只作维护参考。 */
export function readTags(contentDir) {
  return strip(readJson(join(contentDir, 'schema', 'tags.json'))).tags;
}

/** 枚举取值的英文译法：三库合并为一份，已剔除与 glossary.csv 重复的词条。 */
export function readTerms(contentDir) {
  const p = join(contentDir, 'schema', 'terms.en.json');
  if (!existsSync(p)) throw new Error(`内容库缺少 schema/terms.en.json：${contentDir}`);
  return strip(readJson(p));
}
