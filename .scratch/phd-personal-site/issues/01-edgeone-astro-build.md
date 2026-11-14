# EdgeOne Pages 构建 Astro 静态站的配置要求

Type: research
Status: resolved

## Question

EdgeOne Pages 部署一个 Astro 静态站，具体需要哪些配置？要查清并给出官方出处：

1. 默认构建命令与输出目录（Astro 是 `npm run build` → `dist/`，EdgeOne 是否默认就是这两个值，还是要手填）
2. 支持的 Node 版本范围，以及能不能在项目里指定版本
3. Astro 的 `output` 模式要求：纯静态（`static`）能否直接用，需不需要装 adapter
4. 「不含大陆区」区域与「大陆区」在控制台上的选择位置与差异，切换区域是否要重建项目
5. 免费二级域名的实际形态（后缀是什么），以及绑定自定义域的入口在哪
6. 免费 SSL 是否自动签发、对 `*.edgeone.app` 二级域名是否也生效

不涉及的：备案流程细节（已在 hosting-mainland.md 中调研）、付费档位。

## Answer

> 全部结论取自一手官方文档，抓取时间 **2026-11-14**。凡涉版本号/限额，均为「截至 2026-11-14 官方页面所示」。官方没写的写「官方未说明」，不做推测。
> 说明：EdgeOne Pages 已于 2026-06 更名为 **EdgeOne Makers**（域名仍为 `pages.edgeone.ai`），官方称账号/项目/域名/构建行为不变，见 [FAQ 第 6 条](https://pages.edgeone.ai/zh/document/faqs)。

---

### 1. 默认构建命令与输出目录

**结论：EdgeOne 有「框架预设（Framework Preset）」，会按识别到的框架自动填构建命令（形如 `npm run build`），但输出目录若你不填，默认是仓库根目录 `/`，不是 `dist/`——所以要手动确认成 `dist`。Astro 预设的具体默认值官方没列出。**

依据：

- 有框架预设，且自动识别框架：「在创建项目时，使用预设模板的情况下，Makers 将采用模板的默认配置进行构建；而对于导入的 GitHub 仓库，Makers 会自动识别所使用的框架，并应用最常见的构建配置。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- 框架预设的定义：「通过下拉菜单选择预设的框架，可以快速填充各个配置项。选择框架后，您仍然可以继续调整其他配置。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- 构建命令：「Makers 会根据所选框架自动设置构建命令，例如 `npm run build`。构建命令将在 Bash shell 中运行。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- **输出目录默认值是根目录**：「输出目录是存放构建产物（例如 HTML 文件和静态资源）的路径。该目录相对于根目录，**默认为 root ( / )**。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)（英文同文：[Build Guide](https://pages.edgeone.ai/document/build-guide)）
- 根目录默认 `./`：「根目录是执行构建命令的路径，如果未设置，默认为存储库的根目录 `./`。」——同上
- 安装命令自动检测：「Makers 在构建时会自动检测安装命令，从 package.json 安装依赖项。默认为 `npm install`。」支持 Yarn 1 / npm 8,9,10 / pnpm 6,7,8,9,10,11（按 lock 文件识别）——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- **Astro 预设的确切默认值：官方未说明。** 官方的「前端框架默认构建设置」表格只列了 React.js(`build`)、Vue.js(`dist`)、Docusaurus(`build`)、Angular(`dist/angular/browser`)、Gatsby(`public`)、Hexo(`public`)、Qwik(`dist`)、Remix(`build/client`)、Solid(`dist`)，**没有 Astro 这一行**——[框架总览](https://pages.edgeone.ai/document/framework-overview)。Astro 被放在 `全栈 / Astro` 分类下，其页面只讲 adapter 与渲染模式，未给预设配置表——[Astro 框架指南](https://pages.edgeone.ai/document/framework-astro)。
- Astro 侧的事实：构建命令 `npm run build`，产物默认在 `dist/`——[Develop and build](https://docs.astro.build/en/develop-and-build/)（"Astro will build a deploy-ready version of your site in a separate folder (`dist/` by default)"）；`outDir` 配置项默认 `"./dist"`——[Configuration Reference · outDir](https://docs.astro.build/en/reference/configuration-reference/#outdir)
- 也可用根目录 `edgeone.json` 覆盖这三项：`buildCommand` / `outputDirectory` / `installCommand`——[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)

**实操落点**：项目设置 → 构建部署配置里把输出目录改成 `dist`（或 `edgeone.json` 写 `{"outputDirectory": "./dist"}`），构建命令保持 `npm run build`。输出目录填错会直接报 `Output directory build does not exist!`——[排障指南](https://pages.edgeone.ai/zh/document/troubleshooting)

---

### 2. Node 版本

**结论：控制台可选 10 个预装版本（14.21.3 / 16.20.2 / 18.20.4 / 20.18.0 / 22.11.0 / 22.17.1 / 22.21.1 / 24.5.0 / 24.11.0 / 24.18.0）；支持根目录 `.nvmrc` 覆盖、`edgeone.json` 的 `nodeVersion` 覆盖；`package.json` 的 `engines` 字段官方未说明。**

依据：

- 预装版本与控制台入口：「Makers 预装了 14.21.3、16.20.2、18.20.4、20.18.0、22.11.0、22.17.1、22.21.1、24.5.0、24.11.0、24.18.0 几个 Node 版本，您可以在「项目设置 - Node.js 版本」进行选择。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)
- `.nvmrc` 生效，且有一个坑：「若项目根目录里有 `.nvmrc` 会自动下载并切换至指定版本，**但不包含相应的包管理器**。」——[构建指南](https://pages.edgeone.ai/zh/document/build-guide)。即 `.nvmrc` 只换 Node 运行时，pnpm/yarn/bun 不会跟着来，需要另配 `installCommand`。
- `edgeone.json` 的 `nodeVersion`：「指定构建环境的 Node 版本。建议使用系统预装的 14.21.3、16.20.2、18.20.4、20.18.0、22.11.0 几个版本，**若填写其他版本号，可能导致部署失败**。」——[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)
- **环境变量方式指定 Node 版本：官方未说明**（环境变量章节只讲构建期变量注入与 255/1000 字节长度限制，未提 Node 版本）——[构建指南 · 环境变量](https://pages.edgeone.ai/zh/document/build-guide)
- **`package.json` 的 `engines` 字段：官方未说明。**
- Astro 侧要求：`Node.js - v22.23.4 or higher. Odd-numbered versions like v23 are not supported.`——[Installation · Prerequisites](https://docs.astro.build/en/install-and-setup/#prerequisites)
- EdgeOne Astro 页对 Node 的说法：「在部署和运行 Astro 项目时，Makers 平台的运行环境为 Node.js 22+ 版本」——[Astro 框架指南（中文）](https://pages.edgeone.ai/zh/document/framework-astro)
- ⚠️ **中英文表述不一致，两边都列出**：英文原文为 "the Makers platform runtime environment is Node.js 22+. **Using an earlier Node.js version is recommended.**"（[EN](https://pages.edgeone.ai/document/framework-astro)），中文译作「建议使用靠前的 Node.js 版本」（[ZH](https://pages.edgeone.ai/zh/document/framework-astro)）。两者字面矛盾，含义无法从官方文档确认。

**实操落点**：控制台选 **24.18.0**（预装列表里唯一满足 Astro 文档 `>= 22.23.4` 且非奇数的档位；22.11.0 / 22.17.1 / 22.21.1 都低于 Astro 要求的 22.23.4）。这是由两份官方文档交叉推导，非官方直接建议。

---

### 3. Astro 的 output 模式：纯静态能否直接部署、要不要 adapter

**结论：纯静态（`output: 'static'`）可以直接部署，不需要装 adapter。`@edgeone/astro` 只在你要 SSR / 混合 / ISR 时才需要。** 官方的三步 adapter 流程（安装 → 配 `astro.config.mjs` → 部署）是面向服务端渲染场景的，别误读成"静态站也必须装"。

依据：

- EdgeOne 官方 Astro 页有独立的 **SSG 小节**，原文只要求改 `output`，未提 adapter：「可以使用 Astro 来生成完全静态的站点。配置为静态导出模式，可按照如下示例修改 `astro.config.mjs`：`export default defineConfig({ output: 'static' })`」——[Astro 框架指南（中文）](https://pages.edgeone.ai/zh/document/framework-astro) / [EN](https://pages.edgeone.ai/document/framework-astro)
- 同页明确 SSG 的边界：「在 Astro 的 SSG 模式下，所有页面在构建时预渲染为静态 HTML，**没有服务端运行时**，因此无法使用服务端功能，包括 API 路由（`src/pages/api/*`）、中间件（`src/middleware.ts`）等任何需要服务端执行的功能。」——同上
- adapter 的定位是服务端能力：同页「适配器名为 `@edgeone/astro`，用于将 Astro 应用的构建结果自动适配到 Makers 平台。类似 `@astrojs/vercel`」；配置示例一律带 `output: "server"`；ISR 也只在 adapter 的 `isr` 选项里声明——同上
- Astro 官方对"何时必须要 adapter"的表述：「**An adapter is still required to deploy an Astro project with any server-rendered pages**, no matter which output mode your project uses. Failure to include an adapter will result in a warning in development and an error at build time.」——[Upgrade to v5 · Removed: hybrid rendering mode](https://docs.astro.build/en/guides/upgrade-to/v5/)
- Astro 5 的 `output` 默认值就是 `'static'`：「`output` — Type: `'static' | 'server'` — **Default: `'static'`**」——[Configuration Reference · output](https://docs.astro.build/en/reference/configuration-reference/#output)。v5 已把 `hybrid` 合并进 `static`：「Astro v5.0 merges the `output: 'hybrid'` and `output: 'static'` configurations into one single configuration (now called `'static'`)」——[Upgrade to v5](https://docs.astro.build/en/guides/upgrade-to/v5/)
- **EdgeOne 官方的 Astro 部署指南**：EdgeOne 在 [Astro 部署服务商列表](https://docs.astro.build/en/guides/deploy/) 中有独立条目，链接为 [Deploy your Astro Site to EdgeOne Pages](https://docs.astro.build/en/guides/deploy/edgeone-pages/)（中文：[zh-cn 版](https://docs.astro.build/zh-cn/guides/deploy/edgeone-pages/)）。**该页极简，只有两句概述 + 两个"Official Resources"外链（EdgeOne Astro Framework Guide、EdgeOne Astro template），并未复述任何构建配置要求**——即 Astro 侧没有额外的 Astro 专属配置约束，一切以 EdgeOne 的 Astro 框架指南为准。
- 另注意：官方的 Astro 特性支持表标注 **Image 组件「暂不支持」、平台 ISR「暂不支持」**——[Astro 框架指南](https://pages.edgeone.ai/zh/document/framework-astro)。纯静态站若用了 `astro:assets` 的图片优化，构建期仍会跑（sharp 本地处理），但官方的兼容性表述以该表为准，属需要注意的风险点。

**实操落点**：`astro.config.mjs` 里什么都不用加（Astro 5 默认就是 `output: 'static'`），不装 `@edgeone/astro`，不写 `adapter`。

---

### 4. 区域选择：「不含大陆区」vs「大陆区」

**结论：控制台里是创建项目流程中的一个必选步骤，三选一——「中国大陆可用区」「全球可用区」「全球可用区（不含中国大陆）」。差别是节点范围 + 自定义域名是否必须 ICP 备案。创建后能否切换，官方文档没写；但 SDK 的 `projects.update` 可改字段清单里没有 `area`，说明没有提供切换入口。**

依据：

- 三个选项与差异（原文表）：「中国大陆可用区：为您站点下的域名分配使用中国大陆可用区的节点……添加自定义域名需完成工信部备案」；「全球可用区：分配使用全球可用区的节点……**添加自定义域名需完成工信部备案**」；「全球可用区（不含中国大陆）：分配使用除中国大陆可用区外的其他节点……**添加自定义域名不要求工信部备案**」——[域名管理 · 概览（加速区域）](https://pages.edgeone.ai/zh/document/domain-overview)
- 选择位置（两条创建路径都有）：
  - Git 导入：「**选择加速区域**：不同的区域决定了项目分配的节点资源，以及添加自定义域名的时候是否需要备案」——[导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)
  - 直接上传：「2. 填写"项目名称"，并**选择"加速区域"**。」——[直接上传](https://pages.edgeone.ai/zh/document/direct-upload)
  - 查看现状：项目列表中每行展示「加速区域：项目所属的加速区域」——[项目管理](https://pages.edgeone.ai/zh/document/project-management)
- 对应的 API 枚举值与默认值：`area: "mainland" | "overseas" | "global"`，含义为「加速区域，分别对应中国大陆可用区、全球可用区（不含中国大陆）和全球可用区」；`projects.create` 的 `area` **非必填，「未设置时服务端默认使用 `"global"`」**——[SDK · projects.create](https://pages.edgeone.ai/document/sdk-project-operations) / [中文](https://pages.edgeone.ai/zh/document/sdk-project-operations)
- **创建后能否切换区域：官方未说明。** 反证：`projects.update` 明确列出可更新字段——项目名称、根目录、输出目录、构建命令、安装命令、框架预设、Node 版本，**不含 `area`**——[SDK · projects.update](https://pages.edgeone.ai/zh/document/sdk-project-operations)。控制台侧也未检索到任何"修改加速区域"的入口说明（项目管理页的项目设置只列 项目名称/域名管理/Git 管理/配置构建部署/环境管理）——[项目管理](https://pages.edgeone.ai/zh/document/project-management)
- 「切换是否要重建项目」：因官方未提供切换入口，**该问题官方未说明**；从现有文档只能推出"想换区域需新建项目"，属推论，未获官方确认。
- 另一个相关坑（与区域选择时点绑定）：**直接上传方式创建的项目无法改成 Git 集成**，「选择直接上传后无法切换到 Git 集成。必须创建一个具有 Git 集成的新项目才能使用自动部署。」——[直接上传](https://pages.edgeone.ai/zh/document/direct-upload)

**实操落点**：纯静态个人站、无备案域名 → 创建时选「全球可用区（不含中国大陆）」，这样绑自定义域名不要求备案。

---

### 5. 免费二级域名

**结论：官方有「项目域名（`presetDomain`）」和「部署域名」两种平台域名，但文档里没有给出统一的后缀清单；官方示例中出现过 `.edgeone.app`、`.edgeone.dev`、`.edgeone.cool` 三种后缀。实际域名请以控制台 / SDK `projects.get` 返回的 `presetDomain` 为准。另有一个重要限制：大陆网络访问项目域名需用 3 小时有效的预览链接。**

依据：

- 平台域名类型：「Makers 提供了多种域名，包括项目域名，部署域名和自定义域名。默认情况下，您的项目会获得一个**基于 Makers 平台的子域名**」；「项目域名：创建项目并成功部署后，平台会为您分配一个**固定**的项目域名」；「部署域名：每次创建新部署的时候，平台会为您分配一个**仅针对该部署**的域名」——[域名管理 · 概览](https://pages.edgeone.ai/zh/document/domain-overview)
- 字段名：「`presetDomain` / `preset_domain` — 项目域名，**仅由 `projects.get` 返回**」——[SDK · 项目对象](https://pages.edgeone.ai/zh/document/sdk-project-operations)
- **后缀的具体形态：官方未给出统一说明。** 官方页面中出现的实际示例：
  - `.edgeone.app`——「Your app is deployed (example: **`vite-react.edgeone.app`**)」，在 Git 部署与 CLI 部署两处各出现一次——[Vite 框架指南](https://pages.edgeone.ai/document/vite)
  - `.edgeone.dev` 与 `.edgeone.cool`——官方模板库的 demo 域名，如 `astro-template.edgeone.dev`、`multiplepage-portfolio.edgeone.cool`、`next-better-auth-template.edgeone.app`——[模板库](https://pages.edgeone.ai/templates)
  - ⚠️ 因此 `*.edgeone.app` 与 `*.edgeone.ai` 二选一的假设不成立：`.ai` 只是文档站自身域名（`pages.edgeone.ai`），`.edgeone.app/.dev/.cool` 才是托管产物示例域名。
- 在哪里看到：控制台 项目概览 / 域名管理 页面；API 侧 `projects.get({projectId})` 返回 `presetDomain`——[SDK](https://pages.edgeone.ai/zh/document/sdk-project-operations)
- **大陆访问限制（关键坑）**：「为保障内容合规，通过项目域名及部署域名访问 Makers 站点需遵循以下规则：1. 中国大陆网络环境：须使用**系统生成的预览链接**进行访问，该链接**有效期为 3 小时**，超时后将返回 401 错误……2. 非中国大陆网络环境可直接访问。建议绑定自定义域名以建立稳定访问通道，全球可用区（不含中国大陆）无需备案。」——[域名管理 · 概览](https://pages.edgeone.ai/zh/document/domain-overview)
- 绑定自定义域的入口：「1. 进入控制台：进入项目详情，切换到"**域名管理**"页面。2. 添加域名：单击"**添加自定义域名**"。3. 输入域名……4. 验证归属权……5. 添加 CNAME」——[自定义域名](https://pages.edgeone.ai/zh/document/custom-domain)
- 备案前置：加速区域为「中国大陆可用区」或「全球可用区（含中国大陆）」时，添加的域名需先在工信部完成备案——[自定义域名](https://pages.edgeone.ai/zh/document/custom-domain)
- 域名数量配额：免费版 200 个域名（含已绑定自定义域名及"包含边缘函数项目的默认域名"）——[套餐选型对比](https://pages.edgeone.ai/zh/document/billing-plan-comparison)
- 另有 Cloudflare 场景坑：「若域名托管在 Cloudflare 上，其根域名（如 `example.com`）暂时无法作为自定义域名添加到 Makers，建议使用子域名（如 `sub.example.com`）。」——[排障指南](https://pages.edgeone.ai/zh/document/troubleshooting)

---

### 6. 免费 SSL

**结论：有免费证书，但「是否自动签发」在官方文档里自相矛盾——HTTPS 概览明确说"不会自动分配，需手动配置"，而 FAQ 说"设置成功后平台会自动为您提供 SSL 证书"。免费证书由 TrustAsia 与 Let's Encrypt 签发，RSA，有效期 90 天，到期前 15 天自动续签。对免费二级域名是否也生效：官方未说明。**

依据（矛盾两头都列出）：

- 「**Makers 不会自动为您的域名分配 HTTPS 证书**，但鉴于安全性、可信度、搜索排名等因素我们强烈建议您完善 HTTPS 配置。」——[配置 HTTPS 证书 · 概览](https://pages.edgeone.ai/zh/document/configuring-an-https-certificate)（英文同：[EN](https://pages.edgeone.ai/document/configuring-an-https-certificate)）
- 「添加自定义域名非常简单。只需在控制台中添加您的域名，并在域名的供应商系统更新 DNS 设置。设置成功后**平台会自动为您提供 SSL 证书**。」——[常见问题 第 4 条](https://pages.edgeone.ai/zh/document/faqs)
- 另有"平台默认证书"的说法：「**平台默认证书部署超时**：生成默认证书时，证书状态出现"部署超时"。需排查下添加的域名的根域名是否存在 CAA 记录……」——[排障指南](https://pages.edgeone.ai/zh/document/troubleshooting)
  → 三条合并读法：平台对已绑定的自定义域名会尝试下发"默认证书"，但 HTTPS 概览仍要求你显式去域名管理里配置证书方式。**官方未说明默认证书覆盖哪些域名、是否为免费二级域名自动签发。**
- 免费证书的签发方与有效期：「免费证书的签发机构为 TrustAsia 与 Let's Encrypt……**证书有效期为 90 天，平台会在到期前 15 天自动申请续签**，无需手动更新。」不支持下载、不提供 SLA——[申请免费证书](https://pages.edgeone.ai/document/apply-for-free-certificate)（中文：[ZH](https://pages.edgeone.ai/zh/document/apply-for-free-certificate)）
- 需手动配置的路径与三种验证方式：「2. 左侧导航栏点击"域名管理"。3. 在域名管理页面选择需配置证书的域名，在 HTTPS 列点击"配置"。4. 在 HTTPS 配置中找到边缘 HTTPS 证书卡片，点击"配置"。5. 配置方式选择"申请免费证书"……」；三种验证方式为 自动验证 / DNS 委派验证 / 文件验证——[申请免费证书](https://pages.edgeone.ai/zh/document/apply-for-free-certificate)
- 免费证书是 RSA：「当前申请的免费证书是来源于 Trust Asian 和 Let's Encrypt 的 **RSA** 证书」；每个域名最多部署一本 RSA + 一本 ECC + 一本 SM2——[配置 HTTPS 证书 · 概览](https://pages.edgeone.ai/zh/document/configuring-an-https-certificate)
- **对免费二级域名（项目域名/部署域名）是否同样签发：官方未说明。** 所有证书文档的上下文均围绕"添加的自定义域名"，未提及 `presetDomain`。
- 可配的加固项：强制 HTTPS 访问（301/302 重定向）、HSTS、OCSP 装订——[配置 HTTPS 证书 · 概览](https://pages.edgeone.ai/zh/document/configuring-an-https-certificate)

---

### 7. Git 集成

**结论：支持 GitHub、GitLab、Bitbucket、Gitee、CNB（release notes 另提到 Coding）。连接流程是"绑定 → 授权（可只授权单个仓库或全部仓库）→ 选仓库 → 填构建配置 → 选加速区域 → 开始部署"。官方文档未要求仓库公开。**

依据：

- 支持的提供商：「Makers 目前支持 **GitHub，GitLab，Bitbucket，Gitee，CNB** 等 Git 提供商的接入」——[导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)。历史沿革：2025-03 支持 Gitee/Coding，2025-11 新增 GitLab，2026-02 新增 Bitbucket——[产品动态](https://pages.edgeone.ai/zh/document/release-notes)
- 连接流程：「注册/登录 → 开始使用（首次访问点击"立即开通"）→ 绑定 GitHub → **授权 GitHub：授予 EdgeOne 访问您仓库的权限** → **选择仓库：选择您要部署的仓库或授权所有仓库**」——[导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)
  - 授权范围是可控的：可选单个仓库，也可"授权所有仓库"（这就是需要留意的授权范围点）。
- **是否需要公开仓库：官方未说明**（流程中只有 GitHub OAuth 授权，无公开/私有仓库的限制说明）。
- 构建配置与区域在创建流程中填：「输入构建命令……选择加速区域……单击开始部署。EdgeOne Makers 将自动构建您的项目并将其部署到全球边缘网络。」——[导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)
- 触发方式：推送代码 或 控制台重新部署；部署钩子（每项目唯一 URL，HTTP POST，**无需额外认证，需自行保密**）；「目前默认只有主分支的提交才会自动触发部署」——[触发部署](https://pages.edgeone.ai/zh/document/create-deploys)
- 两个真实坑：
  1. **CNB 无原生 Webhook**：「CNB 暂不支持原生 Webhook。导入 CNB 仓库后，需在仓库根目录的 `.cnb.yml` 中配置 CNB Webhook 插件，将代码推送事件通知 Makers，才能自动触发部署。」——[导入 Git 仓库](https://pages.edgeone.ai/zh/document/importing-a-git-repository)
  2. **直接上传的项目不能改回 Git**：「选择直接上传后无法切换到 Git 集成。必须创建一个具有 Git 集成的新项目才能使用自动部署。」——[直接上传](https://pages.edgeone.ai/zh/document/direct-upload)
- 仓库断连可恢复：可通过「项目设置 - Git 管理」重新关联（2025-06 起）——[产品动态](https://pages.edgeone.ai/zh/document/release-notes)
- 环境模型：默认 生产 + 预览 两个环境，均不可删除，各自绑定分支/域名/环境变量；生产关联生产分支（如 `main`），预览关联其余所有分支；每个环境可开「自动部署」——[构建指南 · 环境管理](https://pages.edgeone.ai/zh/document/build-guide)
- CI 路径也可（不进 Git 集成也能部署）：提供 [GitHub Actions](https://pages.edgeone.ai/zh/document/using-github-actions) 与 [GitLab CI/CD](https://pages.edgeone.ai/zh/document/using-gitlab-cicd) 示例，核心命令 `npx edgeone makers deploy ./dist -n <project> -t $EDGEONE_API_TOKEN`。

---

### 8. 构建超时与并发限制

**结论：单次构建超时——免费版 20 分钟，专业版 45 分钟，商业版按需定制；并发构建数——免费版 1，专业版 6，商业版按需定制。（截至 2026-11-14 官方页面所示）**

依据：[套餐选型对比 · 项目与部署](https://pages.edgeone.ai/zh/document/billing-plan-comparison) / [EN Plan Comparison](https://pages.edgeone.ai/document/billing-plan-comparison)

| 项目 | 免费版 | 专业版 | 商业版 |
|---|---|---|---|
| 单次构建超时 | **20 分钟** | **45 分钟** | 按需定制 |
| 并发构建数 | **1** | **6** | 按需定制 |
| 构建时长额度 | 300 分钟 | 0.2 MU/vCPU-s | 按需定制 |
| 部署环境算力规格 | 4 核 6 GB | 可在 `edgeone.json` 升配 8 核 14 GB | 按需定制 |
| 项目总存储 | 5 GB | 10 GB（超量日结 5 MU/GB） | 按需定制 |
| 单次构建文件数 | 20,000 | 20,000 | 按需定制 |
| 单文件大小 | 25 MB | 100 MB | 按需定制 |
| 项目总数 | 40 | 200 | 1000 |
| 域名数 | 200 | 500 | 1000 |

补充依据与交叉验证：

- 构建机器规格由 `edgeone.json` 的 `buildMachine` 控制，`standard`=4 核 6GB（所有套餐默认），`enhanced`=8 核 14GB（仅专业版）；「**免费版配置 `enhanced` 时，构建会自动使用 `standard`**」——[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)
- 文件数与单文件大小报错可在排障页对照：「单次构建的产物最多包含 20000 个文件」「Makers 项目有单文件 25 MB 的大小限制」「Makers 有 5 GB 的存储容量限制」——[排障指南](https://pages.edgeone.ai/zh/document/troubleshooting)
- 注：`edgeone.json` 里的 `functions.*.timeout`（默认 300 秒）是**运行时函数超时**，不是构建超时，勿混用——[edgeone.json](https://pages.edgeone.ai/zh/document/edgeone-json)

---

## 官方未说明 / 未核实

以下条目在官方文档中确实没有找到明确说明，**不做推测**：

1. **Astro 框架预设的具体默认构建命令与默认输出目录值** —— 官方的「前端框架默认构建设置」表未收录 Astro（[框架总览](https://pages.edgeone.ai/document/framework-overview)）；只能确认"会自动识别框架并套用最常见配置"以及"输出目录默认是根目录 `/`"（[构建指南](https://pages.edgeone.ai/zh/document/build-guide)）。
2. **用 `package.json` 的 `engines` 字段指定 Node 版本是否生效** —— 未说明；官方只承认控制台、`.nvmrc`、`edgeone.json#nodeVersion` 三条路径。
3. **用环境变量指定 Node 版本** —— 未说明。
4. **创建项目后能否切换加速区域、切换是否需重建项目** —— 未说明。仅有反证：`projects.update` 可改字段不含 `area`（[SDK](https://pages.edgeone.ai/zh/document/sdk-project-operations)）。"需新建项目"是推论，非官方结论。
5. **免费二级域名（项目域名/部署域名的）确切后缀清单** —— 未说明。官方示例里同时出现 `.edgeone.app`、`.edgeone.dev`、`.edgeone.cool`（[Vite 页](https://pages.edgeone.ai/document/vite)、[模板库](https://pages.edgeone.ai/templates)），无统一声明；实际值须查控制台或 SDK 的 `presetDomain`。
6. **免费 SSL 是否对平台免费二级域名自动生效** —— 未说明；所有证书文档只讲自定义域名。且"是否自动签发"本身在官方文档内部矛盾（HTTPS 概览说不会自动分配 vs FAQ 说会自动提供），已在第 6 条并列。
7. **免费证书是否覆盖泛域名 / 通配符场景在 Makers 下的具体行为** —— 未核实（仅"DNS 委派验证"处提到"适合申请泛域名证书"，未展开 Makers 侧限制）。
8. **Git 集成是否要求仓库公开** —— 未说明。
9. **Astro `astro:assets` Image 组件在纯静态模式下的实际可用性** —— 官方特性表标注 Image 组件「暂不支持」（[Astro 框架指南](https://pages.edgeone.ai/zh/document/framework-astro)），但未区分 SSG 与 SSR 场景，需实测。
10. **中英文文档不一致（已两边列出，供裁决）**：
    - Node 建议版本：EN "Using an **earlier** Node.js version is recommended" vs ZH「建议使用**靠前**的 Node.js 版本」（[EN](https://pages.edgeone.ai/document/framework-astro) / [ZH](https://pages.edgeone.ai/zh/document/framework-astro)）
    - EdgeOne CLI 版本要求：EN「EdgeOne CLI version requirement **≥ 1.2.4**」vs ZH「EdgeOne CLI 版本要求 **≥ 1.2.0**」（[EN](https://pages.edgeone.ai/document/framework-astro) / [ZH](https://pages.edgeone.ai/zh/document/framework-astro)）—— 若走 CLI 部署，按较严的 1.2.4 处理。
11. 本文未涉及的：备案流程细节（属 `hosting-mainland.md`）、付费档位细节、Astro 项目侧的图片/字体优化具体配置。官方文档页面本身未标注逐页"最后更新"时间（腾讯云镜像页显示 Astro 页为 2026-07-13），故版本类数据统一以抓取日 2026-11-14 为准。


---

## 对本项目的落点（决定）

以下是从上述调研直接落到本项目的配置决定，写骨架时照此执行：

| 配置项 | 值 | 依据 |
| --- | --- | --- |
| 构建命令 | `npm run build`（框架预设自动填） | 调研第 1 条 |
| **输出目录** | **必须手填 `dist`** —— 平台默认是仓库根目录 `/`，不填会 404 | 调研第 1 条（这是最容易踩的坑） |
| Node 版本 | 控制台选 **24.18.0** | 预装列表里唯一满足 Astro `>=22.23.4` 且非奇数的档位 |
| Astro output | 不写任何配置（v5 默认 `'static'`），**不装 adapter** | 调研第 3 条 |
| 加速区域 | 创建时选「**全球可用区（不含中国大陆）**」 | 调研第 4 条；创建后无切换入口，选错只能重建项目 |
| Git 集成 | GitHub 或 Gitee 均可，push 主分支自动触发 | 调研第 7 条 |
| 构建配额 | 免费版 300 分钟/月、单次 20 分钟、并发 1、5 GB 存储、单文件 25 MB | 调研第 8 条 |

### ⚠ 推翻了「先不买域名」这个决定

调研第 5 条查到一个官方限制，之前几轮讨论都不知道它的存在：

> 通过**项目域名及部署域名**访问 Makers 站点时，中国大陆网络环境**须使用系统生成的预览链接**，该链接**有效期为 3 小时**，超时后返回 401；非中国大陆网络环境可直接访问。官方建议绑定自定义域名以建立稳定访问通道。

官方出处：[域名管理 · 概览](https://pages.edgeone.ai/zh/document/domain-overview)

**影响**：本站受众以大陆为主。这意味着平台赠送的免费二级域名，对大陆访客**等于不可用**——三小时后链接就失效。所以「先用免费二级域名发给同学看」这条路走不通，**必须绑定自定义域名**，也就意味着**必须买一个域名**。

好在选「不含大陆区」后，绑自定义域名**不需要备案**，所以买域名即可，不必走备案流程。

这条已同步到地图的「已定事项」，需要 owner 重新裁决买域名这件事。

### 另一个风险点

官方 Astro 特性表标注 **Image 组件「暂不支持」**（未区分 SSG/SSR）。纯静态站构建期仍会跑 sharp 处理，但这条官方表述存在不确定性。骨架阶段应实测：用 `astro:assets` 放一张图，确认 `npm run build` 通过且产物图片路径正确。若不通过，退回 `public/` 目录 + 普通 `<img>` 标签，放弃构建期优化。