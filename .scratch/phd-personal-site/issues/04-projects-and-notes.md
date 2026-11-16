# 项目条目与分享条目的内容模型

Type: grilling
Status: **resolved**（2026-11-16 关闭）
Blocked by: 02（已关闭）
GitHub: [#5](https://github.com/zwxdogs/MyWeb/issues/5)

> 本文件是仓库内离线副本。**权威副本是 GitHub Issue**。

## Question

项目和分享两块的内容模型。两者都比论文简单，但要定清楚，否则骨架里无法填样例。

**项目**（已定：全部项目都带截图 +「为什么做这个」）：

1. 字段：名称、一句话简介、技术栈、仓库链接、截图、「为什么做这个」正文、年份/时间
2. 技术栈是字符串数组（便于以后按标签筛选）还是自由文本？
3. 「为什么做这个」写在 frontmatter 还是正文 Markdown？长度有没有约束？
4. 截图多张还是固定一张？要不要配说明？
5. 项目要不要区分「活跃 / 归档」，还是不做区分？

**分享**（已定：先留空位，格式为 Markdown）：

6. 字段：标题、日期、正文；要不要摘要字段（首页那栏要显示简介）？摘要自动截取正文还是手写？
7. 分享是否一定要标题，还是允许只有日期和一段话？
8. 首页分享栏空置时显示占位文字——这段文字的文案定一句。

补充（讨论中新增）：

9. 分享是否也强制手填 `slug`（沿用 #3 的全局规则）？
10. 项目配几张截图、上限多少？
11. 分享要不要 `tags` 字段？
12. 项目排序按日期还是加手动 `order`？

## Answer

> 裁定日期 2026-11-16。

### 第一性原理

**项目条目不可替代的内容只有两样：截图 +「为什么做这个」。** 名称、简介、栈、时间是让读者决定「要不要点开」的钩子；`repo` / `demo` 服务于点开之后还要不要继续走。

**分享条目不可替代的内容只有两样：时间 + 一段话。** 其余都是装饰。

由此得出一条贯穿全票的判据：**schema 只管结构不变量，不管编辑品味。**

| schema 该管 | schema 不该管 |
| --- | --- |
| `slug` 格式、必填字段缺失、图片路径不存在、`alt` 缺失 | 「一个项目配几张图好看」「摘要该多长」 |

前者错了页面就是坏的（构建失败或白屏）；后者错了页面不坏，只是内容编排得不好。**用硬失败去表达编辑偏好，是拿最重的工具干最轻的活**——这是本票唯一一处把已定的做法推翻重来的地方（`.max(4)` 被去掉）。

### 一页纸结论

| # | 议题 | 决定 |
| --- | --- | --- |
| 1 | 项目字段 | 9 个，**7 必填 2 可选**（`repo` / `demo` 可选） |
| 2 | 技术栈 | **数组** `z.array(z.string()).min(1)`；元素写产品原名大小写 |
| 3 | 「为什么做这个」 | **正文 Markdown**，只校验非空；2–5 段/150–400 字是写作建议不做强制 |
| 4 | 截图 | `shots` 数组 `{src, alt}[]`，**`min(1)`、不设上限**；第一张即封面；`alt` 必填 |
| 5 | 活跃/归档 | **不做区分**，不加 `status` |
| 6 | 分享摘要 | **不设 `summary`**；需要时从正文首段自动截取（`src/lib/excerpt.ts`） |
| 7 | 分享标题 | **必填** |
| 8 | 空态文案 | 模板 `暂无{栏目名}。` → 分享栏即 **`暂无分享。`** |
| 9 | 分享 slug | **强制手填**，与文件名脱钩 |
| 10 | 项目排序 | **按 `date` 倒序**，不加 `order` |
| 11 | 分享 tags | **不加** |
| 12 | `draft` | **不加** |
| 13 | 目录组织 | **一篇一目录**：`src/content/<集合>/<slug>/index.md` + 同目录图片 |

### 落地契约

#### 文件树

```
src/
├── content.config.ts
├── content/
│   ├── projects/
│   │   └── <slug>/
│   │       ├── index.md
│   │       ├── shot-1.webp
│   │       └── shot-2.webp
│   ├── notes/
│   │   └── <slug>/
│   │       └── index.md
│   └── papers/                 ← #4 负责，此处不定义
└── lib/
    └── excerpt.ts              ← 分享摘要截取
```

**为什么一篇一目录**：删项目 = 删一个目录，图片不会成为孤儿；`./shot-1.webp` 比 `../../assets/projects/x.webp` 短；正文里 `![](./shot-1.webp)` 与 frontmatter 里 `image()` 的相对路径语义**完全一致**（基准都是条目文件所在目录），一套心智模型管两处。

#### `src/content.config.ts`

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// URL 段：全小写、连字符分隔、不许下划线、不许首尾或连续连字符。
// 发布后不可变——改 slug 等于发一篇新内容。
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      slug,
      name: z.string().min(1),
      // 一句话简介：列表页与首页那一栏只显示它，缺了无法排版。
      summary: z.string().min(1),
      // 必须带日 YYYY-MM-DD：裸写会被 YAML 层解析成 Date，
      // 故只能用 z.coerce.date()，不能用 z.string()。
      date: z.coerce.date(),
      stack: z.array(z.string().min(1)).min(1),
      // 第一张即封面。张数不设上限：那是编辑品味，不是结构不变量；
      // 真正的约束是单张体积（见地图 Not yet specified）。
      shots: z
        .array(z.object({ src: image(), alt: z.string().min(1) }))
        .min(1),
      repo: z.string().url().optional(),
      demo: z.string().url().optional(),
    }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    slug,
    title: z.string().min(1),
    date: z.coerce.date(),
    // 不设 summary / tags / draft，理由见一页纸结论 6/11/12。
  }),
});

export const collections = { projects, notes };
```

> Zod 4 另提供顶层 `z.url()`，与 `z.string().url()` 落地时任选；**以实际编译通过为准**。

#### `astro.config.mjs`

```js
export default defineConfig({
  trailingSlash: 'always',      // #3 已定：仅为 dev 与 Astro.url 一致性
  prerenderConflictBehavior: 'error',  // ← 本票新增，见「推翻与更正」2
});
```

#### 样例条目（骨架必须填 1 条真实项目）

```md
---
slug: paper-digest
name: Paper Digest
summary: 把 arXiv 新投稿按研究方向筛一遍，省掉每天早上翻列表的时间。
date: 2026-05-18
stack: [Python, FastAPI, SQLite, Preact]
shots:
  - src: ./shot-1.webp
    alt: 首页列表，每行一条论文，左侧是方向标签
  - src: ./shot-2.webp
    alt: 单篇论文的摘要页，右侧是原文链接与引用按钮
repo: https://github.com/zwxdogs/paper-digest
---

## 为什么做这个

每天早上要翻五个 arXiv 分类的 new 列表，翻完发现只有一两篇相关。
……
```

（正文 2–5 段：先说是什么场景让我需要它，再说为什么现成方案不行。）

#### 摘要截取函数规格（`src/lib/excerpt.ts`）

官方**没有**摘要 API（`render()` 只返回 `Content` / `headings` / `remarkPluginFrontmatter`），且 `entry.body` 是**磁盘原文**——图片语法未被改写。所以不能 `slice(0, 100)`。

1. 输入 `entry.body`（原始 Markdown 字符串）。
2. 按空行切块；**跳过**纯图片块（`^!\[[^\]]*\]\([^)]*\)$`）与标题块（`^#{1,6}\s`）。
3. 取第一个可用块。
4. 剥 Markdown 标记：`![alt](url)` 整段删除；`[text](url)` → `text`；`**x**` / `*x*` / `` `x` `` → `x`；合并连续空白。
5. 截到约 100 个字符（中文按字符计），加 `…`。
6. 没有可用块 → 返回空串，调用方**整个省略** `<meta name="description">`（不要输出空标签）。

用途：只用于 `<meta name="description">`。首页与列表页展示「标题 + 日期」，不显示摘要——这是「不设 summary」能成立的前提。

#### 空态文案

```
暂无{栏目名}。
```

首页分享栏 → `暂无分享。`；`/notes/` → `暂无分享。`；`/projects/` → `暂无项目。`；`/papers/` → `暂无论文。`

一处模板，四个用处。不写「敬请期待」之类：内容一填进来就成死文本，还得记得删。

### 推翻与更正（含对已关闭票的修正）

1. **`date` 不能用 `z.string()` 裸写。** frontmatter 里 `date: 2026-11-05` 不加引号会被 Astro 的 YAML 层解析成 **`Date` 对象**，`z.string()` 校验直接失败（`Expected type "string", received "object"`）。⇒ 用 `z.coerce.date()`，**必须带日**。本条也适用于 #4。
2. **重复 `slug` 不会让构建失败。** 默认 `prerenderConflictBehavior: 'warn'`：只警告、构建成功、`getCollection()` 只剩一条，**且谁被覆盖非确定性**。这**推翻 #3 里「重复直接构建失败」的说法**。⇒ 必须显式设 `'error'`。已在 #3 留补遗。
3. **正文图片会被优化，路径基准是条目文件目录。** `![](./shot-1.webp)` 渲染成 `/_image?href=…&w=…&h=…&f=webp` 并自动补宽高；路径不存在直接构建报错。判定规则：不以 `/` 开头且不是 URL → 当本地图优化；`/` 开头 → 原样保留、指向 `public/`、**永不优化**。
4. **本票自己推翻的一处**：最初给 `shots` 设 `.max(4)`，被 owner 质疑后**去掉上限，只留 `min(1)`**。张数是编辑品味，不是结构不变量；真正的约束是单张体积。

### 已查范围与调研

**已查（提问前）**：本票正文与评论、地图 [#1](https://github.com/zwxdogs/MyWeb/issues/1)、已关闭的 [#3](https://github.com/zwxdogs/MyWeb/issues/3) 裁定。

**旧笔记不适用**：`docs/research/` 两份只到「要有 404 页」「作品集随项目更新」的原则层，本票 8 问一处未触及；[`astro-url-and-slug-facts.md`](../research/astro-url-and-slug-facts.md) 只覆盖 URL/slug/分页/404。

**新查笔记**：[`astro-content-schema-facts.md`](../research/astro-content-schema-facts.md) —— Astro 7.4.12 的 content collections 字段机制，10 节。**限制**：`docs.astro.build` 被 SSRF 拦截，改从 `withastro/docs` 仓库 mdx 源文件与 `withastro/astro` 源码/官方测试取原文。

### 移交与已知风险

| 事项 | 去向 |
| --- | --- |
| 图片压缩的具体阈值与工具（长边像素、目标格式、**单张体积上限**） | 地图 Not yet specified —— 本票确认**真正该设限的是体积而非张数** |
| 首页各栏展示哪几个字段、要不要 `featured` | [#6 首页四栏的内容来源与降级规则](https://github.com/zwxdogs/MyWeb/issues/6) |
| 论文「首页一张图、详情页多张」的图片来源规则 | [#4 论文内容模型与文件组织](https://github.com/zwxdogs/MyWeb/issues/4)（已转记 owner 原话） |
| `date` 必须带日、`prerenderConflictBehavior: 'error'` | #3 契约补遗（已在 #3 留评论） |

**已知风险**：

- **摘要截取无官方契约**。官方范式是手写 `description` 字段，「正则切 body」属社区做法。若日后 Astro 改 `entry.body` 的形态，截取函数需跟着改。
- **`z.array(z.object({ src: image(), alt }))` 官方文档无逐字示例**。实测通过，官方 fixture 里是 `arrayOfImages: z.array(image())` 与 `cover: z.object({ image: image() })`。若升级后不兼容，退化为并列数组。
- **`prerenderConflictBehavior` 对 content 条目 slug 的作用只在源码里体现**，官方文档只谈「两条路由同 URL」。升级大版本需重新确认。

## 进度

- 10%（2026-11-15T22:46）· 已读票正文、地图、已关闭 #3 裁定、仓内四份笔记；第一轮 9 问已提出
- 35%（2026-11-15T23:05）· 后台一手核查完成并落笔记；两条既有判断被推翻
- 50%（2026-11-16T09:20）· 第一轮 6/9 已定；Q1 补「字段用处」、Q3 澄清、Q4 重问
- 60%（2026-11-16T09:30）· 正文插图核查完成，笔记增补第 10 节；更正 3、4 写入
- 100%（2026-11-16T09:50）· 第二轮 Q10–Q17 全部裁定；`shots` 上限被推翻并去掉；完整契约写入 Answer；票已关闭

## 未做 / 下一步

- 骨架尚未实现（属 [#7](https://github.com/zwxdogs/MyWeb/issues/7) 的验收对象）
- `content.config.ts` 的代码**未在真实 Astro 项目里编译验证过**——这是本票的已知缺口，落地时以 `astro check` 通过为准
- 摘要截取函数只有规格，未写实现
