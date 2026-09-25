/* lishui-kit · 界面脚本
 *
 * 四件事：明暗主题切换、滚动入场、阅读进度、语言切换保持当前位置。
 * 与框架无关：不依赖 Astro，任何静态站点都能用；由站点在页面里调用 initSite()。
 * 语言切换本身是纯链接，这里只负责把当前的 #hash 带过去。
 */

const STORE_KEY = 'lishui-theme';
const THEME_COLOR = { light: '#F6F4EE', dark: '#0C1211' };

function root() {
  return document.documentElement;
}

function currentTheme() {
  return root().getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme, persist = false) {
  root().setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme] || THEME_COLOR.light);
  if (persist) {
    try { localStorage.setItem(STORE_KEY, theme); } catch (e) { /* 隐私模式下忽略 */ }
  }
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label',
      theme === 'dark' ? btn.getAttribute('data-label-light') : btn.getAttribute('data-label-dark'));
  }
}

/** 主题开关；用户未手动选择时跟随系统变化。 */
export function initTheme() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
    applyTheme(currentTheme(), false);
  }

  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = (e) => {
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (err) { /* 忽略 */ }
    if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
  };
  if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);
}

/** 滚动入场；尊重 prefers-reduced-motion，脚本不可用时内容照常显示。 */
export function initReveal() {
  const reveals = [...document.querySelectorAll('.reveal')];
  if (!reveals.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 6, 5) * 55}ms`;
    io.observe(el);
  });
}

/** 正文阅读进度条。 */
export function initProgress() {
  const bar = document.querySelector('[data-progress]');
  if (!bar) return;
  let ticking = false;

  const paint = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const y = window.pageYOffset || doc.scrollTop || 0;
    const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    bar.style.width = `${(ratio * 100).toFixed(2)}%`;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  paint();
}

/** 语言切换：把当前 #hash 附到另一种语言的链接上，切换后停在同一条目。
    筛选与分页改地址时不触发 hashchange，故另听一个 lishui:urlchange（见 client/filter.js）。 */
export function initLangSwitch() {
  const links = [...document.querySelectorAll('[data-lang-switch]')];
  if (!links.length) return;
  const syncHash = () => {
    const { hash } = window.location;
    links.forEach((a) => {
      const base = a.getAttribute('href').split('#')[0];
      a.setAttribute('href', hash ? base + hash : base);
    });
  };
  syncHash();
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('lishui:urlchange', syncHash);
}

/** 页脚年份。 */
export function initYear() {
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
}

/** 站点通用初始化；在页面脚本里调用一次即可。 */
export function initSite() {
  initTheme();
  initReveal();
  initProgress();
  initLangSwitch();
  initYear();
}
