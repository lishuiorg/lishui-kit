/* lishui-kit · 筛选、查找与分页
 *
 * 列表页、时间轴、索引页共用一套 data-* 约定，筛选在已生成的页面上跑，
 * 不额外生成数据文件。与框架无关，站点在页面脚本里调用 initFilters()。
 *
 * 约定：
 *   容器   [data-filterform]            [data-search-input]
 *   选项   .chipbtn[data-filter="组:值"]  另带 data-label（界面文字，不含计数）
 *          .chipbtn 内 [data-chip-count] 由脚本填分面计数
 *   条目   [data-searchable]            另带 data-search-text 与 data-<组>
 *   分组   [data-search-group]          内含 [data-group-count][data-unit]
 *   分页   [data-pager]                 内含 [data-pager-info][data-pager-pages]；
 *          只有列表页放分页条，时间轴与索引页按期分组、不分页
 *   状态   [data-filterstate]  [data-noresult]  [data-filter-clear]
 *
 * 地址栏 #q= / #category= / #dynasty= / #town= / #tag= 等可恢复筛选与页码（组名见 FILTER_GROUPS）；
 * 用户改动筛选或翻页后，脚本把这份状态写回地址栏（replaceState，不产生历史记录），
 * 语言切换按钮因此能把筛选与页码一并带过去。
 */

import { clampPage, pageCount, pageRange, pageWindow } from './paging.js';

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '');

const FILTER_GROUPS = [
  'category', 'unittype', 'genre', 'itemtype', 'level', 'dynasty',
  'town', 'village', 'surname', 'tag',
  'featuretype', 'basin', 'districttowns', 'designation',
  'scenerygrade', 'reservoirclass', 'elevation', 'routemode',
];
/* 一个条目可以同时命中多个取值的组：属性里是空格分隔的一串，命中任一即算命中。
   其余组是一对一的枚举，属性值等于所选值才算命中。 */
const MULTI_VALUE_GROUPS = new Set(['tag', 'districttowns', 'designation']);
const FILTER_SET = new Set(FILTER_GROUPS);
const PAGE_KEY = 'page';
/* 地址栏里由脚本接管、每次重写的键；其余键（如页内锚点）原样保留。 */
const MANAGED = new Set(['q', 'cat', ...FILTER_GROUPS, PAGE_KEY]);

export function initFilters() {
  const form = document.querySelector('[data-filterform]');
  const input = document.querySelector('[data-search-input]');
  const chips = [...document.querySelectorAll('.chipbtn[data-filter]')];
  const items = [...document.querySelectorAll('[data-searchable]')];
  const groups = [...document.querySelectorAll('[data-search-group]')];
  const state = document.querySelector('[data-filterstate]');
  const noresult = document.querySelector('[data-noresult]');
  const clearBtn = document.querySelector('[data-filter-clear]');
  const pager = document.querySelector('[data-pager]');

  if (!items.length && !chips.length) return;

  const pagerInfo = pager?.querySelector('[data-pager-info]');
  const pagerPages = pager?.querySelector('[data-pager-pages]');
  const pageSize = Math.max(1, Number(pager?.getAttribute('data-page-size')) || 24);
  const infoTpl = pager?.getAttribute('data-info-template') || '{from}–{to} / {total}';
  const prevLabel = pager?.getAttribute('data-prev-label') || '‹';
  const nextLabel = pager?.getAttribute('data-next-label') || '›';
  const pageLabel = pager?.getAttribute('data-page-label') || '{n}';
  const hasCounts = chips.some((b) => b.querySelector('[data-chip-count]'));

  const active = {};
  let page = 1;

  /* 查找文本只在首次用到时归一化一次：分面计数会对同一批条目反复比对。 */
  const textCache = new WeakMap();
  const textOf = (el) => {
    let text = textCache.get(el);
    if (text === undefined) {
      text = norm(el.getAttribute('data-search-text') || el.textContent);
      textCache.set(el, text);
    }
    return text;
  };

  const matches = (el, q) => {
    if (q && textOf(el).indexOf(q) === -1) return false;
    for (const g of FILTER_GROUPS) {
      const v = active[g];
      if (!v) continue;
      if (MULTI_VALUE_GROUPS.has(g)) {
        if ((el.getAttribute(`data-${g}`) || '').split(/\s+/).indexOf(v) === -1) return false;
      } else if ((el.getAttribute(`data-${g}`) || '') !== v) {
        return false;
      }
    }
    return true;
  };

  /* 分面计数：数「若选这一项」会有多少条命中，其余筛选与关键词照旧。 */
  const countFor = (group, value, q) => {
    const saved = active[group];
    active[group] = value;
    let n = 0;
    for (const el of items) if (matches(el, q)) n++;
    active[group] = saved;
    return n;
  };

  const chipLabel = (group, value) => {
    const hit = chips.find((b) => b.getAttribute('data-filter') === `${group}:${value}`);
    return hit ? (hit.getAttribute('data-label') || hit.textContent) : value;
  };

  /* ---------- 地址栏状态 ---------- */

  const hashParams = () => {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return [];
    return raw.split('&').map((kv) => {
      const i = kv.indexOf('=');
      return i === -1
        ? [decodeURIComponent(kv), '']
        : [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))];
    });
  };

  const writeHash = () => {
    if (!window.history || !window.history.replaceState) return;
    const parts = [];
    const qv = input ? input.value.trim() : '';
    if (qv) parts.push(`q=${encodeURIComponent(qv)}`);
    for (const g of FILTER_GROUPS) {
      if (active[g]) parts.push(`${g}=${encodeURIComponent(active[g])}`);
    }
    if (page > 1) parts.push(`${PAGE_KEY}=${page}`);
    for (const [k, v] of hashParams()) {
      if (MANAGED.has(k)) continue;
      parts.push(v ? `${encodeURIComponent(k)}=${encodeURIComponent(v)}` : encodeURIComponent(k));
    }
    const { pathname, search } = window.location;
    const url = `${pathname}${search}${parts.length ? `#${parts.join('&')}` : ''}`;
    try {
      window.history.replaceState(null, '', url);
    } catch (e) {
      /* 少数环境不允许改地址，忽略即可，筛选照常工作 */
    }
    /* 语言切换按钮要把这份状态带过去（见 client/index.js）。 */
    window.dispatchEvent(new Event('lishui:urlchange'));
  };

  /* 从地址栏的 # 参数恢复筛选：首页查找框、类别卡都靠它把状态带过来。 */
  const readHash = () => {
    const params = hashParams();
    if (!params.length) return false;
    let found = false;
    page = 1;
    for (const [k, v] of params) {
      if (!v) continue;
      if (k === 'q') {
        if (input) input.value = v;
        found = true;
      } else if (k === 'cat' || k === 'category') {
        active.category = v;
        found = true;
      } else if (FILTER_SET.has(k)) {
        active[k] = v;
        found = true;
      } else if (k === PAGE_KEY) {
        page = Number(v) || 1;
      }
    }
    return found;
  };

  /* ---------- 分页条 ---------- */

  const makeBtn = (text, target, extra = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = extra ? `pagebtn ${extra}` : 'pagebtn';
    b.textContent = text;
    if (target) b.setAttribute('data-page', String(target));
    return b;
  };

  const renderPager = (hits, range) => {
    if (!pager || !pagerPages) return;
    pagerPages.textContent = '';
    const totalPages = pageCount(hits, pageSize);

    if (totalPages <= 1) {
      pager.hidden = true;
      if (pagerInfo) pagerInfo.textContent = '';
      return;
    }
    pager.hidden = false;

    if (pagerInfo) {
      pagerInfo.textContent = infoTpl
        .replace('{from}', String(range.from))
        .replace('{to}', String(range.to))
        .replace('{total}', String(hits));
    }

    const prev = makeBtn(prevLabel, page - 1, 'pagebtn--dir');
    prev.disabled = page <= 1;
    pagerPages.append(prev);

    for (const item of pageWindow(totalPages, page)) {
      if (item === '…') {
        const gap = document.createElement('span');
        gap.className = 'pagebtn pagebtn--gap';
        gap.setAttribute('aria-hidden', 'true');
        gap.textContent = '…';
        pagerPages.append(gap);
        continue;
      }
      const b = makeBtn(String(item), item);
      b.setAttribute('aria-label', pageLabel.replace('{n}', String(item)));
      if (item === page) b.setAttribute('aria-current', 'page');
      pagerPages.append(b);
    }

    const next = makeBtn(nextLabel, page + 1, 'pagebtn--dir');
    next.disabled = page >= totalPages;
    pagerPages.append(next);
  };

  if (pagerPages) {
    pagerPages.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-page]');
      if (!btn || btn.disabled) return;
      const target = Number(btn.getAttribute('data-page'));
      if (!target || target === page) return;
      page = target;
      apply({ scroll: true });
    });
  }

  /* ---------- 应用 ---------- */

  const apply = ({ scroll = false, write = true } = {}) => {
    const q = norm(input ? input.value : '');

    const hitEls = [];
    for (const el of items) if (matches(el, q)) hitEls.push(el);

    const hits = hitEls.length;
    page = clampPage(page, hits, pageSize);
    const range = pageRange(page, hits, pageSize);
    const shown = new Set(pager ? hitEls.slice(Math.max(0, range.from - 1), range.to) : hitEls);
    for (const el of items) el.hidden = !shown.has(el);

    for (const group of groups) {
      const visible = group.querySelectorAll('[data-searchable]:not([hidden])').length;
      group.hidden = visible === 0;
      const counter = group.querySelector('[data-group-count]');
      if (counter) counter.textContent = `${visible} ${counter.getAttribute('data-unit') || ''}`;
    }

    for (const b of chips) {
      const raw = b.getAttribute('data-filter') || '';
      const i = raw.indexOf(':');
      const group = raw.slice(0, i);
      const value = raw.slice(i + 1);
      const on = active[group] === value;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!hasCounts) continue;
      const n = countFor(group, value, q);
      const badge = b.querySelector('[data-chip-count]');
      if (badge) badge.textContent = String(n);
      b.setAttribute('data-empty', n === 0 && !on ? 'true' : 'false');
    }

    if (state) {
      const parts = FILTER_GROUPS.filter((g) => active[g]).map((g) => chipLabel(g, active[g]));
      const qv = input ? input.value.trim() : '';
      if (qv) parts.push(qv);
      state.textContent = parts.length ? `${parts.join('　·　')}　·　${hits}` : '';
    }

    if (noresult) {
      const filtering = !!q || FILTER_GROUPS.some((g) => !!active[g]);
      noresult.setAttribute('data-visible', filtering && hits === 0 ? 'true' : 'false');
    }

    renderPager(hits, range);
    if (write) writeHash();

    if (scroll) {
      const anchor = form || document.querySelector('main');
      if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ block: 'start' });
    }
  };

  chips.forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.getAttribute('data-filter');
      const i = v.indexOf(':');
      const g = v.slice(0, i);
      const val = v.slice(i + 1);
      active[g] = active[g] === val ? '' : val;
      page = 1;
      apply({ scroll: true });
    });
  });

  if (input) input.addEventListener('input', () => { page = 1; apply(); });
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); page = 1; apply(); });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      FILTER_GROUPS.forEach((g) => { active[g] = ''; });
      if (input) input.value = '';
      page = 1;
      apply({ scroll: true });
    });
  }

  const restored = readHash();
  apply({ scroll: restored, write: false });

  window.addEventListener('hashchange', () => {
    if (readHash()) apply({ scroll: true });
  });
}

/** 首页查找框：跳到索引页并把关键词放进 #q=。 */
export function initHomeSearch() {
  const box = document.querySelector('[data-homesearch]');
  if (!box) return;
  box.addEventListener('submit', (e) => {
    e.preventDefault();
    const field = box.querySelector('input');
    const target = box.getAttribute('data-target') || '/index/';
    const value = field ? field.value.trim() : '';
    window.location.href = value ? `${target}#q=${encodeURIComponent(value)}` : target;
  });
}

/** 知识站页面通用初始化：筛选 + 分页 + 首页查找。 */
export function initKnowledgePage() {
  initFilters();
  initHomeSearch();
}
