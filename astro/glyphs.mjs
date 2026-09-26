/* lishui-kit · 图标
 *
 * 线条一律 currentColor，尺寸由使用处的 CSS 定（.cat__glyph svg 等）。
 * 站点用 <Icon name="m3" /> 取用，不各自内联一份 SVG。
 */

export const GLYPHS = {
  // 界格与县域边界
  m1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M9 4.5v15M15 4.5v15M3.5 12h17" stroke-dasharray="2 2.4"/></svg>',
  // 编年条目
  m2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h13M4 12h16M4 18h10"/><circle cx="20" cy="6" r="1.6"/><circle cx="19" cy="18" r="1.6"/></svg>',
  // 石拱桥
  m3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 17.5h19"/><path d="M5 17.5a7 7 0 0 1 14 0"/><path d="M8.5 17.5v-3M12 17.5v-5M15.5 17.5v-3"/></svg>',
  // 地层堆积
  m4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19h18"/><path d="M4 19c1.6-3.2 4-4.8 8-4.8s6.4 1.6 8 4.8"/><path d="M6 13.4c1.4-2.6 3.4-3.9 6-3.9s4.6 1.3 6 3.9"/><path d="M9 8.4c1-1.6 2-2.4 3-2.4s2 .8 3 2.4"/></svg>',
  // 旧志
  m5: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 5.5V20.5"/><path d="M8 7.5h7M8 11h5"/></svg>',
  // 纪念地
  m6: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.5 5.4 5.5.7-4.1 3.9 1.1 5.6L12 16.4l-4.9 2.7 1.1-5.6L4.1 9.6l5.5-.7Z"/></svg>',
  // 笔与卷：诗文与文献
  m7: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4.2 9.6 14.6l-1.1 4.1 4.1-1.1L23 7.2Z"/><path d="M3.5 20.5h9"/></svg>',
  // 界面
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.4A8.4 8.4 0 1 1 9.6 4a6.9 6.9 0 0 0 10.4 10.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  // 站徽：溧水的水与岗
  mark: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 21c4.2 0 5.8-9 10-9s5.8 9 10 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 26c4.2 0 5.8-5.5 10-5.5s5.8 5.5 10 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".45"/><circle cx="16" cy="7" r="3" stroke="currentColor" stroke-width="2"/></svg>',
};
