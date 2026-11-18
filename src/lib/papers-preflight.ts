import type { CollectionEntry } from 'astro:content';

type Paper = CollectionEntry<'papers'>;

/**
 * 论文目录下的**全部**文件，只取路径、不加载内容
 * （`eager: false` 拿到的是惰性 import 函数，这里的值从来不被调用）。
 *
 * 这是「有哪些论文目录」的唯一来源：目录清单只从它推导一次，不另立第二份。
 */
const PAPER_FILES = import.meta.glob('/src/content/papers/*/*', {
  eager: false,
}) as Record<string, unknown>;

/** 论文 `index.md` 的原文，用来读 frontmatter 里声明的 slug。 */
const PAPER_SOURCES = import.meta.glob('/src/content/papers/*/index.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/**
 * 论文的构建期预检（设计稿 §8.2）。管四件事，任何一件不满足就构建失败：
 *
 * 1. **目录名必须等于 slug**。否则 URL 仍按 frontmatter 的 slug 生成、页面一切正常，
 *    只是磁盘上的目录名与 URL 对不上——半年后没人看得懂，而这**不会报错**。
 * 2. **目录里必须有 `index.md`**（判据是「这个目录里有文件」——理由见下）。
 * 3. **slug 集合内唯一**。
 * 4. **DOI 不能跨条目重复**（大小写不敏感——DOI 按定义大小写不敏感）。
 *
 * ## 为什么 1–3 必须看磁盘，而不是数 `getCollection()` 的结果
 *
 * 这一条是实测出来的，不是推的：
 *
 * - **内容集合的 data store 以 slug 作键**。两个目录写同一个 slug 时，`getCollection()`
 *   只返回其中一条，另一条**连影子都没有**。所以「数一数 papers 数组里有没有重复
 *   slug」永远数不出东西——那段代码是死的。
 * - **`entry.filePath` 会被缓存**。命中缓存时保留旧路径，于是「只把目录改名、内容一字
 *   不改」的情况下它仍指向旧目录，预检看不见改名，构建静默通过。
 * - **配置层那道防线（`prerenderConflictBehavior: 'error'`）在本机实测中**没能拦住
 *   「两个目录撞同一个 slug」：glob loader 用 `pLimit(10)` 并发读条目，两条重名条目
 *   同时进 `syncData`，各自查「store 里已有一条同 slug 的条目吗」时对方都还没写进去，
 *   于是谁都没报冲突，后写的那条静静覆盖前一条，构建退出码 0。那道配置仍在（上游行为
 *   若恢复，它会更早报错），但**不能把它当成唯一防线**——本票「不能静默覆盖」的判据
 *   由这里兜住。
 *
 * 结论：磁盘上的目录与文件才是真相，所以 1–3 直接看它。第 4 条读内存里的条目就够
 * （DOI 不参与去重，两条都进得来）。
 *
 * ## 为什么第 2 条的判据是「有文件」而不是「有目录」
 *
 * 单独建一个空目录，git 不跟踪、推不上去，clone 下来也不存在——为它建防线是防幻觉。
 * 但**带图的目录例外**：目录里有图，git 就会跟踪那个目录；这时把 `index.md` 改名或
 * 误删，图还在、目录还在、那篇论文静默消失，构建却全绿。所以只在目录里确实有文件时
 * 才要求 `index.md`。
 *
 * ## 为什么放在「取数入口」而不是某个页面里
 *
 * 静态生成器会把每个路由单独跑一遍。只在列表页调，详情页单独构建时就没有防线；
 * 反之亦然。所以两个入口都调——统一在 `lib/collections.ts` 的 `getSortedPapers()`。
 */
export function assertPapersConsistent(papers: Paper[]): void {
  const { directories, problems } = readDiskState();

  // 1 + 3：目录名 = slug、slug 唯一
  const slugOwners = new Map<string, string[]>();
  for (const { directory, declaredSlug } of directories) {
    if (declaredSlug === undefined) {
      problems.push(
        `论文目录 "${directory}" 的 index.md 里读不到 slug。` +
          `slug 是必填字段，它必须逐字等于目录名。`,
      );
      continue;
    }
    if (declaredSlug !== directory) {
      problems.push(
        `论文目录 "${directory}" 的 slug 是 "${declaredSlug}"，两者不一致。` +
          `目录名与 slug 必须逐字相同，否则磁盘结构与 URL 会各说各话。`,
      );
    }
    const owners = slugOwners.get(declaredSlug) ?? [];
    owners.push(directory);
    slugOwners.set(declaredSlug, owners);
  }

  for (const [slug, owners] of slugOwners) {
    if (owners.length > 1) {
      problems.push(
        `slug "${slug}" 被 ${owners.length} 个目录同时使用：${owners.join('、')}。` +
          `slug 在同一集合内必须唯一；两个目录写同一个 slug 时，构建只会留下其中一条，` +
          `而且留下哪条没有契约。`,
      );
    }
  }

  // 磁盘上有论文目录，但集合里一条都没加载出来：这不是「没有论文」，是「有论文却没进来」。
  if (directories.length > 0 && papers.length === 0) {
    problems.push(
      `磁盘上有 ${directories.length} 个论文目录，但集合里一条都没加载出来。` +
        `检查 content.config.ts 里的 loader 配置。`,
    );
  }

  // 4. DOI 跨条目唯一（大小写不敏感）
  const doiOwners = new Map<string, string[]>();
  for (const paper of papers) {
    const doi = paper.data.doi;
    if (!doi) continue;
    const key = doi.toLowerCase();
    const owners = doiOwners.get(key) ?? [];
    owners.push(`${paper.data.slug}（${doi}）`);
    doiOwners.set(key, owners);
  }
  for (const [, owners] of doiOwners) {
    if (owners.length > 1) {
      problems.push(
        `同一个 DOI 出现在多篇论文里：${owners.join('、')}。` +
          `DOI 大小写不敏感，两篇写同一个 DOI 会让「查看原文」跳到同一处。`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      ['论文集合的构建期预检没通过：', ...problems.map((line) => `  - ${line}`)].join('\n'),
    );
  }
}

interface PaperDirectory {
  directory: string;
  /** 该目录 index.md 的 frontmatter slug；没有 index.md 时是 undefined。 */
  declaredSlug: string | undefined;
}

/** 扫一遍磁盘，返回每个论文目录声明的 slug，加上扫出来的问题。 */
function readDiskState(): { directories: PaperDirectory[]; problems: string[] } {
  const problems: string[] = [];
  const filesByDirectory = new Map<string, string[]>();

  for (const path of Object.keys(PAPER_FILES)) {
    const directory = pathDirectoryOf(path);
    const fileName = pathFileNameOf(path);
    if (directory === undefined || fileName === undefined) {
      problems.push(`预检读到了意料之外的文件路径：${path}`);
      continue;
    }
    const files = filesByDirectory.get(directory) ?? [];
    files.push(fileName);
    filesByDirectory.set(directory, files);
  }

  const directories: PaperDirectory[] = [];
  for (const [directory, files] of filesByDirectory) {
    const hasIndex = files.includes('index.md');
    if (!hasIndex) {
      problems.push(
        `论文目录 "${directory}" 里有文件，但没有 index.md。` +
          `一篇论文 = 一个目录 + 一个 index.md；缺了它，这篇论文会静默消失、构建却全绿。`,
      );
      continue;
    }
    directories.push({
      directory,
      declaredSlug: parseSlug(PAPER_SOURCES[`/src/content/papers/${directory}/index.md`]),
    });
  }

  return { directories, problems };
}

/** 从 `/src/content/papers/<目录>/<文件>` 这样的键里取出目录名。 */
function pathDirectoryOf(path: string): string | undefined {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 2];
}

/** 从 `/src/content/papers/<目录>/<文件>` 这样的键里取出文件名。 */
function pathFileNameOf(path: string): string | undefined {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1];
}

/**
 * 从 index.md 的 frontmatter 里取出 `slug` 的裸值（去掉首尾引号）。
 *
 * 这确实是第二套解析（schema 也会读一次），但它回答的是不同的问题：「这个目录声明自己
 * 是哪个 slug」。schema 读不到「目录名」这个信息，所以两条路都必须在。
 * 只认一行 `slug:`，不引 YAML 解析器；类型、格式、必填由 schema 管，两处不重复管事。
 */
function parseSlug(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;

  // frontmatter 是文件开头两条 `---` 之间的部分；正文里的 `slug:` 不算。
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!frontmatter) return undefined;

  const line = /^slug:\s*(.+)$/m.exec(frontmatter[1]);
  if (!line) return undefined;

  return line[1].trim().replace(/^['"]|['"]$/g, '');
}
