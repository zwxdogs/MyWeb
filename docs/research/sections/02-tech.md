## 1. 三种"官方"

**标准**（W3C/WHATWG/TC39）、**产品文档**（MDN、Vite、Astro，会变）、**社区约定**（frontmatter，无规范）；版本以抓取日 2026-11-04 为准。

## 2. 基础三件套（必学）

| 技术 | 职责 | 来源 |
| --- | --- | --- |
| HTML | "defines the meaning and structure of web content" | [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML)、[WHATWG](https://html.spec.whatwg.org/) |
| CSS | "describe the presentation of a document written in HTML" | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS)、[W3C](https://www.w3.org/TR/CSS/) |
| JS | "programming language with first-class functions" | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript)、[ECMA-262](https://tc39.es/ecma262/) |

HTML 定语义，CSS 定呈现，JS 只做增强。

## 3. 样式方案：选一套

| 方案 | 形态 | 来源 | 取舍 |
| --- | --- | --- | --- |
| 原生 CSS | 层叠、自定义属性、容器查询皆规范能力 | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS) | 零构建，靠约定 |
| Sass | "compiled to CSS"，有变量、嵌套、mixin | [文档](https://sass-lang.com/documentation/)（Dart Sass 1.107.0，抓取日） | 补抽象，需编译 |
| Tailwind | "A utility-first CSS framework"，扫模板类名生成样式 | [文档](https://tailwindcss.com/docs) | 不起类名，标签变长 |
| CSS-in-JS | JS 里写样式：Emotion 的 `css` 函数、styled-components 的 tagged template | [Emotion](https://emotion.sh/docs/introduction)、[styled-components](https://styled-components.com/docs) | 运行时样式，SSR 需额外配置；零运行时选 [vanilla-extract](https://vanilla-extract.style/documentation/getting-started/) |

个人站原生 CSS 多够用；要设计系统再上 Tailwind。

## 4. 内容与数据

- **Markdown**：[CommonMark 0.31.2（2024-01-28）](https://spec.commonmark.org/0.31.2/)是规范；[GFM 0.29-gfm](https://github.github.com/gfm/)是其上的正式扩展规范。
- **frontmatter**：**无标准、纯约定**，源头是 Jekyll 用三条 `---` 包 YAML（[Jekyll](https://jekyllrb.com/docs/front-matter/)）。
- **MDX**：Markdown 里写 JSX/ESM，项目自定义格式，非标准（[MDX](https://mdxjs.com/docs/what-is-mdx/)）。
- **Content Collections**：用 schema（Zod）校验条目，带来类型安全（[Astro](https://docs.astro.build/en/guides/content-collections/)），把约定升级为可校验的契约。

## 5. 构建与工具链

| 工具 | 作用 | 来源 |
| --- | --- | --- |
| Node.js | 异步事件驱动 JS 运行时，工具链环境 | [nodejs.org](https://nodejs.org/en/about) |
| pnpm | 内容寻址存储省磁盘；非扁平 `node_modules`，只暴露直接依赖 | [pnpm](https://pnpm.io/motivation) |
| Vite | 开发态原生 ESM + HMR；构建态打包输出优化后的静态资源 | [指南](https://vite.dev/guide/)、[构建](https://vite.dev/guide/build) |
| Git/GitHub | GitHub flow：分支 → 提交 → PR → 评审 → 合并 → 部署 | [Pro Git](https://git-scm.com/book/en/v2)、[GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) |

**构建产物**：源码经一条命令变成带哈希的静态文件，交给静态托管。Vite 默认以 `index.html` 为入口；v8 起构建器是 Rolldown，旧教程的 Rollup 已过时（[Vite](https://vite.dev/guide/build)）。

## 6. 质量与可见性

| 项 | 事实与边界 | 来源 |
| --- | --- | --- |
| title | Google 自动生成标题链接，可影响不可决定 | [Google](https://developers.google.com/search/docs/appearance/title-link) |
| meta description | 摘要主要取自正文，meta 仅在更好时被采用 | [Google](https://developers.google.com/search/docs/appearance/snippet) |
| 结构化数据 | 词汇用 schema.org；Google 行为以 Google 文档为准 | [Google](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)、[schema.org](https://schema.org/) |
| sitemap | 帮助发现 URL，不保证收录 | [Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) |
| robots.txt | 控制抓取量，不是屏蔽页面的手段；屏蔽用 noindex | [Google](https://developers.google.com/search/docs/crawling-indexing/robots/intro) |
| canonical | `rel="canonical"` 是 strong signal，不是指令 | [Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) |
| Open Graph | 四个必需属性 `og:title`/`type`/`image`/`url` | [ogp.me](https://ogp.me/) |
| 性能 | LCP ≤2.5s、INP ≤200ms、CLS ≤0.1，按 p75 评估 | [web.dev](https://web.dev/articles/vitals) |
| 可访问性 | WCAG 2.2 是 W3C Recommendation（2023-10-05），符合它即符合 2.0/2.1 | [W3C](https://www.w3.org/TR/WCAG22/) |

sitemap 与 robots.txt 交给生成器插件。

## 7. 附加能力（按需，别堆砌）

| 能力 | 代表方案 | 来源 |
| --- | --- | --- |
| 分析 | GA4 / Plausible / Umami | [GA4](https://developers.google.com/analytics/devguides/collection/ga4)、[Plausible](https://plausible.io/docs)、[Umami](https://docs.umami.is/docs) |
| 评论 | giscus（GitHub Discussions）/ utterances（Issues） | [giscus](https://github.com/giscus/giscus)、[utterances](https://github.com/utterance/utterances) |
| 搜索 | Pagefind（构建后生成静态索引）/ DocSearch（Algolia 抓取，免费需申请） | [Pagefind](https://pagefind.app/docs/)、[DocSearch](https://docsearch.algolia.com/docs/what-is-docsearch) |

## 8. 安全与合规

- **HTTPS 必需**：它决定页面是否处于安全上下文，许多 Web API 仅此可用（[MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)）；web.dev 称 "HTTPS is required for many new browser features"（[web.dev](https://web.dev/articles/why-https-matters)）。证书用 [Let's Encrypt](https://letsencrypt.org/docs/) 免费。
- **Cookie 与隐私**：技术侧读 MDN 的 [Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)；合规只指向欧盟 GDPR 官方文本（[EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)），不展开。

## 9. 分层与性质归属

| 层 | 内容 |
| --- | --- |
| **最小可用集** | HTML 语义 + 原生 CSS + 少量 JS；Markdown + frontmatter；Git 推送；静态托管 + HTTPS；title/description/OGP/canonical |
| **常见增强** | Sass 或 Tailwind（二选一）；Collections 校验；sitemap + robots.txt；结构化数据；轻量分析；giscus；Pagefind |
| **进阶** | MDX 组件化正文；零运行时 CSS-in-JS；DocSearch；WCAG 2.2 AA 审计；边缘部署 |

| 类别 | 具体项 |
| --- | --- |
| **标准/规范** | HTML、CSS、ECMA-262、CommonMark、GFM、WCAG 2.2、Open Graph 协议（事实标准，非 W3C） |
| **社区词汇表** | schema.org，官网自称 "collaborative, community activity"，非 W3C 标准 |
| **纯约定** | frontmatter 字段名、URL 结构、`draft`/`date` 语义 |

**易变点**：CWV 指标集演进（FID 已被 INP 取代）；版本号以抓取日为准；"CSS-in-JS 现状"无权威采用率数据。
