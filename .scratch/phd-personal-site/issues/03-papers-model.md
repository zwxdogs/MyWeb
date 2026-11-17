# 论文内容模型与文件组织

Type: grilling
Status: resolved
Blocked by: 02

## Question

把论文条目的 frontmatter 字段契约定死，写成可以直接抄进 2 篇真实论文的形态。

已定的字段：英文标题、中文标题、年份、作者、DOI、期刊/会议、中文简介（1–2 段）、图片（1–2 张）。

要定的是：

1. **字段的确切名字与类型**：`titleEn` / `titleZh` 还是 `title` + `titleZh`？年份是数字还是字符串？作者是一个字符串（`张三, 李四, 王五`）还是数组（便于自动加粗 owner 姓名）？
2. **DOI 的存法**：存裸 DOI（`10.1145/xxx`）还是完整链接（`https://doi.org/10.1145/xxx`）？由模板拼链接还是手填链接？
3. **owner 姓名怎么标记**：用一个全局配置里的名字去匹配作者数组，还是每篇手动写加粗标记？共同一作怎么表示——加个字段，还是靠作者名后的符号？
4. **图片的组织**：每篇一个目录（`src/content/papers/<slug>/figure-1.webp`）还是统一放一个大目录？frontmatter 里怎么引用（相对路径 / 数组）？图要不要配说明文字？
5. **中文简介写在哪**：frontmatter 字段（纯文本，不能分段）还是正文 Markdown（能分段但不能只写 1–2 段就结束）？
6. **可选字段**：代码仓库链接、BibTeX、录用率 —— 现在留哪些？

## 调研笔记

**已查（提问前）**：本票正文与评论（0 条）、地图 `#1` 的已定事项 / Not yet specified / Out of scope、`#3` 的裁定全文、`docs/research/` 两份与 `.scratch/phd-personal-site/research/` 三份既有笔记。结论：旧笔记只答到「要有 frontmatter、用 schema 校验」的原则层，**没有一处触及本票第 1–6 项**，故按 /research 规则新查一次。

**新查笔记**：

- [`papers-content-model-facts.md`](../research/papers-content-model-facts.md) —— Astro 7.4.12：`image()` 的路径基准是**该 `.md` 所在目录**且构建期返回 `ImageMetadata`（宽高已知）；`src/` 图构建期转 `webp`，`public/` 图**永不优化**；`papers/<slug>/index.md` 的 `entry.id` 会去掉 `index` 段（源码断言，文档未写）；`z.array(image())` 与跨条目唯一性官方均无承诺；YAML 只有 `|` / `|-` 能保住分段，`>` 会把换行折成空格。

**后续交叉核对（关票后读到，促成三处更正）**：

- [`astro-content-schema-facts.md`](../research/astro-content-schema-facts.md) —— 由 [#5](https://github.com/zwxdogs/MyWeb/issues/5) 期间产出的 10 节实测笔记：`z.array(z.object({src: image()}))` **实测通过**；`image()` + `public/` 路径**实测 `ImageNotFound`**；重复 slug 默认只**警告并静默覆盖**（非报错，赢家非确定性）；`entry.filePath` 存在。

## Answer

> 裁定日期 2026-11-17，补遗同日。第一性原理：**这份契约的读者不是人，是 schema 和模板。** 每个字段的存在理由必须是「模板要渲染它」或「schema 要校验它」；其余一律砍掉——多一个字段就是多一处永远不会报错的静默失效点。
>
> 由此推出一条贯穿全票的取舍标准（与 #5 的判据合流）：**宁可让构建失败，也不让页面悄悄错；但只用硬失败守结构不变量，绝不用它表达编辑品味。**

### 一页纸结论

| # | 议题 | 决定 |
| --- | --- | --- |
| 1 | 标题字段 | `title_en` + `title_zh`，两个都**必填**、对称命名（`snake_case`，对齐 #5） |
| 2 | 年份类型 | `year` 为 **number**（整数 1990–2100） |
| 3 | 会议字段 | 单个 `venue` 字符串（含年份，如 `CVPR 2026`），不拆类型 |
| 4 | 作者 | **对象数组** `{ name, me? }`；`me: true` 显式标记，**恰好一次** |
| 5 | 一作/共一 | 顶层 `my_role` 枚举 `first / co-first / corresponding / coauthor`，**不给每位作者加标记** |
| 6 | DOI | 存**裸 DOI**（`10.48550/arXiv.1706.03762`），字段可选，链接由模板拼 |
| 7 | 可选字段 | 只留 `doi?` 与 `code_url?`。**录用率、BibTeX 一律不设** |
| 8 | 同年排序 | 加必填 `month`（1–12）；排序 = `year desc → month desc → slug asc` |
| 9 | 年份口径 | `year` = **正式发表年**；未正式发表填 arXiv 首次公开年、`venue` 写 `arXiv` |
| 10 | 图片组织 | **每篇一个目录**：`src/content/papers/<slug>/index.md` + 同目录 `fig-1.webp` |
| 11 | 图片字段 | `figures` 对象数组 `{ src: image(), caption: string }`，**`min(1)` 不设上限**，`caption` **必填**（兼作 `alt`），**第一张即封面** |
| 12 | 中文简介 | frontmatter `summary` 字段，多段用 `\|-`，长度 40–400 字 |
| 13 | 防不一致 | **`prerenderConflictBehavior: 'error'`** + 构建期预检：**目录名 === `slug`**、slug 全局唯一、DOI 不重复 |

### 1. 标题与年份：对称命名，因为「主标题是哪语言」还没定

`title` + `title_zh` 的问题是读者永远在猜「`title` 到底是哪个语言的主标题」，而地图的 Not yet specified 里还挂着「中文与英文标题在列表页的主次」——**这个假设一旦翻转，字段含义就跟着翻转**，改起来是十几篇内容的 diff。`title_en` / `title_zh` 把语言写进字段名，展示顺序怎么变都与数据无关。

写法用 `snake_case` 而非 camelCase：这是 [#5](https://github.com/zwxdogs/MyWeb/issues/5) 留下的跨票约束（「字段名全用小写单词」，`entry.data.summary` 比 `entry.data.summaryText` 在模板里好读）。它约束的是**写法**，不是「字段数越少越好」，所以不必退化成 `title` + `title_zh`。

`year` 存 number：它的用途只有排序与范围校验，`z.number().int().min(1990)` 一行写完；存字符串就只能靠正则，排序还得指望零填充。附带好处是**避开了 #5 的 `date` 坑**——裸日期会被 YAML 层解析成 `Date` 对象（#5 因此必须用 `z.coerce.date()`），而两个数字不产生 `Date`，也就没有这个坑。代价是不记录「哪一天发表」，论文用不上。

`venue` 只留一个字符串，不拆 `venueType` / `venueShort`——已定「不展示发表状态」，没有任何渲染方会消费拆分后的类型。写成 `CVPR 2026` 这种含年份的形态，是因为「会议 + 年份」在页面上永远同一行出现，拆开等于让模板每次拼一遍。

### 2. DOI 存裸值：它是标识符，不是 URL

DOI 按定义带斜杠、**大小写不敏感**（DOI Handbook），而「怎么变成可点链接」只有一种正确拼法：`https://doi.org/` + 裸值。存完整链接等于把展示逻辑抄进内容，还会混进 `http://dx.doi.org/`、`doi:` 这类历史写法；哪天换解析服务就要改十几篇内容。裸值还能用 `^10\.\d{4,9}/\S+$` 卡住格式。

字段**可选**：workshop 论文、在投稿件、部分中文期刊、学位论文都可能没有 DOI。

### 3. owner 标记：显式 `me: true`，因为静默失配是本票最大的敌人

若用全局配置 `owner: "Wenxuan Zhang"` 去匹配字符串数组，那么 `Zhang Wenxuan`、`W. Zhang`、带逗号的变体都会匹配失败，**构建不报错**，只是页面上你的名字不加粗——要等人肉看页面才发现。显式标记把这件事从「运行时猜」变成「构建时校验」。

另外砍掉一个常见冗余：**页面只宣传你，不需要知道别人是不是共一。** 所以不给每位作者加 `coFirst`，只在顶层记录「你在这一篇里的角色」。`my_role` 为枚举，`me: true` 由 `.refine()` 保证恰好出现一次。

### 4. 可选字段：只留 `doi` 与 `code_url`

逐项判负：

- **录用率**（acceptance rate，指该届接收数 ÷ 投稿数）——**范畴错误**：它描述的是会议，不是这篇论文；同一会议不同年份的值还不同，且官方常不公布精确数字、第三方口径不一，每加一篇论文都要重查一次。owner 已明确「不需要，不重要」。要表达含金量应标**录用形式**（`Oral` / `Spotlight` / `top 3%`），那是这篇论文自己的待遇；本 effort 先不设，有 `Oral` 再议。
- **BibTeX** —— 若手写就会和 `authors`/`venue`/`year` 重复表达同一事实，两处迟早不一致。它应由字段**生成**，不是存原文。
- **`pdfUrl`** —— `doi` 已覆盖「查看原文」，等真需要直链 PDF 再加。

### 5. 图片：每篇一个目录

判据不是「哪个好看」，是**删除的安全性**：

- 每篇一目录时，删一篇论文 = 删一个目录，图不可能漏。
- 统一大目录时，删 `.md` 会留下一堆孤儿图，而**没有任何工具会报错**。

再加一条发现（源码断言，文档未写）：`papers/<slug>/index.md` 的 `entry.id` 会**去掉 `index` 段**，即目录名天然就是 URL 段，与 #3 裁定的「手填 slug 且发布后不可变」三者零胶水对齐。

**代价（必须遵守）**：不并存 `papers/<slug>.md` 与 `papers/<slug>/index.md`——两者 id 都是 `<slug>`。**注意：这默认不会让构建失败**（见「更正 1」）。loader 用 `pattern: '**/index.md'` 只解决「不去收根目录散落的 `.md`」。

图**必须放 `src/`**：官方明文 `src/` 图构建期转 `.webp`，而 `public/` 图「never optimized」且不支持响应式。【实测】`image()` 吃 `public/` 绝对路径会直接 `ImageNotFound` 构建失败。这一条没有取舍空间。

`figures` 用对象数组而非两个平行数组（`figures` + `figureCaptions`）：平行数组是经典陷阱，两张图三句说明能通过校验，然后模板把错位的文字配到错位的图上，**构建不报错**。`caption` 必填，因为 `<Image />` 的 `alt` 是硬性必填、缺失即构建报错（官方明文），不能指望模板兜底。

**不设张数上限**：张数是编辑品味，不是结构不变量（#5 已在 `shots` 上因同一理由推翻过自己的 `.max(4)`）。结构不变量只有三条——至少一张、每张必须有 `caption`、路径不存在即失败。`figures[0]` 即封面：首页取第一张，详情页全列，与 #5 的 `shots` 完全同构。真要限制体积，那属于「图片压缩」的全局议题（地图 Not yet specified），不塞进论文 schema。

### 6. 中文简介放 frontmatter

原先的疑虑「frontmatter 纯文本不能分段」**是误解**：Astro 用 `yaml` 包 core schema 解析 frontmatter，YAML 的 `|` / `|-` 完整保留换行，只有 `>` 会把换行折成空格。

修正后的判据只剩一条：**这份文字会不会需要 Markdown 排版**（链接、强调、列表）。1–2 段纯叙述不需要；而放 frontmatter 能白拿 `z.string().min(40).max(400)` 的长度校验——正文做不到「必填且 1–2 段」。代价是 `summary` 里不能写链接，接受。

正文 body 留空，不写「阅读更多」这类填充。

### 7. 两份拷贝的一致性：两道防线

这是「每篇一目录」带出来的新裂缝。源码里 frontmatter 的 `slug` 优先级最高（`if (data.slug) return String(data.slug)`），所以目录名写错时 **URL 仍按 `slug` 生成、页面正常**，只是磁盘目录名与 URL 不符——半年后没人看得懂。

不采取「取消手填 slug、让目录名成为唯一真相」：那等于推翻 #3 的「slug 强制手填、发布后不可变」。

**第一道（更底层）**：`astro.config.mjs` 设 `prerenderConflictBehavior: 'error'`。它拦在 loader 的 `syncData()`，让重复 slug 从「警告 + 静默覆盖」变成硬失败。

**第二道**：构建期预检，管目录名一致性、DOI 查重（跨条目唯一性官方零承诺，schema 逐条校验、拿不到其它条目）。

```ts
// src/lib/papers-preflight.ts
import { getCollection } from 'astro:content';

export async function assertPapersIntegrity() {
  const papers = await getCollection('papers');
  const bySlug = new Map<string, string>();
  const byDoi = new Map<string, string>();

  for (const p of papers) {
    const dir = (p.filePath ?? '')
      .replace(/^src\/content\/papers\//, '')
      .replace(/\/index\.md$/, '');

    if (dir !== p.data.slug) {
      throw new Error(`[papers] 目录名与 slug 不一致：目录「${dir}」 vs slug「${p.data.slug}」`);
    }
    if (bySlug.has(p.data.slug)) {
      throw new Error(`[papers] slug 重复：「${p.data.slug}」`);
    }
    bySlug.set(p.data.slug, p.id);

    const doi = p.data.doi?.toLowerCase();
    if (doi) {
      if (byDoi.has(doi)) {
        throw new Error(`[papers] DOI 重复：「${p.data.doi}」`);
      }
      byDoi.set(doi, p.id);
    }
  }
}
```

调用点：`src/pages/papers/index.astro` 与 `src/pages/papers/[slug].astro` 的 `getStaticPaths()` 开头各 `await assertPapersIntegrity()`（两处都调，任一路由单独构建也能拦住）。`entry.filePath` 确实存在（实测条目 key 含 `filePath`），可放心依赖。

### 完整 schema

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const papers = defineCollection({
  loader: glob({ base: './src/content/papers', pattern: '**/index.md' }),
  schema: ({ image }) =>
    z
      .object({
        slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),

        title_en: z.string().min(1),
        title_zh: z.string().min(1),

        year: z.number().int().min(1990).max(2100),
        month: z.number().int().min(1).max(12),
        venue: z.string().min(1),

        authors: z
          .array(z.object({ name: z.string().min(1), me: z.boolean().optional() }))
          .min(1),
        my_role: z.enum(['first', 'co-first', 'corresponding', 'coauthor']),

        summary: z.string().min(40).max(400),

        doi: z.string().regex(/^10\.\d{4,9}\/\S+$/).optional(),
        code_url: z.url().optional(),

        figures: z
          .array(z.object({ src: image(), caption: z.string().min(1) }))
          .min(1),
      })
      .refine((d) => d.authors.filter((a) => a.me).length === 1, {
        message: 'authors 里必须有且只有一个 me: true',
      }),
});

export const collections = { papers };
```

配套的 `astro.config.mjs`（与 #5 一致）：

```js
export default defineConfig({
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',   // 重复 slug / 重复路由 → 硬失败
});
```

### 两篇真实论文的可抄样例

> 这两篇是真实论文，标题 / 年份 / 会议 / DOI / 作者均按真实信息填。**唯一需要你替换的是标了 `me: true` 的那一行**——这两篇的真实作者里没有你，把这一行改成你自己的署名并挪到你真实的名次上即可。

**样例 A：`src/content/papers/attention-is-all-you-need/index.md`**

```markdown
---
slug: attention-is-all-you-need
title_en: "Attention Is All You Need"
title_zh: 注意力机制就是你所需要的一切
year: 2017
month: 6
venue: NeurIPS 2017
authors:
  - name: Ashish Vaswani
  - name: Noam Shazeer
  - name: 【你的英文署名】
    me: true          # ← 改成你在这篇论文里的真实署名与名次
  - name: Niki Parmar
  - name: Jakob Uszkoreit
  - name: Llion Jones
  - name: Aidan N. Gomez
  - name: Łukasz Kaiser
  - name: Illia Polosukhin
my_role: coauthor
summary: |-
  提出 Transformer：完全基于注意力机制、不含循环与卷积的序列转换模型。核心是多头自注意力，让任意两个位置的依赖关系都只需一步计算，从而摆脱 RNN 的顺序依赖。
  在 WMT 2014 英德与英法翻译任务上取得当时最优结果，且训练成本显著低于同等水平的循环网络。
doi: 10.48550/arXiv.1706.03762
code_url: https://github.com/tensorflow/tensor2tensor
figures:
  - src: ./fig-1.webp
    caption: 编码器—解码器整体结构：左侧为编码器堆叠，右侧为解码器堆叠，多头注意力贯穿其中。
---
```

**样例 B：`src/content/papers/deep-residual-learning/index.md`**

> 这张带两张图，正好演示「首页用 `figures[0]`、详情页全列」。

```markdown
---
slug: deep-residual-learning
title_en: "Deep Residual Learning for Image Recognition"
title_zh: 面向图像识别的深度残差学习
year: 2016
month: 6
venue: CVPR 2016
authors:
  - name: Kaiming He
  - name: Xiangyu Zhang
  - name: Shaoqing Ren
  - name: 【你的英文署名】
    me: true          # ← 改成你在这篇论文里的真实署名与名次
  - name: Jian Sun
my_role: coauthor
summary: |-
  提出残差学习框架：让网络学习「输入与输出之差」而不是直接拟合目标映射，并用跨层恒等捷径实现。这样极深的网络也能稳定训练，而不会因退化问题掉点。
  在 ImageNet 上以 152 层网络取得 3.57% 的 top-5 错误率，同时证明残差结构对任意深度网络都是通用改进。
doi: 10.1109/CVPR.2016.90
code_url: https://github.com/KaimingHe/deep-residual-networks
figures:
  - src: ./fig-1.webp
    caption: 残差学习的基本单元：输入 x 经两层卷积后与恒等捷径相加，再经 ReLU 输出。
  - src: ./fig-2.webp
    caption: ImageNet 上与普通网络（plain）的对比曲线：层数加深时普通网络误差上升，残差网络误差持续下降。
---
```

### 模板渲染契约（骨架照此实现）

- **详情页** `H1` = `title_zh`，紧随其后一行 `title_en`（小字）。列表页里中英文的主次**不在本票裁定范围**，属地图 Not yet specified；本 schema 保证两个字段随时可取。
- **作者行**：`authors` 用 `、` 连接；`me: true` 的那一位加粗，并在其名后追加徽标——`first` → 「第一作者」、`co-first` → 「共同一作」、`corresponding` → 「通讯作者」、`coauthor` → 无徽标。
- **元信息行**：`venue` · `year`。
- **DOI**：`doi` 存在时渲染 `<a href={"https://doi.org/" + doi}>查看原文</a>`；模板负责拼前缀，内容里绝不存链接。
- **图**：`<Image src={fig.src} alt={fig.caption} />` + `<figcaption>{fig.caption}</figcaption>`。`width`/`height` 由 `ImageMetadata` 自动提供，**不手填**。`figures[0]` 作封面。
- **排序**：`year` 降序 → `month` 降序 → `slug` 升序（保证构建可复现）。

### 更正（关票后与 #5 及新笔记交叉核对所得）

1. **重复 slug 不会让构建失败（更正我原先的错判）。** 默认 `prerenderConflictBehavior: 'warn'`：打一条 `[WARN] [glob-loader]`，构建**成功**，`getCollection()` 只剩一条，**且谁被覆盖是非确定性的**（实测两次冷构建，赢家会换）。只有显式设 `'error'` 才失败，而 `glob()` 复用这个开关处理重复条目 slug **只在源码里体现、官方文档未写明**。⇒ 已在第 7 节加第一道防线。
2. **`z.array(z.object({ src: image(), ... }))` 实测通过。** 官方 fixture 里有 `arrayOfImages: z.array(image())` 并断言渲染出 2 张图；`figures: z.array(z.object({ src: image(), alt }))` 实测构建通过，取值形如 `{ src: { src, width, height, format }, alt }`。准确表述是「官方测试/fixture 支持，官方文档正文无逐字示例」——是文档缺口，不是风险。
3. **`image()` 不接受 `public/` 路径，已由实测确认**（`cover: /img/pub.png` → `ImageNotFound`）。文档只在「custom loader 无 `filePath`」时说 `image()` 会被当 public path，而 `glob()` 一定提供 `filePath`。结论不变（图一律放 `src/`），证据等级从「推断」升为「实测」。
4. **字段名统一 `snake_case`**（`title_en` / `title_zh` / `my_role` / `code_url`），对齐 #5 的跨票约束。
5. **去掉 `figures` 的 `.max(2)`**，第一张即封面，与 #5 的 `shots` 同构。

### 仍未决 / 移交

| 事项 | 去向 |
| --- | --- |
| 论文列表页要不要按年份分组标题 | 地图 Not yet specified（属展示） |
| 中文标题与英文标题在列表页的主次与排列 | 同上（属展示，本 schema 已保证两字段可取） |
| 图片压缩阈值与单张体积上限 | 地图 Not yet specified（#5 确认：该设限的是体积不是张数） |
| `index` 去尾、`prerenderConflictBehavior` 作用于条目 slug | 均为**源码行为、文档未写**，跨大版本升级时复核（后者已开 `'error'` 兜底） |
| 无配图论文字段放开 | 若真出现，删掉 `.min(1)` 一行改动即可 |
| `content.config.ts` 与预检脚本**未在真实 Astro 项目里编译验证** | 落地时以 `astro check` / `astro build` 通过为准（#5 有同样缺口） |

## 进度

- 2026-11-15 · 5% · 开工：读票、地图与既有笔记，登记占用
- 2026-11-15 · 20% · 调研笔记落盘；grilling 第一轮提出（字段名/类型、作者与 owner 标记、DOI 存法、可选字段、同年排序、年份口径）
- 2026-11-17 · 60% · 第一轮答复确认；grilling 第二轮提出（图片组织、图说字段、中文简介位置、目录名与 slug 一致性）
- 2026-11-17 · 100% · 十三项全部裁定；样例、schema、预检脚本、渲染契约写入 Answer，票已关闭
- 2026-11-17 · 补遗 · 与 #5 交叉核对后改三处（重复 slug 非报错、字段改 snake_case、删 `.max(2)`），并升级两条证据等级
