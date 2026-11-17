# 首页数据源与排序的一手事实核查（profile 单例 / 取最新 N 条）

> 抓取与实测日期 2026-11-17。判定基准版本：`astro` **7.4.12**（当前 npm `latest`，2026-11-13 发布）。
>
> 只采用一手来源：Astro 官方文档仓库 `withastro/docs` 的英文 mdx 源文件（commit `aebf59e6`）、Astro 源码仓库 `withastro/astro` 的 `packages/` 源码与官方测试（commit `9ad37291`）、ECMA-262 规范源文件（`tc39/ecma262` commit `b1eaed82`）、V8 官方博客源文件（`v8/v8.dev` commit `031a6578`）、以及**本机实跑**（`%TEMP%\astro-verify-home` 等一次性项目，`astro@7.4.12` + `node v24.18.0`）。二手博客、AI 摘要、搜索引擎片段一律未采用。

## 本笔记回答的问题

钉死「首页四栏（介绍 → 论文 → 项目 → 分享）的内容来源与降级规则」这张工单依赖的 9 件事：

- **A1** Astro 5.x+ 是否有官方 `file()` loader（data collections，读 JSON / YAML / TOML）？API 签名、最小代码、「单文件装一个集合」与「一文件多条记录」两种用法、`getCollection()` / `getEntry()` 各自怎么取。
- **A2** 「站点级单例数据」（站点标题、作者简介、社交链接）官方推荐放哪：单条目 content collection、`src/consts.ts` / `src/config.ts` 常量模块、还是别的？官方有没有明说「这类数据不该用 collection」。
- **A3** `src/config.ts` 这类手写 TS 常量模块在官方文档里的角色；有没有「内容 vs 配置」边界的官方表态。
- **B4** `glob({ base: './src/content/profile', pattern: '**/index.md' })` 收到唯一一个 `profile/index.md` 时 `entry.id` 是什么，`index` 段被去掉的依据在哪、文档有没有写明。
- **B5** `getEntry()` 条目不存在返回什么；`getCollection()` 对空集合、对完全没定义过的集合名各返回什么。
- **B6** `getCollection()` 返回顺序非确定性的官方原话（新版本是否变了）。
- **C7** 现代 JS 引擎 `Array.prototype.sort` 是否保证稳定（ES2019 起），规范条文出处，V8/Node 从哪个版本起稳定，「多级排序只写第一级键」这种做法能不能成立。
- **D8** Astro 有没有官方 helper 做「取集合前 N 条」/「按字段排序」；`paginate()` 的适用范围（只用于路由分页？能否只要前 N 条）。
- **D9** 官方文档里「首页显示最新几篇」的标准范式与最小代码。

## 限制（哪些页面没抓全文、怎么绕过的）

- **`docs.astro.build` 只试了一次就放弃**。本机把它解析到私有地址（`198.18.0.130`），`web_fetch` 被 SSRF 防护拦截：`Error: SSRF blocked: docs.astro.build resolves to private address 198.18.0.130`。按约定立刻改走仓库源文件。
- **改从 `withastro/docs` 取 mdx 原文**：`raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/...`，并整包下载 `codeload.github.com/withastro/docs/tar.gz/refs/heads/main`（2822 个文件，其中 en mdx 430 个）做全库 grep，避免只读单文件漏掉证据。
- **源代码侧**同样整包下载 `withastro/astro` main tarball（含 `packages/` 与 `examples/`）本地 grep。
- **`tc39.es`、`v8.dev` 同样被解析到私有地址**（`198.18.0.13` / `198.18.0.14`），`web_fetch` 全部 SSRF 拦截。**绕法**：直接取规范/博客的仓库源文件——`raw.githubusercontent.com/tc39/ecma262/main/spec.html`（ECMA-262 的规范源码，`tc39.es/ecma262` 就是由它构建发布的）、`raw.githubusercontent.com/v8/v8.dev/main/src/features/stable-sort.md` 与 `.../src/blog/v8-release-70.md`、`raw.githubusercontent.com/mdn/content/main/files/en-us/web/javascript/reference/global_objects/array/sort/index.md`。
- **`api.github.com` 的 tree 接口返回 403**（未鉴权限流），改用 `git ls-remote` 拿分支 SHA、用 tarball 拿全量文件清单。
- **官方 `recipes/` 里没有「站点级单例数据」这一篇**：en `recipes/` 共 22 个 mdx（`index.mdx` 是目录页本身，内容篇 21 篇：`add-yaml-support`、`reading-time`、`rss`、`i18n` …），没有 site-metadata / global-data 类 recipe。这一条是**穷举确认**（430 个 en mdx 全 grep `consts` = 0 命中、`singleton` = 0 命中），不是抽样结论。
- 「实测」全部来自 `%TEMP%` 下的一次性项目（`astro-verify-home` / `astro-verify-order`），跑完即弃，**未触碰仓库任何文件**。

## 核查方法与证据分级

- **【官方明文】**：官方文档 mdx 原文、ECMA-262 规范条文、V8 官方博客原文（可直接引用措辞）。
- **【源码】**：`withastro/astro` 的实现代码（比文档更权威，但官方未把它当契约承诺）。
- **【测试】**：官方仓库的 fixture + 断言（官方承认的行为，常覆盖文档没写的边角）。
- **【实测】**：我在本机 7.4.12 + node 24.18.0 上跑出来的结果（可复现，但版本绑定）。
- **【推导】**：由上面几条事实推出来的工程结论，不是任何来源的原话，单独标注。

---

## 1. `file()` loader：存在、签名、两种用法（A1）

### 结论

证据等级：【官方明文】签名/版本/支持格式/两种数据形状 + 【源码】id 推导与错误分支 + 【实测】六组文件形状的实际输出。

- **存在**。`file()` 与 `glob()` 并列为 Astro 的**两个内置 build-time loader**，自 **v5.0.0** 起提供，从 `astro/loaders` 导入。【官方明文】
- 签名：`(fileName: string, options?: FileOptions) => Loader`，`FileOptions` 只有一个可选字段 `parser`。
- 支持的格式：`.json`（`JSON.parse`）、`.yml` / `.yaml`（内置 YAML 解析）、`.toml`（`smol-toml`）；其他后缀（如 `.csv`）必须自带 `parser`，否则抛 `FileParserNotFound`。文件名里不允许出现 `*`（抛 `FileGlobNotSupported`）。
- **关键事实：`file()` 没有「单条目模式」**。它的定位是「一个文件 → 多条 entry」：条目 `id` **不会**自动生成，必须由你提供——数组形式靠每项的 `id`（或 `slug`）字段，对象形式靠**键名**。
- 所以「单个文件装一个集合」= 数组里只放一个元素，或对象里只有一个键；`id` 是你自己写死的那个字符串，`getEntry()` 就用它取。
- **陷阱（实测踩到）**：直接把一条裸记录写成 `{ "title": "Me", "bio": "...", "links": [...] }`，会被当成「**字段名就是 id**」，产出 **3 个** entry（`id` 分别是 `title` / `bio` / `links`，`data` 分别是该字段的**值**），不是 1 个。这不会报错，只会得到一坨错误数据。

### 引文

`file()` 的类型与版本（[content-loader-reference.mdx#L156-L166](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/content-loader-reference.mdx#L156-L166)）：

> "### `file()` loader"
> "**Type:** `(fileName: string, options?: FileOptions) => Loader`" / `<Since v="5.0.0" />`
> "The `file()` loader creates entries from a single file that contains an array of objects with a unique `id` field, or an object with IDs as keys and entries as values."
> "It supports JSON, YAML, or TOML files and you can provide a custom `parser` for data files it cannot parse by default, or to parse data asynchronously."

`parser` 签名（[同文件#L206-L213](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/content-loader-reference.mdx#L206-L213)）：

> "**Type:** `(text: string) => Record<string, Record<string, unknown>> | Array<Record<string, unknown>> | Promise<...>`"
> "A callback function to create a collection from a file's contents. Use it when you need to process files other than JSON, YAML, or TOML that not supported by default (e.g. `.csv`) or when using [nested `.json` documents]…"

两个内置 loader 的定位与 `file()` 的 id 规则（[content-collections.mdx#L163-L166](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L163-L166)、[#L225-L258](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L225-L258)）：

> "Astro provides two built-in loaders (`glob()` and `file()`) for fetching your local content at build time."
> "The `file()` loader fetches multiple entries from a single local file defined in your collection. The `file()` loader will automatically detect and parse (based on the file extension) a single array of objects from JSON and YAML files, and will treat each top-level table as an independent entry in TOML files."
> "Each entry object in the file must have a unique `id` key property so that the entry can be identified and queried. **Unlike the `glob()` loader, the `file()` loader will not automatically generate IDs for each entry.**"
> "You can provide your entries as an array of objects with an `id` property, or in object form where the unique `id` is the key:"

两种数据形状（[content-collections.mdx#L244-L258](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L244-L258)）——同一份 `src/data/dogs.json` 的两种合法写法：

```jsonc
// 数组形式：id 写在对象里
[ { "id": "poodle", "coat": "curly" }, { "id": "afghan", "coat": "short" } ]

// 对象形式：键名即 id
{ "poodle": { "coat": "curly" }, "afghan": { "coat": "silky" } }
```

源码层面的行为（[packages/astro/src/content/loaders/file.ts#L29-L52](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/file.ts#L29-L52) 与 [#L70-L117](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/file.ts#L70-L117)，节选）：

```ts
export function file(fileName: string, options?: FileOptions): Loader {
	if (fileName.includes('*')) { throw new AstroError(FileGlobNotSupported); }
	const ext = fileName.split('.').at(-1);
	if (ext === 'json') { parse = JSON.parse; }
	else if (ext === 'yml' || ext === 'yaml') { parse = parseYaml; }
	else if (ext === 'toml') { parse = toml.parse; }
	if (options?.parser) parse = options.parser;
	if (parse === null) { throw new AstroError({ ...FileParserNotFound, ... }); }
}

// 数组分支：id 来自 rawItem.id，其次 rawItem.slug；缺了就跳过该条
const id = (rawItem.id ?? rawItem.slug)?.toString();
if (!id) { logger.error(`Item in ${fileName} is missing an id or slug field.`); continue; }

// 对象分支：键名即 id；$schema 字符串字段被忽略
const entries = Object.entries<Record<string, unknown>>(data);
if (id === '$schema' && typeof rawItem === 'string') { continue; }
```

**最小可抄代码**（`src/content.config.ts`）：

```ts
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// 用法 A：一个文件装「一个集合，只有一条记录」——对象单键，键名即 entry.id
const site = defineCollection({
  loader: file('./src/data/site.json'),   // 内容：{ "me": { "title": "...", "links": [...] } }
  schema: z.object({ title: z.string(), links: z.array(z.string()) }),
});

// 用法 B：一个文件装多条记录——数组，每条自带 id（或 slug）
const links = defineCollection({
  loader: file('./src/data/links.json'),  // 内容：[{ "id": "github", "href": "..." }, ...]
  schema: z.object({ href: z.string(), label: z.string().optional() }),
});

export const collections = { site, links };
```

取法（`getCollection()` 与 `getEntry()` 的差别）：

```ts
import { getCollection, getEntry } from 'astro:content';

const allLinks = await getCollection('links');            // → 数组，全部条目
const site = await getEntry('site', 'me');                // → 单条；id 必须是 'me'
if (!site) throw new Error('site.json 里缺 me 这一条');
const title = site.data.title;
```

`getEntry()` 的第二个参数是**你写死的那个 id**——对象形式是键名（`me`），数组形式是 `id` 字段（或 `slug` 字段）的值。

**实测**（`astro@7.4.12`，`npx astro build`，从 `getCollection()` 打印 `e.id` 与 `e.data`）：

| 文件内容 | 得到的条目 |
|---|---|
| `{"me":{"title":"Me","links":["a"]}}` | `[{"id":"me","data":{"title":"Me","links":["a"]}}]`（1 条，`data` 里**没有** `id`） |
| `[{"id":"me","title":"Me","links":["a"]}]` | `[{"id":"me","data":{"id":"me","title":"Me","links":["a"]}}]`（1 条，`data` 里**带** `id`） |
| `{"title":"Me","bio":"hello","links":["a","b"]}` | **3 条**：`id=title → "Me"`、`id=bio → "hello"`、`id=links → ["a","b"]` |
| `[{"title":"A"},{"id":"b","title":"B"}]` | 只剩 `b`；缺 id 的那条被 **跳过** 并报 `Item ... is missing an id or slug field.` |
| `[{"id":"x"},{"id":"x"}]` | 只剩 1 条（后者覆盖前者），并报 `multiple entries with the same slug: 'x'` |
| `[]` | 0 条 + 警告 `No items found in src/data/empty.json`，`getCollection()` 返回 `[]` |

### 对本项目的含义

- **「作者简介 / 联系方式」可以放进 data collection，但形状必须选对**：写 `{ "me": { ... } }`（对象单键）或 `[{ "id": "me", ... }]`（单元素数组），然后用 `getEntry('site', 'me')` 取。**绝对不能**写成一条裸记录，否则会静默炸成「每个字段一个 entry」。
- 两种形状里，**对象单键更适合单例**：`data` 干净（不带多余的 `id` 字段），且 `id` 就是你在 JSON 里写的键名，改不了也不容易写错。
- 「社交链接」是**多条**，用数组形式一个文件装完，`getCollection('links')` 直接拿到数组——不需要为每个链接建一条 Markdown。
- 代价：`file()` 的数据**不进** Markdown 渲染管线，`entry.body` 无意义，图片不走 `image()` 优化；它只是「带 schema 校验的 JSON」。如果要写多段文字（教育经历、研究兴趣），Markdown 的 `glob()` 单条目更顺手。

---

## 2. 站点级单例数据放哪（A2）

### 结论

证据等级：**「官方没有明确推荐」这一判断本身是【官方明文】的缺席**——由 430 个 en mdx 穷举确认（0 命中），不是「我没找到」；「迁移指南指向 `src/data/siteMetadata.js`」是【官方明文】；「官方模板用 `src/consts.ts`」是【源码】（模板文件本身）；「该放哪」的最终取舍是【推导】/设计决定。

- **官方没有任何一句直接回答「站点级单例数据该放 content collection 还是常量模块」，也没有任何一句明说「这类数据不该用 content collection」。这是穷举确认：en 430 个 mdx 里 `singleton` 0 命中、`consts` 0 命中。
- 最接近的官方表态有两条，方向**不同**：
  1. **「内容集合的适用边界」**：官方有一个显式小节 `### When not to create a collection`，第一条就是「你只有一条或很少几条不同的内容页 → 直接写页面组件，不要建集合」。这条针对的是**页面型内容**，措辞是「content pages」，不是「站点元数据」。
  2. **「站点元数据（title / description / social accounts）放哪」**：官方只在**迁移指南**里给过一次明确去处——Gatsby 迁移页说把 `siteMetadata: {}` 移到 **`src/data/siteMetadata.js`（或 `.json`）**，并说明它是「关于你站点的数据（标题、描述、社交账号等）」，供页面布局 import。注意：它建议的是**手写 JS/JSON 数据模块**，不是 content collection。
- 另一条**代码级**（非文档）的官方惯例：Astro 官方 blog starter 模板（`examples/blog`，`npm create astro` 的 blog 模板就是这个）里有 `src/consts.ts`，文件头注释写着「把任何全局数据放这个文件」，导出 `SITE_TITLE` / `SITE_DESCRIPTION`。官方 `starlog` 示例同样如此。但**这个文件在文档正文里一次都没被提到过**——它是「官方模板里的既有做法」，不是「官方文档的推荐条款」。
- 结论的准确表述：**官方对「站点标题 / 作者简介 / 社交链接」这类数据，给过的是「放进手写数据模块（`src/data/*.js` 或 `src/consts.ts`）并由布局 import」的示例，没有推荐用 content collection；同时官方明确把「只有一条内容页」列进「不要建 collection」的情形。但『单例数据必须用常量』这句话官方从未写过。** 所以这在本项目里是**设计决定**，不是「照官方做」。

### 引文

「什么时候不该建集合」（[content-collections.mdx#L99-L107](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L99-L107)）：

> "### When not to create a collection"
> "Collections provide excellent structure, safety, and organization when you have multiple pieces of content that must share the same properties."
> "Collections may not be your solution if:"
> "- You have only one or a small number of different content pages. Consider [making individual page components](/en/basics/astro-pages/) such as `src/pages/about.astro` with your content directly instead."
> "- You are displaying files that are not processed by Astro, such as PDFs. …"
> "- Your data source has its own SDK/client library for imports …"

「什么时候该建集合」（[同文件#L84-L90](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L84-L90)）：

> "### When to create a collection"
> "Define your data as a collection when:"
> "- You have multiple files or data to organize that share the same overall structure …"
> "- You have existing content stored remotely …"
> "- You need to fetch (tens of) thousands of related pieces of data at build time …"

站点元数据的官方去处（[from-gatsby.mdx#L235-L239](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/migrate-to-astro/from-gatsby.mdx#L235-L239)）：

> "### Repurpose config files"
> "- `gatsby-config.js`: Move your `siteMetadata: {}` into `src/data/siteMetadata.js` (or `siteMetadata.json`) to import data about your site (title, description, social accounts, etc.) into page layouts."

`astro.config` 不用来存 SEO/meta（[configuring-astro.mdx#L69-L75](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/configuring-astro.mdx#L69-L75)）：

> "### Add site metadata"
> "Astro does not use its configuration file for common SEO or meta data, only for information required to build your project code and render it to HTML."
> "One common pattern for Astro sites is to create a `<Head />` `.astro` component that can be added to a common layout component so it can apply to all your pages."

官方模板里的 `src/consts.ts`（[examples/blog/src/consts.ts#L1-L5](https://github.com/withastro/astro/blob/main/examples/blog/src/consts.ts#L1-L5)）：

```ts
// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Astro Blog';
export const SITE_DESCRIPTION = 'Welcome to my website!';
```

同款（[examples/starlog/src/consts.ts#L1-L5](https://github.com/withastro/astro/blob/main/examples/starlog/src/consts.ts#L1-L5)）：`export const SiteTitle = 'Starlog';` / `export const SiteDescription = 'Welcome to my website!';`

官方 blog 模板的首页与布局**都从 `consts` import**（[examples/blog/src/pages/index.astro#L5](https://github.com/withastro/astro/blob/main/examples/blog/src/pages/index.astro#L5)、[blog/index.astro#L8](https://github.com/withastro/astro/blob/main/examples/blog/src/pages/blog/index.astro#L8)）：

> `import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';`

### 对本项目的含义

- **「个人介绍与联系方式放哪」的决定，不能靠「官方推荐」背书**——官方没有这条推荐。能在工单里写的是：官方明确把「只有一条内容页」列进「不要建 collection」，并在唯一一次讨论站点元数据去处时指向 `src/data/siteMetadata.js`；官方模板则用 `src/consts.ts`。两条都指向「手写数据模块」，没有一条指向 content collection。
- 因此如果本项目的卖点是「Markdown 是唯一内容来源」，要注意：**站点标题/社交链接放进 TS 常量并不违反这条原则**——官方自己也把这类数据叫「meta data」而不是「content」，`Astro.config` 的原文甚至直接把它和「构建项目所需的配置」区分开。真正需要 Markdown 的是**有正文的东西**（论文、项目、分享、个人介绍长文）。
- 折中方案（本项目可采用的、有事实支撑的分法）：**长文（有正文、要 Markdown 渲染）→ `glob()` 单条目集合；纯字段（标题、社交链接数组、邮箱）→ 常量模块或 `file()` 的 JSON**。这样降级规则简单：内容集合缺条目时页面还能用常量兜底，反之不行。
- 如果坚持「连作者简介也进 collection」，那么必须接受第 4 条的事实：单条目目录写法下 `entry.id` 是 `index`（不是 `profile`），`getEntry()` 的 key 会反直觉——这是要写进工单的坑。

---

## 3. `src/config.ts` 这类手写 TS 模块的官方角色（A3）

### 结论

证据等级：**「官方文档 0 命中」是穷举结论**（全库 2822 个文件 grep）；「`src/` 除 `pages/` 外可自由命名」「配置文件不用于 SEO/meta」是【官方明文】；「`src/config.ts` 无官方依据但也不违规」是【推导】。

- **`src/config.ts` 在官方文档里根本不存在**。en 430 个 mdx 全文 grep `src/config` = **0 命中**；全库（含翻译）grep `config.ts` 的命中全部是 `astro.config.*` / `content.config.*` / `live.config.ts` / `tsconfig` / `vitest.config` / `playwright.config` / 第三方 CMS 的 `payload.config.ts` / `keystatic.config.ts` / `tina/config.ts`，**没有一处**是「用户自己的 `src/config.ts` 常量模块」。
- `src/consts.ts` 属于另一种情况：文档里也 0 命中，但它是**官方模板里真实存在的文件**（见第 2 条引文）。所以两者的定位差别是实打实的：
  - `src/consts.ts` = **官方模板的既有惯例**（first-party 代码里有，文档里没写）。
  - `src/config.ts` = **社区/个人约定**（官方文档与官方模板里都没有）。官方博客模板里也没有 `src/config.ts`。
- **官方没有「内容 vs 配置」边界的正式表态**。唯一沾边的是两条：(a) 「Astro 的配置文件不用于 SEO/meta 数据」；(b) 「`src/` 下只有 `src/pages/` 是 Astro 保留的目录，其它随便你怎么组织」。
- 由此：**用 `src/config.ts` 没有任何官方依据，但也不违反任何官方规则**——因为 `src/` 里除了 `pages/` 都可以自由命名。

### 引文

`src/` 只有 `pages/` 是保留目录（[project-structure.mdx#L75-L77](https://github.com/withastro/docs/blob/main/src/content/docs/en/basics/project-structure.mdx#L75-L77)）：

> ":::tip
> While this guide describes some popular conventions used in the Astro community, **the only directory reserved by Astro is `src/pages/`**. You are free to rename and reorganize any other directories in a way that works best for you.
> :::"

`src/components` 的「约定但非必需」措辞（[同文件#L87-L91](https://github.com/withastro/docs/blob/main/src/content/docs/en/basics/project-structure.mdx#L87-L91)）：

> "This is a common convention in Astro projects, but it is not required. Feel free to organize your components however you like!"

配置文件只放构建所需信息（[configuring-astro.mdx#L71](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/configuring-astro.mdx#L71)）：

> "Astro does not use its configuration file for common SEO or meta data, only for information required to build your project code and render it to HTML."

### 对本项目的含义

- 在工单/地图里给 `src/config.ts` 的定性应当是**「本项目自定的约定，官方无对应条款」**，证据等级【推导】而非【官方明文】。不要写成「Astro 推荐用 config.ts 存站点配置」——这句话没有出处。
- 名字上的实际风险也很小（`src/` 除 `pages/` 外可自由命名），但**名字撞车**的风险真实存在：`config.ts` 在这个生态里几乎总是指向 `astro.config.*` / `content.config.*`。若要在工单里定名，选 `src/site-config.ts` 或干脆沿用官方模板的 `src/consts.ts` 更不容易误读。
- 「内容 vs 配置」的边界本项目得自己划，并写进工单。有事实支撑的划法：**需要 Markdown 渲染 / 需要按日期排序 / 会持续增删 → 内容集合；整个站点只有一份、改一次生效全站、不参与排序 → 配置模块。**

---

## 4. 单条目集合的 `entry.id`（B4）

### 结论（分三层，因为「`index` 会被去掉」是有条件的）

证据等级：【源码】（`getContentEntryIdAndSlug` 的 `replace(/\/index$/,'')`）+【测试】（官方断言 `2021/01/01/index.md → slug '2021/01/01'`）+【实测】（五种 base/pattern 组合逐个验证）；**文档层无记录**（en 430 mdx 里 `index.md` 0 命中）。

1. **推导规则**：`entry.id` = 该文件相对 `base` 的路径 → 去扩展名 → **按 `/` 切段** → 每段过 `github-slugger` → 用 `/` 拼回 → 最后 `.replace(/\/index$/, '')`。
2. **`index` 段被去掉是有条件的：只有它前面还有别的路径段时才会去掉**。正则要求 `/index` 前有一个斜杠。所以：
   - `base: './src/content'` + `pattern: 'profile/**/index.md'`，文件 `src/content/profile/index.md` → 相对路径 `profile/index.md` → 去掉扩展名后 `profile/index` → slug `profile`（**`index` 被去掉**）。
   - `base: './src/content/profile'` + `pattern: '**/index.md'`（**本项目拟用的写法**），文件 `src/content/profile/index.md` → 相对路径 `index.md` → `index` → 正则 **不匹配**（前面没有斜杠）→ **`id` 就是 `"index"`**。
3. **官方文档没有写明这个行为**。en 430 个 mdx 里 `index.md` **0 命中**；`astro:content` 参考页对 `CollectionEntry.id` 只说「唯一 ID，内置 `glob()` 产生的 ID 都是 slug 化的」，没有任何「单目录 + index.md → id 是父目录名」的说明。**这条只有【源码】+【测试】+【实测】三层依据，文档层是空白。**

### 引文

源码（[packages/astro/src/content/utils.ts#L366-L390](https://github.com/withastro/astro/blob/main/packages/astro/src/content/utils.ts#L366-L390)）：

```ts
export function getContentEntryIdAndSlug({ entry, contentDir, collection }): { id: string; slug: string } {
	const relativePath = getRelativeEntryPath(entry, collection, contentDir);
	const withoutFileExt = relativePath.replace(new RegExp(path.extname(relativePath) + '$'), '');
	const rawSlugSegments = withoutFileExt.split(path.sep);

	const slug = rawSlugSegments
		// Slugify each route segment to handle capitalization and spaces.
		// Note: using `slug` instead of `new Slugger()` means no slug deduping.
		.map((segment) => githubSlug(segment))
		.join('/')
		.replace(/\/index$/, '');          // ← 只吃掉「/<seg>/index」里的 index

	const res = { id: normalizePath(relativePath), slug };
	return res;
}
```

`glob()` 的默认 id 用的是 **`slug`**，不是 `id`（[packages/astro/src/content/loaders/glob.ts#L59-L79](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/glob.ts#L59-L79)）：

```ts
function generateIdDefault({ entry, base, data }: GenerateIdOptions, isLegacy?: boolean): string {
	if (data.slug) { return String(data.slug); }     // ← frontmatter 的 slug 直接覆盖 id
	const entryURL = resolveEntryUrl(entry, base);
	if (isLegacy) { ... return id; }
	const { slug } = getContentEntryIdAndSlug({ entry: entryURL, contentDir: base, collection: '' });
	return slug;
}
```

官方测试断言（[packages/astro/test/units/content-collections/get-entry-info.test.ts#L26-L46](https://github.com/withastro/astro/blob/main/packages/astro/test/units/content-collections/get-entry-info.test.ts#L26-L46)）：

```ts
it('Returns correct entry info', () => {
	const entry = new URL(`${collection}/first-post.md`, contentDir);
	const info = getContentEntryIdAndSlug({ entry, contentDir, collection });
	assert.equal(info.id, 'first-post.md');
	assert.equal(info.slug, 'first-post');
});

it('Returns correct slug when nested directories used', () => {
	const entry = new URL(`${collection}/2021/01/01/index.md`, contentDir);
	const info = getContentEntryIdAndSlug({ entry, contentDir, collection });
	assert.equal(info.slug, '2021/01/01');       // ← 前面有段，index 被去掉
});
```

参考页对 `id` 的全部说明（[astro-content.mdx#L396-L403](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/modules/astro-content.mdx#L396-L403)）：

> "#### `CollectionEntry.id`"
> "**Type:** `string`"
> "A unique ID. Note that all IDs from Astro's built-in `glob()` loader are slugified."

**实测**（`astro@7.4.12`，五种写法同一份 `src/content/profile/index.md`）：

| `base` | `pattern` | `getCollection()` 得到的 id |
|---|---|---|
| `./src/content/profile` | `**/index.md` | **`["index"]`** |
| `./src/content/profile` | `index.md` | `["index"]` |
| `./src/content/profile` | `**/*.md` | `["index"]` |
| `./src/content` | `profile/index.md` | `["profile"]` |
| `./src/content` | `profile/**/index.md` | `["profile"]` |

附带实测（同一集合，多条目目录式）：`src/content/papers/2024-aa/index.md` → id `2024-aa`；`2025-bb` → `2025-bb`。也就是**「一篇一目录」在 papers / projects / notes 上完全正确，因为 base 之上还有一层目录名**。

frontmatter `slug` 覆盖实测：`profile/index.md` 里写 `slug: me` 后 `getCollection('profile')` 得 `["me"]`，`getEntry('profile','me')` 命中，`getEntry('profile','index')` 返回 `undefined`。

### 对本项目的含义

- **这是本笔记最需要写进工单的一条**：如果 `profile` 集合用 `base: './src/content/profile'` + `pattern: '**/index.md'`，那么 `entry.id` 是 **`"index"`**，`getEntry('profile', 'profile')` **取不到东西**（实测返回 `undefined` 并打印 `Entry profile → profile was not found.`）。正确写法是 `getEntry('profile', 'index')`。
- 想让它读起来像 `'profile'`，有三条**都验证过**的路：① `base: './src/content'` + `pattern: 'profile/**/index.md'`（id = `profile`）；② 在 `profile/index.md` 的 frontmatter 写 `slug: profile`（覆盖成任意你想要的 id）；③ 不用 `getEntry`，直接 `(await getCollection('profile'))[0]`。
- 「一篇一目录」在三个内容集合上仍然是**正确**的选择（实测 `papers/2024-aa/index.md → 2024-aa`）；这个坑**只出现在「集合根目录直接放 index.md」的单条目场景**。工单里应当把单例集合的取法单列一条规则，别让它继承「一篇一目录」的直觉。
- 由于文档对这一层完全空白，任何「Astro 规定 `index` 会被去掉」的表述都是错的；准确说法是「源码里 slug 化时用正则 `/\/index$/` 去尾，只有存在父路径段时才生效」。

---

## 5. `getEntry()` / `getCollection()` 的缺失与空集合语义（B5）

### 结论

证据等级：【官方明文】（`getEntry()` 类型带 `| undefined`、v5 升级说明、错误页的 Deprecated 声明）+【源码】（`runtime.ts` 的两个分支）+【实测】（四种调用逐个验证返回值与日志）。

- **`getEntry()` 在条目不存在时返回 `undefined`**（不抛错），同时打一条 warning：`Entry <collection> → <id> was not found.` 返回类型在官方类型定义里就写着 `| undefined`。
- **`getCollection()` 对「已定义但为空」的集合返回 `[]`**（不报错），并打 warning。
- **`getCollection()` 对「完全没定义过的集合名」也返回 `[]`**（不报错），warning 措辞相同。**这个行为是从「报错」改成「警告」的历史变更**，官方错误页明确标注了 Deprecated。
- 两种情况 warning 文本完全一样，日志上**无法区分**「集合名写错了」和「集合是空的」——这是本项目的真实风险点。
- `getEntry()` 对没定义过的集合名同样返回 `undefined`。

### 引文

`getEntry()` 的类型就带 `undefined`（[astro-content.mdx#L255-L263](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/modules/astro-content.mdx#L255-L263)）：

> "#### `getEntry()`"
> "**Types:**
> * `(collection: CollectionKey, id: string) => Promise<CollectionEntry | undefined>`
> * `({ collection: CollectionKey, id: string }) => Promise<CollectionEntry | undefined>`"

文档示例直接教「检查后用」（[同文件#L267-L276](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/modules/astro-content.mdx#L267-L276)）：

> `if (!enterprisePost) { throw new Error("Could not find the post!"); }`

v5 升级指南（[upgrade-to/v5.mdx#L192-L193](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/upgrade-to/v5.mdx#L192-L193)）：

> "- The `key` argument of `getEntry(collection, key)` is typed as `string`, rather than having types for every entry."
> "- Previously when calling `getEntry(collection, key)` with a static string as the key, the return type was not nullable. **The type now includes `undefined`** so you must check if the entry is defined before using the result or you will have type errors."

「集合不存在」已不再报错（[collection-does-not-exist-error.mdx#L16-L20](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/errors/collection-does-not-exist-error.mdx#L16-L20)）：

> ":::caution[Deprecated]
> Collections that do not exist no longer result in an error. A warning is given instead.
> :::"
> "> A collection queried via `getCollection()` does not exist."

源码：`getCollection()` 的 else 分支（[packages/astro/src/content/runtime.ts#L113-L144](https://github.com/withastro/astro/blob/main/packages/astro/src/content/runtime.ts#L113-L144)）——`hasCollection()` 为真时返回 `result`（空集合即 `[]`），为假时打印 `The collection ... does not exist or is empty.` 并 `return []`；两条路径都不会抛错。

```ts
const hasFilter = typeof filter === 'function';
const store = await globalDataStore.get();
if (await store.hasCollection(collection)) {
	const result = [];
	for (const rawEntry of await store.values<DataEntry>(collection)) { ... result.push(entry); }
	return result;                                   // ← 空集合走到这里，返回 []
} else {
	logger.warn('content', `The collection ${JSON.stringify(collection)} does not exist or is empty. Please check your content config file for errors.`);
	return [];                                       // ← 未定义集合：同样返回 []
}
```

源码：`getEntry()` 取不到时（[同文件#L210-L217](https://github.com/withastro/astro/blob/main/packages/astro/src/content/runtime.ts#L210-L217)）：

```ts
const store = await globalDataStore.get();
if (await store.hasCollection(collection)) {
	const entry = await store.get<DataEntry>(collection, lookupId);
	if (!entry) {
		logger.warn('content', `Entry ${collection} → ${lookupId} was not found.`);
		return;                                      // ← undefined
	}
	...
}
return undefined;
```

**实测**（`astro@7.4.12`）：

| 调用 | 返回 | 日志 |
|---|---|---|
| `getEntry('profile', 'nope')` | `undefined` | `Entry profile → nope was not found.` |
| 已定义但目录为空的 `emptyglob` 集合 | `[]`（`Array.isArray` = `true`，len 0） | `The collection "emptyglob" does not exist or is empty. …` |
| `getCollection('neverDefined')` | `[]` | `The collection "neverDefined" does not exist or is empty. …` |
| `file()` 加载的 `[]` | `[]` | `[file-loader] No items found in src/data/empty.json` |

### 对本项目的含义

- **每条 `getEntry()` 都必须显式判空并给出降级**（工单里的「降级规则」有官方依据了）：条目缺失不是构建错误，而是 `undefined` + 一条容易被淹没的 warning。如果模板直接写 `profile.data.title`，缺条目时会在**渲染期**炸成 `Cannot read properties of undefined`，错误信息远离根因。
- **「集合名写错」和「集合是空的」在日志里长得一模一样**，所以工单里应当要求：每个集合至少放一个 fixture（哪怕 `draft` 占位），否则「忘记建目录」这类事故会被 `[]` 静默吞掉。
- `getCollection()` 永远返回数组，所以「首页最新 N 条」的分页/切片代码**不需要 try/catch**，只需要处理 `length === 0` 的空态；而 `getEntry()` 必须 `if (!entry)`。
- 由于空集合与未定义集合同返回 `[]`，「`profile` 集合被误删」不会让构建失败，只会让首页介绍区变空——这正是「降级规则」必须显式定义的原因。

---

## 6. `getCollection()` 的返回顺序（B6）

### 结论

证据等级：【官方明文】（两处原话）+【源码】（`sortCollections` 的 `localeCompare`）+【实测】（3 次 build + 1 次 dev + file loader 数组顺序，全部一致）。

- **官方原话仍在，最新版没变**：`The sort order of generated collections is non-deterministic and platform-dependent.` 出现在两处——content collections 指南（现行）与 v5 升级指南（历史变更说明）。
- **但 7.4.12 的源码里，写盘前会把集合与条目按 key 排序**（`localeCompare`），这让「同一台机器、同一批文件」的实测输出看起来是**稳定的 id 升序**。我连跑 3 次 build + 1 次 dev，顺序完全一致。
- 这两件事**不矛盾**：官方承诺的是**没有顺序保证**，源码做的是**写盘确定性**（为了让序列化字符串与 content hash 跨构建稳定）。`localeCompare` 本身依赖 ICU/locale，这正是文档里「platform-dependent」的字面含义——换构建机（EdgeOne 的容器镜像、不同 Node 小版本、不同 ICU）理论上可能排出不同顺序。
- 结论：**不能把「实测顺序 = id 升序」当契约**。凡是要顺序的地方必须自己 `.sort()`。

### 引文

指南原话（[content-collections.mdx#L450](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L450)）：

> "The sort order of generated collections is non-deterministic and platform-dependent. This means that if you are calling `getCollection()` and need your entries returned in a specific order (e.g. blog posts sorted by date), you must sort the collection entries yourself:"

v5 升级指南里的同一条（[upgrade-to/v5.mdx#L190](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/upgrade-to/v5.mdx#L190)）：

> "- Sort order of generated collections is non-deterministic and platform-dependent. This means that if you are calling `getCollection()`, the order in which entries are returned may be different than before. If you need a specific order, you must sort the collection entries yourself."

源码里写盘排序（[packages/astro/src/content/data-store-writer.ts#L30-L56](https://github.com/withastro/astro/blob/main/packages/astro/src/content/data-store-writer.ts#L30-L56)）：

```ts
/**
 * Sort collections and their entries by key.
 *
 * Entry insertion order can vary between builds due to concurrent file
 * processing (pLimit), so sorting here guarantees stable output regardless of
 * processing order. Stable output keeps serialized strings (and the content
 * hashes derived from them) deterministic across builds.
 */
function sortCollections(collections: Map<string, Map<string, any>>): Map<string, Map<string, any>> {
	return new Map(
		[...collections.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, collection]) => [key, new Map([...collection.entries()].sort(([a], [b]) => a.localeCompare(b)))]),
	);
}

export function serializeDataStore(collections: Map<string, Map<string, any>>): string {
	return devalue.stringify(sortCollections(collections));
}
```

同文件注释也点明「插入顺序会因为 `pLimit` 并发处理而变化」——即内存中的插入顺序确实是不确定的。

**实测**（`astro-verify-order`，40 个条目 `01-item` … `40-item`，以及后来换成 `zz-last` / `aa-first` / `mm-mid`）：

- 3 次 `astro build` 输出顺序完全一致，均为 `01-item,02-item,…,40-item`；
- `astro dev` 请求首页，输出 `aa-first,mm-mid,zz-last`（即目录创建顺序 `zz-last,aa-first,mm-mid` 被按 id 排序了）；
- 另一次 `file()` loader 实测：JSON 数组写 `[zeta, alpha, mike]`，`getCollection()` 返回 `alpha, mike, zeta`——**数组里的书写顺序也不保留**。

### 对本项目的含义

- 工单里「首页取最新 N 条」**必须**写成「先 `.sort()` 再 `.slice(0, N)`」，不能写成「`getCollection()` 前 N 条」。后者在本地看着对（因为恰好是 id 升序），在 EdgeOne 构建机上没有保证。
- 更隐蔽的一点：**`file()` 的数据同样不保留书写顺序**。如果打算把「首页四栏的展示顺序」写进一个 JSON 数组靠顺序承载，那是不可靠的；顺序必须落到显式字段（如 `order: 1`）再排序。
- 实测发现「id 升序」这件事可以当**调试线索**（看到乱序就知道有并发/排序问题），但不能当**契约**。

---

## 7. `Array.prototype.sort` 的稳定性（C7）

### 结论

证据等级：【官方明文】（ECMA-262 规范条文、V8 官方博客、MDN）+【实测】（node 24 上 40 / 5000 元素的稳定性验证）。

- **ES2019 起规范强制要求 `Array.prototype.sort` 是稳定排序**。规范原文的三条约束里，第三条字面就是稳定性的定义：「若两元素比较结果为 0，则排序后它们的相对次序不变；i.e., the sort is stable」。
- 该改动来自 TC39 PR [tc39/ecma262#1340](https://github.com/tc39/ecma262/pull/1340)（V8 官方博客明确记录）；`%TypedArray%.prototype.sort` 随后由 [#1433](https://github.com/tc39/ecma262/pull/1433) 一并稳定。
- **V8 从 7.0 起稳定**（Chrome 70，2018-10），此前 >10 个元素走不稳定 QuickSort，之后改为 TimSort。**Node.js 从 12 起稳定**（V8 官方 feature-support 表里 nodejs 一栏写的就是 `12`）。
- **稳定性对「多级排序只写第一级键、靠稳定性兜住第二级」意味着什么**：稳定性只保留**元素进入 `sort()` 那一刻的相对次序**。它**不会**读取任何第二级字段，也**不会**替你记住「上一次排序的结果」。所以：
  - 先在**你自己控制、且第一级键构成全序**的数组上排一遍，再排第二遍、只比较第一级键 → 依赖稳定性**成立**（这是 ES2019 后规范的合法保证）。在 Astro 里，`entry.id` 集合内唯一，所以「先 `.sort(byId)` 再 `.sort(byDate)`」在数学上是对的。
  - 直接对 `getCollection()` 的**原始返回值**只写一级比较器 → **不稳定**。因为进入 `sort()` 的初始顺序是「非确定性且平台相关」的（第 6 条），稳定性只是把这个随机顺序原样保留下来。**这是本笔记最容易被误用的一条。**
  - 更省心的是**单个比较器写全所有键**（显式多级），这样不依赖任何前置排序，也不怕后来有人改坏前面那一步。

### 引文

ECMA-262 现行规范，`Array.prototype.sort` 条款里的排序约束（[tc39/ecma262 `spec.html`#L41339-L41350](https://github.com/tc39/ecma262/blob/main/spec.html#L41339-L41350)，即 `tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort`）：

> "Unless the sort order is specified to be implementation-defined, it must satisfy all of the following conditions:"
> "- There must be some mathematical permutation π of the non-negative integers less than _itemCount_, such that for every non-negative integer _j_ less than _itemCount_, the element _old_[_j_] is exactly the same as _new_[π(_j_)]."
> "- Then for all non-negative integers _j_ and _k_, each less than _itemCount_, if ℝ(_sortCompare_(_old_[_j_], _old_[_k_])) < 0, then π(_j_) < π(_k_)."
> "- And for all non-negative integers _j_ and _k_ such that _j_ < _k_ < _itemCount_, if ℝ(_sortCompare_(_old_[_j_], _old_[_k_])) = 0, then π(_j_) < π(_k_)**; i.e., the sort is stable.**"

同条款还定义了 `consistent comparator`（同一对输入必须返回同一个非 NaN Number，且满足自反/对称/传递），并说明**比较器不一致时排序结果就是 implementation-defined 的**：

> "The sort order is implementation-defined if _sortCompare_ is not a consistent comparator for the elements of _items_."

V8 官方博客（[v8.dev `src/features/stable-sort.md`#L48-L70](https://github.com/v8/v8.dev/blob/main/src/features/stable-sort.md#L48-L70)）：

> "For a long time, the JavaScript spec didn't require sort stability for `Array#sort`, and instead left it up to the implementation."
> "In practice, the situation was even more infuriating, since some JavaScript engines would use a stable sort for short arrays and an unstable sort for larger arrays."
> "But there's some good news. We [proposed a spec change](https://github.com/tc39/ecma262/pull/1340) that makes `Array#sort` stable, and it was accepted. All major JavaScript engines now implement a stable `Array#sort`."
> "**Note:** Although stability is now required per spec, JavaScript engines are still free to implement whatever sorting algorithm they prefer. V8 uses Timsort, for example. The spec does not mandate any particular sorting algorithm."

同一篇的 feature-support 表（[#L74-L88](https://github.com/v8/v8.dev/blob/main/src/features/stable-sort.md#L74-L88)）：

> `chrome="70 /blog/v8-release-70#javascript-language-features"` / `firefox="yes"` / `safari="yes"` / **`nodejs="12"`** / `babel="yes"`（针对 `Array.prototype.sort`）
> `chrome="74"` / `firefox="67"` / `safari="yes"` / **`nodejs="12"`**（针对 `%TypedArray%.prototype.sort`）

V8 release v7.0 公告（[`src/blog/v8-release-70.md`#L28](https://github.com/v8/v8.dev/blob/main/src/blog/v8-release-70.md#L28)）：

> "`Array.prototype.sort` is now stable in V8 v7.0. Previously, V8 used an unstable QuickSort for arrays with more than 10 elements. Now, we use the stable TimSort algorithm."

MDN（[mdn/content `array/sort/index.md`#L263-L265](https://github.com/mdn/content/blob/main/files/en-us/web/javascript/reference/global_objects/array/sort/index.md#L263-L265)）：

> "### Sort stability"
> "Since version 10 (or ECMAScript 2019), the specification dictates that `Array.prototype.sort` is stable."

**实测**（`node v24.18.0`，V8 `13.6.233.17-node.50`）：40 个与 5000 个「同 key 不同 seq」的元素各排一次，两次都保持原 `seq` 递增（`stable(40): true` / `stable(5000): true`）；`sort()` 原地修改（返回值与入参同一引用）。

### 对本项目的含义

- 「首页四栏各取最新 N 条」如果写成 `.sort((a,b) => b.data.date - a.data.date)`，**同一天的多篇之间顺序仍然不稳定**——不是因为 `sort` 不稳定，而是因为进 `sort()` 的顺序（`getCollection()` 的输出）本来就没有保证。要稳定就得把第二级键写进比较器，例如 `b.date - a.date || a.id.localeCompare(b.id)`。
- 「先按 id 排一遍、再按日期排」这种「靠稳定性兜底」的写法**在本项目里确实成立**，但有前提：第一次排序必须是**全序**（任意两条比较都不为 0）。`entry.id` 在一个集合内唯一（第 4 条），所以按 id 排序满足这个前提；第二遍按日期排序时，日期相同的条目会保留 id 升序。**但这依赖「两次排序 + 稳定性」三个条件同时成立**，任何人后来把第一遍改成「按 title 排」（title 可能重复）就静默退化。所以更稳的写法仍是**单个比较器里写全所有键**，不依赖中间排序。
- `sort()` 原地修改，`getCollection()` 返回的是每次新构造的数组，所以 `.sort()` 不会污染数据层；但**不要**把 `getCollection()` 的结果存进模块级变量再在别处 `.sort()`，那会全局互相影响。

---

## 8. 「取前 N 条 / 按字段排序」有没有官方 helper（D8）

### 结论

证据等级：【官方明文】（`astro:content` 导出清单、`getCollection()` 签名、`paginate()` 的定位与参数）+【源码】（`paginate.ts` 的 `PageNumberParamNotFound` 抛错、`route-cache.ts` 的注入点、`PaginateOptions` 类型）+【实测】（对象 filter 被忽略）。

- **没有**。`astro:content` 的导出清单里**只有** `defineCollection` / `defineLiveCollection` / `getCollection` / `getLiveCollection` / `getEntry` / `getLiveEntry` / `getEntries` / `reference` / `render` 九个；**没有任何排序、limit、slice、pluck 类 helper**。`getCollection()` 的第二个参数只是一个**布尔谓词过滤器**（按 `id` / `data` 过滤），不接受 `sort` / `limit` / `orderBy` 之类选项。
- 附带一条实测：`getCollection()` 的 filter **只认函数**。传对象（`getCollection('p', { id: 'a' })`）既不报错也不过滤，返回全集；写成函数 `(e) => e.id === 'a'` 才生效。源码里内部类型虽然写着 `((entry: any) => unknown) | Record<string, unknown>`，但 `const hasFilter = typeof filter === 'function'` 直接把对象形态废掉了。
- `paginate()` **不是** `astro:content` 的导出，它是 `getStaticPaths()` 的**上下文参数**，签名在 `GetStaticPathsOptions` 里。它**只能在 `getStaticPaths()` 内调用**，用途是「把数组切成多页并生成对应的路由数组」，返回的是 `{ params, props }[]`（要交给 `getStaticPaths()` 返回的东西），**不是**数据切片。
- `paginate()` 能不能用来「只要前 N 条」：**不能**。① 它必须配 `[page].astro` / `[...page].astro` 这类**带 `page` 参数的路由文件**，否则直接抛 `PageNumberParamNotFound`；② 它的返回值是「N 个路由」而不是「N 条数据」，即便 `pageSize` 设成 N，你拿到的也是 `props.page.data`，且会**额外生成 `/2`、`/3`… 这些页面**。首页要的是「一个页面里显示前 N 条」，用 `paginate()` 等于凭空造出一堆分页路由。
- 所以「取最新 N 条」在本项目里就是 **`await getCollection(...)` → `.sort(全比较器)` → `.slice(0, N)`**，纯 JavaScript，无官方 helper。

### 引文

`astro:content` 的完整导出（[astro-content.mdx#L23-L37](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/modules/astro-content.mdx#L23-L37)）：

> ```js
> import {
>   defineCollection,
>   defineLiveCollection,
>   getCollection,
>   getLiveCollection,
>   getEntry,
>   getLiveEntry,
>   getEntries,
>   reference,
>   render
> } from 'astro:content';
> ```

`getCollection()` 的签名（[同文件#L201-L211](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/modules/astro-content.mdx#L201-L211)）：

> "**Type:** `(collection: CollectionKey, filter?: (entry: CollectionEntry) => boolean) => CollectionEntry[]`"
> "A function that retrieves a list of content collection entries by collection name."
> "It returns all items in the collection by default, and accepts an optional `filter` function to narrow by entry properties."

`paginate()` 的定位（[routing-reference.mdx#L210-L255](https://github.com/withastro/docs/blob/main/src/content/docs/en/reference/routing-reference.mdx#L210-L255)）：

> "A function that **can be returned from [`getStaticPaths()`](#getstaticpaths)** to divide a collection of content items into separate pages."
> "`paginate()` will automatically generate the necessary array to return from `getStaticPaths()` to create one URL for every page of your paginated collection. The page number will be passed as a `param`, and the page data will be passed as a `page` prop."
> "`paginate()` has the following arguments:
> - `data` - array containing the page's data passed to the `paginate()` function
> - `options` - Optional object with the following properties:
>   - `pageSize` - The number of items shown per page (`10` by default)
>   - `params` - Send additional parameters for creating dynamic routes
>   - `props` - Send additional props to be available on each page
>   - `format` - **Since v7.1.0.** A function that allows you to manipulate the computed URLs before being rendered."
> "`paginate()` assumes a file name of `[page].astro` or `[...page].astro`."

源码：`paginate()` 必须能识别 `page` 参数，否则抛错（[packages/astro/src/core/render/paginate.ts#L24-L45](https://github.com/withastro/astro/blob/main/packages/astro/src/core/render/paginate.ts#L24-L45)，节选）：

```ts
const pageSize = _pageSize || 10;
const paramName = 'page';
if (routeMatch.params.includes(`...${paramName}`)) { includesFirstPageNumber = false; }
else if (routeMatch.params.includes(`${paramName}`)) { includesFirstPageNumber = true; }
else { throw new AstroError({ ...AstroErrorData.PageNumberParamNotFound, ... }); }
const lastPage = Math.max(1, Math.ceil(data.length / pageSize));
```

它只在 `getStaticPaths()` 的上下文里被注入（[packages/astro/src/core/render/route-cache.ts#L98-L103](https://github.com/withastro/astro/blob/main/packages/astro/src/core/render/route-cache.ts#L98-L103)）：`mod.getStaticPaths({ paginate: generatePaginateFunction(route, base, trailingSlash), routePattern: route.route })`。

`PaginateOptions` 的类型定义（[packages/astro/src/types/public/common.ts#L39-L59](https://github.com/withastro/astro/blob/main/packages/astro/src/types/public/common.ts#L39-L59)）：`pageSize` / `params` / `props` / `format`——**没有** `offset`、`take`、`limit`。

### 对本项目的含义

- 工单里的「首页取最新 N 条」不要引入 `paginate()`。它是路由分页设施，用在首页会额外产出 `/2`、`/3` 路由，而且要求首页文件名变成 `[...page].astro`——这与「URL 目录式 + 强制手填 slug」的既定决定正面冲突。
- 「取前 N 条」是**纯 JS 三行**：`getCollection` → 全比较器 `sort` → `slice(0, N)`。它没有官方封装，所以**必须写进工单的代码规范**（否则每个栏位各写一套，比较器写不全会退化成依赖乱序）。
- `getCollection()` 的 `filter` 只在**谓词**层面有用（比如过滤 `draft`），不能做排序与截断；如果工单想「只取 N 条以减少构建开销」，注意 `getCollection()` 仍然是**全量**读写，`slice` 只是渲染层截断。

---

## 9. 首页「最新几篇」的官方范式（D9）

### 结论

证据等级：**「文档里没有专门 recipe」是穷举结论**（en recipes 21 篇内容页全列过）；「官方示例代码里有完整范式」是【源码】（`examples/portfolio/src/pages/index.astro`）；「文档只承载排序那一半」是【官方明文】。

- **官方文档里没有「首页显示最新 N 篇」的专门范式/recipe**。en `recipes/` 21 篇内容页里没有这一篇；`content-collections.mdx` 只给了「如何排序」（不含截断），`imports.mdx` 在讲 `import.meta.glob()` 时给过 `posts.slice(0, 5)`（那是 glob 导入路径，不是 content collections 路径）。
- **但官方示例仓库里有完整范式，而且就是首页**：`examples/portfolio` 的 `src/pages/index.astro` 第 16–19 行，注释写着 `// Content Fetching: List four most recent work projects`，代码是 `.sort(按日期降序).slice(0, 4)`。这是 `withastro/astro` 仓库里的**官方 example**，可用 `npm create astro@latest -- --template portfolio` 取用，属于 first-party 代码。
  - 需要注意它**不在** `create astro` 向导的四个内置模板里（向导只给 `basics` / `blog` / `starlight` / `minimal`，见 [create-astro/src/actions/template.ts#L63-L66](https://github.com/withastro/astro/blob/main/packages/create-astro/src/actions/template.ts#L63-L66)）；「官方 example 可通过 `--template <example-name>` 取用」的出处是 [install-and-setup.mdx#L120-L133](https://github.com/withastro/docs/blob/main/src/content/docs/en/install-and-setup.mdx#L120-L133)。
- 另有官方 blog 模板的**列表页**范式：`examples/blog/src/pages/blog/index.astro` 的 `.sort((a,b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())`（不截断）。
- 所以准确表述是：**「取最新 N 条」的官方范式只存在于官方示例代码里（portfolio 模板），文档正文只承载「排序」这一半。**

### 引文

官方 portfolio 示例（[examples/portfolio/src/pages/index.astro#L16-L19](https://github.com/withastro/astro/blob/main/examples/portfolio/src/pages/index.astro#L16-L19)）：

```astro
// Content Fetching: List four most recent work projects
const projects = (await getCollection('work'))
	.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf())
	.slice(0, 4);
```

同文件把结果渲染成一个 section（[#L58-L81](https://github.com/withastro/astro/blob/main/examples/portfolio/src/pages/index.astro#L58-L81)）：`<h3>Selected Work</h3>` + `{projects.map((project) => (<li><PortfolioPreview project={project} /></li>))}` + 一个指向 `/work/` 的 `View All` 链接——即「首页只放 N 条 + 全量列表页在别处」的结构。

官方 blog 示例的列表页排序（[examples/blog/src/pages/blog/index.astro#L10-L12](https://github.com/withastro/astro/blob/main/examples/blog/src/pages/blog/index.astro#L10-L12)）；文档正文里与之等价的片段见 [content-collections.mdx#L452-L460](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/content-collections.mdx#L452-L460)：

```astro
const posts = (await getCollection('blog')).sort(
	(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);
```

`import.meta.glob()` 路径下的 `slice(0, 5)`（[imports.mdx#L214-L225](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/imports.mdx#L214-L225)）——注意这是 **glob 导入**路径，不是 content collections 路径，不能直接照搬到 `getCollection()` 上：`<!-- Renders an <article> for the first 5 blog posts -->` + `{ posts.slice(0, 5).map((post: any) => ( ... )) }`。

**最小可抄代码**（本项目可直接落地，已按第 6/7 条加固比较器）：

```astro title="src/pages/index.astro"
---
import { getCollection } from 'astro:content';

// 全比较器：日期降序，同日期按 id 升序（不依赖 sort 稳定性兜底）
const byNewestFirst = (a, b) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id);

const HOME_LIMIT = 3;
const latestPapers   = (await getCollection('papers')).sort(byNewestFirst).slice(0, HOME_LIMIT);
const latestProjects = (await getCollection('projects')).sort(byNewestFirst).slice(0, HOME_LIMIT);
const latestNotes    = (await getCollection('notes')).sort(byNewestFirst).slice(0, HOME_LIMIT);
---
```

（`pubDate` 用 `z.coerce.date()` 定义时是 `Date` 实例，`valueOf()` 直接可用；若用 `z.string()` 存日期，则比较器要改成字符串比较——`YYYY-MM-DD` 定长格式下字典序等价于时间序，但混入非定长写法就不成立。）

### 对本项目的含义

- 「首页取最新几条怎么排」可以直接照着官方 portfolio 首页的骨架写，**不需要自创**；唯一需要加的是两条加固：① 比较器写全（第 7 条）；② 每个栏位独立 `slice`，不要共享一个排好序的中间数组再切（避免某个集合为空时把别的栏位带崩）。
- 官方范式里**没有**「首页降级」的任何代码——`projects` 为空时官方示例只是渲染出空 section，没有占位文案、没有兜底。所以「降级规则」是本项目自定的部分，不能引官方为依据；有依据的只有「空集合返回 `[]`、缺条目返回 `undefined`」（第 5 条），降级策略要在这两个返回值上自己写。
- 官方 portfolio 用的是 `publishDate`，blog 用的是 `pubDate`，两个示例连字段名都不统一——说明**字段名是本项目自定的**，工单里定 `pubDate` 后三个集合必须一致，否则「首页取最新」没法用同一个比较器。

---

## 仍未决 / 需人工核对

1. **单例集合的 id 取值（第 4 条）需要拍板**：是用 `base: './src/content' + pattern: 'profile/**/index.md'` 得到 `profile`，还是接受 `'index'`，还是在 frontmatter 写 `slug: profile`。三条都实测可用，但这是**约定选择**，不是事实问题。建议直接写进工单，避免后续「一篇一目录」的直觉被误套。同类的设计决定还有「`profile` 单条目集合 vs 常量模块的取舍」（第 2、3 条已说明官方无明确条款），本笔记只提供事实与两侧代价，不代替产品判断。
2. **`localeCompare` 在 EdgeOne 构建容器里的排序结果**：本机（node 24.18.0 / ICU 默认 locale）实测是稳定 id 序，但**未验证**构建机镜像的 ICU 与 locale 是否一致。这属于【需实测】：需要一次真实 EdgeOne 构建，把 `getCollection()` 的 id 序列打进构建日志对比。**目前未验证**，不能声称「跨环境顺序一致」。
3. **`file()` loader 在 dev 模式下的热更新行为**：源码里有 `watcher.on('change')`，但 dev 下改 JSON 是否立刻反映、以及是否清空整个集合（`store.clear()`），**未实测**。若工单要求「改 JSON 立刻能看到」，需实测确认。
4. 未查到一手出处的地方：**「站点级单例数据该放哪」没有任何官方条款**（en 430 mdx 穷举 0 命中 `singleton` / `consts`）；**「`index` 段会被 strip」没有任何官方文档说明**（源码 + 测试 + 实测三层有，文档层空白）；**「首页最新 N 条」没有官方 recipe**（只有官方示例代码）。这三处如需在工单里引用，请按【源码】/【实测】/【示例代码】标注，不要标成【官方明文】。
