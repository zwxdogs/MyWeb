# 论文内容模型与图片组织的官方事实

> 抓取日期 2026-11-15。面向「论文条目内容模型」这一个决策，只收与之相关的事实。
>
> **版本**：`astro` = **7.4.12**（[packages/astro/package.json](https://github.com/withastro/astro/blob/main/packages/astro/package.json)，`"version": "7.4.12"`）。
>
> **抓取方式说明（影响可信度，请知悉）**：本机网络把 `docs.astro.build` 解析到私有地址（`198.18.0.130`），`web_fetch` 被 SSRF 防护拦截，**未能直接打开线上页面**。因此文档原文取自 Astro 官方文档仓库 `withastro/docs` 的英文源文件（`src/content/docs/en/**/*.mdx`）——docs.astro.build 即由这些文件渲染发布，属同一手来源；下文仍给线上页面 URL 便于点击核对，并在每节注明实际读取的 md 文件。Astro 源码从 `raw.githubusercontent.com` 直取。
>
> **证据分级标记**（每条结论前）：
> - **【文档明文】**＝ docs.astro.build 原文明确写的；
> - **【源码断言】**＝ 官方源码/错误信息里可读出、但文档未直说的（可信但非承诺）；
> - **【官方未说明】**＝ 官方文档与源码均未给出结论，需实测或自己兜底。

---

## 1. 内容集合里的图片怎么放

### 1.1 `src/` 任意位置都可以，包括和 `.md` 同目录

**【文档明文】** 图片可以放在 `src/` 下任何目录，包括紧挨着内容文件（即"每篇一个目录放图"是被官方明确认可的形态）。

> "We recommend that local images are kept in `src/` when possible so that Astro can transform, optimize, and bundle them. Files in the `public/` directory are always served or copied into the build folder as-is, with no processing."
>
> "**Images can be stored in any folder, including alongside your content.**"

来源：[Images · Where to store images](https://docs.astro.build/en/guides/images/#where-to-store-images)（实际读 `guides/images.mdx`）。

### 1.2 `image()` 辅助函数的作用：校验 + 在构建期把文件导入成元数据

**【文档明文】** `image()` 是 schema 里的一个校验器（validator），它把 frontmatter 里写的路径**导入并转成图片元数据**，之后可以把该值直接当 `src` 交给 `<Image>` / `<Picture>` / `getImage()`。

> "The `image` helper for the content collections schema lets you **validate and import** the image."
>
> "The image will be **imported and transformed into metadata**, allowing you to pass it as a `src` to `<Image>`, `<Picture>`, or `getImage()` in an Astro component."

来源：[Images · Images in content collections](https://docs.astro.build/en/guides/images/#images-in-content-collections)。

**【源码断言】** 校验失败时抛的错是"文件不存在"，说明它做的是**真实路径解析**（不是字符串透传）：

> `Image ${imagePath} does not exist. Is the path correct?`

来源：[packages/astro/src/content/runtime-assets.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/content/runtime-assets.ts)。

### 1.3 路径解析基准：**相对于该 `.md` 文件**，不是项目根

**【文档明文】** 官方示例直接给了注释答案：

```md
src/content/blog/my-post.md
---
cover: "./firstpostcover.jpeg"   # will resolve to "src/content/blog/firstpostcover.jpeg"
coverAlt: "A photograph of a sunset behind a mountain range."
---
```

> "You can declare an associated image for a content collections entry, such as a blog post's cover image, in your frontmatter using its **path relative to the current folder**"

来源：同上，[Images · Images in content collections](https://docs.astro.build/en/guides/images/#images-in-content-collections)。

**【源码断言】** 实现就是 Vite 的 `resolve(imagePath, entryFilePath)`，以**入口文件的路径**为 importer：

```ts
const resolvedFilePath = (await pluginContext.resolve(imagePath, entryFilePath))?.id;
```

来源：[runtime-assets.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/content/runtime-assets.ts)。→ 推论（源码级）：`./fig-1.webp`、`fig-1.webp`、`../shared/fig-1.webp` 都以 `.md` 所在目录为基准，**跨目录引用也合法**。

### 1.4 `public/` 与绝对 URL 在 `image()` 里的地位

**【文档明文】** 只有一种情况下 schema 里的 `image()` 字段会被当作**公共路径**处理——当 loader 没有提供条目源文件路径时：

> "A path to the file that is the source of this entry, relative to the root of the site. ... **If not set, then any fields in the schema that use the `image()` helper will be treated as public paths and not transformed.**"

来源：[Content Loader API · DataEntry.filePath](https://docs.astro.build/en/reference/content-loader-reference/#dataentryfilepath)。`glob()` loader 会设置 `filePath`（[glob.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/glob.ts) 里 `filePath: relativePath`），所以本项目场景下 **`image()` 字段一定是"按文件解析并转换"，不是公共路径**。

**【官方未说明】** 「`image()` 能不能直接吃 `public/` 下的路径」「能不能吃 `https://...` 绝对 URL」——文档没有正面写。从 1.3 的源码看，它走的是模块解析（`pluginContext.resolve`），失败即报"Image ... does not exist"；因此**绝对 URL 与 `public/` 路径在本项目场景（glob loader）下不应指望被 `image()` 接受**。这是源码推断，非官方承诺，若要用请实测。

### 1.5 `ImageMetadata` 是什么

**【文档明文】** 导入的本地图片资源匹配 `ImageMetadata`，签名：

```ts
interface ImageMetadata {
  src: string;     // The absolute path of the image on the filesystem.
  width: number;
  height: number;
  format: ImageInputFormat;  // "jpeg" | "jpg" | "png" | "tiff" | "webp" | "gif" | "svg" | "avif"
  orientation?: number;
}
```

来源：[astro:assets · ImageMetadata](https://docs.astro.build/en/reference/modules/astro-assets/#imagemetadata-1)（实际读 `reference/modules/astro-assets.mdx`）。→ 即：**图一旦过 `image()`，宽高就在构建期已知**，模板里不用手填。

### 1.6 `inferSize` 只服务于**远程**图，本项目用不到

**【文档明文】**

> "`inferSize` · **Type:** `boolean` · **Default:** `false` · Allows you to set the original `width` and `height` of a **remote** image automatically. By default, this value is set to `false` and you must manually specify both dimensions for your remote image."

同页还写明 `src/` 图的尺寸是自动推断的：

> "These dimensions can be automatically inferred from image files located in `src/`."

来源：[astro:assets · inferSize](https://docs.astro.build/en/reference/modules/astro-assets/#infersize)、[Image · width and height](https://docs.astro.build/en/reference/modules/astro-assets/#width-and-height-required-for-images-in-public)。另有一条版本注记："As of Astro 5.17.3, `inferSize` only fetches dimensions for authorized remote image domains."

---

## 2. 正文 Markdown 里的图片引用规则

### 2.1 相对路径相对**该 Markdown 文件本身**解析

**【文档明文】** loader API 明确说明 `renderMarkdown()` 的 `fileURL` 参数就是用来干这个的：

> "**`fileURL`** · **Type:** `URL` · **Specifies the file path to use for resolving relative image paths in Markdown content.**"

来源：[Content Loader API · fileURL](https://docs.astro.build/en/reference/content-loader-reference/#fileurl)。正文里写 `![alt](./fig-1.webp)` 即相对 `.md` 所在目录（官方 Images 指南的 Markdown 示例同样用 `../assets/stars.png` 这类相对写法）。

### 2.2 以 `/` 开头＝公共目录路径，不按文件解析

**【源码断言】** 收集 Markdown 图片时，判定"本地图"的条件是：**不是合法 URL，且不以 `/` 开头**：

```ts
if (URL.canParse(url)) { ...remote... }
else if (!url.startsWith('/')) { // Then it's a local image.
  localImagePaths.add(url);
}
```

来源：[packages/markdown/remark/src/remark-collect-images.ts](https://github.com/withastro/astro/blob/main/packages/markdown/remark/src/remark-collect-images.ts)。→ 推论：`/images/x.webp`（public）永远不会被当作本地资产处理；远程 URL 只有在 `image.domains` / `image.remotePatterns` 授权后才进远程优化路径。

### 2.3 `src/` 图会被处理，`public/` 图**永不**优化（官方明文的重复强调）

**【文档明文】**

> "Your local images stored in `src/` and remote images will be processed and optimized. ... **Images stored in the `public/` folder are never optimized.**"

来源：[Images · Images in Markdown files](https://docs.astro.build/en/guides/images/#images-in-markdown-files)。

### 2.4 `image()` 的图 vs 正文图的差别

**【文档明文】** + **【源码断言】** 归纳：

| | frontmatter `image()` | 正文 `![](./x.png)` |
|---|---|---|
| 形态 | 校验后变成 **`ImageMetadata` 对象**（`width`/`height`/`format` 可用） | 渲染成 HTML `<img>`，走 rehype 插件加 `__ASTRO_IMAGE_` 标记后再优化 |
| 能否当组件入参 | 能：`<Image src={post.data.cover} />` | 不能：正文图只是 HTML，拿不到元数据 |
| 类型安全 | 有（schema 校验，路径错直接构建失败） | 无（写错路径不一定在 schema 阶段报错） |
| `.md` 里可用组件 | — | **不可**用 `<Image />`/`<Picture />` |

**【文档明文】** `.md` 里不能用图片组件：

> "The `<Image />` and `<Picture />` components are unavailable in `.md` files. If you require more control over your image attributes, we recommend using Astro's MDX integration."

来源：同上（Images · Images in Markdown files）。

---

## 3. 集合目录带子目录时 `entry.id` 的形态

### 3.1 `id` **包含子目录段**（官方明文）

**【文档明文】** 官方在讲按子目录过滤时顺带确认了这一点：

> "The filter argument also supports filtering by nested directories within a collection. **Since the `id` includes the full nested path**, you can filter by the start of each `id` ... (e.g. `id.startsWith('en/')`)"

来源：[Content collections · Filtering collection queries](https://docs.astro.build/en/guides/content-collections/#filtering-collection-queries)。

### 3.2 `index.md` 的 `index` **会被去掉**（源码级结论，文档未直说）

**【源码断言】** `glob()` 的默认 id 生成器取 `slug` 字段，而 slug 生成逻辑对每段做 slug 化后**删掉结尾的 `/index`**：

```ts
const slug = rawSlugSegments
  .map((segment) => githubSlug(segment))
  .join('/')
  .replace(/\/index$/, '');
return slug;
```

来源：[packages/astro/src/content/utils.ts · getContentEntryIdAndSlug](https://github.com/withastro/astro/blob/main/packages/astro/src/content/utils.ts)；glob loader 侧 `const { slug } = getContentEntryIdAndSlug({...}); return slug;`（[glob.ts · generateIdDefault](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/glob.ts)）。

**由此推得（`base: './src/content/papers'`）**：

| 磁盘上的文件 | `entry.id` |
|---|---|
| `papers/attention-is-all-you-need/index.md` | `attention-is-all-you-need` ← **无 `index`** |
| `papers/attention-is-all-you-need.md` | `attention-is-all-you-need` |
| `papers/2024/attention.md` | `2024/attention` ← **含子目录段** |
| `papers/index.md` | `index` ← 只有根级 `index.md` 不会被去尾（正则要求前缀 `/`） |
| `papers/<slug>/fig-1.webp` | **不是条目**（`pattern: '**/*.md'` 不匹配），但可作为图片被引用 |

⚠️ **冲突风险（源码级）**：若同时存在 `papers/foo.md` 与 `papers/foo/index.md`，两者的 id 都是 `foo` → 触发 `DuplicateContentEntrySlugError`（"`**blog** contains multiple entries with the same slug: \`slug\`. Slugs must be unique."，[errors-data.ts](https://github.com/withastro/astro/blob/main/packages/runtime/src/internal/core/errors/errors-data.ts)）。所以"每篇一个目录"要求**不并存同名 `.md`**。

### 3.3 frontmatter `slug` 覆盖 `id`：源码里是**第一优先级**

**【文档明文】**（可覆盖）：

> "You can **override** a single entry's generated `id` by adding your own `slug` property to the file frontmatter or data object for JSON files. This is similar to the 'permalink' feature of other web frameworks."

**【源码断言】** 实现上 `slug` 一旦存在就直接返回，连文件名都不看：

```ts
function generateIdDefault({ entry, base, data }, isLegacy) {
  if (data.slug) { return String(data.slug); }
  ...
}
```

来源：[glob.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/glob.ts)。→ 本项目「手填 slug + `[slug].astro` 用 `entry.id`」的组合是**官方支持的一等路径**，且手填值会原样成为 `id`（不再 slug 化）。

**【文档明文】** 但手填 slug 含 `/` 时路由要换写法：

> "If your custom slugs contain the `/` character to produce URLs with multiple path segments, you must use a **rest parameter (e.g. `[...id]`)** in the `.astro` filename for this dynamic routing page."

来源：[Content collections · Generating Routes from Content](https://docs.astro.build/en/guides/content-collections/#generating-routes-from-content)。→ 手填 slug **只要保证不含 `/`**，`src/pages/papers/[slug].astro` 就够。

---

## 4. Zod schema 能表达什么；跨条目唯一性做不到

### 4.1 基础能力：全部是 Zod v4

**【文档明文】**

> "To use Zod in Astro, import the `z` utility from `"astro/zod"`. This is a re-export of the Zod library, and **it supports all of the features of Zod 4**."

所以 `z.array(z.object({...}))`、`.optional()`、`.default()`、字符串正则校验、`.refine()` 都是 Zod 4 的常规能力，官方 cheatsheet 给了这些写法的示例（如 `.refine((val) => ..., { error: "..." })`、`z.array(z.string())`、`.default("en")`、`z.url().optional()`）：

来源：[Defining datatypes with Zod](https://docs.astro.build/en/guides/content-collections/#defining-datatypes-with-zod)、[astro/zod 参考](https://docs.astro.build/en/reference/modules/astro-zod/)（实际读 `reference/modules/astro-zod.mdx`）。

**已知限制（文档明文）**：

> "All Zod schema methods (e.g. `.parse()`, `.transform()`) are available, with some limitations. **Notably, performing custom validation checks on images using `image().refine()` is unsupported.**"

来源同上（Content collections · Zod schema methods）。→ 想对图片字段加自定义校验（比如"必须 16:9"）**不能**用 `image().refine()`，得换路子（自定义字段 + `.refine()`，或构建期脚本）。

### 4.2 跨条目唯一性：**schema 层做不到**（官方从未说能做，且机制上排除）

**【文档明文】** schema 的定位是"**每个条目**的数据形状校验"：

> "Schemas enforce consistent frontmatter or entry data **within a collection** through Zod validation. A schema **guarantees** that this data exists in a predictable form ... If any file violates its collection schema, Astro will provide a helpful error..."

来源：[Defining the collection schema](https://docs.astro.build/en/guides/content-collections/#defining-the-collection-schema)。→ 校验输入是"一个条目的 data 对象"（`parseData({ id, data })`，[Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/#loadercontextparsedata)），**拿不到其它条目**，因此"DOI 全站唯一""标题不重复"这类断言在 schema 里无数据可用。**【官方未说明】** 官方文档**没有**任何一段话讨论"跨条目唯一性校验"，既没说支持也没说反对——它是被机制排除，而不是被点名禁止。

**【源码断言】** 官方唯一强制唯一的东西是**条目的 id/slug**：

- `DataEntry.id`："An identifier for the entry, **which must be unique within the collection**."（[Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/#dataentryid)）
- 重复即报错：`DuplicateContentEntrySlugError`（"Slugs must be unique."，[errors-data.ts](https://github.com/withastro/astro/blob/main/packages/runtime/src/internal/core/errors/errors-data.ts)）。

→ 结论：**DOI 去重 / slug 撞车防护都要自己做构建期脚本**（例如用 `getCollection()` 在 `getStaticPaths()` 或一个 `astro:build:start` 集成里比对并 `throw`）。

---

## 5. 图片优化

### 5.1 默认图像服务就是 Sharp

**【文档明文】**

> "**Sharp** is the default image service used for `astro:assets`. You can further configure the image service using the `image.service` option."

来源：[Images · Default image service](https://docs.astro.build/en/guides/images/#default-image-service)。官方还提示 strict 包管理器需手动装：

> "When using a strict package manager like `pnpm`, you may need to manually install Sharp into your project even though it is an Astro dependency: `pnpm add sharp`"

**【源码断言】** 旁证：`sharp` 在 `package.json` 里是 **`optionalDependencies`**（`"sharp": "^0.35.4"`），不是硬依赖——所以它"默认但不保证装上"（[package.json](https://github.com/withastro/astro/blob/main/packages/astro/package.json)）。

### 5.2 `<Image />` 对属性的要求

**【文档明文】**：

- `src`（required）——`src/` 本地图必须**先 import**再传对象；`public/` 图传相对 public 的路径字符串；远程图传完整 URL。
- `alt`（required）——"This attribute is **required** for both the `<Image />` and `<Picture />` components. If no alt text is provided, a helpful error message will be provided reminding you to include the `alt` attribute."（缺失即报错，不是警告）
- `width`/`height`——**只有 `public/` 的图是必填**："these properties are **required for images stored in your `public/` folder** as Astro is unable to analyze these files."；`src/` 图自动推断，原始比例时可不填。

来源：[astro:assets · src / alt / width and height](https://docs.astro.build/en/reference/modules/astro-assets/#src-required)、[Images · Alt Text](https://docs.astro.build/en/guides/images/#alt-text)。

### 5.3 构建期是否转换格式：**会**，`<Image />` 默认输出 `.webp`

**【文档明文】**

> "`<Image />` can transform a local or authorized remote image's dimensions, file type, and quality for control over your displayed image. **This transformation happens at build time for prerendered pages.**"

> "By default, the `<Image />` component will produce a **`.webp`** file."

`<Picture />` 还能多格式：`formats` "By default, this is set to `['webp']`"，`fallbackFormat` "Defaults to `.png` for static images (or `.jpg` if the image is a JPG)"。

来源：[Images · `<Image />`](https://docs.astro.build/en/guides/images/#image-)、[Image · format](https://docs.astro.build/en/reference/modules/astro-assets/#format)、[Picture](https://docs.astro.build/en/reference/modules/astro-assets/#picture-)。

### 5.4 `public/` 图片**不**经优化（两条官方明文）

**【文档明文】**

> "Files in the `public/` directory are always served or copied into the build folder **as-is, with no processing**."

> "Images stored in the `public/` folder are **never optimized**."

> "Images in your `public/` folder are never optimized, and **responsive images are not supported**."

来源：[Images · src/ vs public/](https://docs.astro.build/en/guides/images/#src-vs-public)、[Images in Markdown files](https://docs.astro.build/en/guides/images/#images-in-markdown-files)、[Responsive image behavior](https://docs.astro.build/en/guides/images/#responsive-image-behavior)。

---

## 6. 多段长文本在 frontmatter 里怎么写

### 6.1 Astro 用什么解析 frontmatter：`yaml` 包 + core schema

**【源码断言】** frontmatter 由 `yaml`（eemeli/yaml）的 `parseDocument` 解析，**`schema: 'core'`**（YAML 1.2 core schema），并开启 `merge` 与 `timestamp` 自定义 tag：

```ts
const document = parseDocument(source, {
  customTags: ['timestamp'], merge: true, schema: 'core',
});
```

来源：[packages/internal-helpers/src/yaml.ts](https://github.com/withastro/astro/blob/main/packages/internal-helpers/src/yaml.ts)；分隔符判定见 [frontmatter.ts](https://github.com/withastro/astro/blob/main/packages/internal-helpers/src/frontmatter.ts)（`---` → YAML，`+++` → TOML）。

### 6.2 块标量行为：`|` 保留换行，`>` 折成空格

**【规范明文】** YAML 1.2.2 对两种块标量的定义：

> "Scalar content can be written in block notation, using a **literal style** (indicated by `|`) where **all line breaks are significant**. Alternatively, they can be written with the **folded style** (denoted by `>`) where **each line break is folded to a space** unless it ends an empty or a more-indented line."

> 例：`stats: |` → `0.278 Batting Average` 保留换行；`accomplishment: >` → 单行文本。

来源：[YAML 1.2.2 spec · Chapter 2 Scalars / 8.1.3](https://github.com/yaml/yaml-spec/blob/main/spec/1.2.2/spec.md)（线上 `yaml.org` 亦被本机 SSRF 拦截，故用官方 spec 仓库源文件）。

`|-` 的 `-` 是 **chomping indicator**（去掉结尾换行），`>` 同理可写 `>-`。→ 结论：**`|` / `|-` 能正确保留段内换行**；`>` 会把换行变空格，只适合"一句话很长要折行"的场景，**不适合多段**。

### 6.3 官方对"长文本放 frontmatter 还是正文"有没有说法

**【官方未说明】** 没有。`guides/markdown-content.mdx`、`guides/content-collections.mdx`、`reference/modules/astro-zod.mdx` 三处都只讲"frontmatter 是 YAML/TOML 定义的自定义属性"，**从未**比较过"长文本该放 frontmatter 字段还是正文 body"，也没有长度建议、没有"frontmatter 支持多段"的示例。官方唯一的间接态度是：正文是"content"，frontmatter 是"properties such as a title, description, and tags"。

---

## 官方未说明 / 存疑清单

1. **`image()` 能否接受 `public/` 路径或 `https://` 绝对 URL** —— 文档无正面说明。源码走 `pluginContext.resolve`（模块解析），推断**不接受**；需实测确认（含"接受但原样透传"的可能性）。
2. **`z.array(image())` 是否官方支持** —— 文档只给了单个 `image()` 的示例；从类型上是 Zod schema 可嵌套，但**没有官方示例或说明**，每篇"1–2 张图"若写成数组请先跑一次构建。
3. **`image()` 与 `.refine()` 组合** —— 文档只说 `image().refine()` **不支持**；"先 `image()` 再用 `z.object` 包一层后 `.refine()`"是否可行，官方未说明。
4. **跨条目唯一性校验** —— 官方完全没有讨论；机制上 schema 逐条校验，所以做不到。**没有任何官方推荐的绕法**（构建期脚本的具体钩子也没有官方示例）。
5. **`index.md` 去尾是文档未写的源码行为** —— `replace(/\/index$/, '')` 在源码里，但文档只说"id 包含完整的嵌套路径"，没写 `index` 会被吃掉。属**源码断言**，跨大版本需复核。
6. **根级 `papers/index.md` 的 id 是 `index`** —— 由同一条正则推出（要求 `/` 前缀），非文档结论。
7. **`_` 开头目录/文件在显式 `glob()` 下是否被跳过** —— **未核实**。源码里忽略下划线的逻辑（`globWithUnderscoresIgnored`）挂在 legacy 自动生成集合的路径上；显式 `glob({ pattern: '**/*.md' })` 是否同样跳过 `_shared/` 未验证。若想用 `_shared/` 放大目录图，请实测。
8. **长文本放 frontmatter vs 正文** —— 官方无任何说明（无长度建议、无多段示例）。
9. **`image()` 字段的图进不进 `public/` 之外的产物路径、产物文件名** —— `propsToFilename` 有规则，但"论文图最终落在 `dist/_astro/` 的什么名字"文档未直说。
10. **本次抓取的技术限制**：`docs.astro.build` 与 `yaml.org` 在本机被解析到私有地址而遭 SSRF 拦截，文档原文取自 `withastro/docs` 与 `yaml/yaml-spec` 仓库源文件；本会话未在本地跑 `astro build` 实测，第 3 节的 id 形态与第 5 节的产物行为均依赖源码，而非构建产物。

---

## 对本项目（`src/content/papers/` + 手填 slug + 每篇 1–2 图）的直接含义

**A. "每篇一个目录放图" 是官方明确认可的形态，且技术上零阻力。**

- `Images can be stored in any folder, including alongside your content.`（第 1.1 节）
- `papers/<slug>/index.md` + `papers/<slug>/fig-1.webp` 时，条目 id 就是 `<slug>`（`index` 被去掉），**与手填 slug 天然对齐**（第 3.2、3.3 节）。
- 代价：不能与 `papers/<slug>.md` 同名并存，否则 id 撞车直接构建失败（第 3.2 节）。
- 统一大目录也能用（`image()` 支持 `../shared/x.webp`），但会丢掉"目录即条目"的可读性；官方没有偏好，属纯组织选择。

**B. frontmatter 里引用图，写相对 `.md` 的路径即可，并用 `image()`。**

```ts
// 推荐形态
figures: z.array(z.object({
  src: image(),            // 相对该 .md 解析 → ./fig-1.webp
  caption: z.string().optional(),
})).max(2).optional(),
```

- 解析基准是**该 `.md` 文件所在目录**（官方注释 "will resolve to src/content/blog/firstpostcover.jpeg"，第 1.3 节），不是项目根。
- 过了 `image()` 就拿到 `ImageMetadata`（`width`/`height`/`format` 全有），模板里 `<Image src={fig.src} alt={...} />` **不必手填宽高、不必自己算比例**（第 1.5、5.2 节）。
- `alt` 是**必填**，缺失即构建报错——所以 schema 里应当把说明文字（caption/alt）设计成字段，而不是指望模板兜底（第 5.2 节）。

**C. 图放 `src/content/papers/` 下会被优化；一旦为了省事挪到 `public/`，就永远是原图。**

- `src/` 图构建期转 `.webp`（默认），`public/` 图 "never optimized" + "responsive images are not supported"（第 5.3、5.4 节）。→ 论文截图/图表走 `src/` 是唯一能吃到优化的路线。

**D. 唯一性、DOI 查重必须自己写构建期脚本。**

- schema 逐条校验，拿不到其它条目；官方只对 id 强制唯一（第 4.2 节）。→ 在 `getStaticPaths()` 里先 `getCollection()` 建 Map 比对 DOI/标题并 `throw`，是最省事的落点。

**E. 多段中文简介：frontmatter 能存，但**只有 `|` / `|-` 能保段落**。**

- `|` 保留换行、`>` 折成空格（第 6.2 节），Astro 用 `yaml` 包 core schema 解析，块标量是标准行为。
- 但官方对"长文本放哪"零表态（第 6.3 节）。**事实层面的取舍**：放 frontmatter 则可被 schema 校验（`z.string()`）、可与图字段并列；放正文则天然支持 Markdown 排版（链接、强调、多段），但不再是"字段"，无法校验长度/必填。**本项目"1–2 段纯文本、不能分段"的约束下，frontmatter + `|-` 最贴合已定字段表**；若以后要富文本，再迁到 body。
