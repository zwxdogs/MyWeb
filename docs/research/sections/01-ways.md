## 个人网站/博客的六类建站路线

**口径**：数据抓取于 2026-11-04；价格取自官方定价页，Squarespace/Wix 会按访问 IP 本地化币种（此处为 HK$ 与含 GST 的 US$），促销单独标注，取不到写"未核实"。【判断】为我的取舍，非官方声明。

### 1. 手写静态站（原生 HTML/CSS/JS）

适合页面少、想掌控标记的人：编辑器即可开工，无构建链，任何静态托管可放；开发体验就是改完刷新，没有热更新与内容校验。代价是无模板与内容工作流，改版靠手工，页面一多就退化。定制 100%，成本≈0——GitHub Free 已含 Pages，限制站点 ≤1 GB、带宽软限 100 GB/月（[Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)、[GitHub 定价](https://github.com/pricing)）；入门看 MDN [第一个网站](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website)。【判断】适合学习与单页作品集，不适合持续写作。

### 2. 静态站点生成器（SSG）

| 产品 | 官方定位 | 栈/门槛 | 成本 |
|---|---|---|---|
| [Astro](https://docs.astro.build/en/concepts/why-astro/) | content-driven 站点，islands 架构削减 JS | JS/TS，组件近 JSX，中 | 免费开源 |
| [Hugo](https://gohugo.io/about/features/) | 单二进制、秒级构建，内置图片/Sass/多语言 | Go 模板，中 | 免费开源 |
| [Eleventy](https://www.11ty.dev/docs/) | README 自述"更简单的 SSG，Jekyll 替代" | JS，模板最自由，中低 | 免费开源 |
| [Docusaurus](https://docusaurus.io/docs) | 文档站专用：React SPA + 版本化/i18n/搜索 | React，中 | 免费开源 |

适合把写作留在 Markdown、又不想租服务器的人。差异在约定多少：Astro 定好岛与水合，写博客最省心；Hugo 胜在速度与资产管线，但要学模板函数；Eleventy 约定最少、要自己拼装；Docusaurus 是文档站最优解，做博客需绕开文档心智。另有 [Jekyll](https://jekyllrb.com/docs/)（Ruby，最老牌、环境偏重）。【判断】共性：纯静态、托管便宜、SEO 好；共性问题：评论、搜索、后台都得自己接。

### 3. React/Vue 全栈框架

| 框架 | 渲染能力 | 备注 |
|---|---|---|
| [Next.js](https://nextjs.org/docs/app/building-your-application/rendering) | SSG / SSR / ISR 同处 App Router | ISR：先发静态壳，访问后增量补全 |
| [Nuxt](https://nuxt.com/docs/guide/concepts/rendering) | 默认 universal（SSR），一行配置切渲染模式 | Vue 生态 |
| [SvelteKit](https://svelte.dev/docs/kit/adapter-static) | adapter-static 全站预渲染即 SSG | 也可只预渲染部分路由 |
| [Remix](https://remix.run/) | 自称 fully-stacked web framework | [文档站](https://remix.run/docs)提示 React Router v7 已发布，选型先确认版本【判断】 |

SSG 构建时生成 HTML，SSR 每请求现渲染，ISR 先静态后按需再生。适合确定要登录、评论、后台的站点，门槛最高，要懂组件、路由与数据加载；开发体验最好；定制受框架约定约束。优点是不用中途换栈，缺点是依赖多、升级勤。【判断】纯博客用它属于过度工程。

### 4. 传统 CMS 自托管

适合要插件扩展（电商、会员、论坛）且有人管服务器的人。[WordPress](https://wordpress.org/about/) 开源，插件与主题生态最大，自托管需 PHP + MySQL 与运维，软件免费、主机成本未核实。[Ghost](https://ghost.org/docs/install/) 开源 Node，写作与邮件订阅体验最顺，[Ghost(Pro)](https://ghost.org/pricing/) 为 Starter $18、Publisher $29、Business $199（USD/月，年付折算）。优点：可视化后台、非技术作者可写、插件可扩；缺点：升级备份与安全自负，动态渲染对纯内容站是额外负担。

### 5. 托管平台 / 无代码

| 产品 | 官方价（抓取日） | 备注 |
|---|---|---|
| [Squarespace](https://www.squarespace.com/pricing) | Basic HK$179/月；年付 HK$129/月 | 14 天试用，官方称年付最多省 36% |
| [Wix](https://www.wix.com/plans) | Light $17.77、Core $29.77、Business $39.77、Elite $159.77 | US$/月，年付一次付清、含 GST，部分档标 Save 50% |
| [Framer](https://www.framer.com/pricing/) | Free $0；Basic $10、Pro $30（USD/月） | 页面默认按年计费 |
| [Webflow](https://webflow.com/pricing) | Starter 免费；Basic $15/月；Premium $25/月 | USD，按年计费 |
| [Super.so](https://super.so/pricing/) | Free；Personal $16、Pro $28（USD/月） | 年付 $144/年；[Notion](https://www.notion.com/pricing) 本身 Free $0 |
| [Hexo](https://hexo.io/docs/) / [Typecho](https://docs.typecho.org/) / [Halo](https://docs.halo.run/) | Hexo 开源；Typecho GPLv2、PHP 7.4+；Halo 开源 | Halo 付费版官网横幅"至 11 月 18 日 6 折"，档位价未核实 |

适合不写代码、想尽快上线的人。共性：编辑、域名、SSL、CDN 全包；代价是导出受限、迁移贵、按站点或流量加价。【判断】不想碰服务器可优先，但"内容能否导出"是硬指标。

### 6. Git + Markdown 的文档型方案

[VitePress](https://vitepress.dev/guide/what-is-vitepress) 官方定义为"为快速、内容为中心的站点设计的 SSG"，Vue 生态，默认主题即技术文档。[MkDocs Material](https://squidfunk.github.io/mkdocs-material/) 是 Python/MkDocs 主题，官方首页公告 **2027-05-05 停止维护**、后继为 Zensical，新项目需评估这条时间线【判断】。两者皆 Markdown 进、静态 HTML 出，适合文档与知识库，不适合评论、会员、电商。

### 结论

【判断】长期写博客且愿写代码 → Astro 或 Hugo；只想写不想配 → Ghost(Pro) 或 Super；站点会长成产品 → Next.js / Nuxt；纯文档 → VitePress。
