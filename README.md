# lishui-kit · 溧水一方共享底座

站群的公共地基。各分站的站点库都以 `file:../lishui-kit` 依赖引入这里，**不各写一份**。

底座只装「每个分站都要的东西」：设计系统、知识组件、双语路由规则、专名译法、内容装载、校验引擎。**分站特有的东西一律不进 kit**——历史分站的六类归属、五期分期，山水分站的水系分级，都写在各自站点库里。

设计原则：**框架无关的部分不碰 Astro，模板部分才用 Astro。** `content/`、`i18n/`、`validate/`、`seo/`、`styles/`、`client/` 都是纯 JS/CSS，内容库的校验脚本、任何静态站点都能用；只有 `astro/` 认 Astro。

## 目录

| 目录 | 放什么 | 认框架吗 |
| --- | --- | --- |
| `styles/` | 设计系统：色板与明暗令牌、基础排版、知识组件样式、响应式 | 否，纯 CSS |
| `client/` | 界面脚本：主题、滚动入场、阅读进度、筛选查找与分页、语言切换保位 | 否，原生 JS |
| `content/` | front-matter 解析、来源层与成果层装载、条目派生助手 | 否 |
| `i18n/` | 路径规则、专名与枚举译法、年代表述、渲染上下文 | 否 |
| `validate/` | 内容校验引擎、产物链接自检、产物页面自检 | 否 |
| `seo/` | sitemap 与 robots 生成 | 否 |
| `astro/` | 页面外壳 `Layout` 与知识组件 | 是，仅此目录 |

导入方式有两种，按需选：

```js
import { makeContext, forLang } from 'lishui-kit';          // 常用件从根导入
import { buildSitemap } from 'lishui-kit/seo/sitemap.mjs';   // 其余按子路径导入
import Layout from 'lishui-kit/astro/Layout.astro';
import 'lishui-kit/styles/index.css';
```

## styles/ · 设计系统

站点只写一行 `import 'lishui-kit/styles/index.css'`（`Layout.astro` 已经代劳），不必逐份引入。

| 文件 | 内容 |
| --- | --- |
| `tokens.css` | 色板、字号、间距、圆角、阴影，明暗两套值挂在 `[data-theme]` 上 |
| `base.css` | 重置、排版、站群带、顶栏、页脚、按钮、首屏 `.hero`、眉题 `.eyebrow`、查找框 `.searchbar`、凡例、无结果 |
| `knowledge.css` | 知识组件样式：条目卡、类别卡、信息卡、目录、来源块、时间轴、索引表、统计条 |
| `responsive.css` | 断点与响应式规则，站点不重复写 |

分站**不写 CSS**。要改样式改这里，改完所有分站同时生效。

## client/ · 界面脚本

框架无关的原生 JS，站点在页面脚本里调用一次 `initSite()`。

```js
import { initSite } from 'lishui-kit/client/index.js';
initSite();   // 主题 + 滚动入场 + 阅读进度 + 语言切换保位 + 页脚年份
```

| 函数 | 作用 |
| --- | --- |
| `initTheme()` / `applyTheme(theme, persist)` | 明暗切换。默认跟随系统，用户手动选过就写 `localStorage['lishui-theme']` |
| `initReveal()` | 滚动入场，尊重 `prefers-reduced-motion`；脚本不可用时内容照常显示 |
| `initProgress()` | 正文页阅读进度条，取 `[data-progress]` |
| `initLangSwitch()` | 语言切换时把当前 `#hash` 带到另一种语言的链接上，**不跳回首页**；筛选与翻页改地址时另听 `lishui:urlchange` |
| `initFilters()` | 列表页 / 时间轴 / 索引页共用的筛选、查找与分页 |
| `initHomeSearch()` | 首页查找框：把关键词带到目标页的 `#q=` |
| `initKnowledgePage()` | 知识页的组合初始化 |

`initFilters()` 靠一套 `data-*` 约定工作，站点只要按约定输出属性，**不额外生成数据文件**：

| 约定 | 标记 |
| --- | --- |
| 表单 / 输入框 | `[data-filterform]`、`[data-search-input]` |
| 筛选按钮 | `.chipbtn[data-filter="组:值"]`，另带 `data-label`（纯界面文字）与 `[data-chip-count]`（分面计数） |
| 条目 | `[data-searchable]`，另带 `data-search-text` 与 `data-<组>` |
| 分组 | `[data-search-group]`，内含 `[data-group-count][data-unit]` |
| 分页 | `[data-pager]`，内含 `[data-pager-info][data-pager-pages]`，页大小由 `data-page-size` 给 |
| 状态 / 空结果 / 清除 | `[data-filterstate]`、`[data-noresult]`、`[data-filter-clear]` |

分面计数与分页都只在已生成的页面上算，不预生成数据：

- **分面计数**——每个筛选按钮右侧显示「若选这一项」的命中数（其余筛选与关键词照旧），计数为 0 的压暗但仍可点；
- **分页**——只有放了 `[data-pager]` 的页面分页；条目数不超过一页时分页条自动隐藏。**时间轴与索引页不要放**：它们按期分组、要一次看全，分期计数也只该算全量而非当页。

地址栏 `#q=` `#category=` `#dynasty=` `#town=` `#tag=` `#page=` 可恢复筛选与页码。用户改动筛选或翻页后，脚本把这份状态用 `replaceState` 写回地址栏（不产生历史记录，也不吞掉页内锚点），语言切换按钮因此能把筛选与页码一并带过去。

分页算式（`pageCount` / `clampPage` / `pageRange` / `pageWindow`）在 `client/paging.js`，是纯函数，不碰 DOM，可单独验算。

## content/ · 内容装载

| 导出 | 作用 |
| --- | --- |
| `loadContent({ contentDir, typeDirs, publishedOnly })` | 读来源层与成果层，返回 `{ entries, sourcesAll, glossary, terms, enums, tags, byId }` |
| `resolveContentDir(candidates)` | 按候选顺序取第一个含 `schema/enums.json` 的目录 |
| `renderMarkdown(body)` | Markdown → HTML，给 h2/h3 加锚点并抽出目录 `{ html, toc }` |
| `forLang(entries, lang)`、`ofSection`、`byYear`、`byUpdated` | 取用与排序助手 |
| `loadMarkdown`、`listMarkdown`、`readCsv` | front-matter 与 CSV 解析，**与校验脚本共用同一份**，避免两处各写一遍 |
| `searchText(entry, ctx)` | 查找文本：本语言字段 + 标签译法 + 另一语言的标题，中英关键词都能命中 |
| `filterAttrs(entry, ctx)` | 筛选属性，组名与 `client/filter.js` 的约定一一对应 |
| `flags(entry, ctx)` | 可靠性标记：可靠不显示，存疑与待核显形，未复核另标 |

`typeDirs` 由站点给（如 `{ events: 'event', places: 'place', articles: 'article' }`）——**kit 不猜类型，也不认站点分类体系**。

## i18n/ · 双语

中文在根路径、英文在 `/en/` 下，两种语言的路径一一对应。

| 导出 | 作用 |
| --- | --- |
| `LANGS`、`DEFAULT_LANG`、`otherLang(lang)` | 语言常量 |
| `localizePath(path, lang)` | 套语言前缀 |
| `altPath(path, lang)` | 语言切换目标（同一页面的另一种语言版本） |
| `entryPath({ dirName, slug, lang })`、`sectionPath(section, lang)` | 条目页与列表页路径 |
| `makeGloss({ glossary, terms })` | 生成 `gloss(zh, lang)`：中文原样返回，英文按词表查，查不到原样返回（由校验脚本在入库前拦下） |
| `enumLabel` / `typeLabel` / `depthLabel` / `confLabel` / `rightsLabel` / `catLabel` | 枚举与分类标签 |
| `timeText(entry, { lang, gloss })`、`axisYear(entry, ...)` | 年代表述；精度只有年、十年、世纪三档，负年份表示公元前 |
| `makeContext({ site, lang, ui, content, categories })` | **渲染上下文**，页面与组件只认 `ctx` |

译法有两个来源，按优先级：内容库 `glossary.csv`（专名，权威译法）→ `schema/terms.en.json`（枚举值）。

`ctx` 上挂着页面要的一切，组件不必自己拼装：

```js
const ctx = makeContext({ site, lang, ui, content, categories });
ctx.gloss('天生桥', 'en')      // → 'Tiansheng Bridge'
ctx.timeText(entry)            // → '约 591 年' / 'c. 591'
ctx.enumLabel('rights', 'gov-open')
ctx.searchText(entry)          // 查找文本
ctx.filterAttrs(entry)         // 筛选属性
ctx.flags(entry)               // 可靠性标记
```

**界面串由站点提供**（`ui.zh.json` / `ui.en.json`），kit 不预置文案。约定：`ui.labelSep` 中文用 `：`、英文用 `: `，避免英文页出现全角冒号。

## validate/ · 校验

| 导出 | 作用 |
| --- | --- |
| `validateContent({ repo, siteId, typeDirs, extra, ... })` | **内容校验引擎**，通用六项 + 站点专属规则 |
| `checkLinks(dist)` | 产物站内链接自检，返回 `{ pages, checked, broken }` |
| `checkPages(dist, { themeKey })` | 产物页面自检，返回 `{ pages, problems }` |

`validateContent` 的通用六项：

1. **来源层**——id 与文件名一致、授权状态入表、链接类来源必须有访问日期、出版者为中文时必须补 `publisherEn`；
2. **成果层**——必填字段、schema 之外的字段、id 与路径一致、取值入表、来源可解析、关联可解析；
3. **英文稿**——展示字段不得残留中文，纪年必须能查到译法；
4. **词表覆盖**——取值表里的中文取值必须都能翻成英文，否则英文页会漏出中文；
5. **双语配对**——`published` 条目必须中英成对，共用同一 ID；
6. **专名一致**——中文标题里的专名，英文标题必须用 `glossary.csv` 的译法。

分站专属规则以 `extra` 回调注入，拿到 `{ entry, data, file, sources, byId, enums, err, warn, oneOf }`：

```js
validateContent({
  repo, siteId: 'lishui-history', typeDirs: TYPE_DIRS,
  glossaryTitleCategories: new Set(['地名', '水系', '古迹']),
  extra({ entry, data: d, err, warn }) {
    if (entry.type === 'event' && !d.time) err(file, 'event 必须有 time');
  },
});
```

`checkPages` 检查四件事：语言互指是否落在镜像路径、canonical 与 hreflang 是否正确、`<head>` 内联主题脚本与切换按钮是否齐备、英文页界面文字是否残留中文或全角冒号。404 页只查 `noindex`，不参与镜像检查。

引擎**零依赖**，CI 不必 `npm install`（但内容库要能解析到 `lishui-kit`，所以内容库自身仍以 `file:` 依赖引入）。

## seo/ · 收录

| 导出 | 作用 |
| --- | --- |
| `buildSitemap({ origin, routes })` | 按语言把路由配对，中英同页互标 `hreflang`，并补 `x-default` 指向中文 |
| `buildRobots({ origin, sitemapPath })` | robots.txt 内容 |

路由由站点枚举后传入（`{ path, lastmod, priority }`），kit 只负责配对与序列化。

## astro/ · 组件

只有这一层认 Astro。站点把数据算好传进来，组件只管渲染。

**外壳**

| 组件 | 说明 |
| --- | --- |
| `Layout.astro` | 页面外壳：head 元信息、canonical、hreflang、站群带、顶栏、页脚、主题内联脚本、`initSite()`。站点全部页面套这一层，不重写 |
| `PageHead.astro` | 页头：眉题、标题、导语、备注、元信息 |
| `SectionHead.astro` | 区块标题 |

**知识组件**

| 组件 | 主要 props |
| --- | --- |
| `EntryCard.astro` | `entry`、`ctx` |
| `CardGrid.astro` | `entries`、`ctx`、`noresult`、`empty` |
| `CategoryGrid.astro` | `items`（每项 `{ href, glyph, name, alt, desc, count, countUnit, browseAll, empty }`） |
| `FilterForm.astro` | `ui`、`groups`、`search`；按钮自带分面计数占位 |
| `Pagination.astro` | `ui`、`pageSize`；**只放列表页**，时间轴与索引页不放 |
| `InfoCard.astro` | `entry`、`ctx`，详情页侧栏的结构化元信息 |
| `TocNav.astro` | `entry`、`ctx`，正文目录 |
| `SourcesBlock.astro` | `entry`、`ctx`，来源与授权 |
| `RelatedNav.astro` | `entry`、`ctx`，相关条目 |
| `TimelinePeriods.astro` | `periods`、`ctx`、`limit`、`searchable`、`countUnit` |
| `IndexTable.astro` | `groups`、`ctx` |
| `Hero.astro` | `eyebrow`、`title`、`lede`、`searchTarget`、`searchPlaceholder` 等 |
| `StatBar.astro` | `items` |
| `RulesList.astro` | `items`，凡例 |
| `Icon.astro` / `glyphs.mjs` | 内联 SVG 图标，无外部图标库 |

`Layout` 的 props：`site`、`lang`、`ui`、`path`、`title`、`description`、`active`、`nav`、`progress`、`noindex`、`jsonLd`。

## 站群互链

分站与门户互相认得对方，靠三处，都不需要站点各写一遍：

| 位置 | 谁给 | 指向 |
| --- | --- | --- |
| 站群带（`.netbar`，页顶细带） | `Layout` 自动渲染 | `site.portal`，英文页去 `/en/` |
| 页脚「站群」栏 | `Layout` 自动渲染 | 同上 |
| 结构化数据 `isPartOf` | 站点在 `jsonLd` 里写 | 分站 `WebSite` → 门户 `WebSite`，用 `@id` 串起来 |

站群带存在的理由：搜索引擎常把人直接送到分站内页，读者从那里进来时看不到门户，页脚又太靠下。带子在顶栏之上、不吸顶，滚过即让位。

站点常量里要有 `portal`、`portalName`、`portalNameEn`——`Layout` 靠它们生成回链。

## 站点怎么用

站点库只需要写四件事：

```js
// src/site/config.mjs —— 站点常量、本站分类表、板块
export const SITE = { name: '溧水历史', nameEn: 'Lishui History', origin: 'https://lishi.lishui.org', ... };
export const CATEGORIES = [{ key: 'dashiji', zh: '大事记', en: 'Chronicle', desc: {...} }, ...];
export const TYPE_DIRS = { events: 'event', places: 'place', articles: 'article' };
```

```js
// src/site/content.mjs —— 装载内容库，套上本站规则（分类归属、分期、筛选值）
const content = loadContent({ contentDir: resolveContentDir(), typeDirs: TYPE_DIRS });
for (const entry of content.entries) {
  entry.category = deriveCategory(entry);   // 本站规则
  entry.path = entryPath(entry);
}
```

```js
// src/site/context.mjs —— 由 makeContext 生成 ctx，页面共用
export const ctxFor = (lang) => makeContext({ site: SITE, lang, ui: UI[lang], content: siteContent(), categories: CATEGORIES });
```

```astro
---
// src/views/XxxView.astro —— 视图只填数据，外壳与组件都来自 kit
import Base from '../layouts/Base.astro';
import CardGrid from 'lishui-kit/astro/CardGrid.astro';
---
<Base lang={lang} path={path} title={title} description={desc}>
  <CardGrid entries={entries} ctx={ctx} />
</Base>
```

`src/pages/` 下按目录结构定路由，中文在根、英文在 `en/` 下的对称路径，一个页面文件三五行：算数据 → 交给视图。

## 版本与升级

kit 以 `file:../lishui-kit` 装在站点库与内容库的 `node_modules` 下，是**符号链接**：改 kit 后分站立即生效，不必重装。

- Astro 的 `vite.resolve.preserveSymlinks` 必须为 `true`，让 Vite 按链接路径解析，否则会把 `node_modules` 之外的真实路径当成项目外文件；
- kit 目前是 `private` 包、版本 `0.1.0`，**不做独立发版**——站群同仓库、同分支一起演进。等分站数量上来、需要分别锁版本时，再考虑打 tag 或发私有 registry；
- 唯一运行时依赖是 `marked`（Markdown → HTML）。样式与界面脚本零依赖，校验与收录零依赖。

## 谁不写在这里

- **内容**不进 kit。内容在各自的内容库（`lishui-history` 等），kit 只提供读它的代码；
- **站点分类与分期**不进 kit。kit 只提供 `catLabel` 这类通用助手，具体有哪些类别由站点给；
- **界面文案**不进 kit。文案在站点的 `ui.zh.json` / `ui.en.json`；
- **站点专属校验规则**不进 kit。以 `extra` 回调注入。
