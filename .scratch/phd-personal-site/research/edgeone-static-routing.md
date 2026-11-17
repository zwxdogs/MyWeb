# EdgeOne Pages 静态站的路由形态、404 与重定向：官方事实

> 抓取日期 2026-11-15。取自 pages.edgeone.ai 官方文档（中英对照）；官方没写的明确标「官方未说明」。

**取数方式说明（影响可信度，请先读）**：本次会话的直连抓取被环境拦截（`pages.edgeone.ai`、`cloud.tencent.com`、`r.jina.ai` 均被 SSRF 策略判为私网地址，`pwsh` 因工作区 ACL 授予失败无法执行），因此**没有任何一页被完整抓取**。下列引文全部来自搜索引擎（Exa / Firecrawl / Keenable / Parallel / Jina 等）对该官方页面的**正文片段**索引，逐条保留了原文措辞与页面 URL；引文中的「…」表示片段被截断。凡本报告未引原文的地方，即为「官方未说明」。

---

## 1. 目录式 URL（/foo/ 与 /foo）

**官方对静态产物的「目录 + index.html」解析规则、以及尾斜杠 301/302 跳转，均无任何说明。**

- 官方只明确了「站点入口」这一条约定：产物根目录必须有 `index.html`。「**入口文件**：上传内容的根目录需包含 `index.html` 作为网站入口。使用 ZIP 或文件夹上传时，请确保 `index.html` 位于压缩包或文件夹的最外层，避免多套一层目录（例如 ZIP 内为 `dist/index.html`，而非根目录下的 `index.html`），否则访问站点首页时会返回 404。」—— [直接上传](https://pages.edgeone.ai/zh/document/direct-upload)
- 排障文档同样只提根目录入口文件，不提子目录 index 解析：「直接上传部署成功后页面 404 可排查上传的文件夹根目录下有没有 index.html 文件。」—— [排障指南](https://pages.edgeone.ai/zh/document/troubleshooting)
- 因此对 `dist/papers/foo/index.html`：访问 `/papers/foo/` 与 `/papers/foo` 各自会返回什么、是否会自动补斜杠或去斜杠，**官方未说明**。文档中没有任何「默认首页文件」「index.html 解析规则」「尾斜杠重定向」章节。
- 官方唯一涉及「尾斜杠可选」的表述在**函数路由**章节，不是静态资源：「**说明：** 路由尾部斜杠 / 是可选。`/hello-pages` 和 `/hello-pages/` 将被路由到 /functions/hello-pages.js。」—— [Pages Functions](https://edgeone.ai/document/162227908241616896)（同一句见 [Edge Functions](https://pages.edgeone.ai/zh/document/edge-functions)）
- 间接线索（**只是框架侧建议，不是平台行为说明**）：Next.js 静态导出示例给的是 `trailingSlash: true, // 添加尾部斜杠，提高兼容性`—— [Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs)
- 另一处间接线索：Build Output API 的示例路由里出现主动补斜杠的规则，属于**手动配置示例**，不是平台默认行为：「``` { "version": 3, "routes": [ { "src": "^/([^.]+[^/.])$", "dest": "/$1/", "continue": true }, …``` 」—— [Build Output Configuration](https://pages.edgeone.ai/document/building-output-configuration)

**小结**：`/papers/foo/` 与 `/papers/foo` 的实际行为 = 官方未说明；文档未承诺任何自动斜杠规范化。若要确定，只能实测或自行在 `edgeone.json` 的 `redirects` 里显式配 301。

---

## 2. 文件式 URL（/foo.html 与 /foo）

**平台没有「无扩展名 → 自动补 `.html`」的说明，也没有类似 Netlify pretty URLs 的开关。**

- 官方文档中不存在 pretty URLs / clean URLs 的功能描述或开关；「Clean URLs」只作为 **Build Output API 里要你自己写的一条 route 示例**出现：「### Clean URLs ``` { "src": "^/about$", "dest": "/about.html" } ``` 」—— [构建输出配置指南](https://pages.edgeone.ai/zh/document/building-output-configuration)（英文页同： [Build Output Configuration](https://pages.edgeone.ai/document/building-output-configuration)）
- 即：`/foo` 命中 `foo.html` 属于「需自行配置」的范畴（route 或 rewrite），不是平台默认。`/papers/foo.html` 直接命中文件属常规静态文件访问，官方未特别说明。
- 从 Netlify / Cloudflare Pages 迁移的官方指南里，只讲把 `_redirects` / `_headers` 改写为 `edgeone.json`，**没有**提到 pretty URLs 的对应能力：「Cloudflare Pages 使用 _redirects 和 _headers 文件来配置重定向规则和自定义标头，需要将这些配置迁移到 EdgeOne Makers 的 edgeone.json 文件中。」—— [从 Cloudflare Pages 迁移](https://pages.edgeone.ai/zh/document/migrating-from-cloudflare-pages-to-edgeone-pages)；同见 [从 Netlify 迁移](https://pages.edgeone.ai/zh/document/migrating-from-netlify-to-edgeone-pages)

**小结**：无扩展名访问 `.html` 是否命中 = 官方未说明（无默认美化 URL 能力记载，也无开关）；想稳定要 `/foo` 就写 rewrite。

---

## 3. 自定义 404 页

**支持，且是约定文件名 `404.html`（构建输出目录根下），不是控制台上传、不是 `edgeone.json` 字段。**

- 总述：「当用户访问 EdgeOne Makers 项目中不存在的路径时，平台将提供一个标准的 404 错误页面。为确保用户体验的一致性，平台建议您创建自定义 404 页面。」—— [自定义 404 页面](https://pages.edgeone.ai/zh/document/custom-404-page)
- SSG（Astro 这类多 HTML 产物属于此列）：「对于使用 Gatsby、Hugo 等静态站点生成器构建的应用，或在构建时生成多个 HTML 文件的应用，只需确保构建输出目录中有 `404.html` 文件，M 部署时将自动识别此文件，并在请求未匹配到任何路径时将其作为 404 页面返回。」—— 同页
- Astro 专门一节：「在您的 `src/pages/` 目录下创建一个 `404.astro` 文件。Astro 会在构建时自动识别并使用它。当服务器收到一个无法匹配任何页面的请求时，会渲染并返回 `404.astro` 页面的内容，并附带 404 状态码。」—— [自定义 404 页面（腾讯云镜像）](https://cloud.tencent.com.cn/document/product/1552/127386)；英文：「Create a `404.astro` file under your `src/pages/` directory. Astro will automatically identify and use it at build time. When the server receives a request unable to match any page, it will render and return the contents of the `404.astro` page, with a 404 status code.」—— [Custom 404 Page](https://pages.edgeone.ai/document/custom-404-page)
- SPA 有反向警告：「对于使用 React、Vue 等现代前端框架构建的单页应用，404 错误处理通常由客户端路由负责。在路由配置中设置一个"捕获所有"或通配符路由，即可处理所有未匹配到的路径。 **注意：** 单页应用不能在输出目录根路径下放置 404.html，会影响客户端的路由配置。」—— [自定义 404 页面](https://pages.edgeone.ai/zh/document/custom-404-page)
- SSR 另有一节：「Makers 目前已支持下列全栈框架的服务端渲染 (SSR) 模式。由于各框架处理 404 页面的机制不尽相同，下面列出了每个框架的配置方法，以确保您的应用能正确展示自定义 404 页面。」—— 同页
- 配置手段排查结论：该页通篇只给「放 `404.html` / 框架内建 404 页面」两种方式，**没有** `edgeone.json` 里的 404 字段，**没有**控制台上传 404 页的入口，**没有**用函数兜底 404 的官方写法。
- 免费版 vs 专业版：官方未在任何页面写明 404 能力有套餐差异（[限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas) 的免费版配额表不含 404 条目；[套餐对比](https://pages.edgeone.ai/zh/document/billing-plan-comparison) 的可见片段也未提及 404）。**官方未说明差异。**
- 未说明项：SSG 一节只说「作为 404 页面返回」，**没有**说 HTTP 状态码是 404 还是 200；只有 Astro/SSR 一节明确「附带 404 状态码」。

---

## 4. 重定向 / 重写

**支持，靠仓库根目录的 `edgeone.json`（`redirects` / `rewrites`），另有中间件与函数可做更复杂逻辑；免费版可用，条数有硬上限。**

- 定位：「除了通过控制台进行项目设置，您还可以在项目根目录下创建 `edgeone.json` 文件，来定义和覆盖项目的默认行为，以便更灵活地配置项目。」—— [edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)
- `redirects`：「将请求从一个 URL 重定向到另一个 URL，以下是几个重定向的示例。」示例含 301 与 302：「使用 301 永久重定向将请求从 `/articles/+ ID` 的 URL（例如 /articles/123），重定向到 `/news-articles/ + ID` 的 URL」—— 同页
- `rewrites`：「将所有以 `/assets/` 开头的请求重写到 `/assets-new/` 目录下，同时保留原始请求的路径部分。」—— 同页
- SPA fallback（rewrites 下的独立小节）：「对于以 `/index.html` 为入口的单页应用，可通过以下配置显式声明 SPA fallback：``` { "rewrites": [ { "source": "/*", "destination": "/index.html" } ]} ``` Makers 会将该精确配置识别为 SPA fallback：请求优先匹配项目中的其他路由（包括静态资源和函数），仅在未命中任何其他路由时返回 `/index.html`，并交由前端路由处理。该规则不会作为普通重写规则生效。」—— [edgeone.json（腾讯云镜像，措辞最全）](https://cloud.tencent.com/document/product/1552/127389)
- 数量限制（`edgeone.json` 页自己写的）：「注意： redirect 最大数量限制为 100 个。 `source` 与 `destination` 不超过 500 个字符。源路径必须以 `/` 开头。」「注意： rewrite 最大数量限制为 100 个。 `source` 与 `destination` 不超过 500 个字符。」「每个 header 的 value 限制为 1 - 1000 个字符，不支持中文。」—— [edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json) / [腾讯云镜像](https://cloud.tencent.com/document/product/1552/127389)
- 免费版配额页给出同一组数字，并明确「本文列出的均为免费版当前生效的各项配额」：「`redirects` 最大数 | 100」「`rewrites` 最大数 | 100」「`headers` 最大数 | 30」「`headers` key 长度 | 1 - 100 字符（数字、字母、`-`）」「`headers` value 长度 | 1 - 1000 字符（不支持中文）」—— [限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas) / [腾讯云镜像](https://cloud.tencent.com/document/product/1552/132789)
- 免费版是否**能**用：能。上述配额页标题即「免费版…各项配额」，且注明「免费版配额在商业化正式上线前执行较为宽松，用量超限也会优先保障您的业务稳定」—— [限制与配额](https://cloud.tencent.com/document/product/1552/132789)。另：[套餐对比](https://pages.edgeone.ai/zh/document/billing-plan-comparison) 可见片段未对 redirect/rewrite 做套餐分级。
- 另一条路：中间件。「请求改写与路由控制：根据路径、域名、Header、Cookie、查询参数等条件重写 URL 或跳转到不同页面。」—— [中间件](https://pages.edgeone.ai/zh/document/middleware)
- 框架侧说明：Next.js 自带的重定向/重写不被采纳：「| Redirects and rewrites | 目前暂不支持 Next.js 的重写和重定向，平台建议尽可能使用 edgeone.json 来配置，具体可参考文档。|」—— [Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs)
- 旧版文档另有 SPA 禁用条款（与现版冲突，见第 7 节）：「该配置仅适用于静态资源访问 不支持 SPA (单页应用) 的前端路由重写 源路径必须以 `/` 开头」—— [edgeone.json（旧版国际站）](https://edgeone.ai/document/162316940299157504)
- 控制台是否有可视化「重定向规则」面板：Makers 文档未提供该入口，只反复指向 `edgeone.json`。**官方未说明存在控制台规则引擎入口。**（EdgeOne 站点加速产品有自己的规则引擎/访问 URL 重定向文档，但那是站点级产品，不是 Makers 项目配置，本报告不据以推断 Makers 行为。）

---

## 5. 大小写与非 ASCII 路径

**函数路由明确大小写敏感；静态资源路径的大小写敏感性、非 ASCII 路径处理方式，官方均未说明。**

- 函数路由大小写敏感（官方原文）：「路由大小写敏感，/helloworld 将被路由到 /edge-functions/helloworld.js，不能被路由到 /edge-functions/HelloWorld.js」—— [Edge Functions](https://pages.edgeone.ai/zh/document/edge-functions)；英文：「Routes are case-sensitive. /helloworld will be routed to /cloud-functions/helloworld.js and cannot be routed to /cloud-functions/HelloWorld.js.」—— [Node Functions](https://pages.edgeone.ai/document/node-functions)
- 同一段还给出优先级：「**说明：** 如果 Edge Functions 路由跟静态资源路由冲突，客户端请求将优先被路由到静态资源。」—— [Edge Functions](https://pages.edgeone.ai/zh/document/edge-functions)
- 静态文件路径大小写：官方未说明。
- 非 ASCII（中文）路径：官方唯一相关约束是上传时的文件名非法字符清单——「**文件命名**：文件名不能包含非法字符 `\ / : * ? " < > |`。」—— [直接上传](https://pages.edgeone.ai/zh/document/direct-upload)。**是否支持中文文件名、是否需要百分号编码、请求按 UTF-8 还是百分号解码，官方未说明。**
- 唯一明说「不支持中文」的地方是响应头取值，与路径无关：「`headers` value 长度 | 1 - 1000 字符（不支持中文）」—— [限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas)

---

## 6. `.html` 后缀与 SEO / canonical

**官方没有任何「选哪种 URL 形态更好」的建议，也没有默认行为说明。**

- 文档中没有 canonical、URL 规范化、后缀策略相关章节。`edgeone.json` 全文只讲构建/路由/头/缓存/函数，不含 URL 形态建议（[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)）。
- 唯一带倾向性的官方文字是 Next.js 静态导出的配置注释：「`trailingSlash: true, // 添加尾部斜杠，提高兼容性`」—— [Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs)。这是**框架配置建议**（为「提高兼容性」），不是平台对 URL 形态的规范建议，也不涉及 SEO 或 canonical。
- 因此：平台默认推荐哪种 URL 形态、是否建议 301 到唯一形态、canonical 由谁负责 —— **官方未说明。**

---

## 7. 中英文不一致处（并列列出）

以下三处**两个版本都原样列出，不替官方裁决**。

### 7.1 rewrites 是否支持 SPA 前端路由重写：旧版页面说「不支持」，现版页面给出 SPA fallback 配置

- 旧版（国际站 `edgeone.json` 页，仍在线）：「该配置仅适用于静态资源访问 不支持 SPA (单页应用) 的前端路由重写 源路径必须以 `/` 开头 … **SPA 应用重写建议** 如需在 SPA 中实现 URL 重写，建议采用以下方案：前端路由重定向 使用框架自带的路由系统进行路径重定向」—— [edgeone.ai/document/162316940299157504](https://edgeone.ai/document/162316940299157504)
- 旧版英文/日文页同一段：「Frontend route rewriting is not supported for SPAs (single-page applications). The source path must start with `/`. **SPA application rewriting advice:**」—— [edgeone.ai/ja/document/162316940304400384](https://edgeone.ai/ja/document/162316940304400384)
- 现版（pages.edgeone.ai 中英）：「对于以 `/index.html` 为入口的单页应用，可通过以下配置显式声明 SPA fallback … Makers 会将该精确配置识别为 SPA fallback：请求优先匹配项目中的其他路由（包括静态资源和函数），仅在未命中任何其他路由时返回 `/index.html`」—— [中文](https://pages.edgeone.ai/zh/document/edgeone-json) / [English](https://pages.edgeone.ai/document/edgeone-json)（英文原文：「Makers identifies this precise configuration as an SPA fallba…」，片段截断）
- 另有一篇官方资源页仍带旧口径：「| SPA 限制 | 重写规则**不**支持SPA的前端路由重写。|」「| 适用范围 | 这些重写规则仅对静态资源访问有效。|」—— [如何使用 EdgeOne Pages 作为反向代理](https://pages.edgeone.ai/zh/resources/use-pages-as-reverse-proxy) / 英文版：「| Applicable scope | These rewrite rules are only effective for static resource access. |」—— [resources/use-pages-as-reverse-proxy](https://pages.edgeone.ai/resources/use-pages-as-reverse-proxy)

### 7.2 redirects / rewrites 条数上限：100 还是 30

- 100（现版 `edgeone.json` 与配额页，中英一致）：「redirect 最大数量限制为 100 个」「rewrite 最大数量限制为 100 个」—— [edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)；英文：「**Note:** The maximum number of redirects is 100. The `source` and `destination` must not exceed 500 characters.」—— [Edgeone.json Configuration Guide](https://pages.edgeone.ai/document/edgeone-json)；配额表 `redirects` 100 / `rewrites` 100 —— [限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas)
- 30（反向代理教程页，中英一致）：「| 规则最大数量 | 30 |」「| Maximum number of rules | 30 |」—— [中文](https://pages.edgeone.ai/zh/resources/use-pages-as-reverse-proxy) / [English](https://pages.edgeone.ai/resources/use-pages-as-reverse-proxy)

### 7.3 自定义 404 页是否附带 404 状态码：Astro/SSR 章节明确，SSG 章节不提

- Astro 章节（中文）：「…会渲染并返回 `404.astro` 页面的内容，并附带 404 状态码。」—— [腾讯云镜像](https://cloud.tencent.com.cn/document/product/1552/127386)；英文：「…with a 404 status code.」—— [Custom 404 Page](https://pages.edgeone.ai/document/custom-404-page)
- SSG 章节（中英同）只说「…将其作为 404 页面返回。」—— [中文](https://pages.edgeone.ai/zh/document/custom-404-page) / [英文](https://pages.edgeone.ai/document/custom-404-page)，未提状态码

---

## 8. 官方未说明 / 存疑清单

1. `/papers/foo/` 与 `/papers/foo`（目录式 URL）各自返回什么、是否 301/302 补斜杠或去斜杠 —— **官方未说明**；文档无「默认首页文件」「index.html 解析规则」章节。
2. `/papers/foo`（无扩展名）是否自动命中 `foo.html`；是否存在 pretty URLs 开关 —— **官方未说明**（只给了手写 route / rewrite 的做法）。
3. 静态资源路径是否大小写敏感 —— **官方未说明**（仅函数路由明确「路由大小写敏感」）。
4. 中文/非 ASCII 路径是否可直接访问、是否需百分号编码、按 UTF-8 还是百分号解码 —— **官方未说明**（只给了文件名非法字符清单 `\ / : * ? " < > |`）。
5. SSG 场景下自动返回 `404.html` 时，HTTP 状态码是 404 还是 200 —— **官方未说明**（Astro/SSR 章节明确 404；SSG 章节未提）。
6. 自定义 404 是否存在「控制台配置入口」或 `edgeone.json` 字段 —— **官方未说明有**；文档只给「产物根放 `404.html`」与框架内建 404 页面两种方式。
7. 404 能力是否有免费版/专业版差异 —— **官方未说明**（配额表与套餐对比可见片段均未涉及）。
8. `edgeone.json` 是否有 `name` / `framework` / `devCommand` 的**正文小节**说明 —— 存疑：`"name": "example-app"`、`"framework": "nextjs"`、`devCommand` 出现在官方与官方模板的示例文件里，但 `edgeone.json` 页的小节标题序列我只索引到 `buildCommand / installCommand / outputDirectory / nodeVersion / redirects / rewrites / headers / caches / cloudFunctions / agents`，未见这几项独立小节，故 **不确认为受支持字段**。
9. 是否有控制台可视化「重定向/重写规则」面板 —— Makers 文档只指向 `edgeone.json` 与中间件，**未说明**存在该面板。
10. 平台对 URL 形态（带不带 `.html`、带不带尾斜杠）的 SEO 建议、canonical 归属 —— **官方未说明**。
11. 本报告所有引文均为搜索索引的正文片段，未获完整页面；截断处的完整上下文未核 —— 若要作为契约依据，需人工再开一次上述 URL 核对全文。

---

## 附：`edgeone.json` 与路由/错误页/重定向/headers 相关字段清单

主来源：[edgeone.json 中文](https://pages.edgeone.ai/zh/document/edgeone-json) ｜ [English](https://pages.edgeone.ai/document/edgeone-json) ｜ [腾讯云镜像（措辞最全，含 SPA fallback 段）](https://cloud.tencent.com/document/product/1552/127389) ｜ [旧版国际站](https://edgeone.ai/document/162316940299157504)

| 字段 | 官方原文含义 | 备注 |
|---|---|---|
| `buildCommand` | 「覆盖 `控制台 - Makers 项目 - 项目设置 - 构建部署配置` 中的构建命令。」 | 示例 `{"buildCommand": "next build"}` |
| `installCommand` | 「覆盖 … 中的安装命令。此配置项可自定义构建过程使用的包管理器」 | 示例 `{"installCommand": "npm install"}` |
| `outputDirectory` | 「覆盖 … 中的输出目录。」 | 示例 `{"outputDirectory": "./build"}` |
| `nodeVersion` | 「指定构建环境的 Node 版本。建议使用系统预装的 14.21.3、16.20.2、18.20.4、20.18.0、22.11.0 几个版本，若填写其他版本号，可能导致部署失败。」 | 影响构建，非路由 |
| `redirects` | 「将请求从一个 URL 重定向到另一个 URL」；条目为 `source` / `destination` / `statusCode` | 上限 100 条；`source` 必须以 `/` 开头；source/destination ≤ 500 字符 |
| `rewrites` | 「将所有以 `/assets/` 开头的请求重写到 `/assets-new/` 目录下，同时保留原始请求的路径部分。」 | 上限 100 条；同上字符限制 |
| `rewrites` 的 SPA fallback 特例 | 「Makers 会将该精确配置识别为 SPA fallback：请求优先匹配项目中的其他路由（包括静态资源和函数），仅在未命中任何其他路由时返回 `/index.html`…该规则不会作为普通重写规则生效。」 | 精确写法 `{"source": "/*", "destination": "/index.html"}`；旧版页面称不支持 SPA（见 7.1） |
| `headers` | 「自定义和管理 HTTP 响应头，以改善网站的性能和安全性…通过为所有请求设置 X-Frame-Options 头部…同时，通过 Cache-Control 指定响应可以被缓存 2 小时」 | 上限 30 条；key 1–100 字符（数字/字母/`-`）；value 1–1000 字符，**不支持中文** |
| `caches` | 「可用于针对不同资源配置边缘缓存时间，优化不同资源的边缘缓存策略，提升请求资源的加载速度。」示例 `"caches": [{ "source": "/images/*", "cacheTtl": 86400 }]` | 来源：[旧版国际站 edgeone.json](https://edgeone.ai/document/162316940299157504)；`cacheTtl: -1` / `0` 见官方模板 |
| `source` 匹配规则 | 「在 `redirects`、`rewrites` 和 `headers` 中，`source` 用于匹配请求 URL 路径；`destination` 可引用 `source` 中捕获的参数。」类型：精确路径 `/api/hello`「仅匹配指定路径」；占位符 `/articles/:id`「匹配单级路径参数」；通配符 `/assets/*`「`*` 匹配任意内容，可通过 `:splat` 引用」 | 旧版措辞：「source 中只能包含一个通配符」「每个占位符只能在 source 中使用一次」 |
| `cloudFunctions` | 函数相关：`includeFiles`（「如果您的 Node.js 函数需要直接读取文件，需要配置 includeFiles 列表，构建器会把这些文件复制到构建产物中」）、`externalNodeModules`、`mainlandRegions` / `overseasRegions`（「指定 Cloud Functions 的部署地域…每个数组中只能配置一个地域 ID」） | 非静态路由，但与构建产物组织相关 |
| `agents` | `framework` / `dir` / `timeout` / `sandbox`（「`\"dir\": \"agents\", // 可选，默认 \"agents\"`」） | 与静态路由无关，仅列全 |

**与 404 相关的官方配置手段（`edgeone.json` 中无 404 字段）**：产物根目录放 `404.html`，平台部署时自动识别（[自定义 404 页面](https://pages.edgeone.ai/zh/document/custom-404-page)）。SPA 不要放根 404.html（同页）。

**另一条与路由/错误页相关的官方机制**：中间件可「根据路径、域名、Header、Cookie、查询参数等条件重写 URL 或跳转到不同页面」（[中间件](https://pages.edgeone.ai/zh/document/middleware)）；函数路由「如果 Edge Functions 路由跟静态资源路由冲突，客户端请求将优先被路由到静态资源」（[Edge Functions](https://pages.edgeone.ai/zh/document/edge-functions)）。
