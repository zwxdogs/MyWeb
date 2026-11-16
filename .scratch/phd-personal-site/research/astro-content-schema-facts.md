# Astro Content Collections 字段模型的事实核查（papers / projects / notes）

> 抓取与实测日期 2026-11-15。判定基准版本：`astro` **7.4.12**（当前 npm `latest`）。
>
> 只采用一手来源：Astro 官方文档仓库 `withastro/docs` 的英文 mdx 源文件、Astro 源码仓库 `withastro/astro` 的 `packages/` 源码与测试断言、以及**本机实跑**（临时目录里 `npm install astro@7.4.12` 建的验证项目）。
> 二手博客、AI 摘要、搜索引擎片段一律未采用。

## 本笔记回答的问题

在建 `papers` / `projects` / `notes` 三个集合之前，需要把下面 9 件事钉死，避免模型设计建立在猜测上：

1. 当前稳定大版本号；v5 之后 content collections 配置文件的**确切路径与文件名**（`src/content.config.ts` 还是 `src/content/config.ts`，两者是否都还支持）；`defineCollection` + `glob()` 的现行最小写法。
2. `z` 从哪导入；`image()` 辅助函数从哪来（是不是 `astro:schema`）；它接受什么字符串、图片必须放哪个目录、返回值 `ImageMetadata` 有哪些字段、路径不存在时是否构建报错。
3. `image()` 能否放进数组；`z.array(z.object({ src: image(), alt: z.string() }))` 这种「图 + 说明」写法官方支不支持。
4. 正文怎么取：`entry.body` 在 v5+ 是否存在；`render(entry)` 返回什么；同一篇能否既渲染正文又在列表页用摘要。
5. Astro 有没有内置 excerpt/摘要能力（明确「有/没有」）。
6. `draft` 字段的官方推荐写法、构建时过滤的原文示例、草稿是否会在 `getStaticPaths()` 里生成页面。
7. `z.coerce.date()` 与 `z.string()` 的后果差异：`date: 2026-11-15` 会被解析成什么、用什么排序、页面怎么格式化。
8. `.optional()` 与 `.default()` 的行为差异；`z.string().optional()` 在模板里的类型。
9. 同一集合内 `slug`（即 `entry.id`）唯一性：Astro 会不会自动检测？两个文件写同一个 `slug` 会怎样——报错、静默覆盖、还是谁赢？

## 限制（哪些页面没抓全文、怎么绕过的）

- **`docs.astro.build` 没抓到**。本机把它解析到私有地址，`web_fetch` 被 SSRF 防护拦截，`https://docs.astro.build/...` 一律拿不到正文。**替代路径**：官方文档仓库 `withastro/docs`（docs.astro.build 就是由这些 mdx 渲染发布的，同一手来源）。做法是先抓 `raw.githubusercontent.com` 上的单个 mdx，再整包下载 `withastro/docs` main 分支 tarball（2653 个 mdx）做全库 grep，避免只靠单文件漏掉证据。
- **`pages.edgeone.ai` 等平台文档没抓**（与本题无关，属另一张票的范围）。
- **`astro.build/blog/...` 博客正文没抓**（属官方博客，但本笔记的结论都不依赖它；有引用处会显式标注）。
- **`api.github.com/search/code` 用不了**（需鉴权，返回 401）。改用 `git/trees/main?recursive=1` 拿全量文件清单定位路径，再抓 `raw.githubusercontent.com` 单文件；源码仓库同样整包下载 tarball 到本地 grep。
- 少数跨平台文件名在解包时报错（`special-“characters”`、中文文件名、两个 symlink fixture），**与本次结论无关**。
- 除文档/源码外，本笔记的「实测」全部来自 `%TEMP%\astro-verify` 这个一次性项目（`astro@7.4.12` + `node v24.18.0`），跑完即弃，**未触碰仓库任何文件**。

## 核查方法与证据分级

本笔记每条结论标注证据级别，请按此权衡：

- **【文档】**：官方文档 mdx 原文（可直接引用措辞）。
- **【源码】**：`withastro/astro` 的实现代码（比文档更权威，但官方未把它当契约承诺）。
- **【测试】**：官方仓库的 fixture + 断言（官方承认的行为，往往覆盖文档没写的边角）。
- **【实测】**：我在本机 7.4.12 上跑出来的结果（可复现，但版本绑定）。

---

## 1. 版本号与配置文件路径

### 结论

- 当前稳定大版本是 **Astro 7**，最新版 **7.4.12**（2026-11-13 发布）。v5、v6 都已是历史版本。
- 配置文件的**唯一官方位置**是 **`src/content.config.ts`**（同级也支持 `.js` / `.mjs` / `.mts`）。
- **`src/content/config.ts` 在 v7 已不再自动生效**：单独存在时会直接抛 `LegacyContentConfigError` 让构建失败。它只在 `legacy.collectionsBackwardsCompat: true` 这个**临时迁移开关**下才被接受。所以「两者是否都还支持」的准确答案是：**`src/content.config.ts` 是唯一正常路径；旧路径只在显式打开 legacy 开关时可用，且官方明说是临时 helper**。
- `defineCollection()` 是唯一入口；每个集合**必须**有 `loader`（`type` 字段已废弃）；`glob()` 来自 `astro/loaders`。

### 引文

版本号（[packages/astro/package.json](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/package.json)）：

> `"name": "astro",` / `"version": "7.4.12"`

npm registry（[registry.npmjs.org/astro](https://registry.npmjs.org/astro)）：`dist-tags.latest = 7.4.12`，`time['7.4.12'] = 2026-11-13T19:02:02.073Z`。

配置位置（[guides/content-collections.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/content-collections.mdx)）：

> "All of your build-time content collections are defined in a special `src/content.config.ts` file (`.js` and `.mjs` extensions are also supported) using `defineCollection()`, and then a single collections object is exported for use in your project."

v5 升级指南（[guides/upgrade-to/v5.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/upgrade-to/v5.mdx)）：

> "1. **Move the content config file**. This file no longer lives within the `src/content/` folder. This file should now exist at `src/content.config.ts`."

> "Additionally, temporary backwards compatibility exists for keeping the content config file in its original location of `src/content/config.ts`."

v6 升级指南（[guides/upgrade-to/v6.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/upgrade-to/v6.mdx)）：

> "Astro v6.0 removes this automatic legacy content collections support, along with [the `legacy.collections` flag](#removed-legacy-content-collections). All content collections must now use [the Content Layer API introduced in Astro v5.0](https://astro.build/blog/content-layer-deep-dive/) that powers all content collections."

该开关只保留这几件事（同上，`legacy.collectionsBackwardsCompat`）：

> "- Supports the legacy configuration file `src/content/config.ts`"
> "**This is a temporary migration helper.** Migrate your collections to the Content Layer API as soon as possible, then disable this flag."

源码层的判定顺序（[packages/astro/src/content/utils.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/utils.ts)）：

```ts
function searchConfig(fs, srcDir) {
  const paths = ['content.config.mjs','content.config.js','content.config.mts','content.config.ts'];
  return search(fs, srcDir, paths);
}
function searchLegacyConfig(fs, srcDir) {
  const paths = ['content/config.ts','content/config.js','content/config.mjs','content/config.mts'];
  return search(fs, srcDir, paths);
}
```

且 `getContentPaths()` 里，找不到 `content.config.*` 但找到 `content/config.*` 时：

```ts
if (!legacyCollectionsBackwardsCompat) {
  throw new AstroError({ ...AstroErrorData.LegacyContentConfigError, message: ... });
}
```

对应错误页（[reference/errors/legacy-content-config-error.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/errors/legacy-content-config-error.mdx)）：

> "Found legacy content config file in "src/content/config.ts". Please move this file to "src/content.config.ts" and ensure each collection has a loader defined."
> "A legacy content config file was found. Move the file to `src/content.config.ts` and update any collection definitions if needed."

**【实测】** 把 `src/content.config.ts` 改名成 `src/content/config.ts` 后构建：

```
[LegacyContentConfigError] Found legacy content config file in "src\content\config.ts". Please move this file to "src/content.config.ts" ...
exit=1
```

加上 `legacy: { collectionsBackwardsCompat: true }` 后该错误消失（能继续走到后续编译阶段）。

### 最小可抄代码（现行写法）

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const papers = defineCollection({
  loader: glob({ base: './src/content/papers', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { papers };
```

官方同款（content-collections.mdx，注意注释是原文）：

```ts
// 1. Import utilities from `astro:content`
import { defineCollection } from 'astro:content';
// 2. Import loader(s)
import { glob, file } from 'astro/loaders';
// 3. Import Zod
import { z } from 'astro/zod';
// 4. Define a `loader` and `schema` for each collection
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
});
// 5. Export a single `collections` object to register your collection(s)
export const collections = { blog };
```

### 对本项目的含义

一律用 `src/content.config.ts`，别碰 `src/content/config.ts`，也不要在 `astro.config.mjs` 开 legacy 开关——那只是给从 v4 迁移过来的人用的临时口子。

---

## 2. `z` 与 `image()` 的导入来源与行为

### 结论

- **`z` 从 `astro/zod` 导入**（Zod v4 的再导出）。`astro:schema` 与「从 `astro:content` 拿 `z`」在 v6 起被官方标记为 deprecated，正确写法只有 `astro/zod`。**【实测】** 7.4.12 下三种写法都仍能构建成功、也不打 deprecation 警告（废弃≠报错），但不要主动用旧的。
- **`image()` 不需要 import，也从来不是从 `astro:schema` 或 `astro:content` 导入的**。它是 `schema` 的**函数形态**注入的上下文参数：`schema: ({ image }) => z.object({...})`。类型层面叫 `SchemaContext`；`schema` 写成对象时就没有 `image()` 可用。
- `image()` **接受一个字符串**：相对**当前条目文件所在目录**的图片路径（不是相对项目根、也不是相对 `src/`）。文档原文的注释写得很直白：`cover: "./firstpostcover.jpeg"` 会解析成 `src/content/blog/firstpostcover.jpeg`。
- 图片**必须放在 `src/` 下**（能被 Astro 作为模块 import 的那棵树里；`src/content/`、`src/assets/` 都可以）。**`public/` 的绝对路径不行**——【实测】`cover: /img/pub.png` 直接 `[ImageNotFound]` 构建失败。文档只在「custom loader 没有 `filePath`」时提到 `image()` 字段会被当作 public path 处理，`glob()` 会提供 `filePath`，所以不适用。
- 返回值是 **`ImageMetadata`**：`{ src: string; width: number; height: number; format: ImageInputFormat; orientation?: number }`。**`src` 是构建后的资源路径**（【实测】`/_astro/cover.CB-FUXe_.png`），不是原始相对路径；`orientation` 只在图片元数据里有该信息时才出现（【实测】普通 PNG 的键恰好是 `src,width,height,format` 四个）。
- **路径不存在 = 构建失败**（不是警告、不是静默跳过）：抛 `ImageNotFound`，`fatal: true`。

### 引文

`z` 的来源（[guides/content-collections.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/content-collections.mdx)）：

> "To use Zod in Astro, import the `z` utility from `"astro/zod"`. This is a re-export of the Zod library, and it supports all of the features of Zod 4."

废弃说明（[guides/upgrade-to/v6.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/upgrade-to/v6.mdx)）：

> "In Astro 5.x, `astro:schema` was introduced as an alias of `astro/zod`. `z` was also exported from `astro:content` for convenience. However this occasionally created confusion for users who were unsure about where they should be importing from."
> "Astro 6.0 deprecates `astro:schema` and `z` from `astro:content` in favor of `astro/zod`."

```ts del={1} ins={2}
import { z } from "astro:schema"
import { z } from "astro/zod"
```

`SchemaContext`（[reference/modules/astro-content.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/modules/astro-content.mdx)）：

> "The `context` object that `defineCollection` uses for the function shape of `schema`. This type can be useful when building reusable schemas for multiple collections."
> "This includes the following property: - `image` - The `image()` schema helper that allows you [to use local images in Content Collections](/en/guides/images/#images-in-content-collections)"

源码类型（[packages/astro/src/content/config.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/config.ts)）：

```ts
// This needs to be in sync with ImageMetadata
type ImageFunction = () => z.ZodObject<{
	src: zCore.$ZodString;
	width: zCore.$ZodNumber;
	height: zCore.$ZodNumber;
	format: zCore.$ZodUnion<[...]>;
}>;

export type SchemaContext = { image: ImageFunction };
```

`image()` 用法与路径语义（[guides/images.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/images.mdx)）：

> "You can declare an associated image for a content collections entry, such as a blog post's cover image, in your frontmatter using its path relative to the current folder:"

```md title="src/content/blog/my-post.md" {3}
---
title: "My first blog post"
cover: "./firstpostcover.jpeg" # will resolve to "src/content/blog/firstpostcover.jpeg"
coverAlt: "A photograph of a sunset behind a mountain range."
---
```

```ts title="src/content.config.ts"
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const blogCollection = defineCollection({
	schema: ({ image }) => z.object({
		title: z.string(),
		cover: image(),
		coverAlt: z.string(),
	}),
});

export const collections = {
	blog: blogCollection,
};
```

> "The image will be imported and transformed into metadata, allowing you to pass it as a `src` to `<Image/>`, `<img>`, or `getImage()` in an Astro component."

目录选择（images.mdx · Where to store images）：

> "We recommend that local images are kept in `src/` when possible so that Astro can transform, optimize, and bundle them. Files in the `public/` directory are always served or copied into the build folder as-is, with no processing."

`ImageMetadata` 字段（[reference/modules/astro-assets.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/modules/astro-assets.mdx)）：

> **Type:** `{ src: string; width: number; height: number; format: ImageInputFormat; orientation?: number; }`
> "`ImageMetadata.src` — The absolute path of the image on the filesystem."

（注意：文档说 `src` 是「filesystem 绝对路径」，但**【实测】**经 `getCollection()` 拿到的 `src` 是 `/_astro/cover.CB-FUXe_.png` 这种已发出的站内路径。**文档这句与实测不符**，以实测为准——这一点列入「仍需人工核对」。）

路径不存在即报错（[packages/astro/src/content/runtime-assets.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/runtime-assets.ts)）：

```ts
if (!metadata) {
  ctx.addIssue({
    code: 'custom',
    message: `Image ${imagePath} does not exist. Is the path correct?`,
    fatal: true,
  });
  return z.never();
}
```

**【实测】** `cover: ../../assets/does-not-exist.png`：

```
[ImageNotFound] Could not find requested image `../../assets/does-not-exist.png`. Does it exist?
  Hint: This is often caused by a typo in the image path. ...
exit=1
```

### 对本项目的含义

用 `schema: ({ image }) => z.object({...})`；图片放 `src/assets/`（或与 md 同目录），frontmatter 写相对条目文件的路径（如 `../../assets/x.png`）；不要往 `public/` 放 schema 图，也不要把 `src` 拿去当固定 URL 猜。

---

## 3. `image()` 能否放进数组 / 图 + 说明的组合

### 结论

- **`z.array(image())` 完全可行**，而且**官方仓库里就有**：Astro 自己的集成测试 fixture 用 `arrayOfImages: z.array(image())` 并断言渲染出 2 张图。但**官方文档正文（en）里没有任何 `z.array(image())` 示例**——所以准确说法是「官方测试/示例仓库支持，官方文档未给示例」。
- **`z.array(z.object({ src: image(), alt: z.string() }))` 也可行**（【实测】通过，取值形如 `{ src: { src, width, height, format }, alt }`）。但**官方文档没有这个逐字示例**；官方文档给的「图 + 说明」范式是**并列的两个字段**（`cover: image()` + `coverAlt: z.string()`），官方 fixture 里则有嵌套对象形式 `cover: z.object({ image: image() })`。
- 结论落地：**「图 + 说明」两种写法 Astro 都吃**——并列字段是官方文档范式（最稳），数组套对象是我方自选（实测可行、官方无语档示例）。

### 引文

官方 fixture（[packages/astro/test/fixtures/core-image/src/content.config.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/fixtures/core-image/src/content.config.ts)）：

```ts
const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({image}) => z.object({
    title: z.string(),
    image: image(),
		cover: z.object({
			image: image()
		}),
		arrayOfImages: z.array(image()),
  }),
});
```

对应 frontmatter（[packages/astro/test/fixtures/core-image/src/content/blog/one.md](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/fixtures/core-image/src/content/blog/one.md)）：

```md
---
title: One
image: ../../assets/penguin2.jpg
cover:
  image: ../../assets/penguin1.jpg
arrayOfImages:
  - ../../assets/penguin2.jpg
  - ../../assets/penguin1.jpg
---
```

对应断言（[packages/astro/test/core-image.test.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/core-image.test.ts)）：

```ts
it('has proper sources for array of images', () => {
  const $img = $('#array-of-images img');
  const imgsSrcs: string[] = [];
  $img.each((_i, img) => { imgsSrcs.push(img.attribs['src']); });
  assert.equal($img.length, 2);
  assert.equal(imgsSrcs.every((img) => img.startsWith('/')), true);
});
```

渲染侧（同 fixture 的 `[...slug].astro`）：

```astro
<div id="array-of-images">
	{ entry.data.arrayOfImages.map((image) => <img src={image.src} />) }
</div>
```

官方文档的「图 + 说明」范式（images.mdx，即上面第 2 节引的 `cover` + `coverAlt`），以及其渲染：

```astro
<Image src={post.data.cover} alt={post.data.coverAlt} />
```

**【实测】** 下面这个组合能正常构建并取到值：

```ts
gallery: z.array(image()).optional(),
figures: z.array(z.object({ src: image(), alt: z.string() })).optional(),
```

```json
"galleryLens": [["src","width","height","format"], ["src","width","height","format"]],
"figures": [{ "src": { "src": "/_astro/cover.CB-FUXe_.png", "width": 1, "height": 1, "format": "png" },
              "alt": "figure alt text" }]
```

### 对本项目的含义

`papers` 的图表列表可以用 `figures: z.array(z.object({ src: image(), alt: z.string() }))`——但要知道这是「实测可用、文档无示例」；若想完全贴官方文档，就退化成 `figureSrc: z.array(image())` + `figureAlt: z.array(z.string())` 两个并列数组（更丑，但每个字都有官方依据）。

---

## 4. 正文：`entry.body`、`render(entry)`、正文 + 摘要能否同页

### 结论

- **`entry.body` 存在**，类型 `string | undefined`，内容是**未编译的原始 Markdown 字符串**（不含 frontmatter）。`glob()` 默认保留 body，只有显式 `retainBody: false` 才变 `undefined`。
- **`render(entry)` 返回恰好三样东西**：`Content`（组件）、`headings`（标题数组）、`remarkPluginFrontmatter`（插件改过的 frontmatter）。这一点我在真实构建里 dump 过 key 列表，与文档、与 `.astro/content.d.ts` 里的 `RenderResult` 接口三方一致。
- **同一篇内容可以既渲染正文、又在列表页显示摘要**：`body` 挂在 entry 上、与是否 `render()` 无关；页面里可以同时 `const { Content } = await render(e)` 和基于 `e.body` 算摘要。**【实测】** 一个页面里同时输出 `firstPara`（取自 body）与 `<Content />`，两者都正确。

### 引文

`CollectionEntry.body`（[reference/modules/astro-content.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/modules/astro-content.mdx)）：

> **Type:** `string | undefined`
> "A string containing the raw, uncompiled body of the Markdown or MDX document."
> "Note that if [`retainBody`](/en/reference/content-loader-reference/#retainbody) is set to `false`, this value will be `undefined` instead of containing the raw file contents."

`render()`（同上）：

> **Type:** `(entry: CollectionEntry) => Promise<RenderResult>`
> "A function to compile a given entry for rendering. This returns the following properties:
> - `<Content />` - A component used to render the document's contents in an Astro file.
> - `headings` - A generated list of headings, mirroring Astro's `getHeadings()` utility on Markdown and MDX imports.
> - `remarkPluginFrontmatter ` - The modified frontmatter object after any Markdown processor plugins have been applied. Set to type `any`."

```astro title="src/pages/blog/entry-1.astro"
---
import { getEntry, render } from 'astro:content';
const entry = await getEntry('blog', 'entry-1');

if (!entry) {
  throw new Error('Could not find blog post 1');
}
const { Content, headings, remarkPluginFrontmatter } = await render(entry);
---
```

Markdown 指南（[guides/markdown-content.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/markdown-content.mdx)）：

> "Additionally, `body` contains the raw, uncompiled body content as a string."
> "The [`render()`](/en/reference/modules/astro-content/#render) function returns your Markdown body content, a generated list of headings, as well as a modified frontmatter object after any Markdown processor plugins have been applied."

`retainBody` 默认值（[packages/astro/src/content/loaders/glob.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/loaders/glob.ts)）：

```ts
body: globOptions.retainBody === false ? undefined : body,
```

构建产物里的类型（本机 `.astro/content.d.ts`，由 `astro sync` 生成）：

```ts
export interface RenderResult {
	Content: import('astro/runtime/server/index.js').AstroComponentFactory;
	headings: import('astro').MarkdownHeading[];
	remarkPluginFrontmatter: Record<string, any>;
}
```

**【实测】** 同 build 内 dump：

```json
"hasBody": "string",
"bodyStart": "First paragraph of body text.\n\nSecond pa",
"renderKeys": ["Content", "headings", "remarkPluginFrontmatter"],
"entryKeys": ["id","data","body","filePath","assetImports","imageImports","digest","rendered","collection"]
```

### 对本项目的含义

`notes` / `papers` 详情页用 `render(entry)`；列表页摘要直接用 `entry.body` 处理，不需要为摘要再渲染一次——一份数据两处用，构建成本不翻倍。

---

## 5. Astro 有没有内置 excerpt / 摘要能力

### 结论

**没有。** 这是明确答案，不是「未找到」。

- Astro 源码 `packages/astro/src` 里 **`excerpt` 零命中**（全库 grep）。
- 官方英文文档 428 个 mdx 里，`excerpt` 只出现在**第三方 CMS 的字段名**（Cosmic、WordPress、Gatsby 迁移）和 **RSS 的 `description`** 语境，**没有任何一处是 Astro 自己的摘要 API**。
- 没有 `entry.excerpt`、没有 `render()` 的摘要返回项（`RenderResult` 只有那 3 个字段）、也没有内置截断工具。
- 官方给出的实际做法是两条，都能在官方材料里找到依据：
  1. **手写 `description` 字段**（官方每个 schema 示例都带 `description: z.string()`），列表页读 `entry.data.description`；
  2. **写 remark/mdast 插件把派生值塞进 frontmatter**，再用 `render()` 的 `remarkPluginFrontmatter` 读出来——官方 recipe「Add reading time」就是这个范式（`data.astro.frontmatter.minutesRead`）。
- 【实测】自己从 `entry.body` 按空行切第一段，可行且零依赖（`firstPara: "Intro paragraph here."`）。

### 引文

`render()` 只返回三项（见第 4 节引文，[astro-content.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/modules/astro-content.mdx)）——其中没有 excerpt。

官方插件范式（[recipes/reading-time.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/recipes/reading-time.mdx)）：

> "Create a [mdast plugin](/en/guides/markdown-content/#markdown-processor-plugins) which adds a reading time property to the frontmatter of your Markdown or MDX files."

```js title="remark-reading-time.mjs"
import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // readingTime.text will give us minutes read as a friendly string,
    // i.e. "3 min read"
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
```

> "If your blog posts are stored in a [content collection](/en/guides/content-collections/), access [the `remarkPluginFrontmatter` from the `render()` function](/en/reference/modules/astro-content/#render)."

`excerpt` 在官方文档里只以别人家字段出现（[guides/cms/cosmic.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/cms/cosmic.mdx)、[recipes/rss.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/recipes/rss.mdx)）：

> cosmic.mdx: `body={post.metadata.excerpt}`
> rss.mdx: "`description`: A short excerpt from or describing the entry."

### 对本项目的含义

摘要是**我们的字段**，不是 Astro 的能力：三个集合都加 `description: z.string()`（列表页/SEO/OG 都用它）；不要指望自动摘要，也不要为此引 remark 插件——手写字段一行代码就能读。

---

## 6. `draft` 字段：官方写法、过滤、草稿是否生成页面

### 结论

- **schema 写法**：官方没有强制形态，但官方示例/官方 fixture 用 `z.boolean()` 或 `z.boolean().default(false)`。推荐 `.default(false)`：缺省即「已发布」语义，且字段在模板里是必有的 `boolean`（见第 8 节）。
- **构建时过滤**：官方给了两段示例，原文如下（一段「始终排除草稿」，一段「dev 可见、生产排除」，后者就是 `import.meta.env.PROD` 那段）。
- **草稿条目在 `getStaticPaths()` 里会不会生成页面**：**会**——只要你没在 `getStaticPaths()` 内部过滤掉它。`getStaticPaths()` 的返回值**就是**「要预渲染哪些路由」的唯一依据，Astro 不会因为 `draft: true` 自动跳过。**【实测】** `draft: true` 的条目照样产出 `dist/papers/two/index.html`。
- 因此过滤必须写**两处**：列表页的 `getCollection()`（控制「显示」）+ `getStaticPaths()` 里的 `getCollection()`（控制「生成」）。官方文档只演示了前者，后者是 `getStaticPaths` 语义的直接推论。

### 引文

过滤示例（[guides/content-collections.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/content-collections.mdx)）：

> "You can use this to filter by any content criteria you like. For example, you can filter by properties like `draft` to prevent any draft blog posts from publishing to your blog:"

```astro title="src/pages/blog.astro"
---
// Example: Filter out content entries with `draft: true`
import { getCollection } from 'astro:content';
const publishedBlogEntries = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});
---
```

> "You can also create draft pages that are available when running the dev server, but not built in production:"

```astro title="src/pages/blog.astro"
---
// Example: Filter out content entries with `draft: true` only when building for production
import { getCollection } from 'astro:content';
const blogEntries = await getCollection('blog', ({ data }) => {
  return import.meta.env.PROD ? data.draft !== true : true;
});
---
```

`getStaticPaths()` 决定生成哪些路由（[reference/routing-reference.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/routing-reference.mdx)）：

> "A function to generate multiple, prerendered page routes from a single `.astro` page component with one or more parameters in its file path."
> "The `getStaticPaths()` function must return an array of objects to determine which URL paths will be prerendered by Astro."

官方 fixture 里的 draft 形态（[packages/astro/test/fixtures/content-collections/src/content.config.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/fixtures/content-collections/src/content.config.ts)）：

```ts
schema: z.object({
  title: z.string(),
  isDraft: z.boolean().default(false),
  lang: z.enum(['en', 'fr', 'es']).default('en'),
  publishedAt: z.date().transform((val) => new Date(val)),
}),
```

**【实测】** `two.md` 带 `draft: true`，`getStaticPaths()` 不过滤：

```
22:57:57   ├─ /papers/my-custom-slug/index.html (+10ms)
22:57:57   ├─ /papers/two/index.html (+2ms)
dist\papers\two\index.html   ← 草稿页面确实生成了
```

### 对本项目的含义

`draft: z.boolean().default(false)`，列表页与 `getStaticPaths()` **两处都写** `({ data }) => import.meta.env.PROD ? data.draft !== true : true`；只在列表页过滤会留下可访问的草稿 URL（静态站没人拦，那是真会被爬到的）。

---

## 7. 日期字段：`z.coerce.date()` vs `z.string()`

### 结论

- **`z.coerce.date()`**（官方示例统一用它）：得到的 `data.pubDate` 是真正的 `Date` 对象。排序用 `.valueOf()` 或直接减；显示用 `Date` 自带方法（官方示例 `toDateString()`）。`build.format` 无关，纯数据层。
- **`z.string()` 有个必须先知道的坑**：frontmatter 里裸写 `date: 2026-11-15`（不加引号）会被 YAML 解析成 **`Date` 对象**，`z.string()` 校验**直接失败**——报 `Expected type "string", received "object"`。要 `z.string()` 就必须把日期**写成带引号的字符串** `date: "2026-11-15"`。
- 所以问题「`date: 2026-11-15` 会被解析成什么」的答案是：**JS `Date`，UTC 午夜**（`2026-11-15T00:00:00.000Z`，本机 +08:00 显示为 `Sun Nov 15 2026 08:00:00 GMT+0800`）。这是 Astro 的 YAML 层（`yaml` 包 + `schema: 'core'` + `customTags: ['timestamp']`）干的，**不是** `z.coerce.date()` 干的——`z.coerce.date()` 只是把这个 `Date` 收下（或把字符串强制转成 `Date`）。
- 对本项目：**用 `z.coerce.date()`**。`Date` 对象排序最稳、格式化最自然；用 `z.string()` 只会把「要记得加引号」变成隐性负担，且排序退化成字符串比较（ISO 格式下恰好也对，但一旦有人写成 `2026-11-15` 之外的形式就崩）。

### 引文

官方日期示例（[guides/content-collections.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/content-collections.mdx)，多处同款）：

```ts
pubDate: z.coerce.date(),
updatedDate: z.coerce.date().optional(),
```

官方排序（同页）：

> "The sort order of generated collections is non-deterministic and platform-dependent. This means that if you are calling `getCollection()` and need your entries returned in a specific order (e.g. blog posts sorted by date), you must sort the collection entries yourself:"

```astro title="src/pages/blog.astro"
---
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog')).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);
---
```

官方格式化（同页）：

```astro
<p>Published on: {entry.data.pubDate.toDateString()}</p>
```

YAML 层实现（[packages/internal-helpers/src/yaml.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/internal-helpers/src/yaml.ts)）：

```ts
export function parseYaml(source: string): unknown {
	const document = parseDocument(source, {
		customTags: ['timestamp'],
		merge: true,
		schema: 'core',
	});
	...
}
```

官方测试对「裸日期 → Date」的断言（[packages/astro/test/content-collections.test.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/content-collections.test.ts)）：

```ts
assert.equal(
  publishedDates.every((date) => date instanceof Date),
  true,
  'Not all publishedAt dates are Date objects',
);
assert.deepEqual(
  publishedDates.map((date) => date.toISOString()).sort(),
  [
    '2021-01-01T00:00:00.000Z',
    ...
```

（对应 fixture 的 frontmatter 就是裸日期 `publishedAt: 2021-01-01`。）

**【实测】** 同一份 frontmatter 里并排四种值（`z.any()` 接收后 dump）：

```json
{
  "dateStr":  { "type": "object", "isDate": true,  "iso": "2026-11-15T00:00:00.000Z", "raw": "Sun Nov 15 2026 08:00:00 GMT+0800 (中国标准时间)" },
  "quoted":   { "type": "string", "isDate": false, "iso": "2026-11-15", "raw": "2026-11-15" },
  "unquoted": { "type": "object", "isDate": true,  "iso": "2026-11-15T00:00:00.000Z", "raw": "Sun Nov 15 2026 08:00:00 GMT+0800 (中国标准时间)" },
  "coerced":  { "type": "object", "isDate": true,  "iso": "2026-11-15T00:00:00.000Z", "raw": "Sun Nov 15 2026 08:00:00 GMT+0800 (中国标准时间)" }
}
```

把 `dateStr` 的 schema 换成 `z.string()` 后构建失败：

```
[InvalidContentEntryDataError] papers → strdate data does not match collection schema.
  dateStr**: **dateStr: Expected type `"string"`, received `"object"`
exit=1
```

### 对本项目的含义

统一 `pubDate: z.coerce.date()`（+ `updatedDate: z.coerce.date().optional()`），frontmatter 裸写 `2026-11-15` 即可；列表排序抄官方 `.sort((a,b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())`；页面展示不要直接丢 `Date`，用 `Intl.DateTimeFormat` 或 `toISOString().slice(0,10)` 定型。

---

## 8. `.optional()` vs `.default()`

### 结论

- **行为差异（实测确认）**：
  - `.optional()`：字段**根本不出现在 `data` 里**（`'opt' in data === false`），读出来是 `undefined`。
  - `.default(x)`：字段**一定存在**，缺省时填入默认值（`data.tag === 'untagged'`、`data.tags === []`）。
- **类型差异**：`z.string().optional()` → `string | undefined`；`z.string().default('x')` → `string`。两者在模板里写法不同：前者要么 `?.`/`??` 兜底，要么先判空，否则 TS strict 下报错。
- 关键取舍：`.default()` 让**字段永远存在**（省掉分支），`.optional()` 让**「没写」这件事可被区分**。对本项目：`draft` / `tags` 这类「有合理空值」的用 `.default()`；`description` / `updatedDate` 这类「真可能没有、且要区分有无」的用 `.optional()`。

### 引文

`.default()` 的官方用法（[reference/modules/astro-zod.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/modules/astro-zod.mdx)，含类型推断结果）：

```ts
const user = z.object({
  ...
  language: z.enum(["en", "fr", "es"]).default("en"),
  ...
  website: z.url().optional(),
});
```

> ```ts
> /* The `User` type will be:
>  * type User = {
>  *   ...
>  *   language: "en" | "fr" | "es";
>  *   ...
>  *   website?: string | undefined;
>  * }
>  */
> ```

（即官方明示：`.default()` → 必有；`.optional()` → `?: ... | undefined`。）

官方 fixture 混合用（[fixtures/content-collections/src/content.config.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/fixtures/content-collections/src/content.config.ts)）：

```ts
isDraft: z.boolean().default(false),
lang: z.enum(['en', 'fr', 'es']).default('en'),
```

**【实测】** 同一个条目只写 `title`，其余留空：

```json
{
  "hasTag": true,  "tag": "untagged",
  "hasOpt": false, "optType": "undefined", "optIsUndefined": true,
  "tags": [], "tagsLen": 0
}
```

**【实测·类型】** `tsc --noEmit`（`astro/tsconfigs/strict`）下，`const tag: string = e.data.tag` 与 `const tags: string[] = e.data.tags` 通过；而 `const bad: string = e.data.opt` 报错（我在它上面加了 `@ts-expect-error` 才通过编译，退出码 0）——即 `opt` 的类型确实是 `string | undefined`。

`CollectionEntry.body` 同一机制（生成代码里是 `body?: string`）：

```ts
"papers": Record<string, {
  id: string;
  body?: string;
  collection: "papers";
  data: InferEntrySchema<"papers">;
  ...
}>;
```

### 对本项目的含义

`draft: z.boolean().default(false)`、`tags: z.array(z.string()).default([])` 免掉所有判空；`description: z.string().optional()`、`updatedDate: z.coerce.date().optional()` 则要求在模板里显式处理 `undefined`——别混着来，否则模板里一半要判空一半不用，最容易被漏掉。

---

## 9. 同一集合内 slug（`entry.id`）唯一性

### 结论（分三层说清，因为官方只答了第一层）

1. **会不会自动检测重复？会。** 官方有专门错误页 `DuplicateContentEntrySlugError`，措辞「Slugs must be unique」；检测点在 `glob()` loader 的 `syncData()`。
2. **两个文件写同一个 `slug` 构建会怎样？默认是「警告 + 静默覆盖成一个条目」，不是报错。** 默认配置 `prerenderConflictBehavior: 'warn'` 时：打一条 `[WARN] [glob-loader]` 警告，构建**成功**，`getCollection()` 里**只剩一个**该 id 的条目（重复的被覆盖，不是两条并存）。
3. **谁赢？官方未说明，而且实测为非确定性**——同样输入连续两次冷构建，胜出的文件不一样。**这是本节最重要的一句话：绝不能依赖「谁赢」。**

补充：把 `prerenderConflictBehavior` 设为 `'error'` 可让构建阶段直接失败（官方有这个配置项，但它的文档措辞针对的是「两条路由生成同一个预渲染 URL」，`glob()` 复用同一开关来处理重复条目 slug 这件事**只在源码里体现，官方文档未写明**）。

### 引文

官方错误页（[reference/errors/duplicate-content-entry-slug-error.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/errors/duplicate-content-entry-slug-error.mdx)）：

> "`COLLECTION_NAME` contains multiple entries with the same slug: `SLUG`. Slugs must be unique."
> "Content collection entries must have unique slugs. Duplicates are often caused by the `slug` frontmatter property."

错误数据定义（[packages/runtime/src/internal/core/errors/errors-data.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/runtime/src/internal/core/errors/errors-data.ts)）：

```ts
export const DuplicateContentEntrySlugError = {
	name: 'DuplicateContentEntrySlugError',
	title: 'Duplicate content entry slug.',
	message(collection: string, slug: string, preExisting: string, alsoFound: string) {
		return (
			`**${collection}** contains multiple entries with the same slug: \`${slug}\`. ` +
			`Slugs must be unique.\n\n` +
			`Entries: \n` +
			`- ${preExisting}\n` +
			`- ${alsoFound}`
		);
	},
} satisfies ErrorData;
```

判定逻辑（[packages/astro/src/content/loaders/glob.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/loaders/glob.ts)）：

```ts
const message = AstroErrorData.DuplicateContentEntrySlugError.message(
	collection,
	id,
	existingEntry.filePath,
	relativePath,
);
if (config.prerenderConflictBehavior === 'error') {
	throw new AstroError({ ...AstroErrorData.DuplicateContentEntrySlugError, message });
} else if (config.prerenderConflictBehavior !== 'ignore') {
	logger.warn(message);
}
```

默认值（[core/config/schemas/defaults.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/core/config/schemas/defaults.ts)）：

```ts
prerenderConflictBehavior: 'warn',
```

配置项文档（[reference/configuration-reference.mdx](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/reference/configuration-reference.mdx)）：

> **Type:** `'error' | 'warn' | 'ignore'` / **Default:** `'warn'` / Since v6.0
> "Determines the default behavior when two routes generate the same prerendered URL:
> - `error`: fail the build and display an error, forcing you to resolve the conflict
> - `warn` (default): log a warning when conflicts occur, but build using the highest-priority route
> - `ignore`: silently build using the highest-priority route when conflicts occur"

⚠️ 注意这段措辞的对象是「**两条路由生成同一个预渲染 URL**」，**没有**提到 content collection 的条目 slug。`glob()` 用它来处理重复条目 slug 是源码事实，文档未覆盖 → 这条只能算【源码】+【实测】。

**【实测】默认 warn（冷构建）**——构建成功，只打警告：

```
22:57:31 [WARN] [glob-loader] **papers** contains multiple entries with the same slug: `my-custom-slug`. Slugs must be unique.

Entries: 
- src/content/papers/one.md
- src/content/papers/three.md
...
22:57:31 [build] Complete!
```

且 `getCollection()` 只剩 2 个条目（`my-custom-slug` + `two`），不是 3 个。

**【实测】谁赢 = 非确定性**——完全相同输入、清掉 `.astro` 与 `dist` 各跑一次：

```
### COLD build #1
id=my-custom-slug  filePath=src/content/papers/three.md  body="Third body with duplicate slug"
### COLD build #2（同输入）
id=my-custom-slug  filePath=src/content/papers/one.md   body="First paragraph of body text."
```

**【实测】`prerenderConflictBehavior: 'error'`**——构建失败：

```
[DuplicateContentEntrySlugError] papers contains multiple entries with the same slug: `my-custom-slug`. Slugs must be unique.

Entries: 
- src/content/papers/one.md
- src/content/papers/three.md
exit=1
```

### 对本项目的含义

手填 `slug` 是「人肉保证唯一」——Astro 只会警告然后**随机**丢一个。三个集合各自维护一张 `slug` 清单（或加一条构建前校验脚本 / 单测）比事后查「为什么这张论文页显示的是另一篇的正文」便宜得多；若想硬失败，可在 `astro.config.mjs` 设 `prerenderConflictBehavior: 'error'`（副作用：也会让重复路由从警告变失败）。

---

## 10. 正文 Markdown 里的图片

### 结论

**Q1 —— `![]()` 相对路径会不会被解析优化？会，而且不是「原样输出」。**

- `.md` 正文里的标准 Markdown 图片 `![](./images/x.png)`，只要路径不是 URL、也不以 `/` 开头，就**算本地图片**，Astro 会在渲染时把它换成优化后的产物（`/_image?href=...&w=...&h=...&f=webp`），并补上 `width` / `height` 属性。**不会**输出 `src="./images/x.png"`。
- 前提：文件必须真实存在于该相对路径上。**路径不存在 = 报错** `Could not find requested image ... Does it exist?`，不是静默 404。
- 所以「原样输出导致线上 404」这个担心，**只对 `public/` 绝对路径成立（而且那是设计如此）**，对 `src/` 相对路径不成立。
- 官方文档正面说明在 **guides/images.mdx 的 `## Images in Markdown files`** 一节。

**Q2 —— 基准目录 = 条目文件自己所在的目录。**

不是集合 `base`，也不是项目根。源码把条目文件的 `filePath` 作为 importer 写进查询参数，再相对它解析；文档示例也是「`src/pages/post-1.md` 里写 `../assets/stars.png` 指向 `src/assets/stars.png`」。这跟 frontmatter 里 `image()` 的语义**完全一致**（第 2 节已证）。

**Q3 —— `./`、`../`、`/` 三者行为差异。**

| 写法 | 判定 | 是否优化 | 结果 |
|---|---|---|---|
| `./images/x.png` | 本地图片（非 URL、非 `/` 开头） | ✅ 优化 | 换成 `/_image?...`，带 `width`/`height` |
| `../assets/x.png` | 同上 | ✅ 优化 | 同上 |
| `x.png`（裸名） | 同上（也不以 `/` 开头） | ✅ 优化 | 同上，等价 `./x.png` |
| `/images/x.png` | **不作为本地图片**（被 `!url.startsWith('/')` 排除） | ❌ 不优化 | **原样保留** `src="/images/x.png"`，指向 `public/images/x.png` |
| `https://...` | 远程图片（需授权域名才优化） | 视 `image.domains` | 未授权则原样输出 |

即：**`public/` 下的 `/images/x.png` 在正文里确实原样保留、不做任何优化**，这是官方明说的行为（`public/` 永不优化），不是 bug。另外别名（`~/assets/x.png`）也算本地图片、也会被优化。

**Q4 —— 正文图片享受的是 `image()` 同一套优化管线，但机制不同；`.md` / `.mdx` 的处理不同。**

- 享受同一套：正文图片最终同样走 `getImage()`（sharp / image service），产物同样进 `_astro`、同样受 `image.layout` 的响应式全局配置影响。
- **机制不同**：Astro **不是**把 markdown 图片替换成 `<Image />` 组件，而是**在 HTML 层重写 `<img>` 的属性**——先打 `__ASTRO_IMAGE_` 标记，再在渲染时用 `getImage()` 的结果替换 `src` 等属性。所以**你拿不到 `ImageMetadata` 对象**：正文图片的元数据不会出现在 `entry.data` 里，只有 `image()` 声明的 frontmatter 字段才有。
- **`.md` vs `.mdx` 差异（官方明说）**：`.md` 里只能用 `![]()`，以及只能对 `public/` 或远程图用 HTML `<img>`；**`<Image />` 和 `<Picture />` 在 `.md` 里不可用**。`.mdx` 四种都支持（`<Image />`、`<Picture />`、`<img />`、`![]()`），还能把组件和 Markdown 语法混用。要更细的图片属性控制，官方建议上 MDX 集成。

**Q5 —— 约束：不需要显式写尺寸，但有一条硬约束（本地图不能用 HTML `<img>`）。**

- `![]()` **不需要**写宽高、也不需要写 `width`/`height`：Astro 自动推断并回填。官方测试直接断言正文图片渲染后有 `width` 和 `height`。
- **硬约束**：本地（`src/`）图片在 `.md` 里**只能**用 `![]()`；用 HTML `<img>` 指向 `src/` 的本地图**不被支持**（官方原文「`<img>` is not supported for your local images in `src`」）。HTML `<img>` 只对 `public/` 和远程图有效。
- `alt` 不是强制的（`<Image />` 组件才强制 `alt`）；正文写 `![](./x.png)` 空 alt 会被**保留为空字符串**而不是被删掉（官方有专门断言）。
- **远程图也不需要你写尺寸**：正文 markdown 图片会被自动打上 `inferSize: true`（除非你/插件已经给了 `width` 和 `height`），由 Astro 去探测远端尺寸。注意这条是**正文 `![]()` 专有**：`.astro` 里直接写 `<Image />` 才需要自己给尺寸（`remote-error-no-dimensions` fixture 测的是那个场景，不是 markdown）。远程图若未在 `image.domains` / `image.remotePatterns` 里授权，则**整张图原样透传**、不优化、也不再探测尺寸。

**Q6 —— `entry.body` 里是原始相对路径，未被改写；做摘要会把图片语法带进摘要。**

- `entry.body` 来自 `safeParseFrontmatter(contents).content.trim()`，**就是磁盘原文**（去掉 frontmatter）。图片路径改写发生在**渲染产物（HTML）**层面，不回流到 `body`。所以 `entry.body` 里躺着的就是 `![](./images/x.png)` 这串原始字符。
- 结论：**用 `entry.body` 切首段当摘要，一定会把 `![...](...)` 原样带出来**，除非你自己清理。

**Q7 —— 官方没有「正文首段摘要」的现成写法。**

- 官方没有 excerpt API（见第 5 节），`render()` 也只返回 `Content` / `headings` / `remarkPluginFrontmatter` 三样，**没有摘要、也没有「正文纯文本」**。`headings` 只能告诉你标题，切不出首段。
- 官方材料里**没有任何一处**推荐「用正则切 `entry.body`」或「用 headings 判断首段」——这两个都是社区做法，不是官方契约。
- 官方唯一给的范式仍是：**手写 `description` 字段**（列表页/SEO 读它），或写 remark/mdast 插件把派生值塞进 frontmatter 再用 `remarkPluginFrontmatter` 读（见第 5 节引文）。

### 引文

官方正面说明（[guides/images.mdx · Images in Markdown files](https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/images.mdx)）：

> "**Options:** `![]()`, `<img>` (with public or remote images)"
> "Use standard Markdown `![alt](src)` syntax in your `.md` files. Your local images stored in `src/` and remote images will be processed and optimized. When you [configure responsive images globally](/en/reference/configuration-reference/#imagelayout), these images will also be [responsive](#responsive-image-behavior)."
> "Images stored in the `public/` folder are never optimized."

同页代码块（注意注释原文，直接回答基准目录与 `public/` 行为）：

```md
<!-- src/pages/post-1.md -->

# My Markdown Page

<!-- Local image stored in src/assets/ -->
<!-- Use a relative file path or import alias -->
![A starry night sky.](../assets/stars.png)

<!-- Image stored in public/images/ -->
<!-- Use the file path relative to public/ -->
![A starry night sky.](/images/stars.png)

<!-- Remote image on another server -->
<!-- Use the full URL of the image -->
![Astro](https://example.com/images/remote-image.png)
```

同页，`<img>` 的约束与 `.md` / `.mdx` 差异（这段是 Q4/Q5 的直接依据）：

> "The HTML `<img>` tag can also be used to display images stored in `public/` or remote images without any image optimization or processing. However, `<img>` is not supported for your local images in `src`."
> "The `<Image />` and `<Picture />` components are unavailable in `.md` files. If you require more control over your image attributes, we recommend using [Astro's MDX integration](/en/guides/integrations-guide/mdx/) to add support for `.mdx` file format."

`.mdx` 侧（同页 `## Images in MDX files`）：

> "**Options:** `<Image />`, `<Picture />`, `<img />`, `![]()`, SVG components"
> "Additionally, there is support for [standard Markdown `![alt](src)` syntax](#images-in-markdown-files) with no import required."

响应式也覆盖正文图片（同页）：

> "When this responsive behavior is [configured globally with `image.layout`](/en/reference/configuration-reference/#imagelayout), it will apply to all image components and also to any local and remote images using [the Markdown `![]()` syntax](/en/guides/images/#images-in-markdown-files)."

「什么算本地图片」的判定（Unified 处理器：[remark-collect-images.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/markdown/remark/src/remark-collect-images.ts)）：

```ts
if (URL.canParse(url)) {
  if (isRemoteAllowed(url, { domains, remotePatterns })) {
    remoteImagePaths.add(url);
  }
} else if (!url.startsWith('/')) {
  // If:
  // + not a valid URL
  // + AND not an absolute path
  // Then it's a local image.
  localImagePaths.add(url);
}
```

v7 默认处理器 Sätteri 里是**同一条规则**（[satteri-processor.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/markdown/satteri/src/satteri-processor.ts)）：

```ts
export function createCollectImagesPlugin(image = {}): MdastPluginDefinition {
  return {
    name: 'collect-images',
    image(node, ctx) {
      const url = node.url ? decodeURI(node.url) : undefined;
      if (!url) return;
      const astro = ctx.data.astro;
      if (URL.canParse(url)) {
        if (isRemoteAllowed(url, { domains, remotePatterns })) astro?.remoteImagePaths.add(url);
      } else if (!url.startsWith('/')) {
        astro?.localImagePaths.add(url);
      }
    },
  };
}
```

「改成 `<Image>` 优化产物」的真实机制——**不是**换成组件，而是打标记 + 重写属性（同文件）：

```ts
/** Tags <img> with `__ASTRO_IMAGE_` for astro's vite-plugin-markdown to replace with the processed image's attributes. */
export function createImageMarkerPlugin(): HastPluginDefinition {
  const indexBySrc = new Map();
  return {
    name: 'image-marker',
    element: {
      filter: ['img'],
      visit(node, ctx) {
        ...
        const isLocal = astro?.localImagePaths.has(src) ?? false;
        ...
        if (!isLocal && !isRemote) return;   // ← public / 未授权远程图到这里就原样放行
        ...
        ctx.setProperty(node, '__ASTRO_IMAGE_', JSON.stringify(imageProperties));
        ...
        ctx.setProperty(node, 'src', null);
      },
    },
  };
}
```

最终调 `getImage()` 的地方（[vite-plugin-markdown/images.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/vite-plugin-markdown/images.ts)）：

```ts
import Astro__${entry.safeName} from ${JSON.stringify(entry.raw)};
...
imageSources[src + '_' + imageProps.index] = await getImage({src: Astro__${entry.safeName}, ...props});
```

**基准目录 = 条目文件目录**的源码证据（[assets/utils/resolveImports.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/assets/utils/resolveImports.ts)）：

```ts
// The import paths are relative to the content (md) file, but when it's actually resolved it will
// be in a single assets file, so relative paths will no longer work. To deal with this we use
// a query parameter to store the original path to the file and append a query param flag.
const params = new URLSearchParams(CONTENT_IMAGE_FLAG);
if (filePath) {
  params.set('importer', filePath);
}
return `${imageSrc}?${params.toString()}`;
```

以及接收端（[content/vite-plugin-content-assets.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/content/vite-plugin-content-assets.ts)）：

```ts
const importerParam = params.get('importer');
const importerPath = importerParam ? fileURLToPath(new URL(importerParam, settings.config.root)) : importer;
const resolved = await this.resolve(base, importerPath, { skipSelf: true, ...opts });
if (!resolved) {
  throw new AstroError({ ...AstroErrorData.ImageNotFound, message: AstroErrorData.ImageNotFound.message(base) });
}
```

正文图片在 **content collections** 里也会被优化（官方 fixture + 断言，[core-image.test.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/core-image.test.ts)）：

```ts
it('image in cc folder is processed', () => {
  const $imgs = $('img');
  const $blogfolderimg = $($imgs[6]);
  assert.equal($blogfolderimg.attr('src')!.includes('blogfolder.jpg'), true);
  assert.equal($blogfolderimg.attr('src')!.endsWith('f=webp'), true);
});
```

对应 fixture（[core-image/src/content/blog/one.md](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/test/fixtures/core-image/src/content/blog/one.md)）——图片与条目 md **同目录**、正文里用**裸相对名**：

```md
---
title: One
image: ../../assets/penguin2.jpg
---

# A post

text here

![sir penguin](blogfolder.jpg)
```

`.md` 页面侧「不输出原路径、输出优化产物 + 宽高」的断言（同文件）：

```ts
it('Adds the <img> tag', () => {
  let $img = $('img');
  assert.equal($img.length, 2);
  // Verbose test for the full URL to make sure the image went through the full pipeline
  assert.equal(
    $img.attr('src')!.startsWith('/_image') && $img.attr('src')!.endsWith('f=webp'),
    true,
  );
});

it('has width and height attributes', () => {
  let $img = $('img');
  assert.equal(!!$img.attr('width'), true);
  assert.equal(!!$img.attr('height'), true);
});
```

路径不存在就报错（同文件）：

```ts
it('properly error image in Markdown content is not found', async () => {
  logs.length = 0;
  let res = await fixture.fetch('/post');
  await res.text();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message.includes('Could not find requested image'), true);
});
```

空 alt 被保留、remote 未授权被原样透传（同文件）：

```ts
it('content collection images with empty alt preserve the alt attribute', async () => {
  ...
  assert.equal($contentImg.attr('alt'), '', 'alt attribute should be empty string, not missing');
});

it('properly handles remote images', async () => {
  ...
  const remoteUrls = ['https://example.com/image.png', '/image.png'];
  $img.each((index, element) => {
    assert.equal(element.attribs['src'], remoteUrls[index]);   // ← 原样，未优化
  });
});
```

`entry.body` 是原文（[vite-plugin-markdown/content-entry-type.ts](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/vite-plugin-markdown/content-entry-type.ts)）：

```ts
async getEntryInfo({ contents, fileUrl }) {
  const parsed = safeParseFrontmatter(contents, fileURLToPath(fileUrl));
  return {
    data: parsed.frontmatter,
    body: parsed.content.trim(),   // ← 原始正文，未改写图片路径
    slug: parsed.frontmatter.slug,
    rawData: parsed.rawFrontmatter,
  };
},
```

（`glob()` 只是把这个 `body` 原样存进 store：`body: globOptions.retainBody === false ? undefined : body`，见第 4 节。）

### 对本项目的含义

1. **正文插图就写相对路径 `![](./images/x.png)`（或裸名 `x.png`），并保证图片真在 `src/` 树里**。这样能拿到优化 + 自动宽高 + 响应式，线上不会 404。不要为了「保险」把正文图塞进 `public/` 再写 `/images/x.png`——那等于主动放弃优化（官方明说 `public/` 永不优化）。
2. **规则可以并成一句**：正文图片和 frontmatter `image()` 用**同一套路径语义**（相对条目文件、必须在 `src/` 下）；区别只是正文图拿不到 `ImageMetadata` 对象，`entry.data` 里不会有它。要元数据就走 `image()` 字段。
3. **`papers` 的正文插图不必在 schema 里声明**，`![]()` 直接生效；但图注/尺寸这类结构化信息仍建议走 `figures: image()` 字段（第 3 节）。
4. **摘要必须自己剥图片**：`entry.body` 是原文，直接 `split('\n\n')[0]` 会把 `![...](...)` 带进摘要。最省事的做法仍是**三集合都加 `description: z.string()`**（第 5 节），从根上绕开这个问题；若确实要从 body 兜底，就先 `replace(/!\[[^\]]*\]\([^)]*\)/g, '')` 再切段，并且**明确知道这是社区做法、官方无契约**。
5. 别指望 `render().headings` 帮你切首段——它只有标题，没有正文。
6. 若哪天要在正文里做精细图片控制（指定 `width`/`loading` 等），`.md` 做不到（`<Image />` 不可用、HTML `<img>` 不支持 `src/` 本地图）；那时才考虑上 `@astrojs/mdx`。

---

## 仍未决 / 需人工核对

1. **`ImageMetadata.src` 到底是「文件系统绝对路径」还是「构建后站内路径」**。官方 `astro-assets.mdx` 写的是 "The absolute path of the image on the filesystem."，但【实测】经 `getCollection()` 取到的是 `/_astro/cover.CB-FUXe_.png`。两种可能：(a) 文档描述的是**导入期**的内部值，`getCollection()` 之后已被替换；(b) 文档过时。**结论：不要依赖 `src` 的具体形态，只把它当 `<img src>` / `<Image src>` 的入参**；若某处需要原始相对路径，用 `entry.filePath` 自行推导。建议后续在 dev 与 build 两种模式下各确认一次。
2. **`prerenderConflictBehavior` 对 content 条目 slug 的作用，官方文档未覆盖**。源码明确复用（`glob.ts`），但文档只谈「两条路由同 URL」。若这条对项目关键（决定是否开 `'error'`），建议以源码为准并在升级大版本时重新确认——它可能在新版本被换成独立配置项。
3. **`image()` 在 `public/` 下的行为**：文档只在「custom loader 无 `filePath`」时提到会被当 public path；【实测】`glob()` + `image()` + `public/` 绝对路径 = `ImageNotFound`。这条实测很确定，但官方没有一句话正面写「`image()` 不接受 public 路径」，属**推导结论**。
4. **`z.array(z.object({ src: image(), alt: z.string() }))` 官方无逐字示例**。我实测通过、官方 fixture 有相邻形态（嵌套对象 + 数组 image），但组合本身没有官方档。若要求「每个字都有官方依据」，改用并列字段 `cover` + `coverAlt` 范式。
5. **`entry.body` 与 `render()` 并存时的性能**：`glob()` 默认保留 body（`retainBody` 未设即保留），意味着正文同时以「原始字符串」和「渲染产物」两份存在。大数据量下这是内存开销，官方给了 `retainBody: false` 与 `deferRender` 两个旋钮，但「摘要需要 body、正文需要 render」这个组合下**没有**「只留其一」的官方方案——本项目内容量小，暂不处理；若 notes 破千篇需重新评估。
6. **`slug` 唯一性没找到「设计意图」层面的官方说明**（为什么默认是 warn 而不是 error、为什么赢家非确定性）。只找到错误页与源码分支，没有任何 issue/PR 讨论被引用进来。若这条要写进团队规范，建议以「实测非确定性」为依据，而不是猜官方意图。
7. **未验证 `mdx` 集合**：本项目若只用 `.md`，`@astrojs/mdx` 的额外约束（如 MDX 组件、`<Content components={...}>`）未核查。
