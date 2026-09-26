/* lishui-kit · 共享底座
 *
 * 站群的公共地基。各分站与内容库都从这里取，不各写一份。
 *
 *   styles/    设计系统与知识组件样式（CSS，认框架无关）
 *   client/    界面脚本：主题、滚动入场、阅读进度、筛选与查找（原生 JS）
 *   content/   内容库装载：front-matter 解析、来源层与成果层读取
 *   i18n/      路径规则、专名与枚举译法、年代表述、界面串默认值与合并
 *   validate/  内容校验引擎，分站以 extra 回调注入专属规则
 *   astro/     Astro 组件与页面模板
 *   schema/    站群级取值表：三库逐字相同的枚举及其英文译法
 *   glossary.csv  站群唯一一份专名词表（见 i18n/glossary.mjs）
 *   site-defaults.mjs  三站一致的站点常量（ARCHIVE／RULES／LIST_PAGE_SIZE）
 *   sites.mjs  站群清单：读门户的 sites.json，生成跨站统一导航
 */

export * from './sites.mjs';
export * from './content/load.mjs';
export * from './content/frontmatter.mjs';
export * from './content/entry.mjs';
export * from './i18n/paths.mjs';
export * from './i18n/labels.mjs';
export * from './i18n/time.mjs';
export * from './i18n/context.mjs';
export * from './i18n/glossary.mjs';
export * from './i18n/ui.mjs';
export * from './i18n/ui-default.mjs';
export * from './site-defaults.mjs';
