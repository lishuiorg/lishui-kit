/* lishui-kit · 站内链接自检
 *
 * 遍历构建产物里的 HTML，确认每个站内 href/src 都有对应文件：
 * 目录链接按 index.html 解析，外链、锚点、data: 跳过。
 * 与站点结构无关，各分站在构建后调用一次即可。
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function targetOf(root, page, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return null;
  return clean.startsWith('/') ? join(root, clean.slice(1)) : resolve(dirname(page), clean);
}

function resolves(p) {
  if (existsSync(p)) {
    if (statSync(p).isDirectory()) return existsSync(join(p, 'index.html'));
    return true;
  }
  return existsSync(`${p}.html`);
}

/** @returns {{ pages:number, checked:number, broken:string[] }} */
export function checkLinks(dist) {
  const root = resolve(dist);
  if (!existsSync(root)) throw new Error(`找不到构建产物目录：${root}`);

  const files = walk(root);
  const attr = /(?:href|src)="([^"]+)"/g;
  const broken = [];
  let checked = 0;

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    let m;
    while ((m = attr.exec(html))) {
      const url = m[1];
      if (/^(https?:|mailto:|data:|#|\/\/)/.test(url)) continue;
      const target = targetOf(root, file, url);
      if (!target) continue;
      checked++;
      if (!resolves(target)) broken.push(`${file.slice(root.length + 1)} -> ${url}`);
    }
  }

  return { pages: files.length, checked, broken };
}
