/* 从站群清单取当前在线分站，供 CI 生成构建矩阵。
 *
 * 站点清单是门户持有的 sites.json——站群唯一数据源。新站上线只改那里的 status，
 * 本脚本与 verify-sites 工作流都不用动，新站自动纳入回归范围。
 *
 * 用法：node live-sites.mjs <sites.json>
 * 输出：一行 JSON 数组，每项 { repo, id, name }，直接喂给 GitHub Actions 的矩阵。
 * 门户在清单的 portal 字段里、不在 sites 数组里，故不会被取到（它无构建）。
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function liveSites(registry) {
  return (registry.sites || []).filter((s) => s.status === 'live');
}

const file = process.argv[2];
if (!file) {
  console.error('用法：node live-sites.mjs <sites.json>');
  process.exit(2);
}

const registry = JSON.parse(readFileSync(resolve(file), 'utf8'));
console.log(JSON.stringify(
  liveSites(registry).map(({ siteRepo, id, name }) => ({ repo: siteRepo, id, name })),
));
