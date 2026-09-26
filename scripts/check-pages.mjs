#!/usr/bin/env node
/* lishui-kit · 页面自检（命令行入口）
 *
 * 检查构建产物的语言互指、canonical 与 hreflang、主题脚本与切换按钮、
 * 英文页界面文字是否残留中文。实现见 validate/pages.mjs，各分站共用这一份。
 * 在站点库根目录运行：node ../lishui-kit/scripts/check-pages.mjs
 * 也可指定产物目录：  node ../lishui-kit/scripts/check-pages.mjs --dist some/dist
 */

import { resolve } from 'node:path';
import { checkPages } from '../validate/pages.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const dist = resolve(process.cwd(), arg('--dist', 'dist'));
const { pages, problems } = checkPages(dist);

console.log(`页面 ${pages} 个，问题 ${problems.length} 项`);
for (const p of problems) console.log(`  ${p.file}  ${p.msg}`);
process.exit(problems.length ? 1 : 0);
