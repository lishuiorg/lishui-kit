/* 内容解析公共库
 *
 * front-matter 是 YAML 的受限子集（标量、嵌套映射、列表、内联数组、折叠/字面块），
 * 这里自带解析器，内容库的校验脚本与站点库的生成器共用同一份实现，CI 无需 npm install。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* ---------- 标量 ---------- */

export function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    return splitInline(inner).map(parseScalar);
  }
  if (s.length > 1 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}

export function splitInline(s) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x !== '');
}

const indentOf = (line) => line.length - line.trimStart().length;

/* 折叠块（>- / >）把换行折成空格，但中文行之间不该留空格，
   否则「……特殊地位，\n以及……」会渲染成「……特殊地位， 以及……」。 */
const isCJK = (ch) => !!ch && /[\u2E80-\u2EFF\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/.test(ch);

function foldLines(lines) {
  let out = '';
  for (const line of lines) {
    if (line === '') { out += '\n'; continue; }
    if (out === '' || out.endsWith('\n')) { out += line; continue; }
    out += (isCJK(out[out.length - 1]) && isCJK(line[0])) ? line : ` ${line}`;
  }
  return out;
}

function parseBlock(lines, i, indent) {
  const t = lines[i].trim();
  return t === '-' || t.startsWith('- ') ? parseList(lines, i, indent) : parseMap(lines, i, indent);
}

function parseMap(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const ind = indentOf(line);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`缩进不一致：${line}`);
    const m = /^([^:#]+):(?:[ \t]+(.*))?$/.exec(line.trim());
    if (!m) throw new Error(`无法解析的字段行：${line}`);
    const key = m[1].trim();
    const rest = (m[2] ?? '').trim();

    if (/^[|>][-+]?$/.test(rest)) {
      const folded = rest[0] === '>';
      const chunk = [];
      let j = i + 1;
      let childIndent = null;
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() === '') { chunk.push(''); j++; continue; }
        if (indentOf(l) <= indent) break;
        if (childIndent === null) childIndent = indentOf(l);
        chunk.push(l.slice(childIndent));
        j++;
      }
      const text = (folded ? foldLines(chunk) : chunk.join('\n')).trim();
      obj[key] = rest.endsWith('-') ? text : text + '\n';
      i = j;
      continue;
    }

    if (rest === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && indentOf(lines[j]) > indent) {
        const [val, next] = parseBlock(lines, j, indentOf(lines[j]));
        obj[key] = val;
        i = next;
      } else {
        obj[key] = null;
        i = j;
      }
      continue;
    }

    obj[key] = parseScalar(rest);
    i++;
  }
  return [obj, i];
}

function parseList(lines, i, indent) {
  const arr = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const ind = indentOf(line);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`缩进不一致：${line}`);
    const t = line.trim();
    if (t !== '-' && !t.startsWith('- ')) break;
    const rest = t.slice(1).trim();

    if (rest === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const [val, next] = parseBlock(lines, j, indentOf(lines[j]));
      arr.push(val);
      i = next;
      continue;
    }

    if (/^[^:\s][^:]*:([ \t]|$)/.test(rest)) {
      const synthetic = [' '.repeat(indent + 2) + rest];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || indentOf(lines[j]) > indent)) {
        synthetic.push(lines[j]);
        j++;
      }
      const [val] = parseMap(synthetic, 0, indent + 2);
      arr.push(val);
      i = j;
      continue;
    }

    arr.push(parseScalar(rest));
    i++;
  }
  return [arr, i];
}

/* ---------- 文件 ---------- */

export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error('文件未以 front-matter 开头');
  const end = normalized.indexOf('\n---\n', 3);
  if (end === -1) throw new Error('front-matter 未闭合');
  const head = normalized.slice(4, end + 1);
  const body = normalized.slice(end + 5);
  const [data] = parseMap(head.split('\n'), 0, 0);
  return { data, body };
}

export function loadMarkdown(file) {
  const text = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(text);
  return { data, body, text };
}

export function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(dir, e.name));
}

/* ---------- CSV ---------- */

export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function readCsv(file) {
  return readFileSync(file, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map(parseCsvLine);
}
