/* lishui-kit · 筛选与查找
 *
 * 列表页、时间轴、索引页共用一套 data-* 约定，筛选在已生成的页面上跑，
 * 不额外生成数据文件。与框架无关，站点在页面脚本里调用 initFilters()。
 *
 * 约定：
 *   容器   [data-filterform]            [data-search-input]
 *   选项   .chipbtn[data-filter="组:值"]
 *   条目   [data-searchable]            另带 data-search-text 与 data-<组>
 *   分组   [data-search-group]          内含 [data-group-count][data-unit]
 *   状态   [data-filterstate]  [data-noresult]  [data-filter-clear]
 * 地址栏 #q= / #category= / #dynasty= / #town= / #tag= 可恢复筛选状态。
 */

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '');

const FILTER_GROUPS = new Set(['category', 'dynasty', 'town', 'tag']);

export function initFilters() {
  const form = document.querySelector('[data-filterform]');
  const input = document.querySelector('[data-search-input]');
  const chips = [...document.querySelectorAll('.chipbtn[data-filter]')];
  const items = [...document.querySelectorAll('[data-searchable]')];
  const groups = [...document.querySelectorAll('[data-search-group]')];
  const state = document.querySelector('[data-filterstate]');
  const noresult = document.querySelector('[data-noresult]');
  const clearBtn = document.querySelector('[data-filter-clear]');

  if (!items.length && !chips.length) return;

  const active = {};

  const chipLabel = (group, value) => {
    const hit = chips.find((b) => b.getAttribute('data-filter') === `${group}:${value}`);
    return hit ? hit.textContent : value;
  };

  const matches = (el, q) => {
    const text = el.getAttribute('data-search-text') || el.textContent;
    if (q && norm(text).indexOf(q) === -1) return false;
    for (const g of Object.keys(active)) {
      if (!active[g]) continue;
      if (g === 'tag') {
        const tags = (el.getAttribute('data-tags') || '').split(/\s+/);
        if (tags.indexOf(active[g]) === -1) return false;
      } else if ((el.getAttribute(`data-${g}`) || '') !== active[g]) {
        return false;
      }
    }
    return true;
  };

  const apply = () => {
    const q = norm(input ? input.value : '');
    let hits = 0;

    items.forEach((el) => {
      const ok = matches(el, q);
      el.hidden = !ok;
      if (ok) hits++;
    });

    groups.forEach((group) => {
      const visible = group.querySelectorAll('[data-searchable]:not([hidden])').length;
      group.hidden = visible === 0;
      const counter = group.querySelector('[data-group-count]');
      if (counter) counter.textContent = `${visible} ${counter.getAttribute('data-unit') || ''}`;
    });

    if (state) {
      const parts = Object.keys(active).filter((g) => active[g]).map((g) => chipLabel(g, active[g]));
      if (input && input.value.trim()) parts.push(input.value.trim());
      state.textContent = parts.length ? `${parts.join('　·　')}　·　${hits}` : '';
    }

    if (noresult) {
      const filtering = !!q || Object.keys(active).some((g) => !!active[g]);
      noresult.setAttribute('data-visible', filtering && hits === 0 ? 'true' : 'false');
    }

    chips.forEach((b) => {
      const v = b.getAttribute('data-filter');
      const i = v.indexOf(':');
      b.setAttribute('aria-pressed', active[v.slice(0, i)] === v.slice(i + 1) ? 'true' : 'false');
    });
  };

  chips.forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.getAttribute('data-filter');
      const i = v.indexOf(':');
      const g = v.slice(0, i);
      const val = v.slice(i + 1);
      active[g] = active[g] === val ? '' : val;
      apply();
    });
  });

  if (input) input.addEventListener('input', apply);
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      Object.keys(active).forEach((g) => { active[g] = ''; });
      if (input) input.value = '';
      apply();
    });
  }

  /* 从地址栏的 # 参数恢复筛选：首页查找框、类别卡都靠它把状态带过来。 */
  const readHash = () => {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return false;
    let found = false;
    raw.split('&').forEach((kv) => {
      const i = kv.indexOf('=');
      let k = decodeURIComponent(i === -1 ? kv : kv.slice(0, i));
      const v = decodeURIComponent(i === -1 ? '' : kv.slice(i + 1));
      if (!v) return;
      if (k === 'q') {
        if (input) input.value = v;
        found = true;
      } else {
        if (k === 'cat') k = 'category';
        if (FILTER_GROUPS.has(k)) {
          active[k] = v;
          found = true;
        }
      }
    });
    return found;
  };

  const restored = readHash();
  apply();

  if (restored) {
    const anchor = form || document.querySelector('main');
    if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ block: 'start' });
  }

  window.addEventListener('hashchange', () => {
    if (readHash()) apply();
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

/** 知识站页面通用初始化：筛选 + 首页查找。 */
export function initKnowledgePage() {
  initFilters();
  initHomeSearch();
}
