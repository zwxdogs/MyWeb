# 页面清单与 URL 结构

Type: grilling
Status: resolved

## Question

把站点的页面清单和每类页面的 URL 形态定下来，这是所有内容模型的前置。

要定的是：

1. **完整页面清单**：除了首页 / 论文列表 / 论文详情 / 项目列表 / 项目详情 / 分享列表 / 分享详情，还要不要 404 页？论文列表页要不要单独存在（既然首页已有论文栏）？
2. **URL 形态**：目录式（`/papers/xxx/`）还是文件式（`/papers/xxx.html`）；末尾带不带斜杠。这会影响静态托管的行为和以后换平台。
3. **详情页 slug 从哪来**：论文用英文标题自动转（`attention-is-all-you-need`），还是手动在 frontmatter 里写一个 `slug` 字段？项目同理。
4. **中文标题怎么进 URL**：如果 slug 从中文标题生成，中文会被转成一串百分号编码，URL 变丑且难分享。要不要强制要求每篇都手填英文 slug？
5. **列表页分页**：现在内容量不需要分页，但 URL 结构要不要预留（`/papers/page/2/`）？

## Answer

> 裁定日期 2026-11-15。推导用的第一性原理：**URL 是本项目唯一会跨出仓库、被别人复制走的产物**。标题、字段名、目录结构都能随便改，代价是一堆 diff；URL 一改，简历、邮件、别人论文致谢里的链接全部失效。由此三条硬约束：① URL 必须与内容解耦，不能从会变的东西派生；② 静态站的 URL 就是构建产物的目录结构，所以「定 URL」实为「定路由与目录」；③ 只用所有静态托管都支持的最小公分母，不依赖任何平台的「美化 URL」特性。

### 一页纸结论

| # | 议题 | 决定 |
| --- | --- | --- |
| 1 | 页面清单 | 首页 + 论文/项目/分享三类列表页 + 三类详情页 + 404。**不做**独立「关于」页 |
| 2 | URL 形态 | **目录式**（`/papers/<slug>/`）。`build.format` 保持默认 `'directory'`，**零配置** |
| 3 | slug 来源 | **强制手填** frontmatter `slug`，schema 正则校验，全局唯一，发布后视为不可变 |
| 4 | 中文进 URL | **完全禁止**。中文只出现在页面 H1 / `<title>` / OG 标签 |
| 5 | 栏目段名 | `/papers/`、`/projects/`、`/notes/`；详情 URL **不带**年份或任何分类层级 |
| 6 | 分页 | **不实现、不预留** `/page/2/`。超过 50 条再按 Astro 默认形态加 |
| 7 | 尾斜杠规范化 | EdgeOne **无任何官方承诺**；实测随下一个 effort（上线）做，本 effort 记为已知风险 |

### 1. 页面清单：三类列表页全保留，404 要，不要关于页

首页每栏只显示最新 2–3 条，那是**橱窗**，不是**索引**。论文一旦超过 3 篇、项目一旦超过 3 个，就必须有一个能列全的地方；否则第 4 篇论文只能靠直接链接访问，等于不存在。所以三个列表页全部独立存在。

404 的成本是一个静态 HTML 文件，收益是任何失效外链都有出口。

个人介绍只有一段 owner 自己写的文字，塞在首页顶部即可；独立成页只会多一个几乎没人点的导航项，而导航已定为 4 项（首页 / 论文 / 项目 / 分享）。

最终路由清单：

| 路由 | 产物 |
| --- | --- |
| `/` | `dist/index.html` |
| `/papers/` | `dist/papers/index.html` |
| `/papers/<slug>/` | `dist/papers/<slug>/index.html` |
| `/projects/` | `dist/projects/index.html` |
| `/projects/<slug>/` | `dist/projects/<slug>/index.html` |
| `/notes/` | `dist/notes/index.html` |
| `/notes/<slug>/` | `dist/notes/<slug>/index.html` |
| `/404.html` | `dist/404.html`（由 `src/pages/404.astro` 产出） |

### 2. URL 形态：目录式，零配置

`build.format` 的默认值就是 `'directory'`，Astro 会把每个路由产成 `<路径>/index.html`。这意味着**目录式不需要写任何配置**：

- 官方原文：「**Type:** `('file' | 'directory' | 'preserve')` **Default:** `'directory'`」——[配置参考 · build.format](https://docs.astro.build/en/reference/configuration-reference/#buildformat)
- 「`'directory'`: Astro will generate a directory with a nested `index.html` file for each page.」（同页）

**为什么不是文件式**：文件式（`/papers/foo.html`）想做成 `/papers/foo` 这种无扩展名访问，必须依赖平台的「pretty URLs」能力。查证结果：EdgeOne **没有**这个默认能力，也**没有**开关，官方只把「Clean URLs」当成你手写一条 route（`{"src":"^/about$","dest":"/about.html"}`）的示例——[构建输出配置](https://pages.edgeone.ai/zh/document/building-output-configuration)。押注平台特性等于给换平台埋断链。

「一个目录里放一个 `index.html`」是 EdgeOne / Cloudflare Pages / GitHub Pages / Vercel 全都一致的最小公分母。

**尾斜杠**：统一带。但必须说清一个更正过的判断——

> 我最初认为 `trailingSlash: 'always'` 能保证「一个页面只有一种写法」。**这是错的。**
> 官方原文：「Set the route matching behavior for trailing slashes in the **dev server and on-demand rendered pages**.」（[配置参考 · trailingSlash](https://docs.astro.build/en/reference/configuration-reference/#trailingslash)）
> 「Trailing slashes on **prerendered pages are handled by the hosting platform**, and may not respect your chosen configuration. (…) **You cannot use Astro redirects for this use case at this point.**」（同页）

即：纯静态站的尾斜杠由 EdgeOne 决定，Astro 管不了。`trailingSlash: 'always'` 仍值得写，但理由降级为「让 dev server 行为与线上一致、让构建期 `Astro.url` 带尾斜杠」，**不是**「能锁死线上只有一种写法」。

### 3. slug：强制手填，不可变

**机制**（Astro 现行做法，v5 起变了）：`entry.slug` 已不存在，改用 `entry.id`；但 frontmatter 里写 `slug:` 仍然有效，作用是**覆盖自动生成的 id**。

- 「Content layer collections do not have a reserved `slug` field. Instead, all updated collections will have an `id`」——[Upgrade to v5](https://docs.astro.build/en/guides/upgrade-to/v5/#legacy-v20-content-collections-api)
- 「You can override a single entry's generated `id` by adding your own `slug` property to the file frontmatter (…). This is similar to the “permalink” feature of other web frameworks.」——[Content collections · Defining custom IDs](https://docs.astro.build/en/guides/content-collections/#defining-custom-ids)

所以代码里**引用 `entry.id`，绝不写 `entry.slug`**；自定义 URL 段的载体是 frontmatter 的 `slug` 字段。

**规则**（写进 schema）：

1. **必填**，没有就构建失败。
2. 正则 `^[a-z0-9]+(-[a-z0-9]+)*$`——全小写、连字符分隔、只允许 `[a-z0-9-]`、不允许首尾或连续连字符，不允许下划线。
3. 长度 3–7 个词。
4. **全局唯一**（同一集合内）：构建时检测到重复直接失败，不许静默覆盖。
5. **发布后视为不可变**：改 slug 等于发一篇新内容。静态站没有重定向能力，就不要先许诺自动跳转。

**为什么不用「英文标题自动转」**：英文标题是内容，会变（拼写修正、改投会议、副标题增删）。让 URL 从会变的东西派生，等于把不可逆的成本挂在可变的东西上。

### 4. 中文与 DOI 都不进 URL

**中文完全禁止**。理由三条：

1. 中文进路径必然被百分号编码，复制粘贴变丑、微信/邮件里容易截断、CDN 日志是一串乱码。
2. **产物与链接会分裂**：据 Astro 官方 PR 的测试断言，构建产物目录名是**中文原样**（`dist/papers/注意力机制/index.html`），而浏览器地址栏是百分号编码。同一篇文章有两个不同的字面形态，这本身就是坑。（该结论来自官方源码与测试，非文档明文——官方文档对中文路径**完全未说明**。）
3. EdgeOne 对非 ASCII 路径的处理**官方未说明**，只给了文件名非法字符清单 `\ / : * ? " < > |`——[直接上传](https://pages.edgeone.ai/zh/document/direct-upload)。

**英文标题缺失时的兜底**：`<会议简称><年份>-<两三个关键词>`，例如 `cvpr2026-few-shot-seg`。这条写进 schema 注释，写内容时不用临时想。

**DOI 为什么不进 URL**（owner 提过这个方案，此处记录否决理由）：

- **范畴错误**：DOI 标识的是「某一次寄存（deposit）」，不是「这篇论文」。同一篇论文在生命周期里常有多个 DOI——arXiv 预印本一个（`10.48550/arXiv.xxx`），正式发表后期刊再发一个。选 DOI 本是为了 URL 稳定，结果 DOI 自己就会变一次，交易是亏的。
- **DOI 按定义带斜杠**：「The DOI syntax shall be made up of a DOI prefix and a DOI suffix **separated by a forward slash**.」——[DOI Handbook · General Characteristics](https://www.doi.org/doi-handbook/HTML/general-characteristics-of-the.html)。路径必然变多段。
- **大小写不敏感 vs 文件系统大小写敏感**：「DOI names are **case insensitive**, using ASCII case folding for comparison.」——[DOI Handbook · Case Insensitivity](https://www.doi.org/doi-handbook/HTML/case-insensitivity.html)。两个 DOI 写法在 DOI 世界是同一个，在 `dist/` 里是两个目录。
- **不是每篇都有**：workshop 论文、在投稿件、部分中文期刊、学位论文都可能没有 DOI（arXiv 是 [2022-02 起才给全部论文分配 DOI](https://blog.arxiv.org/2022/02/17/new-arxiv-articles-are-now-automatically-assigned-dois)）。**既然「没有 DOI」必须兜底，slug 规则无论如何省不掉**，用 DOI 只是多一条分支代码路径。
- **个别 DOI 含非法文件名字符**：[Crossref 明说](https://crossref.org/documentation/member-setup/constructing-your-dois/suffixes-containing-special-characters) 部分老 DOI 带 `#`、`<`、`>`，需特殊编码，无法直接当目录名。

**DOI 仍然要存**，但它是内容模型的字段，不是 URL 的一部分。两个正确用途：① 详情页的「查看原文」链接（`https://doi.org/<doi>`）；② BibTeX / 引用格式。**DOI 的存法（裸 DOI 还是完整链接）由「论文内容模型与文件组织」那张票裁定。**

### 5. 栏目段名

- `/papers/` 而非 `/publications/`：更短，学界通用。
- `/notes/` 而非 `/blog/` 或 `/posts/`：`notes` **不承诺博客语义**。RSS、站内搜索、评论都在「明确不做」里；用 `blog` 会让人期待一个博客该有的东西，然后失望。
- `/projects/`：直接。

**详情 URL 不带年份或任何分类层级**（不做 `/papers/2024/xxx/`）。年份是可变的元数据（会议论文后来发期刊，年份会改），进 URL 就让 URL 随元数据漂移，违反第一性原理。

### 6. 分页：不做，也不预留

十几二十条论文，滚动就够了；分页只是给读者多一次点击。`paginate()` 也没有「最小条目数」开关，官方对「条目少就别分页」未作任何说明。

**不预留 `/papers/page/2/` 这种自造层级。** 真超过 50 条再加，届时用 `[...page].astro`——官方明确：「`/posts/[page].astro` would generate the URLs `/posts/1`, `/posts/2`…」而「`/posts/[...page].astro` would generate the URLs `/posts`, `/posts/2`…」（[Routing Reference · paginate()](https://docs.astro.build/en/reference/routing-reference/#paginate)）。即用 rest 参数才能让第 1 页留在 `/papers/` 而不是 `/papers/1/`。

当前不分页 = 一个普通页面 `src/pages/papers/index.astro`，无需任何额外配置。

### 7. 尾斜杠规范化：已知风险，移交下一个 effort

`/papers/foo`（不带斜杠）访问 EdgeOne 会怎样——**官方完全未说明**。查证结论：

- EdgeOne 文档没有「默认首页文件」「index.html 解析规则」「尾斜杠 301/302 规范化」任何章节。
- 唯一出现「尾斜杠可选」的地方在**函数路由**章节，不是静态资源。
- 唯一间接线索是 Next.js 指南里框架侧的 `trailingSlash: true, // 添加尾部斜杠，提高兼容性`，属框架侧建议，不是平台行为说明。

**兜底手段存在但未验证**：`edgeone.json` 的 `redirects` 免费版可用，上限 100 条，`source` 支持 `*`→`:splat` 与 `:id` 占位符（[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)、[限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas)）。但把不带斜杠的请求 301 到带斜杠的形式，**官方没有现成示例可抄**，需要实测通配规则写法。

**处置**：实测需要先部署，而「站点部署上线」在本图 Out of scope 内。因此本票只记录风险与候选方案，**实测挪到下一个 effort（上线）**，并在骨架里内建一条验证用例：放一个刻意不带斜杠的内部链接，部署后实测。若届时平台不自动纠正，再决定是加 `edgeone.json` 重定向还是改为强制内部链接带斜杠。

### 落地契约（骨架照此实现）

```
src/
├── pages/
│   ├── index.astro              → /
│   ├── 404.astro                → dist/404.html
│   ├── papers/
│   │   ├── index.astro          → /papers/
│   │   └── [slug].astro         → /papers/<entry.id>/
│   ├── projects/
│   │   ├── index.astro          → /projects/
│   │   └── [slug].astro         → /projects/<entry.id>/
│   └── notes/
│       ├── index.astro          → /notes/
│       └── [slug].astro         → /notes/<entry.id>/
└── content/
    ├── papers/*.md              frontmatter 必含 slug
    ├── projects/*.md            同上
    └── notes/*.md               同上
```

- 三个集合都用 `glob()` loader；`[slug].astro` 的 `getStaticPaths()` 直接映射 `({ params: { slug: entry.id } })`。
- `astro.config.mjs`：`build.format` 不写（默认 `'directory'`）；`trailingSlash: 'always'` 写上（作用仅限于 dev 一致性与 `Astro.url`）。
- schema 里 `slug` 用 `.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)` 卡死；集合内唯一性另加构建期检查。
- **404 页零配置**：`src/pages/404.astro` 产出 `dist/404.html`，EdgeOne 官方明说「构建输出目录中有 `404.html` 文件，M 部署时将自动识别此文件，并在请求未匹配到任何路径时将其作为 404 页面返回」——[自定义 404 页面](https://pages.edgeone.ai/zh/document/custom-404-page)。Astro 侧对应「This will build to a `404.html` page. Most deploy services will find and use it.」——[Pages · Custom 404](https://docs.astro.build/en/basics/astro-pages/#custom-404-error-page)。

### 调研笔记（仓内路径，复用时只记结论）

- [`astro-url-and-slug-facts.md`](../research/astro-url-and-slug-facts.md) —— Astro 的 `build.format` 默认值、`trailingSlash` 对静态站无管辖权、`slug` 覆盖 `id` 的现行做法、分页第 1 页形态、404 产物路径。**已找到的旧笔记无法回答这些**：`docs/research/` 两份只写到「要有 404 页」「要列一张页面表」的原则层，没有一处触及本票的 5 个选择。
- [`edgeone-static-routing.md`](../research/edgeone-static-routing.md) —— EdgeOne 对目录式/文件式 URL 的解析规则、自定义 404 的约定、`edgeone.json` 的 redirects/rewrites 能力与配额。

**两份笔记的共同限制**（引用其结论时须知情）：本机把 `docs.astro.build`、`pages.edgeone.ai` 等域名解析到私有地址，`web_fetch` 被 SSRF 防护拦截，**没有任何一页被完整抓取**。Astro 那份改从官方文档仓库 `withastro/docs` 的 mdx 源文件取原文（同一手来源）；EdgeOne 那份的引文全部来自搜索引擎对官方页面的**正文片段索引**，逐条保留了原文措辞与 URL，作为契约依据前建议人工再开一次页面核对全文。另：本会话 `pwsh` 因工作区 ACL 授予失败（`SetNamedSecurityInfoW failed (Win32 5)`）无法执行，故**未能本地跑 `astro build` 实测产物形态**。

### 仍未决 / 移交

| 事项 | 去向 |
| --- | --- |
| EdgeOne 对无尾斜杠访问的实际响应 | 下一个 effort（上线时实测），本 effort 内建验证用例 |
| SSG 场景下 `404.html` 是否真返回 404 状态码 | 同上。EdgeOne 的 Astro/SSR 章节明说「附带 404 状态码」，SSG 章节只字未提——官方自相矛盾处，需实测 |
| DOI 的存法（裸 DOI vs 完整链接） | 「论文内容模型与文件组织」票 |
| 论文列表页要不要按年份分组标题 | 地图 Not yet specified（属展示，不属 URL） |

## 进度

- 2026-11-15 · 100% · 七项全部裁定，结论与落地契约已写进本节；尾斜杠实测移交下一 effort。
