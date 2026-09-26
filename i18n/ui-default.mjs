/* lishui-kit · 共用界面串默认值
 *
 * 站群三站（历史／文化／街镇）逐字相同的界面串，集中在这里，避免每站各抄一份。
 * 各站自己的 src/i18n/ui.<lang>.json 只保留两类键：
 *   1. 同名覆盖键——本站措辞与默认值不同；
 *   2. 本站独有键——只有本站用得上的板块、字段、筛选维度。
 * 合并由 ./ui.mjs 的 mergeUi 完成，站点侧调用后拿到的仍是完整的界面串对象。
 *
 * 值必须与站点层逐字一致，否则页面产物会变。改动这里等于改动三个站。
 */

export const UI_DEFAULT = {
  "zh": {
    "lang": "zh-Hans",
    "langShort": "中",
    "labelSep": "：",
    "langLabel": "界面语言",
    "skip": "跳到主要内容",
    "nav": {
      "home": "首页",
      "index": "索引",
      "about": "关于"
    },
    "theme": {
      "dark": "切换到深色模式",
      "light": "切换到浅色模式"
    },
    "wordmark": {
      "sub": "溧水 · 南京"
    },
    "hero": {
      "searchButton": "查找",
      "searchHint": "查找在索引页运行，范围是本站已发布的全部条目。"
    },
    "stats": {
      "entries": "已发布条目",
      "categories": "内容类别",
      "sources": "来源记录"
    },
    "home": {
      "latestTitle": "最新更新",
      "latestNote": "按 updated 字段倒序，最多六条。",
      "latestSeeAll": "查看全部条目",
      "rulesTitle": "编纂凡例",
      "rulesNote": "四条硬规则，由内容库的校验脚本在入库前把关。",
      "browseAll": "查看全部"
    },
    "list": {
      "countUnit": "条",
      "filterCategory": "类别",
      "filterTag": "标签",
      "filterAll": "全部",
      "clear": "清除筛选",
      "pager": "分页",
      "pagerInfo": "第 {from}–{to} 条 · 共 {total} 条",
      "pagerPrev": "上一页",
      "pagerNext": "下一页",
      "pagerPage": "第 {n} 页",
      "search": "在全部条目中查找",
      "noresult": "没有符合条件的条目。",
      "empty": "这一类还没有已发布的条目。"
    },
    "detail": {
      "toc": "本页目录",
      "info": "信息卡",
      "type": "类型",
      "category": "类别",
      "time": "时间",
      "dynasty": "朝代",
      "era": "纪年",
      "precision": "精度",
      "approx": "约",
      "depth": "深度",
      "confidence": "可靠性",
      "updated": "更新",
      "protection": "文保级别",
      "protectionBatch": "公布批次",
      "address": "位置",
      "genre": "体裁",
      "outcome": "结果与影响",
      "related": "关联条目",
      "places": "相关地点",
      "sources": "来源",
      "sourceLocator": "位置",
      "sourceAccessed": "访问",
      "sourceRights": "授权",
      "backToList": "返回列表",
      "license": "本条目文字采用 CC BY 4.0 授权，转载请注明来源。",
      "unverified": "本条目尚未经第二人核对来源。"
    },
    "indexPage": {
      "title": "索引",
      "colYear": "年份",
      "colEntry": "条目",
      "colType": "类型",
      "colCategory": "类别",
      "colDepth": "深度",
      "noTime": "无年份"
    },
    "about": {
      "title": "关于本分站",
      "scopeTitle": "内容范围",
      "sourceTitle": "来源策略",
      "licenseTitle": "许可",
      "licenseBody": "本分站的条目文字采用 CC BY 4.0 授权，署名即可商用与改编。来源层各条资料的授权状态见每条来源的 rights 字段，不随本分站授权一并转移。",
      "bilingualTitle": "双语与主题",
      "bilingualBody": "中文在根路径，英文在 /en/ 下，两种语言的页面路径一一对应，切换语言时停在当前页面。主题默认跟随系统，也可手动切换，选择记在浏览器本地，刷新不闪烁。",
      "fixTitle": "纠错",
      "fixBody": "发现事实错误、来源失效或专名译法不一致，请在站群仓库提交 issue，注明条目 ID 与依据。核对后更新条目并把 updated 字段改到当天。",
      "gateTitle": "校验门禁",
      "techTitle": "技术说明",
      "statsTitle": "当前规模",
      "statsNote": "数字由构建时统计，随内容库更新而变，不手工维护。",
      "sectionsTitle": "分板块条目数",
      "sectionsHead": "板块",
      "catStatsTitle": "分内容类别条目数",
      "categoriesHead": "类别",
      "rightsTitle": "来源层授权状态",
      "rightsHead": "授权状态",
      "archiveTitle": "来源层归档方式",
      "archiveHead": "归档方式"
    },
    "footer": {
      "portal": "回到溧水一方",
      "rights": "成果层文字：CC BY 4.0",
      "updated": "内容更新至"
    },
    "type": {
      "article": "文章"
    },
    "depth": {
      "stub": "骨架条目",
      "standard": "常规条目",
      "full": "长条目"
    },
    "confidence": {
      "high": "可靠",
      "medium": "存疑",
      "low": "待核"
    },
    "precision": {
      "year": "年",
      "decade": "十年",
      "century": "世纪",
      "unknown": "不详"
    },
    "rights": {
      "public-domain": "公有领域",
      "gov-open": "政府公开信息",
      "excerpt-only": "摘录（受版权保护）",
      "link-only": "仅登记链接",
      "permission-required": "授权未定",
      "unknown": "授权状态未知"
    },
    "notFound": {
      "title": "没有这个页面",
      "lede": "地址可能写错了，或者这条内容还没上线。",
      "back": "回到首页"
    }
  },
  "en": {
    "lang": "en",
    "langShort": "EN",
    "langLabel": "Language",
    "labelSep": ": ",
    "skip": "Skip to main content",
    "nav": {
      "home": "Home",
      "index": "Index",
      "about": "About"
    },
    "theme": {
      "dark": "Switch to dark mode",
      "light": "Switch to light mode"
    },
    "wordmark": {
      "sub": "Lishui · Nanjing"
    },
    "hero": {
      "searchButton": "Search",
      "searchHint": "Search runs on the index page, over every published entry on this site."
    },
    "stats": {
      "entries": "Published entries",
      "categories": "Content categories",
      "sources": "Source records"
    },
    "home": {
      "latestTitle": "Recently updated",
      "latestNote": "Ordered by the updated field, six at most.",
      "latestSeeAll": "See every entry",
      "rulesTitle": "Editorial rules",
      "browseAll": "Browse all"
    },
    "list": {
      "countUnit": "entries",
      "filterCategory": "Category",
      "filterTag": "Tag",
      "filterAll": "All",
      "clear": "Clear filters",
      "pager": "Pagination",
      "pagerInfo": "Entries {from}–{to} of {total}",
      "pagerPrev": "Previous",
      "pagerNext": "Next",
      "pagerPage": "Page {n}",
      "search": "Search all entries",
      "noresult": "No entry matches the current filters.",
      "empty": "No published entries in this category yet."
    },
    "detail": {
      "toc": "On this page",
      "info": "Details",
      "type": "Type",
      "category": "Category",
      "time": "Date",
      "dynasty": "Period",
      "era": "Era name",
      "precision": "Precision",
      "approx": "c.",
      "depth": "Depth",
      "confidence": "Confidence",
      "updated": "Updated",
      "protection": "Protection",
      "protectionBatch": "Listing",
      "address": "Location",
      "genre": "Genre",
      "outcome": "Outcome",
      "related": "Related entries",
      "places": "Places",
      "sources": "Sources",
      "sourceLocator": "Reference",
      "sourceAccessed": "Accessed",
      "sourceRights": "Rights",
      "backToList": "Back to the list",
      "license": "The text of this entry is licensed CC BY 4.0; please credit the source when reusing it.",
      "unverified": "This entry has not yet been checked against its sources by a second person."
    },
    "indexPage": {
      "title": "Index",
      "colYear": "Year",
      "colEntry": "Entry",
      "colType": "Type",
      "colCategory": "Category",
      "colDepth": "Depth",
      "noTime": "No year"
    },
    "about": {
      "title": "About this site",
      "scopeTitle": "Scope",
      "sourceTitle": "Sources",
      "licenseTitle": "Licence",
      "licenseBody": "The text of the entries is licensed CC BY 4.0: reuse and adaptation, including commercial use, require attribution only. The rights status of each source in the source layer is given in its own rights field and is not transferred by this licence.",
      "bilingualTitle": "Languages and themes",
      "bilingualBody": "Chinese is served from the root and English from /en/, with page paths matching one to one, so switching language keeps you on the same page. The theme follows your system setting by default and can be switched by hand; the choice is stored in your browser and does not flash on reload.",
      "fixTitle": "Corrections",
      "gateTitle": "Validation",
      "techTitle": "How it is built",
      "statsTitle": "Current size",
      "statsNote": "Counted at build time from the content repository; nothing here is maintained by hand.",
      "sectionsTitle": "Entries by section",
      "sectionsHead": "Section",
      "catStatsTitle": "Entries by category",
      "categoriesHead": "Category",
      "rightsTitle": "Source layer by rights status",
      "rightsHead": "Rights",
      "archiveTitle": "Source layer by archive",
      "archiveHead": "Archive"
    },
    "footer": {
      "portal": "Back to A Place Called Lishui",
      "rights": "Entry text: CC BY 4.0",
      "updated": "Content updated to"
    },
    "type": {
      "article": "Article"
    },
    "depth": {
      "stub": "Skeleton",
      "standard": "Standard",
      "full": "Long-form"
    },
    "confidence": {
      "high": "High",
      "medium": "Qualified",
      "low": "Unconfirmed"
    },
    "precision": {
      "year": "year",
      "decade": "decade",
      "century": "century",
      "unknown": "unknown"
    },
    "rights": {
      "public-domain": "Public domain",
      "gov-open": "Government open information",
      "excerpt-only": "Excerpt (copyrighted)",
      "link-only": "Link only",
      "permission-required": "Permission pending",
      "unknown": "Rights unknown"
    },
    "notFound": {
      "title": "No such page",
      "lede": "The address may be wrong, or this entry is not online yet.",
      "back": "Back to the home page"
    }
  }
};
