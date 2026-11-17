# 空内容集合 / 空动态路由下的 Astro 构建行为：一手事实核查

> 调研与实测日期：**2026-11-17**。
> 判定基准版本：`astro` **7.4.12**（当时 npm `latest`，2026-11-13T19:02:02Z 发布；`npm view astro version` → `7.4.12`）。
> 本机环境：Windows（x64）、Node **v24.18.0**、npm **12.2.0**、`@astrojs/check@0.9.12` + `typescript@6.0.3`。
> 一手来源：Astro 官方文档仓库 `withastro/docs`（commit `a3d01b7481cfe7de467fca796a2341f708fa8389`，`src/content/docs/en/*.mdx` 共 430 篇全文本地 grep）；Astro 源码仓库 `withastro/astro` tag `astro@7.4.12`（commit `5b7c3275cf2f4aa0d1685495f943cb19039a2e83`，`packages/astro/src` 与 `packages/astro/test` 本地 grep）；以及**本机一次性实测**。
> 本文不采用任何二手博客、AI 摘要或搜索引擎片段作为依据；唯一的"社区说法"（问题 4）是**待证伪对象**，不是依据。

---

## 本笔记回答的问题

钉死「骨架期 `notes` 集合 0 条」这件事到底会让 `astro build` 变成什么样，以及它如何决定骨架验收清单能写什么、不能写什么：

- **Q1** 集合目录整体不存在（`glob({ base: './src/content/notes', ... })` 但 `src/content/notes/` 不存在）
- **Q2** 集合目录存在但只有 `.gitkeep`
- **Q3** `src/pages/notes/[slug].astro` 的 `getStaticPaths()` 返回 `[]`
- **Q4** 同一路由改成 `[...slug].astro`（rest 参数）返回 `[]` 是否不同（核实社区说法）
- **Q5** 0 条路径时该模板的组件代码是否完全不被执行
- **Q6** `astro check` / `astro build` 是否因"动态路由产出 0 页面"而报错（有没有 Next.js 式"至少一个页面"限制）
- **Q7** `dist/notes/index.html` 与动态路由共存是否正常

## 实测方法与证据分级

- **【实测】**：在 `%TEMP%\astro-empty-probe`（`C:\Users\zwxUnderdogs\AppData\Local\Temp\astro-empty-probe`）手工搭的最小工程里跑出来的真实输出。工程结构完全对齐计划中的骨架：`papers` 2 条、`projects` 1 条、`notes` 0 条、`profile` 1 条；`build.format` 用默认值（`'directory'`）；路由为 `src/pages/{index,404}.astro`、`papers/{index,[slug]}.astro`、`projects/{index,[slug]}.astro`、`notes/{index,[slug]}.astro`。所有实验在 `%TEMP%` 下完成，**未触碰 `E:\项目\MyWeb` 任何文件**。
- **【源码】**：`withastro/astro` tag `astro@7.4.12` 的实现代码，用来解释"为什么"以及确认没有隐藏的"至少一页"检查。
- **【文档】**：`withastro/docs` 的 en mdx 原文。**注意：`docs.astro.build` 在本机被 SSRF 防护拦截（解析到私有地址），因此全部改从文档仓库源码取原文**；下引均为仓库内文件路径 + 行号，可复核。
- 三者不一致时以【实测】为准，并明确指出差异。

**关键事实先说**：`docs.astro.build` 全站抓不到（`web_fetch` 报 SSRF blocked）。本笔记所有"文档"依据都来自 `raw.githubusercontent.com/withastro/docs` / `codeload.github.com` 的 tarball，即文档站点的**构建源文件**，与线上页面同源同版本。

---

## 一页纸结论

| # | 问题 | 构建结果 | 一句话结论 |
|---|---|---|---|
| Q1 | `src/content/notes/` 目录**不存在** | **成功（exit 0）**，1 条 WARN | `[glob-loader] The base directory "..." does not exist.`；只警告不失败，`getCollection('notes')` 返回 `[]` |
| Q2 | 目录存在但只有 `.gitkeep` | **成功（exit 0）**，1 条 WARN（措辞不同） | `[glob-loader] No files found matching "**/index.md" in directory "src\content\notes"`；`.gitkeep` **消不掉**这条警告，也**不让**集合"注册"成功 |
| Q3 | `[slug].astro` 的 `getStaticPaths()` 返回 `[]` | **成功（exit 0）**，无额外警告 | 不为该路由生成任何页面；`dist/notes/` 是否存在只取决于 `notes/index.astro`，不冲突 |
| Q4 | `[...slug].astro`（rest）返回 `[]` | **成功（exit 0）**，与 Q3 **完全一致** | 社区"rest 参数空数组会产出 404"的说法**不成立**；rest 与非 rest 在 `[]` 时行为相同 |
| Q5 | 模板代码是否执行 | 不执行（但**模块会被加载**） | 组件函数体（frontmatter + 模板）0 次执行；`getStaticPaths()` 执行 1 次；`import` 的模块级副作用**会**执行 |
| Q6 | 是否因"0 页面"报错 | **不报错** | Astro 没有 Next.js 式"至少一个页面"限制；极端情况下 `0 page(s) built` 且 exit 0 |
| Q7 | 列表页与动态路由共存 | **正常** | `dist/notes/index.html` 单独存在、无子目录；`/notes/` 由 `index.astro` 独占，动态路由 0 条时不产生竞争 |

---

## Q1 · 集合目录整体不存在

### 实测命令

工程里 `src/content.config.ts` 声明了 `notes`：

```ts
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/index.md' }),
  schema: z.object({ title: z.string(), date: z.coerce.date() }),
});
```

磁盘上**没有** `src/content/notes/`（`Test-Path src\content\notes` → `False`），然后 `astro build`。

### 真实终端输出

```text
> astro-empty-probe@1.0.0 npx
> astro build

19:25:05 [content] Syncing content
19:25:05 [WARN] [glob-loader] The base directory "C:\Users\zwxUnderdogs\AppData\Local\Temp\astro-empty-probe\src\content\notes\" does not exist.
19:25:05 [content] Synced content
19:25:05 [types] Generated 421ms
19:25:05 [build] output: "static"
19:25:05 [build] mode: "static"
19:25:05 [build] directory: C:\Users\zwxUnderdogs\AppData\Local\Temp\astro-empty-probe\dist\
19:25:05 [build] Collecting build info...
19:25:05 [build] ✓ Completed in 440ms.
19:25:05 [build] Building static entrypoints...
19:25:05 [vite] ✓ built in 134ms
19:25:05 [vite] ✓ built in 13ms
19:25:05 [build] Rearranging server assets...

 generating static routes 
19:25:05 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE] getStaticPaths called, notes.length = 0
19:25:05   ├─ /404.html (+8ms) 
19:25:05   ├─ /notes/index.html19:25:05 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE] notes/index.astro executed, notes.length = 0
 (+3ms) 
19:25:05   ├─ /papers/demo-paper-a/index.html (+3ms) 
19:25:05   ├─ /papers/demo-paper-b/index.html (+2ms) 
19:25:05   ├─ /papers/index.html (+3ms) 
19:25:05   ├─ /projects/demo-project/index.html (+2ms) 
19:25:05   ├─ /projects/index.html (+2ms) 
19:25:05   ├─ /index.html19:25:05 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE-COUNTS] {"papers":2,"projects":1,"notes":0,"profile":1,"notesIds":[]}
 (+3ms) 
19:25:05 ✓ Completed in 52ms.

19:25:05 [build] ✓ Completed in 245ms.
19:25:05 [build] 8 page(s) built in 686ms
19:25:05 [build] Complete!

=== EXIT CODE: 0 ===
```

`dist/` 产出（8 个页面，**没有** `dist/notes/<slug>/`）：

```text
dist\404.html
dist\index.html
dist\notes\index.html
dist\papers\demo-paper-a\index.html
dist\papers\demo-paper-b\index.html
dist\papers\index.html
dist\projects\demo-project\index.html
dist\projects\index.html
```

### 依据

- 【实测】如上：**exit 0，构建成功，1 条 glob-loader WARN**。
- 【源码】`packages/astro/src/content/loaders/glob.ts:289-294`：

  ```ts
  const exists = existsSync(baseDir);

  if (!exists) {
    // We warn and don't return because we will still set up the watcher in case the directory is created later
    logger.warn(`The base directory "${fileURLToPath(baseDir)}" does not exist.`);
  }
  ```

  注释明确写了"warn 且**不 return**，以便目录以后被创建时仍能 watch"——这就是"只警告不失败"的实现原因。
- 【文档】`en/reference/errors/collection-does-not-exist-error.mdx:16-18` 明文（这是官方错误页里的一条 Deprecated 说明）：

  > `:::caution[Deprecated]`
  > Collections that do not exist no longer result in an error. A warning is given instead.

  即"集合不存在"**曾经**是 error，现在是 warning。这直接回答了"成功/警告/失败"：**警告**。

### 结论

**构建成功，只有警告，不失败。** 报错原文三条（按出现顺序）：

1. `[WARN] [glob-loader] The base directory "<绝对路径>\src\content\notes\" does not exist.`
2. `[WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.`（每次 `getCollection('notes')` 触发一次；本次因 `getStaticPaths` + `notes/index.astro` + `index.astro` 各调一次，出现 **3 次**）
3. 无其他错误。

`getCollection('notes')` 返回 **`[]`**（`[PROBE-COUNTS]` 里 `"notes":0,"notesIds":[]`）。注意它是**通过"警告 + return []"分支**返回的空数组，不是"已注册但为空"的集合——见 Q2 源码分析。

---

## Q2 · 目录存在但为空（只有 `.gitkeep`）

### 实测命令

```powershell
New-Item -ItemType Directory -Force -Path "src\content\notes" | Out-Null
Set-Content -LiteralPath "src\content\notes\.gitkeep" -Value "" -Encoding utf8
npx astro build
```

### 真实终端输出

```text
19:25:23 [content] Syncing content
19:25:23 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
19:25:23 [content] Synced content
19:25:23 [types] Generated 479ms
19:25:23 [build] output: "static"
19:25:23 [build] mode: "static"
19:25:23 [build] directory: C:\Users\zwxUnderdogs\AppData\Local\Temp\astro-empty-probe\dist\
19:25:23 [build] Collecting build info...
19:25:23 [build] ✓ Completed in 500ms.
19:25:23 [build] Building static entrypoints...
19:25:23 [vite] ✓ built in 139ms
19:25:23 [vite] ✓ built in 12ms
19:25:23 [build] Rearranging server assets...

 generating static routes 
19:25:23 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE] getStaticPaths called, notes.length = 0
19:25:23   ├─ /404.html (+9ms) 
19:25:23   ├─ /notes/index.html19:25:23 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE] notes/index.astro executed, notes.length = 0
 (+4ms) 
...
19:25:23 [build] 8 page(s) built in 759ms
19:25:23 [build] Complete!

=== EXIT CODE: 0 ===
```

`src/content/notes/` 内容：

```text
Name
----
.gitkeep
```

`dist\notes\index.html` 依然产出。

### 依据

- 【实测】exit 0，构建成功。**警告只是换了措辞**：从「base directory 不存在」变成「没有文件匹配 pattern」。
- 【源码】`glob.ts:301-305`：

  ```ts
  if (exists && files.length === 0) {
    logger.warn(
      `No files found matching "${globOptions.pattern}" in directory "${relativePath}"`,
    );
  }
  ```

  所以"目录存在但 0 个匹配文件"和"目录不存在"是**两个不同的 warn 分支**，但都是 warn。
- 【源码】关键：`.gitkeep` **不会**让集合在 data store 里被注册。`getCollection` 的判定是 `hasCollection(collection)`（`packages/astro/src/content/runtime.ts:115`），而 `hasCollection` 直接读内部 Map（`packages/astro/src/content/data-store.ts:118-120`）：

  ```ts
  hasCollection(collectionName: string) {
      return this._collections.has(collectionName);
  }
  ```

  而 `_collections` 只在 `set()` 被调用时才写入（`packages/astro/src/content/mutable-data-store.ts:82-86`）。glob loader 只在 `store.set(...)`（`glob.ts:240/253/262`，每个匹配文件一次）时注册。**0 个匹配文件 ⇒ 从不 `set` ⇒ 集合从未注册 ⇒ `hasCollection` 为 false**。这就是为什么 `.gitkeep` 之后仍然打出同一条 `The collection "notes" does not exist or is empty.` 警告。
- 【源码】`runtime.ts:135-143` 是该警告的来源，且**返回值固定是 `[]`**：

  ```ts
  } else {
      logger.warn(
          'content',
          `The collection ${JSON.stringify(collection)} does not exist or is empty. Please check your content config file for errors.`,
      );
      return [];
  }
  ```

- 【实测】额外验证：即使集合名**从未在 `content.config.ts` 里声明过**，行为也一样——`getCollection('ghostly' as any)` 在构建中返回 `[]` 并警告，exit 0：

  ```text
  19:40:56   ├─ /ghost/index.html19:40:56 [WARN] [content] The collection "ghostly" does not exist or is empty. Please check your content config file for errors.
  [EXP16] getCollection("ghostly") returned length = 0
  19:40:56 [build] 9 page(s) built in 730ms
  === EXIT: 0 ===
  ```

### 结论

**构建成功，1 条警告，`getCollection('notes')` 返回 `[]`。** 与 Q1 的差别**只有警告文案**：

| 情形 | glob-loader 警告原文 | `getCollection` 返回 | 构建 |
|---|---|---|---|
| 目录不存在 | `The base directory "<abs>\src\content\notes\" does not exist.` | `[]` | 成功 |
| 目录存在、0 匹配文件 | `No files found matching "**/index.md" in directory "src\content\notes"` | `[]` | 成功 |

**`.gitkeep` 不能消掉任何警告**，也不能让集合"注册"成功。它唯一的作用是让 git 能跟踪这个空目录（见「对骨架验收的影响」）。

---

## Q3 · `[slug].astro` 的 `getStaticPaths()` 返回 `[]`

### 实测命令（硬编码空数组，排除"收集本身为空"的干扰）

```astro
---
console.log('[PROBE-3] MODULE TOP-LEVEL OF notes/[slug].astro EXECUTED (frontmatter)');

export async function getStaticPaths() {
  console.log('[PROBE-3] getStaticPaths() CALLED, returning hardcoded []');
  return [];
}

const { entry } = Astro.props;
console.log('[PROBE-3] NOTES BODY RENDERED -> entry.data.title =', entry.data.title);
---
```

`src/pages/notes/index.astro` 同时存在（列表页）。

### 真实终端输出

```text
 generating static routes 
[PROBE-3] getStaticPaths() CALLED, returning hardcoded []
19:25:38   ├─ /404.html (+8ms) 
19:25:38   ├─ /notes/index.html19:25:38 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE] notes/index.astro executed, notes.length = 0
 (+4ms) 
19:25:38   ├─ /papers/demo-paper-a/index.html (+3ms) 
19:25:38   ├─ /papers/demo-paper-b/index.html (+2ms) 
19:25:38   ├─ /papers/index.html (+2ms) 
19:25:38   ├─ /projects/demo-project/index.html (+1ms) 
19:25:38   ├─ /projects/index.html (+3ms) 
19:25:38   ├─ /index.html19:25:38 [WARN] [content] The collection "notes" does not exist or is empty. Please check your content config file for errors.
[PROBE-COUNTS] {"papers":2,"projects":1,"notes":0,"profile":1,"notesIds":[]}
 (+4ms) 
19:25:38 ✓ Completed in 58ms.

19:25:38 [build] 8 page(s) built in 735ms
19:25:38 [build] Complete!

=== EXIT CODE: 0 ===
```

`dist` 内容：

```text
dist\404.html
dist\index.html
dist\notes\index.html          ← 只有这一个，来自 notes/index.astro
dist\papers\demo-paper-a\index.html
dist\papers\demo-paper-b\index.html
dist\papers\index.html
dist\projects\demo-project\index.html
dist\projects\index.html
```

**没有** `dist\notes\<slug>\` 任何子目录。

### 对照：去掉列表页，只留空 `[slug].astro`

```text
================ EXP15: 只有 [slug].astro 返回 []（无列表页） ================
19:40:27 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
19:40:27 [build] ✓ Completed in 563ms.
19:40:27   ├─ /index.html[PROBE-COUNTS] {"papers":2,"projects":1,"notes":0,"profile":1,"notesIds":[]}
19:40:27 ✓ Completed in 64ms.
19:40:27 [build] ✓ Completed in 258ms.
19:40:27 [build] 7 page(s) built in 822ms
19:40:27 [build] Complete!
=== EXIT: 0 ===
=== dist/notes exists? ===
False
```

### 依据

- 【实测】**成功，exit 0，没有针对"0 路径"的任何警告。** `dist/notes/` 的出现完全由 `notes/index.astro` 决定，不由 `[slug].astro` 决定。
- 【源码】`packages/astro/src/runtime/prerender/static-paths.ts:122-172`（`#getPathsForRoute`）：对静态路由直接 push 一条 pathname 并 `return`；对动态路由才 `callGetStaticPaths(...)`，然后

  ```ts
  // Convert params to pathnames using stringifyParams
  for (const staticPath of staticPaths) {
      const pathname = stringifyParams(staticPath.params, route, manifest.trailingSlash);
      paths.push({ pathname, route, ... });
  }

  return paths;
  ```

  `staticPaths` 为 `[]` 时循环 0 次，返回 `[]`。**没有任何"数组为空则抛错"的分支。**
- 【源码】`validateGetStaticPathsResult`（`packages/astro/src/core/routing/validation.ts:26-59`）只检查三件事：整体是不是数组、每个元素是不是非 null 对象、`params` 是否非空。**空数组 `[]` 直接 `forEach` 0 次通过**，不报错。
- 【源码】`packages/astro/src/core/build/generate.ts:143-263`：拿到 `pathsWithRoutes` 后做冲突过滤，然后 `for (const paths of generationPhases) for (const { pathname, route } of paths) { await generatePathWithPrerenderer(...) }`。空数组 = 0 次渲染循环，不会有任何 error。
- 【文档】`en/reference/routing-reference.mdx:86-118`：`getStaticPaths()` 的语义是"**must return an array of objects to determine which URL paths will be prerendered**"。文档从未说过"必须至少返回一条"。

### 结论

**构建成功，无警告。** `dist/notes/` 会被创建（因为有 `notes/index.astro`），但里面**只有 `index.html`**，没有 `dist/notes/<slug>/`。**不会**生成 `dist/notes/index.html` 的第二个副本，**不会**与列表页冲突（见 Q7）。

---

## Q4 · 对照实验：`[...slug].astro`（rest 参数）返回 `[]`

### 实测命令与输出

把 `src/pages/notes/[slug].astro` 换成 `src/pages/notes/[...slug].astro`，`getStaticPaths()` 仍硬编码 `return []`：

```text
================ EXPERIMENT 4: [...slug].astro getStaticPaths() { return []; } (与 notes/index.astro 共存) ================
19:27:31 [content] Syncing content
19:27:31 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
...
 generating static routes 
[PROBE-4] getStaticPaths() CALLED, returning hardcoded []
19:27:31   ├─ /404.html (+9ms) 
19:27:31   ├─ /notes/index.html19:27:31 [WARN] [content] The collection "notes" does not exist or is empty. ...
[PROBE] notes/index.astro executed, notes.length = 0
 (+3ms) 
19:27:31   ├─ /papers/demo-paper-a/index.html (+3ms) 
...
19:27:31 [build] 8 page(s) built in 726ms
19:27:31 [build] Complete!

=== EXIT CODE: 0 ===
```

`dist` 与 Q3 **逐字节等价**：只有 `dist\notes\index.html`，无子目录。

再去掉列表页（只留 rest 路由）：

```text
================ EXPERIMENT 4b: 去掉 notes/index.astro，只留 [...slug].astro 返回 [] ================
[PROBE-4] getStaticPaths() CALLED, returning hardcoded []
19:27:40   ├─ /404.html (+8ms) 
19:27:40   ├─ /papers/demo-paper-a/index.html (+3ms) 
...
19:27:40 [build] 7 page(s) built in 669ms
19:27:40 [build] Complete!
=== EXIT CODE: 0 ===
=== dist notes ===
=== dist/notes exists? ===
False
```

与 Q3 的对照实验（EXP15）**完全一致**：也是 `7 page(s) built`，`dist/notes` 不存在。

### 关于「社区说法」的核实

待核实的说法是：*"rest 参数（`[...slug].astro`）的 `getStaticPaths()` 返回空数组会产出 404，与非 rest 参数不同。"*

**核实结果：不成立（至少在 build 侧不成立）。**

- 【实测】rest 与非 rest 在 `return []` 时：exit code、警告集合、`dist` 产出**完全一致**（都是 0 页面、无警告、exit 0）。
- 【源码】为什么不可能不同：`callGetStaticPaths` 返回后统一走 `stringifyParams` 循环（`static-paths.ts:162-169`），rest 与非 rest 的区别只在 `stringifyParams` 如何处理 `params` 的**值**，不在"数组为空"这个分支上。空数组在到达 `stringifyParams` 之前就已经是 0 次迭代。

那"404"的说法从哪来？【实测】发现两个真实的相邻现象，很可能是混淆源：

1. **dev server 的 404 日志**。dev 下访问任何未生成的路径，Astro 会打一条 `[WARN] [router]` 并以 404 响应（详见下文），这跟 rest/非 rest 无关：

   ```text
   19:36:49 [WARN] [router] A `getStaticPaths()` route pattern was matched, but no matching static path was found for requested path `/notes/anything/`.

   Possible dynamic routes being matched: src/pages/notes/[slug].astro.
   19:36:49 [404] /notes/anything/ 3ms
   ```

   （`[...slug].astro` 版本打出来的文案是 `Possible dynamic routes being matched: src/pages/notes/[...slug].astro.`，其余相同。）

2. **rest 参数确实有一个非 rest 没有的能力**：`params: { slug: undefined }` 可以生成"父路径"那一页，而非 rest 会报错。这是**唯一**真实差异，且它与"空数组"无关：

   ```text
   ================ EXP18（非 rest）: [slug] 返回 params.slug=undefined ================
   node : Missing parameter: slug
     Location: ...\astro\dist\core\routing\generator.js:21:10
   ```

   ```text
   ================ EXPERIMENT 4c（rest）: [...slug] 返回 params.slug=undefined ================
   19:36:26   ├─ /notes/index.html (+3ms) 
   19:36:26 [build] 8 page(s) built in 699ms
   19:36:26 [build] Complete!
   === EXIT: 0 ===
   ```

   而这时如果列表页也在，会撞车（见 Q7）：

   ```text
   19:36:36 [WARN] [build] Could not render `/notes` from route `/notes/[...slug]` as it conflicts with higher priority route `/notes`.
   ```

### 结论

**rest 参数返回 `[]`：构建成功，行为与非 rest 完全一致，没有任何"产出 404"的特殊行为。** 社区说法不成立——除非它指的是 dev server 的 404 日志，那是两条路由都有的。

---

## Q5 · 0 条路径时，模板的组件代码是否完全不被执行

这是最关键的一条，必须分清三个层次：**模块加载**、**`getStaticPaths()`**、**组件函数体**。

### 实测设计

`src/pages/notes/[slug].astro` 三层各埋一个 `console.log` / `throw`，`getStaticPaths()` 硬编码 `return []`：

```astro
---
import { marker } from '../../lib/probe-import.ts';   // 被 import 的模块，模块级有 console.log
console.log('[EXP14] frontmatter top-level console.log RAN, marker =', marker);
export async function getStaticPaths() {
  console.log('[EXP14] getStaticPaths RAN, returning []');
  return [];
}
const { entry } = Astro.props;
console.log('[EXP14] component body RAN, title =', entry.data.title);
---
<html><body><h1>{entry.data.title}</h1></body></html>
```

`src/lib/probe-import.ts`：

```ts
console.log('[EXP14] module-scope side effect of imported helper RAN');
export const marker = 'M';
```

### 真实终端输出

```text
================ EXP14: 0 路径时，模块级 / frontmatter / 组件体 各自是否执行 ================
19:40:08 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
19:40:08 [build] ✓ Completed in 484ms.
[EXP14] module-scope side effect of imported helper RAN
[EXP14] getStaticPaths RAN, returning []
19:40:08   ├─ /notes/index.html[PROBE] notes/index.astro executed, notes.length = 0
...
19:40:08 [build] 8 page(s) built in 739ms
19:40:08 [build] Complete!
=== EXIT: 0 ===
```

注意：`[EXP14] frontmatter top-level console.log RAN` **一次都没出现**，`[EXP14] component body RAN` 也**一次都没出现**。

### 更强的证据：组件体直接 `throw`

```astro
---
export async function getStaticPaths() { return []; }
throw new Error('PROBE-5 BODY EXECUTED: template code ran with 0 paths');
const { entry } = Astro.props;
---
```

```text
================ EXPERIMENT 5: 组件正文 throw，getStaticPaths 返回 [] ================
19:27:53 generating static routes 
19:27:53   ├─ /404.html (+9ms) 
19:27:53   ├─ /notes/index.html...
19:27:53 [build] 8 page(s) built in 724ms
19:27:53 [build] Complete!
=== EXIT: 0 ===
=== grep PROBE-5 ===
0
```

**构建成功，exit 0，`throw` 的那行代码从未被执行（grep 命中 0 次）。**

### 反向对照：同样会崩的模板，塞 1 条数据就崩

用 `entry.data.title.toFixed(2)`（`title` 是 `string`，运行时必崩）做探针：

```text
================ EXP11: 0 条 notes 时 astro build ================
19:38:25 [build] 8 page(s) built in 701ms
19:38:25 [build] Complete!
=== EXIT: 0 ===
```

```text
================ EXP12: 塞 1 条 notes 后同一份代码 ================
19:38:28 [ERROR] TypeError: entry.data.title.toFixed is not a function
    at file:///.../dist/.prerender/chunks/_slug__BdZ44mxz.mjs:25:31
    at async callComponentAsTemplateResultOrResponse (...)
19:38:28 [ERROR] [build] Caught error rendering /notes/boom: TypeError: entry.data.title.toFixed is not a function
entry.data.title.toFixed is not a function
=== 1 note + broken template -> exit=-1073740791 ===   ← 非零，构建失败
```

### 依据

- 【实测】三层行为明确分离：

  | 层次 | 0 路径时是否执行 | 证据 |
  |---|---|---|
  | 被 `import` 的模块（模块级副作用） | **执行** | EXP14 打出 `module-scope side effect ... RAN` |
  | `.astro` 的 frontmatter 顶层语句 | **不执行** | EXP14 从未打出 frontmatter 那条 |
  | 组件体（frontmatter 其余 + 模板表达式） | **不执行** | EXP5 的 `throw` 命中 0 次、exit 0 |
  | `getStaticPaths()` 函数本身 | **执行 1 次** | EXP14 打出 `getStaticPaths RAN` |
- 【源码】这正好对应 `static-paths.ts` 的调用方式：`callGetStaticPaths({ mod: componentInstance, ... })` 只调用 `mod.getStaticPaths(...)`（`route-cache.ts:98`），**不调用 `mod.default(...)`（组件本身）**。组件函数只会在 `generatePathWithPrerenderer` 的渲染循环里被调用，而空数组不进入该循环（`generate.ts:246-262`）。
- 【源码】模块之所以会被求值，是因为 `getComponentByRoute` 需要 `import()` 该模块拿到它的 `getStaticPaths` 导出（`static-paths.ts:138-140`）。**所以"import 链上的语法错误 / 导入不存在的模块 / 模块级抛错"仍然会失败**，只有"组件函数体"被跳过。

### 结论

**是，但要说准：组件函数体（frontmatter + 模板）在 0 条路径时 0 次执行、完全不被求值；`getStaticPaths()` 会执行 1 次；被 import 的模块会被加载（模块级副作用会跑）。**

这条对验收判断极其关键：**`astro build` 通过 ≠ 该模板被运行时验证过**。骨架期 `notes` 为 0 条时，`src/pages/notes/[slug].astro` 的模板代码实际上是一段"从未运行过的代码"。

**但有一个重要补充**：`astro check` 仍然会对它做**静态类型检查**（见 Q6 的 EXP10），所以类型层面的错误抓得到，运行时层面的错误抓不到。

---

## Q6 · `astro check` / `astro build` 是否因"动态路由 0 页面"报错

### 6a. 极端实验：整个站点 0 个可产出页面

新建一个只有两个动态路由、且**都返回 `[]`** 的工程（无 `404.astro`、无静态页）：

```text
C:\...\astro-zero-pages\src\pages\[...rest].astro      ← getStaticPaths(){ return [] }
C:\...\astro-zero-pages\src\pages\blog\[slug].astro    ← getStaticPaths(){ return [] }
```

```text
================ EXPERIMENT 9: 全部页面都是空动态路由（0 页面可产出） ================
19:37:17 [content] Syncing content
19:37:17 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
19:37:17 [content] Synced content
19:37:17 [types] Generated 517ms
19:37:17 [build] output: "static"
19:37:17 [build] mode: "static"
19:37:17 [build] directory: C:\Users\zwxUnderdogs\AppData\Local\Temp\astro-zero-pages\dist\
19:37:17 [build] Collecting build info...
19:37:17 [build] ✓ Completed in 539ms.
19:37:17 [build] Building static entrypoints...
19:37:18 [vite] ✓ built in 95ms
19:37:18 [vite] ✓ built in 12ms
19:37:18 [build] Rearranging server assets...

 generating static routes 
19:37:18 ✓ Completed in 13ms.

19:37:18 [build] ✓ Completed in 159ms.
19:37:18 [build] 0 page(s) built in 699ms
19:37:18 [build] Complete!

=== EXIT: 0 ===
```

`dist/` 存在但是**空目录**（`Test-Path dist` → `True`，`Get-ChildItem dist` 无输出）。

### 6b. `astro check` 在 notes 0 条时是否仍然检查该模板

在模板里故意写类型错误 `entry.data.title.toFixed(2)`（`title` 是 `string`），`notes` 为 0 条：

```text
================ EXPERIMENT 10: notes 0 条时 astro check 是否检查模板类型 ================
[96msrc/pages/notes/[slug].astro[0m:[9314[0m:[9324[0m - [91merror[0m[90m ts(2551): [0mProperty 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

[7m14[0m const bad = entry.data.title.toFixed(2); // deliberate type error: title is string
[7m  [0m  [91m                             ~~~~~~~[0m

Result (12 files): 
- 1 error
- 0 warnings
- 12 hints

=== EXIT: 1 ===
```

同时 `astro check` 在 notes 0 条 / 目录不存在的正常状态下是 **0 error、exit 0**：

```text
=== astro check: notes 目录不存在 ===
19:39:52 [content] Syncing content
19:39:52 [WARN] [glob-loader] The base directory "C:\...\src\content\notes\" does not exist.
19:39:52 [content] Synced content
19:39:52 [types] Generated 441ms
19:39:52 [check] Getting diagnostics for Astro files in C:\...\astro-empty-probe...
...
Result (12 files): 
- 0 errors
- 0 warnings
- 12 hints
=== EXIT: 0 ===
```

### 依据

- 【实测】`0 page(s) built` + `Complete!` + **exit 0**。Astro **没有** Next.js 式的"必须至少一个页面 / 必须至少一个静态路径"限制。
- 【源码】`packages/astro/src/core/build/index.ts:336-357`（`printStats`）只是把 `pageCount` 打进日志，没有任何 `if (pageCount === 0) throw`：

  ```ts
  if (buildMode === 'static') {
      messages = [`${pageCount} page(s) built in`, colors.bold(total)];
  } else {
      messages = ['Server built in', colors.bold(total)];
  }
  logger.info('build', messages.join(' '));
  logger.info('build', `${colors.bold('Complete!')}`);
  ```
- 【源码】全 `packages/astro/src` 里搜 `at least one` / `no pages` / `No pages`，在 `core/build/` 下**没有任何命中**（只命中 lockfile 注释和 vite-plugins 注释）。唯一相关的硬性要求是 `src/pages` **目录**必须存在，不是"必须有页面"。
- 【文档】`en/basics/project-structure.mdx:84` 明确说：

  > `src/pages` is a **required** sub-directory in your Astro project. Without it, your site will have no pages or routes!

  注意这是说"**目录**必需"，并顺势承认"没有它就没有页面和路由"——**并没有说"没有页面"会报错**。
- 【实测】`astro check` 会类型检查 0 条数据的模板（EXP10）。这一点很重要：`check` 验的是**类型**，`build` 验的是**运行**，二者互补。

### 结论

**不报错。** `astro build` 在"某动态路由产出 0 页面"时静默通过；即使全站 0 页面也 exit 0。`astro check` 在同样情况下不报错，但**仍然会静态检查那份模板的类型**。

---

## Q7 · `dist/notes/index.html` 与动态路由共存

### 实测

`src/pages/notes/index.astro`（列表页）与 `src/pages/notes/[slug].astro`（动态详情页，0 条）共存，构建：

```text
19:42:32   ├─ /notes/index.html[PROBE] notes/index.astro executed, notes.length = 0
 (+3ms) 
```

`dist/notes/` 目录内容：

```text
=== dist/notes/ listing ===
Name      
----      
index.html
```

`dist/notes/index.html` 全文：

```html
<!DOCTYPE html><html><head><title>notes</title></head><body><h1>notes: 0</h1></body></html>
```

**没有任何冲突警告**（对比 Q4 的 rest+`undefined` 场景才会报 `Could not render /notes ... conflicts with higher priority route /notes`）。

### 依据

- 【实测】`dist/notes/index.html` 存在、`dist/notes/` 目录存在、二者**天然共存**——因为 `index.html` 就是目录的索引文件，不构成"文件 vs 目录同名"问题。
- 【源码】`generate.ts:160-210` 的冲突检测按 **规范化后的 pathname** 去重（`removeTrailingForwardSlash(pathname)`），`/notes` 由 `notes/index.astro` 产出，`[slug].astro` 0 条时不产出任何 pathname，**没有第二个 pathname 去争 `/notes`**，因此不触发 `prerenderConflictBehavior`。
- 【文档】`en/reference/configuration-reference.mdx:417-433`：`prerenderConflictBehavior` 默认 `'warn'`，只在"两个路由生成同一个 prerendered URL"时才生效。0 条内容时不存在这种情形。
- 【源码】默认值在 `packages/astro/src/core/config/schemas/defaults.ts:55`：`prerenderConflictBehavior: 'warn'`。

### 结论

**共存完全正常。** `dist/notes/index.html` 与 `dist/notes/` 目录不冲突（前者本来就位于后者内部）；`/notes/` 由 `index.astro` 独占，`[slug].astro` 在 0 条时不产任何 URL，不会争夺该路径。

---

## 对骨架验收的影响

以下是由上面 7 条事实**推导**出的工程结论（【推导】，不是任何来源的原话）。

### 1. 空集合目录：**要不要 `.gitkeep`？要，但理由不是"消警告"**

- 【实测】`git` **不跟踪空目录**。在本机用真实 git 仓库验证：

  ```text
  === tracked files ===
  src/content/papers/a.md          ← src/content/notes/ 存在但未被跟踪
  === is notes dir present in working tree? ===
  True
  ```

  commit 后 `git clone` 到新目录：

  ```text
  === after clone: does src/content/notes exist? ===
  False
  ```

  **空目录在 clone 后消失。**
- 【实测】加了 `.gitkeep` 之后：

  ```text
  === tracked after adding .gitkeep ===
  src/content/notes/.gitkeep
  src/content/papers/a.md
  === after clone: does .gitkeep exist? ===
  True
  ```

- 【实测】`.gitkeep` 对构建的唯一影响：把警告文案从"base directory 不存在"换成"没有文件匹配 pattern"，**构建结果和 `getCollection()` 返回值完全不变**（都是 `[]`、exit 0）。

**结论**：`.gitkeep` 该放，**但目的纯粹是让 git 保留目录、让"集合目录不存在"这个更差的警告态不出现**（否则 CI/新 clone 会退化成 Q1 的 `base directory ... does not exist`）。它**不是**为了让警告消失——警告消不掉。验收清单里**不能**把"构建无 `notes` 相关警告"写成通过条件。

### 2. 空路由的模板：**不能算「已验证」**

【实测】0 条时组件函数体 0 次执行（Q5），`astro build` exit 0。所以：

- `astro build` 通过 **只证明**：模块能解析、`getStaticPaths()` 能跑、类型没问题（若跑了 `check`）。**不证明** `src/pages/notes/[slug].astro` 的 frontmatter 与模板能正确渲染。
- 反面证据：同一份带 `entry.data.title.toFixed(2)` 的模板，0 条时 **exit 0 / Complete!**，1 条时 **exit 非零 / `[ERROR] Caught error rendering /notes/boom`**（EXP11 vs EXP12）。
- 所以验收清单**必须**区分"文件存在 + 构建通过"和"模板已渲染验证过"这两件事。

### 3. 验收**必须**加一条「临时塞 1 条 notes 再删」的往返验证

这是把"未执行"变成"已执行"的**唯一**办法。本机实测这套往返是可行的，且两次构建都干净：

**塞 1 条（`src/content/notes/hello/index.md`，`title` + `date`）后：**

```text
 generating static routes 
19:29:28   ├─ /404.html (+7ms) 
19:29:28   ├─ /notes/hello/index.html[PROBE-7] notes/[slug].astro BODY RENDERED for id = hello
 (+3ms) 
19:29:28   ├─ /notes/index.html[PROBE] notes/index.astro executed, notes.length = 1
 (+3ms) 
...
19:29:28 [build] 9 page(s) built in 725ms
19:29:28 [build] Complete!
=== EXIT: 0 ===
```

`dist/notes/hello/index.html` 真实渲染出内容：

```html
<!DOCTYPE html><html><head><title>Hello Note</title></head><body><h1>Hello Note</h1><p>A temporary note used for the round-trip probe.</p>
</body></html>
```

**删掉后：**

```text
19:42:32 [WARN] [glob-loader] No files found matching "**/index.md" in directory "src\content\notes"
19:42:32   ├─ /notes/index.html[PROBE] notes/index.astro executed, notes.length = 0
...
19:42:32 [build] 8 page(s) built in 816ms
19:42:32 [build] Complete!
=== EXIT: 0 ===
```

验收要点：
- 塞入条目时**必须**让 `[slug].astro` 真的渲染一次（看 `dist/notes/<slug>/index.html` 里出现 `entry.data.*` 的实际值，而不是只看 exit code）。
- 删掉后必须回到"8 页、`dist/notes/` 只剩 `index.html`"的状态。
- 往返两次构建都必须 exit 0，且**不引入**新的警告（塞入时 `No files found matching` 应消失；删掉后应恢复）。

### 4. 验收清单措辞建议（把模糊条件换成可判定条件）

| 别这么写 | 这么写 | 依据 |
|---|---|---|
| "构建无错误" | "`astro build` exit code = 0，且 `dist/` 含 8 个 html：`index`、`404`、`papers/index`、`papers/<slug>/`×2、`projects/index`、`projects/<slug>/`×1、`notes/index`" | Q1/Q3 实测的真实产出清单 |
| "notes 相关警告为零" | "**允许** 1 条 `[glob-loader] No files found matching "**/index.md" in directory "src\content\notes"` 与每个调用点 1 条 `[content] The collection "notes" does not exist or is empty.`；**不允许**出现 `base directory ... does not exist`（出现即说明 `.gitkeep` 丢了）" | Q2 实测：`.gitkeep` 消不掉第一条警告，但能消掉第二条 |
| "notes 详情页已验证" | "**临时**放入 `src/content/notes/_probe/index.md`（含 `title`/`date`），`astro build` 通过且 `dist/notes/_probe/index.html` 内含该条目的 `title` 文本；随后删除该目录，再次 `astro build` 通过且 `dist/notes/` 仅含 `index.html`" | Q5 实测：0 条时模板 0 次执行 |
| "`dist/notes/` 不应存在" | "`notes` 为 0 条时 `dist/notes/` **应存在**（因 `notes/index.astro`），且**仅含** `index.html`，不含任何子目录" | Q3/Q7 实测 |
| （无） | "`astro check` exit code = 0" | Q6 实测：`check` 会类型检查 0 条模板，是 `build` 之外的独立门槛 |

### 5. 一个容易踩的坑：`entry.render()` 在 Astro 7 已被 `render(entry)` 取代

【实测】第一次跑就撞到了。按旧写法 `const { Content } = await entry.render();`，构建直接失败：

```text
19:24:53 [ERROR] TypeError: entry.render is not a function
    at file:///.../dist/.prerender/chunks/_slug__DEIHQy-M.mjs:24:34
19:24:53 [ERROR] [build] Caught error rendering /papers/demo-paper-a: TypeError: entry.render is not a function
entry.render is not a function
=== EXIT CODE: 1 ===
```

改成 `import { getCollection, render } from 'astro:content'` + `const { Content } = await render(entry);` 后正常。【文档】`en/guides/content-collections.mdx:619-630` 的最新示例正是 `render` 具名导入。**这项与"空集合"无关，但验收若要用往返验证就一定会用到它**，所以记在这里。

---

## 仍未确定 / 限制

- **exit code 在本机不可靠**。失败构建在某些情况下返回的不是 `1`，而是 `-1073740791`（= `0xC0000409`，`STATUS_STACK_BUFFER_OVERRUN`），并伴随 Node 自身的断言：

  ```text
  Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
  ```

  首次失败（`entry.render is not a function`）拿到的是正常的 `exit 1`；后来的失败（schema 校验失败、模板运行时抛错、`Missing parameter: slug`）拿到的是 `-1073740791`。**这是本机 Node v24.18.0 + Windows 的退出路径问题，不是 Astro 的行为**。含义不变（非零 = 失败），但验收脚本若断言 `exit == 1` 会误判，应断言 `exit != 0`。
- **`astro check` 在本机偶发 `-1`**。`node ... check` 经过 PowerShell 管道时有一次拿到 `EXIT: -1`（同一命令用重定向到文件再跑则是 `EXIT: 0`）。判断为同类的 Windows 进程退出/管道干扰，**不影响 check 的结论**，但提醒：验收脚本不要用管道同时 tee + 取退出码。
- **`build.format` 只测了默认值 `'directory'`**。计划里写明用默认值，所以本文所有 `dist` 路径结论（`dist/notes/index.html`、`dist/papers/<slug>/index.html`）都以 `'directory'` 为前提。`'file'` / `'preserve'` 下的空路由行为**未实测**。文档里 `build.format` 的默认值我没能从 `configuration-reference.mdx` 里精确定位到（grep 到的 `L417` 段落是 `prerenderConflictBehavior`，`build.format` 的锚点没抓到），因此这一条**只依赖实测观察到的 `dist` 形状，未拿到文档明文**。
- **`docs.astro.build` 全站抓不到**。`web_fetch` 报 `SSRF blocked`（域名解析到私有地址）。所以"文档明文"全部来自 `withastro/docs` 仓库的 mdx 源文件（commit `a3d01b7`），**不是**线上渲染后的页面。两者同源，但若线上版本与 `main` 分支有发布延迟，措辞可能有差异。
- **`withastro/astro` 源码 tarball 解压不完整**。Windows `tar` 对含非 ASCII 字符的 fixture 路径（如 `special-"characters"-in-file.md`、`么.astro`）和无权限符号链接报错，这些 fixture **没能解出来**。所以"官方测试里有没有覆盖空 `getStaticPaths` 的用例"我**没能确认**（grep `packages/astro/test` 的 `.js` 对 `getStaticPaths.*\[\]`、`empty collection`、`does not exist or is empty` 均 0 命中——但这是"没搜到"，不等于"不存在"，因为可能在我没解出来的 fixture 里）。
- **`NoMatchingStaticPathFound` 在 build 侧是否可能触发，未穷尽**。源码里它在 `core/render/params-and-props.ts:67` 抛出，我在 build 侧没构造出这个场景；dev 侧则稳定触发（见 Q4 引用的 `[WARN] [router]` 日志）。结论"build 侧不因空路由报错"来自 EXP9/EXP15 的实测与 `generate.ts` 的循环结构，**不是**对全部调用点的穷尽分析。
- **未测 `getEntry()`**。本文只覆盖 `getCollection()`。`getEntry()` 对不存在条目返回 `undefined` 的行为属于另一条线，本次未实测。
- **未测增量构建 / `experimental.incrementalBuild`**。`generate.ts` 里有 `IncrementalBuildCache` 分支，空路径在其下的缓存行为未验证。
