# 首页四栏的内容来源与降级规则

Type: grilling
Status: closed（2026-11-17）
Blocked by: 02 ✅, 03 ✅, 04 ✅

> **权威副本在 GitHub：[#6](https://github.com/zwxdogs/MyWeb/issues/6)**。本文是离线可读的镜像，结论与契约完整；逐条推导见 issue 正文。

## Question

首页是单页可下滑结构（介绍 → 论文 → 项目 → 分享），每栏显示最新 2–3 条。要把「每栏取哪几条、怎么排、内容为空时显示什么」定死。

1. **每栏取几条**：固定 2 条还是 3 条？三栏分别定还是统一？
2. **「最新」按什么排**：论文按年份（同年多篇怎么排？按文件修改时间还是手动序号）？项目按什么（没有天然时间字段的话）？分享按日期。
3. **降级规则**：没有论文时显示什么？只有一个项目时显示什么？分享栏已定为显示「以后会在这里写点东西」占位。
4. **个人介绍那段文字**：放哪（`src/content` 下的一个 MD？还是一个配置文件？），改它需要改代码吗？
5. **联系方式栏**：邮箱 / GitHub / Google Scholar 三项，如果某一项没有怎么处理（不显示、还是显示但灰掉）？数据从哪读（配置文件）？
6. **每栏底部**：要不要「查看全部 →」链接指向列表页。
7. **每栏每条显示哪些字段**（#5 移交）。
8. **要不要 `featured` 置顶机制**。
9. **字段命名**：地图写 `snake_case`，#4 的 schema 曾是 camelCase。

## Answer

判据：**首页不是第二个列表页，是「为什么要点开」的橱窗。** 每条内容只承担一个职责——让人判断要不要继续走。凡是不服务这个判断的字段、不服务于「少写了就该报错」的规则，一律不进首页。

### 一页纸结论

| # | 议题 | 决定 |
| --- | --- | --- |
| 1 | 每栏条数 | 三栏统一 **3 条**（`HOME_LIMIT = 3`） |
| 2 | 排序 | 首页**复用列表页排序函数**取前 3；分享补 `slug asc` 第三级；**比较器写全每级键** |
| 3 | 降级 | `0` → `暂无{栏目名}。`；`1–2` → 正常渲染**不补占位**；`≥3` → 取前 3 |
| 4 | 个人介绍 | `src/content/profile/index.md` 单条目集合；正文=介绍，frontmatter=姓名+联系方式；**改它不改代码** |
| 5 | 联系方式 | `email` 必填；`github`/`scholar` 可选；**不加 ORCID**；缺了整项不渲染 |
| 6 | 查看全部 | **仅在该栏总条数 > 3 时显示** |
| 7 | 每条字段 | 论文：封面图+`title_zh`（主）+`title_en`（次）+`venue · year`；项目：封面图+`name`+`summary`；分享：`title`+`date` |
| 8 | 置顶 | **不做 `featured`** |
| 9 | 字段命名 | 全 `snake_case`（与地图一致；#4 第二条补遗已完成对齐） |

### 1. 为什么是 3 条

地图终点的验收是骨架里真的填进 **2 篇论文 + 1 个项目**。取 2 条，论文栏刚好填满，「不足 N 条」这条分支在骨架期**永远不触发**；取 3 条，骨架当场把「只有 1 个项目」渲染一遍。三栏统一而非分别定：一个常量，改一处三栏一起变。

### 2. 排序：复用 + 写全比较器

**其一，首页与列表页共用一个函数。** 两处各写一遍迟早漂移，而漂移**不报错**，只让首页和列表页顺序不一致。

**其二，比较器每级键写全。** `Array.prototype.sort` 自 ES2019 起规范强制稳定（V8 7.0 / Node 12 起），所以「靠稳定性保住第二级」在单次内存排序内成立——**但稳定性只保住「进 `sort()` 那一刻」的次序**，而那个次序来自 `getCollection()`，**它没有顺序契约**（官方原话：non-deterministic and platform-dependent）。实测 7.4.12 源码在写盘前按 `localeCompare` 排过，本地看着像稳定 id 升序，但那是写盘确定性、不是承诺，且依赖 ICU/locale。

⇒ 比较器自己写完每一级键。`slug` 强制唯一（#3），所以永远有全序，不存在完全相等的并列。

**分享补第三级**：`date desc → slug asc`。同一天两篇，没有第三级就退化成依赖输入顺序。

### 3. 降级：三档，中间档不补占位

| 该栏条目数 | 渲染 |
| --- | --- |
| `0` | `暂无{栏目名}。` → `暂无论文。` / `暂无项目。` / `暂无分享。` |
| `1 … 2` | 正常渲染这几条，**不补空占位、不留白、不重复** |
| `≥ 3` | 取前 3 |

**本票推翻了地图两行**：地图「首页」「分享」都写着分享栏空置显示「以后会在这里写点东西」，但 #5 已裁定空态统一 `暂无{栏目名}。` 并明确否决这类文案（内容一填进来就成死文本，还得记得删）。**以 #5 为准**，地图那两句已改掉。

中间档不补占位是刻意的：「只有一个项目」不是错误状态，补一句「还有更多」反而是假话。

### 4. 个人介绍：单条目集合

```
src/content/profile/
└── index.md      ← frontmatter: slug/name/email/github?/scholar?
                    正文: 自我介绍那一段（Markdown）
```

正文放介绍（需要 Markdown，会有「我在 X 实验室」这类链接），frontmatter 放联系方式（结构化字段，模板渲染 + schema 校验）。

**为什么不是 `src/config.ts` 常量**：官方对这件事**没有任何条款**（en 430 个 mdx 穷举 0 命中）——Gatsby 迁移页指向 `src/data/siteMetadata.js`，官方模板用 `src/consts.ts`，而官方另有一条反向条款「只有一条或极少数内容页 → 直接写页面组件，别建集合」。所以这是**设计决定，不能标成「照官方做」**。本项目自己的理由：改自我介绍要改 TypeScript 在语义上是错的；且 TS 常量拿不到 schema 校验，邮箱写错、URL 少 `https://` 页面照样生成，坏在浏览器里。

⚠️ **实现陷阱（官方文档对此完全空白）**：`base: './src/content/profile'` + `pattern: '**/index.md'` 时 `entry.id` 实测是 **`"index"`** 而非 `"profile"`（源码正则 `/\/index$/` 要求前面还有路径段）。`getEntry('profile','profile')` 会返回 `undefined` 且只打一条 warning。⇒ schema 用 `z.literal('profile')` 钉死。

### 5. 联系方式：三项保留，缺了整项不渲染

| 字段 | 必填 | 校验 |
| --- | --- | --- |
| `name` | 是 | `z.string().min(1)` |
| `email` | 是 | 邮箱格式 |
| `github` | 否 | URL |
| `scholar` | 否 | URL |

灰掉的链接不可点，读者会以为坏了；而「灰掉」需要禁用态视觉规范，属 Out of scope 的 UI 设计。写错 → 构建失败；没写 → 合法不显示，两种情况不混。

这一栏**出现两次**（介绍下方 + 页脚），必须抽成 `<ContactLinks />` 组件，两处渲染同一份数据。

### 6. 查看全部：条件显示

只在**该栏总条数 > 3** 时显示。链接的价值等于「用户想看的第 4 条是否存在」：只有 3 条时挂「查看全部」，点进去还是这 3 条，那才是真冗余；一旦有第 4 篇就需要出口，而人肉记「什么时候加这个链接」不可能。

### 7. 首页每条显示哪些字段

| 栏 | 显示 | 留到点开之后 |
| --- | --- | --- |
| 论文 | 封面图（`figures[0]`）+ `title_zh`（主）+ `title_en`（次，小字）+ `venue · year` | `summary`、`authors`、`doi`、`my_role` |
| 项目 | 封面图（`shots[0]`）+ `name` + `summary` | `stack`、`repo`/`demo`、动机正文 |
| 分享 | `title` + `date`（#5 已定） | 正文 |

`summary` 不进论文栏：40–400 字在三张卡里会撑爆首屏。项目的 `summary` 要留：一句话简介就是为这个钩子设计的。

`figures` 与 `shots` 都是 `min(1)`（#4 / #5），`[0]` 永远取得到，不需要兜底。

### 8. 不做 `featured`

做了，首页显示了什么就不能从内容文件推出来，得读额外字段；那字段写错**不报错**、只是顺序不对——又一枚静默失效点。不做，规则压成一句：**首页 = 各集合已定排序的前 3 条**。想让某篇更靠前，把 `year`/`month` 填对。

### 9. 字段命名：全 snake_case

地图写「全 `snake_case`（#5 立、#4 沿用）」，#4 的 Answer 正文里却是 `titleEn`/`myRole`/`codeUrl`——但 **#4 的第二条补遗（08:18）已经完成对齐**，只是修正写在评论里、正文保持原样。结论：#4 已对齐，地图那一行准确，全 `snake_case` 执行。

混用的真实代价不是审美：`data.titleEN` 写错得到 `undefined`，Astro 渲染空字符串，**构建照样成功**。

## 落地契约

### `src/content.config.ts` 新增 `profile`

```ts
const profile = defineCollection({
  loader: glob({ base: './src/content/profile', pattern: '**/index.md' }),
  schema: z.object({
    // 锁死 id：单条目目录下 entry.id 实测是 "index"
    slug: z.literal('profile'),
    name: z.string().min(1),
    email: z.string().email(),
    github: z.string().url().optional(),
    scholar: z.string().url().optional(),
  }),
});

export const collections = { papers, projects, notes, profile };
```

### `src/lib/collections.ts` —— 排序的唯一真相

```ts
import { getCollection } from 'astro:content';

export const HOME_LIMIT = 3;

const bySlug = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

// 论文：year desc → month desc → slug asc（#4）
export const byPaper = (a: any, b: any) =>
  b.data.year - a.data.year || b.data.month - a.data.month || bySlug(a, b);

// 项目 / 分享：date desc → slug asc（#5 + 本票补第三级）
export const byDate = (a: any, b: any) =>
  b.data.date.valueOf() - a.data.date.valueOf() || bySlug(a, b);

export const sortPapers   = async () => (await getCollection('papers')).sort(byPaper);
export const sortProjects = async () => (await getCollection('projects')).sort(byDate);
export const sortNotes    = async () => (await getCollection('notes')).sort(byDate);

export const takeHome = <T,>(all: T[]) => all.slice(0, HOME_LIMIT);
```

首页与三个列表页**只调这四个函数**，不各自再写 `.sort()`。

### 首页降级与「查看全部」判定

```astro
{papers.length === 0
  ? <p class="empty">暂无论文。</p>
  : <ul>{papers.map((p) => (
      <li><a href={`/papers/${p.id}/`}>{p.data.title_zh}</a>
          <small>{p.data.title_en}</small>
          <span>{p.data.venue} · {p.data.year}</span>
      </li>
    ))}</ul>}

{allPapers.length > HOME_LIMIT && <a href="/papers/">查看全部 →</a>}
```

项目、分享两栏同构；空态分别为 `暂无项目。` / `暂无分享。`。

### 文件树增量

```
src/
├── content/profile/index.md      ← 本票新增
├── components/ContactLinks.astro ← 介绍下方 + 页脚共用
└── lib/collections.ts            ← 本票新增：排序唯一真相
```

## 已知风险

- **单条目集合的 `id` 行为无官方文档依据**（源码 + 测试 + 实测三层有，文档层空白）。用 `z.literal('profile')` 钉死，若源码行为变化会构建失败而非静默取空。
- **`getCollection()` 的 filter 传对象会被静默忽略**（源码 `hasFilter = typeof filter === 'function'`）。首页与列表页**一律不用 filter 参数**，只用 `.sort()` + `.slice()`；将来要过滤必须写成函数谓词。
- **`localeCompare` 依赖 ICU/locale**。本项目主次序全是数值比较（`year`/`month`/`date`），只在最终 tie-break 用它，且同一集合内不会出现只差 locale 的并列。

## 移交

| 事项 | 去向 |
| --- | --- |
| 列表页中文/英文标题主次 | 地图 Not yet specified |
| 分享第一篇形态（长文/短记） | 地图 Not yet specified |
| 论文列表页按年份分组标题 | 地图 Not yet specified |
| 图片压缩阈值与单张体积上限 | 地图 Not yet specified |
| 骨架验收标准与设计稿交付形态 | [#7](https://github.com/zwxdogs/MyWeb/issues/7)（本票关闭后解锁） |

## 调研

- [`homepage-data-sources-facts.md`](../research/homepage-data-sources-facts.md) —— Astro 7.4.12 九节一手事实。既有七份笔记（`docs/research/` 两份 + `.scratch/.../research/` 五份）只答字段定义、图片路径、URL 生成、构建参数，**本票三类事实一处未触及**，故按 /research 规则新查。
