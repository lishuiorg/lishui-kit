#!/usr/bin/env node
/* lishui-kit · 站内链接自检（命令行入口）
 *
 * 实现见 validate/links.mjs，与站点结构无关，各分站共用这一份，站点不再各存包装脚本。
 * 在站点库根目录运行：node ../lishui-kit/scripts/check-links.mjs
 * 也可指定产物目录：  node ../lishui-kit/scripts/check-links.mjs --dist some/dist
 */

import { resolve } from 'node:path';
import { checkLinks } from '../validate/links.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const dist = resolve(process.cwd(), arg('--dist', 'dist'));
const { pages, checked, broken } = checkLinks(dist);

console.log(`页面 ${pages} 个，站内链接 ${checked} 条，失效 ${broken.length} 条`);
for (const b of broken) console.log(`  失效 ${b}`);
process.exit(broken.length ? 1 : 0);
