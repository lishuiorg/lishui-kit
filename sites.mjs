/* lishui-kit · 站群清单
 *
 * sites.json 由门户持有，是全部站点的唯一登记表：站点 ID、名称、域名、层级、
 * 上线状态、内容库与站点库。各分站构建时读它生成统一导航，不在代码里硬编码
 * 兄弟站点（见主规划 3.2 节「一张映射表」）。
 *
 * 查找顺序：LISHUI_SITES_JSON 环境变量 → 同级 site-portal/sites.json → 本目录 sites.json。
 * 本地开发与 CI 都把 site-portal 放在同级目录，故第二种是常规路径。
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function resolveSitesFile(root = process.cwd()) {
  const candidates = [
    process.env.LISHUI_SITES_JSON,
    resolve(root, '..', 'site-portal', 'sites.json'),
    resolve(root, 'sites.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error(
    '找不到 sites.json。请设置 LISHUI_SITES_JSON，或把 site-portal 放在同级目录。',
  );
}

let cached = null;

export function loadSites(root = process.cwd()) {
  if (cached) return cached;
  const file = resolveSitesFile(root);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  cached = { ...data, file };
  return cached;
}

/* 站群导航：只列已上线的分站——未上线的域名打不开，列出来只会点空。
   current 按 host 认，不按仓库名：内容库名（lishui-towns）与站点 ID（jiezhen）
   是两套码，host 是两者唯一的交集。 */
export function networkNav({ lang = 'zh', host = '', root } = {}) {
  const { sites } = loadSites(root);
  return sites
    .filter((s) => s.status === 'live' && s.host)
    .map((s) => ({
      id: s.id,
      name: lang === 'zh' ? s.name : s.nameEn,
      url: `https://${s.host}${lang === 'en' ? '/en/' : '/'}`,
      current: s.host === host,
    }));
}
