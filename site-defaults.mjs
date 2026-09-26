/* lishui-kit · 共用站点常量默认值
 *
 * 三站逐字相同的常量集中在这里；站点 config.mjs 用再导出取用，
 * 所以各 View 里 `import { ARCHIVE } from '../site/config.mjs'` 一行都不用改。
 *
 * 判断标准是「是否全站一致」：
 *   ARCHIVE          三站逐字相同 → 默认值即终值
 *   RULES            历史与文化逐字相同；街镇第 2、3 条按官方文件口径自写 → 街镇自行覆盖
 *   LIST_PAGE_SIZE   三站都是 24
 * 站点特有的 CATEGORIES／SECTIONS／PERIODS／VILLAGE_LEVEL／CN_NUM 不在这里，
 * 它们属于本站编纂体系，上移会把这个文件变成一堆分支判断。
 */

/* ---------- 来源层归档方式 ---------- */

export const ARCHIVE = {
  zh: {
    fulltext: '全文或影印本归档',
    'link-registered': '登记链接（有在线版本）',
    'catalogued-only': '仅著录（未见在线版本）',
    excerpt: '摘录卡（只记必要片段）',
    link: '链接档案（政府页与名录）',
  },
  en: {
    fulltext: 'Full text or scan archived',
    'link-registered': 'Link registered (online copy exists)',
    'catalogued-only': 'Catalogued only (no online copy seen)',
    excerpt: 'Excerpt card (essential passages only)',
    link: 'Link record (government pages and lists)',
  },
};

/* ---------- 编纂凡例（首页） ---------- */

export const RULES = {
  zh: [
    ['一', '无来源不入库', '每条条目引用的来源都必须在来源层存在对应卡片，且 <code>rights</code> 字段填明授权状态。无来源的事实不进入已发布状态。'],
    ['二', '成果层自撰', '成果层文字一律自行撰写，不整段转录受版权保护的来源；旧志原文属公有领域，引用也标卷次页码。'],
    ['三', '矛盾并列', '来源互相矛盾时并列呈现、各自标注，不做单方面取舍；传说保留「相传」字样，与史实分段。'],
    ['四', '双语成对', '中英共用同一个条目 ID，英文稿放在 <code>content/en/</code> 的对称路径下。缺任一份，两份都不得发布。'],
  ],
  en: [
    ['I', 'No source, no entry', 'Every source cited by an entry must exist as a card in the source layer with its <code>rights</code> status stated. Nothing without a source is published.'],
    ['II', 'Written, not copied', 'Entry text is written here, not transcribed wholesale from copyrighted sources. Public-domain gazetteer passages are quoted by juan and page.'],
    ['III', 'Disagreement shown', 'Where sources disagree they are set side by side, each attributed; tradition keeps its original wording and is kept apart from record.'],
    ['IV', 'Paired languages', 'Chinese and English share one entry ID, with the English draft at the mirrored path under <code>content/en/</code>. If either is missing, neither may be published.'],
  ],
};

/* ---------- 列表页每页条数 ---------- */

/** 卡片网格按 300px 起排，24 条正好是 4 列 × 6 行。 */
export const LIST_PAGE_SIZE = 24;
