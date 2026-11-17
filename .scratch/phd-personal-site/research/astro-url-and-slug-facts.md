# Astro URL 形态 / slug / 分页 / 404 的官方事实

> 抓取日期 2026-11-15。全部取自 docs.astro.build 与 Astro 官方仓库；官方没写的明确标「官方未说明」。
>
> **版本**：`astro` 最新版 = **7.4.12**（[packages/astro/package.json](https://github.com/withastro/astro/blob/main/packages/astro/package.json)）；docs 仓库 main 分支即当前线上文档，升级指南已含 v5、v6 两篇。
>
> **抓取方式说明（影响可信度，请知悉）**：本机网络把 `docs.astro.build` 解析到了私有地址，`web_fetch` 被 SSRF 防护拦截，**未能直接打开线上页面**。因此文档原文取自 Astro 官方文档仓库 `withastro/docs` 的英文源文件（`src/content/docs/en/**/*.mdx`）——docs.astro.build 就是由这些文件渲染发布的，属同一手来源；引用时仍给线上页面 URL 便于点击核对。Astro 源码与 GitHub PR/issue 直接从 `raw.githubusercontent.com` / `api.github.com` 取得。

---

## 1. build.format

**结论**：`build.format` 有 `'file' | 'directory' | 'preserve'` 三个取值，**默认 `'directory'`**，即 `dist/papers/foo/index.html`。

官方原文（[配置参考 · build.format](https://docs.astro.build/en/reference/configuration-reference/#buildformat)）：

> "**Type:** `('file' | 'directory' | 'preserve')` **Default:** `'directory'` Control the output file format of each page. This value may be set by an adapter for you."

> - "`'file'`: Astro will generate an HTML file named for each page route. (e.g. `src/pages/about.astro` and `src/pages/about/index.astro` both build the file `/about.html`)"
> - "`'directory'`: Astro will generate a directory with a nested `index.html` file for each page. (e.g. `src/pages/about.astro` and `src/pages/about/index.astro` both build the file `/about/index.html`)"
> - "`'preserve'`: Astro will generate HTML files exactly as they appear in your source folder. (e.g. `src/pages/about.astro` builds `/about.html` and `src/pages/about/index.astro` builds the file `/about/index.html`)"

补充事实：
- 默认值在源码里写死为 `'directory'`：[schemas/defaults.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/core/config/schemas/defaults.ts) 中 `build: { format: 'directory', ... }`。
- 路由指南只说「可自定义输出格式」，不重复取值含义："In static builds, you can customize the file output format using the [`build.format`](https://docs.astro.build/en/reference/configuration-reference/#buildformat) configuration option."（[Routing](https://docs.astro.build/en/guides/routing/)）
- 该配置**可能被 adapter 覆盖**（见上面 "may be set by an adapter for you"）。

**对本项目的直接含义**：不配置时，内容页产物是 `dist/papers/<segment>/index.html`。

---

## 2. trailingSlash

**结论**：`trailingSlash` 取值 `'always' | 'never' | 'ignore'`，**默认 `'ignore'`**；它管的是 **dev server 的路由匹配 + on-demand 渲染页的重定向**，**不决定静态产物文件名**（那是 `build.format` 的事）。

官方原文（[配置参考 · trailingSlash](https://docs.astro.build/en/reference/configuration-reference/#trailingslash)）：

> "**Type:** `'always' | 'never' | 'ignore'` **Default:** `'ignore'` Set the route matching behavior for trailing slashes in the dev server and on-demand rendered pages."

> "`'ignore'` - Match URLs regardless of whether a trailing "/" exists. Requests for "/about" and "/about/" will both match the same route."

关于**是否影响托管平台的实际 HTTP 行为（301 等）**——官方有明确说明，这是本节最关键的一句：

> "Trailing slashes on prerendered pages are handled by the hosting platform, and may not respect your chosen configuration. See your hosting platform's documentation for more information. You cannot use Astro [redirects](#redirects) for this use case at this point."

（同页；即：**预渲染（纯静态）页面的末尾斜杠由托管平台决定，可能不遵守该配置，且不能用 Astro 的 `redirects` 兜底**。）

301/308 的说法只针对 on-demand 渲染页：

> "When redirects occur in production for GET requests, the redirect will be a 301 (permanent) redirect. For all other request methods, it will be a 308 (permanent, and preserve the request method) redirect."

`build.format` 与 `trailingSlash` 的配对关系，官方 v5 文档快照写得更直白（[v5 配置参考 · build.format](https://v5.docs.astro.build/en/reference/configuration-reference/#buildformat)）：

> "Setting `build.format` controls what `Astro.url` is set to during the build. When it is: - `directory` - The `Astro.url.pathname` will include a trailing slash to mimic folder behavior. (e.g. `/foo/`) - `file` - The `Astro.url.pathname` will include `.html`. (e.g. `/foo.html`)"

> "To prevent inconsistencies with trailing slash behaviour in dev, you can restrict the [`trailingSlash` option](#trailingslash) to `'always'` or `'never'` depending on your build format: - `directory` - Set `trailingSlash: 'always'` - `file` - Set `trailingSlash: 'never'`"

⚠️ 注意：上面两段"Effect on Astro.url / 配对建议"来自 **v5 文档快照**；当前版本（v7.x）的 `trailingSlash` 条目里我只看到 "**See Also:** build.format" 的相互引用，未见同一段落（当前版 `trailingSlash` 的 JSDoc 已不含该段，见 [config.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/types/public/config.ts)）。该配对建议是否仍属当前官方立场，**官方未在当前文档中重述**。

**对本项目的直接含义**：静态站产物形态由 `build.format` 定；`trailingSlash` 改不了已生成的 `index.html`，也管不住 EdgeOne 是否 301。

---

## 3. 内容集合 slug 来源（含 v5 变更）

**结论 A（id 从哪来）**：`entry.id` 由**文件名（含相对子目录路径）**生成，**不是** frontmatter 标题，默认会被 slug 化（kebab-case、小写）。

官方原文（[Content collections · Defining custom IDs](https://docs.astro.build/en/guides/content-collections/#defining-custom-ids)）：

> "When using the [`glob()` loader](#the-glob-loader) with Markdown, MDX, Markdoc, JSON, or TOML files, every content entry [`id`](https://docs.astro.build/en/reference/modules/astro-content/#collectionentryid) is automatically generated in a URL-friendly format based on the content filename."

> "By default it uses [`github-slugger`](https://github.com/Flet/github-slugger) to generate a slug with [kebab-cased](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case) words."（[Content Loader API · generateId()](https://docs.astro.build/en/reference/content-loader-reference/#generateid)）

API 参考亦同："**Type:** `string` A unique ID. Note that all IDs from Astro's built-in `glob()` loader are slugified."（[astro:content · CollectionEntry.id](https://docs.astro.build/en/reference/modules/astro-content/#collectionentryid)）

**结论 B（v5 到底改了什么）**：v5 的 Content Layer **取消了保留字段 `entry.slug`**，改用 `entry.id`；**但 frontmatter 里写 `slug:` 仍然有效**，它现在的作用是**覆盖生成的 `id`**。

官方原文（[Upgrade to Astro v5](https://docs.astro.build/en/guides/upgrade-to/v5/#legacy-v20-content-collections-api)，步骤 3 标题即 "Change references from `slug` to `id`"）：

> "Content layer collections do not have a reserved `slug` field. Instead, all updated collections will have an `id`"

而当前文档仍明确写着 frontmatter `slug` 可用（[Defining custom IDs](https://docs.astro.build/en/guides/content-collections/#defining-custom-ids)）：

> "You can override a single entry's generated `id` by adding your own `slug` property to the file frontmatter or data object for JSON files. This is similar to the “permalink” feature of other web frameworks."

示例（同页）：

```md
---
title: My Blog Post
slug: my-custom-id/supports/slashes
---
```

**结论 C（自定义 URL 段的官方两条路）**：
1. frontmatter `slug`（覆盖 id）——见上；
2. `glob()` loader 的 `generateId()` 选项（按集合批量改）——"You can also pass options to the `glob()` loader's [`generateID()` helper function]... when you define your build-time collection to adjust how `id`s are generated."（同页；API 见 [generateId()](https://docs.astro.build/en/reference/content-loader-reference/#generateid)，签名 `(options: GenerateIdOptions) => string`，入参含 `entry` / `base` / `data`）。
3. 此外，页面路由的 `params` 完全由你自己的 `getStaticPaths()` 给出，可与 id 无关："Each object must include a `params` object, to specify route paths."（[Routing Reference · getStaticPaths()](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)）

**结论 D（v6 现状）**：v6 **彻底移除**了 legacy 集合兼容，只有 Content Layer；`entry.slug` 仅在该临时迁移 flag 下存在。

官方原文（[Upgrade to Astro v6](https://docs.astro.build/en/guides/upgrade-to/v6/)）：

> "Astro v6.0 removes this automatic legacy content collections support, along with [the `legacy.collections` flag](#removed-legacy-content-collections). All content collections must now use [the Content Layer API introduced in Astro v5.0]"

> 该 flag 的描述："Preserves legacy entry API: `entry.slug` and `entry.render()` / Uses path-based entry IDs instead of slug-based IDs"（同页，`legacy.collectionsBackwardsCompat`）

含 `/` 的自定义 slug 需要 rest 参数，官方明说：

> "If your custom slugs contain the `/` character to produce URLs with multiple path segments, you must use a [rest parameter (e.g. `[...id]`)](https://docs.astro.build/en/guides/routing/#rest-parameters) in the `.astro` filename for this dynamic routing page."

**对本项目的直接含义**：`getCollection()` 出来的入口默认叫 `entry.id`（由文件名派生）；想让 URL 段不同于文件名，写 frontmatter `slug` 或在 `getStaticPaths()` 里自己映射 params 都行；**不要再写 `entry.slug`**。

---

## 4. 中文/非 ASCII 路径

**官方文档：未说明。** 我在以下页面均未找到关于中文/非 ASCII 文件名与路由的专门说明：[Routing](https://docs.astro.build/en/guides/routing/)、[Routing Reference](https://docs.astro.build/en/reference/routing-reference/)、[Pages](https://docs.astro.build/en/basics/astro-pages/)、[配置参考](https://docs.astro.build/en/reference/configuration-reference/)。

官方文档**唯一相关的间接记载**是 v6 的路径名规范化变更（[Upgrade to Astro v6 · Changed: Route pathname normalization](https://docs.astro.build/en/guides/upgrade-to/v6/)）：

> "Since Astro v6, route pathnames may be partially decoded during route normalization. This means `Astro.url.pathname` may differ from `new URL(Astro.request.url).pathname` for percent-encoded route segments."

> "If you need access to the original encoded pathname, use `new URL(Astro.request.url).pathname` instead of `Astro.url.pathname`."

以及 `getStaticPaths` 的 params 不解码（[Routing · Decoding params](https://docs.astro.build/en/guides/routing/#decoding-params)）：

> "`params` returned by a `getStaticPaths()` function are not decoded. Use [`decodeURI()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI) when you need to decode parameter values."

**构建产物是否是中文目录名**——文档未写，以下为**官方源码/官方测试证据（非文档结论）**：

- 构建时会先 `encodeURI(pathname)` 再拼输出目录，但写入用的是 `nodeFs.promises.writeFile(result.outFile, ...)`（`URL` 形式），`fileURLToPath` 会把 `%E6%B3%A8...` 还原成真实字符——见 [core/build/generate.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/core/build/generate.ts) 中 `const encodedPath = encodeURI(pathname);` 与 `getOutFolder({... pathname: encodedPath ...})`。
- 官方 PR 的测试断言直接证明产物是**原样非 ASCII**："**Build (SSG)**: `/redirected/héllo/index.html` is generated correctly"（[withastro/astro#15444](https://github.com/withastro/astro/pull/15444)，该 PR 的测试名亦为 `/redirected/héllo`）。

**社区 issue（不是官方文档结论）**：
- [withastro/astro#14464](https://github.com/withastro/astro/issues/14464) "Astro.rewrite wrongly renders 404s when rewriting to a URL with non-ASCII characters"（Astro v5.14.1，已由 #15444 修复并合并）。issue 正文的构建日志显示同一页面会同时产出 `/héllo/index.html` 与 `/h%C3%A9llo/index.html` 两个文件，说明编码形式会影响去重/路由匹配。
- [withastro/astro#17381](https://github.com/withastro/astro/issues/17381) 与 [#17423](https://github.com/withastro/astro/pull/17423)：`create astro` 在**含非 ASCII 的工程目录路径**下（NFC/NFD 规范化差异）会静默建到错误目录——这是脚手架/路径问题，与 URL 路由无关，但同一台机器上值得留意。
- [withastro/astro#16222](https://github.com/withastro/astro/issues/16222)：Astro 编译器误把 Unicode 弯引号 `“ ”` 当作属性结束符（已在 2026-06 关闭）——只影响 `.astro` 模板里的中文引号，不影响文件名。

**对本项目的直接含义**：构建产物目录名是**中文原样**（`dist/papers/注意力机制/index.html`），而浏览器地址栏与 `Astro.url.pathname` 层面会出现百分号编码形式；这两者不是一回事。

---

## 5. 分页

**结论**：`paginate()` 从 `getStaticPaths()` 返回；**文件名决定第 1 页 URL**——`[page].astro` 的第 1 页是 `/papers/1`，`[...page].astro` 的第 1 页才是 `/papers`。

官方原文（[Routing Reference · paginate()](https://docs.astro.build/en/reference/routing-reference/#paginate)）：

> "`paginate()` assumes a file name of `[page].astro` or `[...page].astro`. The `page` param becomes the page number in your URL:
> - `/posts/[page].astro` would generate the URLs `/posts/1`, `/posts/2`, `/posts/3`, etc.
> - `/posts/[...page].astro` would generate the URLs `/posts`, `/posts/2`, `/posts/3`, etc."

示例路径同样是 `src/pages/pokemon/[page].astro`（同页）与 `src/pages/astronauts/[page].astro`（[Routing · Pagination](https://docs.astro.build/en/guides/routing/#pagination)，明确写 "the file name `/astronauts/[page].astro` will generate routes for `/astronauts/1`, `/astronauts/2`"）。

`page` prop 关键字段：`page.currentPage`（"The current page number, starting with `1`"）、`page.url.prev`（"will be `undefined` if on page 1"）、`page.url.first`、`page.url.last`（同页）。

**分页与 `trailingSlash` 的交互**：官方**未说明**两者存在交互问题。唯一相关的是 `trailingSlash` 自身的定位声明（"in the dev server and on-demand rendered pages"）与"预渲染页由平台决定"那段（见第 2 节）。`page.url.*` 的值受 `base` 影响，官方明说（"If a value is set for `base`, the URL starts with that value."），v5 起 `base` 自动包含（[v5 升级指南 · URLs returned by paginate()](https://docs.astro.build/en/guides/upgrade-to/v5/)）。

**「内容只有十几条、不分页」的官方推荐做法**：**官方未说明**。官方文档只描述了 `paginate()` 的用法，没有给出"条目少就不要分页"的建议；`paginate()` 也没有"最小条目数"之类的开关。事实层面可对照的是：`src/pages/` 下的普通 `.astro` 文件本身就是一条路由（"Each file in your `src/pages/` directory becomes an endpoint on your site based on its file path."，[Pages](https://docs.astro.build/en/basics/astro-pages/)），即一个不分页的列表页就是 `src/pages/papers/index.astro` 这类普通页面，无需任何额外配置。

---

## 6. 404 页

**结论**：`src/pages/404.astro`（或 `404.md`）在 `output: 'static'` 下产出 **`dist/404.html`**；官方明说**依赖部署服务去发现并使用它**（"**Most** deploy services will find and use it"——用了 "Most"，不是 "All"）。

官方原文（[Pages · Custom 404 Error Page](https://docs.astro.build/en/basics/astro-pages/#custom-404-error-page)）：

> "For a custom 404 error page, you can create a `404.astro` or `404.md` file in `src/pages`. This will build to a `404.html` page. Most [deploy services](https://docs.astro.build/en/guides/deploy/) will find and use it."

关于「是否在所有托管平台上都能生效」——官方**没有**保证；上句的 "Most" 以及 middleware 文档里这段说明平台可能自行接管：

> "Middleware will attempt to run for all on-demand rendered pages, even when a matching route cannot be found. This includes Astro's default (blank) 404 page and any custom 404 pages. However, it is up to the [adapter](https://docs.astro.build/en/guides/on-demand-rendering/) to decide whether that code runs. Some adapters may serve a platform-specific error page instead."（[Middleware · Error pages](https://docs.astro.build/en/guides/middleware/#error-pages)）

**dev server 与生产托管的差异**：官方文档**未逐条说明** dev 下 404 的状态码/行为。相关但不等价的记载只有上面那段（讲的是 on-demand 渲染与 adapter 的取舍）。社区 issue 里有具体现象讨论——[withastro/astro#7516](https://github.com/withastro/astro/issues/7516) "Custom 404 page has status code 200 OK"（Astro 2.7.0 + Node adapter，2023-07 已关闭）；**这是社区 issue，不是官方文档结论**，且版本较旧。

**对本项目的直接含义**：产物固定是 `dist/404.html`；能否真正"404 生效"取决于 EdgeOne Pages 的 404 规则，Astro 侧无法保证。

---

## 7. 官方未说明 / 存疑清单

- **中文/非 ASCII 文件名与路由**：官方文档完全未提。「产物目录名保留中文」来自官方源码与官方 PR 测试（#15444），不是文档结论；「地址栏/`Astro.url.pathname` 为百分号编码」仅有 v6 的路径规范化变更可间接印证，无专门条目。
- **`trailingSlash` 对托管平台 HTTP 行为的控制力**：官方明确说"由平台处理、可能不遵守"，但**未**说明各平台的具体行为，也**未**说明能否用任何配置强制。
- **`trailingSlash` 与 `build.format` 的官方配对建议**：仅见于 **v5 文档快照**；当前（v7.x）文档中我未取到该段（当前版 `trailingSlash` 的 JSDoc 已无此内容），是否仍属现行建议存疑。
- **分页与 `trailingSlash` 的交互**：官方无任何说明。
- **"条目少就不分页"的推荐做法**：官方无任何说明；`paginate()` 无最小条目阈值。
- **404 在 dev server 与各托管平台上的具体行为差异**：官方无逐条说明；只有 "Most deploy services will find and use it." 与 "it is up to the adapter to decide"。
- **`build.format: 'preserve'` 的引入版本**：官方配置参考未标 `Added in`（`Since` 组件未出现在该项），v5 文档快照中已存在该取值，更早版本未核。
- **本次抓取的两个技术限制**（记录以备复核）：① `docs.astro.build` 在本机被解析到私有地址，`web_fetch` 被 SSRF 拦截，文档原文改由 `withastro/docs` 仓库源文件取得；② 本会话 `pwsh` 因工作区 ACL 授权失败无法执行，因此未能本地跑 `astro build` 实测产物，第 4 节的产物结论依赖源码与官方测试而非本地构建。

---

## 对本项目的直接含义（仅事实推论）

- 不配置时：内容页产物路径 = `dist/papers/<段落>/index.html`（`build.format` 默认 `'directory'`）。
- `trailingSlash` 默认 `'ignore'`，它不会改变已生成的静态文件，也管不住 EdgeOne 的 301——这由平台决定。
- `entry.slug` 已不存在（v6 起无 legacy），URL 段来自 `entry.id`（文件名派生）；要自定义就写 frontmatter `slug` 或自己在 `getStaticPaths()` 里给 `params`。
- 中文文件名会生成中文目录名，浏览器侧呈现为百分号编码。
- 不分页 = 写一个普通列表页（`src/pages/papers/index.astro`）；要分页则 `[...page].astro` 的第 1 页才是 `/papers`。
- 404 产物是 `dist/404.html`，生效与否取决于平台。
