# lishui-kit · 溧水一方共享底座

站群的公共地基。各分站的站点库都以 `file:../lishui-kit` 依赖引入这里，**不各写一份**。

底座只装「每个分站都要的东西」：设计系统、知识组件、页面模板、双语路由规则、专名译法、内容装载、校验引擎、分站脚手架。**分站特有的东西一律不进 kit**——历史分站的六类归属、五期分期，山水分站的水系分级，都写在各自站点库里。

设计原则：**框架无关的部分不碰 Astro，模板部分才用 Astro。** `content/`、`i18n/`、`validate/`、`seo/`、`styles/`、`client/` 都是纯 JS/CSS，内容库的校验脚本、任何静态站点都能用；只有 `astro/` 认 Astro。

## 目录

| 目录 | 放什么 | 认框架吗 |
| --- | --- | --- |
| `styles/` | 设计系统：色板与明暗令牌、基础排版、知识组件样式、响应式 | 否，纯 CSS |
| `client/` | 界面脚本：主题、滚动入场、阅读进度、筛选查找与分页、语言切换保位 | 否，原生 JS |
| `content/` | front-matter 解析、来源层与成果层装载、条目派生助手 | 否 |
| `i18n/` | 路径规则、专名与枚举译法、年代表述、渲染上下文、界面串默认值与合并 | 否 |
| `validate/` | 内容校验引擎、产物链接自检、产物页面自检 | 否 |
| `seo/` | sitemap 与 robots 生成 | 否 |
| `schema/` | 站群级取值表：各站逐字相同的枚举及其英文译法；另有站点登记与本站取值表的读取 | 否 |
| `astro/` | 页面外壳 `Layout`、页面壳 `layouts/Base`、**页面模板 `views/`**、404 视图、构建配置工厂 `astro-config.mjs`、知识组件 | 是，仅此目录 |
| `scripts/` | 命令行入口：站内链接与页面自检、分站脚手架、在线站清单 | 否 |
| `glossary.csv` | 站群唯一一份专名译法表 | — |
| `site-defaults.mjs` | 全站一致的站点常量（`ARCHIVE`／`RULES`／`LIST_PAGE_SIZE`） | 否 |
| `sites.mjs` | 站群清单：读门户 `sites.json`，生成跨站统一导航 | 否 |
| `.github/workflows/site-deploy.yml` | 可复用发布工作流，站点库的 `deploy.yml` 只填两个参数 | — |
| `.github/workflows/verify-sites.yml` | 底座回归：底座一改，自动构建全部 `status: live` 的站 | — |

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
| `UI_DEFAULT` | 界面串默认值（`zh` / `en` 两份完整串） |
| `mergeUi(base, override)` | 界面串深合并：对象逐键合并，数组与标量整体替换 |
| `makeContext({ site, lang, ui, content, categories, sections })` | **渲染上下文**，页面与组件只认 `ctx` |

译法有两个来源，按优先级：底座根目录 `glossary.csv`（专名，全站唯一一份，权威译法）→ 内容库 `schema/terms.en.json`（枚举值）。**同一个中文词不得同时出现在两处**：底座那份优先，内容库那份会被遮蔽而失效，改了不生效。

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

**界面串是「底座默认 + 站点覆盖」**：底座 `i18n/ui-default.mjs` 给出一份完整的默认串（`UI_DEFAULT`），站点 `ui.zh.json` / `ui.en.json` 只写本站要改的那几处，用 `mergeUi(UI_DEFAULT[lang], UI[lang])` 合并——**站点侧拿到的仍是完整对象，页面与组件照旧直接取用**。

```js
// src/site/context.mjs
import { makeContext, mergeUi, UI_DEFAULT } from 'lishui-kit';
import UI from '../i18n/ui.zh.json' with { type: 'json' };   // 实际按语言分别引入
const ui = mergeUi(UI_DEFAULT[lang], UI[lang]);
```

合并规则：对象逐键合并，站点有的以站点为准；数组与标量整体替换。**数组不逐项合并**——界面串里的数组是整段列表（如凡例、导航项），逐项合并会拼出一个两边都不是的列表。

约定：`ui.labelSep` 中文用 `：`、英文用 `: `，避免英文页出现全角冒号。

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

**页面模板（`views/`）**

六个页面在底座各有一个命名模板，站点层不再各存一份。**模板里没有一处站点判断**：差异归纳成有限几种「页面形态」，站点在自己那层的薄包装里 `import` 哪一种——分支落在站点层（本来就一站一份），kit 保持无分支。

| 模板 | 形态 | 站点要给的 |
| --- | --- | --- |
| `HomeShell.astro` | 首页骨架：规模条 + 中部预览插槽 + 凡例 | `statItems`、`rules`、中部插槽内容 |
| `HomeTimelineView.astro` | 首页变体：中部是时间轴分期 | `periods` |
| `HomeBoardView.astro` | 首页变体：中部是板块卡 | `boardItems` |
| `ListView.astro` | 列表页：筛选组 + 卡片网格 + 分页 | `section`、`entries`、`groups`、`text` |
| `IndexView.astro` | 索引页：按类别分组 + 列序 | `groups`、`columns`、`total` |
| `DetailView.astro` | 详情页：正文 + 侧栏 + 来源 + 相关 | `entry`、`siblings`、`metaBits`、`schemaType` |
| `AboutView.astro` | 关于页：两栏各放哪几节 | `statItems`、`columns: { left, right }` |
| `NotFoundView.astro` | 404 | — |

站点侧的视图包装只剩三行——算数据，摊给模板：

```astro
---
import HomeTimelineView from 'lishui-kit/astro/views/HomeTimelineView.astro';
import { homeModel } from '../site/model.mjs';
const { lang } = Astro.props;
---
<HomeTimelineView {...homeModel(lang)} />
```

**空白约定（改模板前必读）**：`compressHTML` 只把同一段静态文本里的连续空白压成一个空格，**不跨表达式节点与 slot 边界**合并。所以 slot 要紧贴容器标签、不留空白，间隔全部由 slot 内容自带的空白充当；否则产物会比手写多一个空格（`</p>  <h2>` 而非 `</p> <h2>`）。

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

站点库只写「本站特有」的四件事：

```js
// src/site/config.mjs —— 站点身份、本站分类表、板块说明、编纂凡例
export const SITE = { id: 'lishui-history', name: '溧水历史', nameEn: 'Lishui History', origin: 'https://lishi.lishui.org', ... };
export const CATEGORIES = [{ key: 'dashiji', zh: '大事记', en: 'Chronicle', desc: {...} }, ...];
export const SECTIONS = { events: { zh: {...}, en: {...} }, ... };
```

实体类型与实体目录（`events` → `event` 之类）**不在这里**——它们登记在内容库的 `schema/sites.json`，装载与校验都从那里读，站点不再各传一份。

```js
// src/site/content.mjs —— 装载内容库，套上本站规则（分类归属、分期、筛选值）
const content = loadContent({ contentDir: resolveContentDir(), siteId: SITE.id });
for (const entry of content.entries) {
  entry.category = deriveCategory(entry);   // 本站规则
  entry.path = entryPath(entry);
}
```

```js
// src/site/context.mjs —— 界面串合并 + 生成 ctx，页面共用
const ui = mergeUi(UI_DEFAULT[lang], UI[lang]);
export const ctxFor = (lang) => makeContext({ site: SITE, lang, ui, content: siteContent(), categories: CATEGORIES });
```

```js
// src/site/model.mjs —— 每个页面要算什么：规模条、筛选组、分组维度、元信息行、排序口径
export function listModel(lang, section) { /* ... */ return { ctx, lang, section, entries, groups, text }; }
```

```astro
---
// src/views/XxxView.astro —— 薄包装：选底座的哪一种页面形态，把模型摊给它
import ListView from 'lishui-kit/astro/views/ListView.astro';
import { listModel } from '../site/model.mjs';
const { lang, section } = Astro.props;
---
<ListView {...listModel(lang, section)} />
```

`src/pages/` 下按目录结构定路由，中文在根、英文在 `en/` 下的对称路径，一个页面文件三五行：算数据 → 交给视图。

**新增分站不必照抄这些**：跑一次 `scripts/scaffold-site.mjs` 生成骨架（站点库、本站 `schema/sites/<siteId>.json`、内容子树），再填本站特有的分类体系即可。用法见内容库 `README.md` 的「新增一个分站」。

## 站点构建与发布

构建配置与发布流程也集中在底座，新增分站不必复制这几份文件。

```js
// astro.config.mjs —— 通用部分在底座，本站只填域名
import { makeAstroConfig } from 'lishui-kit/astro/astro-config.mjs';
import { SITE } from './src/site/config.mjs';
export default makeAstroConfig({ site: SITE.origin });
```

自检脚本的命令行入口在 `scripts/`，站点库 `package.json` 直接指过去（**站点层不再各存一份包装脚本**）：

```json
"check-links": "node ../lishui-kit/scripts/check-links.mjs",
"check-pages": "node ../lishui-kit/scripts/check-pages.mjs"
```

`scripts/` 下的命令行入口，本地与 CI 共用：

| 脚本 | 作用 |
| --- | --- |
| `check-links.mjs` / `check-pages.mjs` | 产物自检（站内链接、页面互指与主题脚本），站点 `package.json` 直接指过来 |
| `scaffold-site.mjs` | 分站脚手架：一条命令生成新站骨架（站点库、本站取值表、内容子树），用法见内容库 `README.md` 的「新增一个分站」 |
| `live-sites.mjs` | 从门户 `sites.json` 取 `status: live` 的站，输出一行 JSON 供 CI 生成构建矩阵 |

发布走 `.github/workflows/site-deploy.yml`（`on: workflow_call`）。站点库的 `deploy.yml` 只剩调用方，填站点库名与本站内容侧 siteId：

```yaml
jobs:
  deploy:
    uses: lishuiorg/lishui-kit/.github/workflows/site-deploy.yml@main
    with:
      site: site-lishi
      siteId: lishui-history
```

工作流内部检出四个库（站点库、底座、内容库、门户 `sites.json`）并保持同级目录关系，再跑与本地同一条 `npm run check`。内容库按本站子树**稀疏检出**——只拉 `content/<siteId>/`、`content/en/<siteId>/`、共享来源层与取值表，不为构建一个站拉下全部站的 markdown 与影印文本。少检了会直接构建失败，不会静默出错。

## 版本与升级

kit 以 `file:../lishui-kit` 装在站点库与内容库的 `node_modules` 下，是**符号链接**：改 kit 后分站立即生效，不必重装。

- Astro 的 `vite.resolve.preserveSymlinks` 必须为 `true`，让 Vite 按链接路径解析，否则会把 `node_modules` 之外的真实路径当成项目外文件；
- 唯一运行时依赖是 `marked`（Markdown → HTML）。样式与界面脚本零依赖，校验与收录零依赖；
- kit 目前是 `private` 包、版本 `0.1.0`，**不做独立发版**——站群同仓库、同分支一起演进。

### 发布纪律

底座是全部站点共用的一层，**改一行没有任何东西会告诉你哪个站被改坏**。三道约束，按发现问题的先后排：

1. **本地自检**：改 kit 后，在受影响的站点库跑 `npm run check`（校验 + 构建 + 站内链接 + 页面自检）。动了视图模板或界面串默认值，还要与改动前的 `dist/` **逐字节比对**——`compressHTML` 的空白行为与 slot 边界会让「看着一样」的模板产出不一样的 HTML（见上文「空白约定」）。
2. **CI 回归（PR 阶段）**：`.github/workflows/verify-sites.yml` 把当前 `status: live` 的站点全部构建一遍，与发布走同一条 `npm run check`。站点清单从门户 `sites.json` 现取，**新站上线只改那里的 status，本工作流一行都不用动**。这是唯一能挡住「底座改动静默改坏某个站」的机制——故意改掉一个组件 prop 名，它就会报错。
3. **引用方式**：各站以 `@main` 引用底座，所以 PR 阶段的回归是**必需**的，不是可选的。若后期站点多到 CI 变慢，再改为按 tag 引用、显式升级；那时每站锁一个版本，代价是升级要逐站改。

**改底座的顺序**：先在本分支把改动做完 → 本地跑受影响站点的 `npm run check` → 推 kit 的 PR，等 `verify-sites` 全绿 → 合并。破坏性改动（改 prop 名、改导出名、改默认值语义）必须同步改各站调用处，或按「先加新的、再改站点、最后删旧的」分两次提交——`verify-sites` 会在第一次就报出还有哪个站没跟上。

## 谁不写在这里

- **内容**不进 kit。内容在统一内容库 `lishui`，kit 只提供读它的代码；
- **站点分类与分期**不进 kit。kit 只提供 `catLabel` 这类通用助手，具体有哪些类别由站点给；
- **站点界面文案**不进 kit。文案在站点的 `ui.zh.json` / `ui.en.json`，只写覆盖键；默认值在 `i18n/ui-default.mjs`；
- **站点专属校验规则**不进 kit。以 `extra` 回调注入；
- **站群清单**不进 kit。`sites.json` 由门户持有，kit 只负责读它并生成导航。
