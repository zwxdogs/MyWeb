import { getCollection, type CollectionEntry } from 'astro:content';
import { assertPapersConsistent } from './papers-preflight';

type Paper = CollectionEntry<'papers'>;

/**
 * 论文排序的唯一真相：年份降序 → 月份降序 → slug 升序。
 *
 * 为什么三级键要写全：`getCollection()` 的返回顺序没有契约（官方原话是
 * non-deterministic and platform-dependent），而 `Array.prototype.sort` 的稳定性
 * 只保住「进排序那一刻」的次序——那个次序本身就是不可靠的。所以比较器自己写全
 * 每一级键，不依赖上游顺序。
 *
 * slug 在集合内强制唯一，所以永远有全序，不存在完全相等的并列。
 *
 * 排序里一律用 `entry.id`（frontmatter 的 `slug` 会覆盖自动生成的 id），
 * 不要写 `entry.slug`——那个属性在 Astro 7 已经不存在。
 */
export function sortPapers(entries: Paper[]): Paper[] {
  return [...entries].sort((a, b) => {
    if (a.data.year !== b.data.year) return b.data.year - a.data.year;
    if (a.data.month !== b.data.month) return b.data.month - a.data.month;
    // 不localeCompare：它受运行环境 locale 影响，构建机不同就可能换序。
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * 论文的取数入口：**排序 + 预检**都从这里走。
 *
 * 首页、论文列表页、论文详情页都调它，因此三处拿到的是同一套顺序，
 * 而预检也因此在每个路由单独构建时都会执行一次（静态生成器会把每个路由
 * 单独跑一遍；只在一处调，另一处单独构建时就没有防线）。
 */
export async function getSortedPapers(): Promise<Paper[]> {
  const papers = await getCollection('papers');
  assertPapersConsistent(papers);
  return sortPapers(papers);
}
