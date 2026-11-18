# 博士个人网站 · 探索地图

## Destination

一份可直接开工的站点设计稿，外加一个能跑起来的最小骨架：信息架构、每个栏目的内容模型（字段契约）、目录结构与技术选型全部定下来，并且骨架里真的填进了 2 篇论文和 1 个项目，能证明字段够用。

**不含**：把站点部署上线、买域名、完整视觉 UI 设计 —— 那些是下一个 effort。

**规划状态：已完结**（2026-11-17）。**交接状态：已完成**（2026-11-18）。**本图已关闭**（2026-11-18）。全部 6 张探索子票关闭，无未决决定；规格 #8 与 7 张实施票 #9–#15 已生成，施工由实施票承担。

## Notes

**背景**：在读博士生，要做一个全中文的个人网站，四个内容区：个人介绍、论文发表、开发项目、日常分享。

**领域约定**：纯静态站，内容以 Markdown 文件为唯一来源；没有数据库、没有登录、没有服务端逻辑。

**每个 session 开工前应当先读**：

- [`docs/research/个人网站制作调研.md`](../../docs/research/个人网站制作调研.md) —— 六类建站路线、平台限额、部署流程的一手来源汇总
- [`docs/research/个人网站执行清单.md`](../../docs/research/个人网站执行清单.md) —— 阶段 0–10 的验收清单
- [`research/hosting-mainland.md`](research/hosting-mainland.md) —— 托管与备案的一手调研
- [`research/astro-url-and-slug-facts.md`](research/astro-url-and-slug-facts.md) —— Astro 的 URL 形态、slug 机制、分页、404 产物的一手事实
- [`research/astro-content-schema-facts.md`](research/astro-content-schema-facts.md) —— content collections 的字段机制：`image()`、正文渲染、日期解析、重复 slug、正文插图（10 节）
- [`research/papers-content-model-facts.md`](research/papers-content-model-facts.md) —— 论文条目专用：`image()` 的路径基准、`ImageMetadata`、`index.md` 的 id 去尾、跨条目唯一性、YAML 块标量分段
- [`research/edgeone-static-routing.md`](research/edgeone-static-routing.md) —— EdgeOne 的 URL 解析、404 约定、`edgeone.json` 路由能力
- [`research/homepage-data-sources-facts.md`](research/homepage-data-sources-facts.md) —— 首页与单例数据：单条目集合的 `entry.id` 陷阱（是 `index` 不是目录名）、官方对单例数据无条款、`getCollection()` 顺序非契约、`sort` 稳定性、`getCollection()` 的 filter 传对象被静默忽略（9 节）
- [`research/skeleton-acceptance-facts.md`](research/skeleton-acceptance-facts.md) —— 空内容集合 / 空动态路由的构建行为（7 节全实测，astro 7.4.12）：`getStaticPaths()` 返回 `[]` 时**组件函数体执行 0 次**、空集合两条警告消不掉、`.gitkeep` 防 clone 退化而非消警告、失败退出码可能是 `0xC0000409`、`render(entry)` 已取代 `entry.render()`

**读票纪律**：**读已关闭票时必须连评论一起读**（`deck_issue_get` 带 `comments=N`）。Wayfinder 的补遗惯例是把修正写在评论里、正文保持原样；只看正文会把「已对齐」误判成「未对齐」——#4 的字段命名就踩过一次。

**已定事项**（grilling 阶段确定，没有对应的票）：

| 主题 | 决定 |
| --- | --- |
| 受众 | 学术展示与软件项目展示为主，偶尔日常分享；暂不面向求职 |
| 语言 | 全中文；论文标题、会议名、技术名词保留英文原名 |
| 技术栈 | Astro，纯静态输出 |
| 托管 | EdgeOne Pages，「全球可用区（不含中国大陆）」；创建时选，创建后无切换入口 |
| 域名 | **必须购买自定义域名**（原「先用免费二级域名」的决定已被推翻，见工单 01）——平台二级域名对大陆访客仅 3 小时有效 |
| 部署触发 | Git 集成，push 后平台自动构建（仓库放 GitHub 还是 Gitee，由 owner 自行二选一） |
| 仓库布局 | Astro 默认布局，站点在仓库根目录，`docs/` 与源码平级 |
| 版本管理 | 建骨架前先 `git init` 并完成首次提交（含 `.gitignore`）。**开工前另有一步：把规划期未提交改动单独提交一次**（见工单 07） |
| 导航 | 4 项：首页 / 论文 / 项目 / 分享 |
| 首页 | 单页可下滑：介绍 → 论文 → 项目 → 分享，**每栏取 3 条**，可点开看详情。**首页 = 各集合已定排序的前 3 条，无例外**（见工单 06） |
| 个人介绍 | 只有一段 owner 自己写的文字 + 一个名字；下方固定一条联系方式栏（邮箱 / GitHub / Google Scholar），页脚再出现一次。**不做独立「关于」页**（见工单 03） |
| 论文字段 | 英文标题、中文标题、年份、作者、DOI、期刊/会议、中文简介（1–2 段）、图片（1–2 张） |
| 论文排序 | 纯按年份倒序，不展示发表状态 |
| 作者标记 | 加粗 owner 姓名，并显式标注第一作者 / 共同一作 |
| 论文详情 | 独立页面、独立 URL；URL 一旦定下不再随标题改动 |
| 项目 | 全部项目都带截图 +「为什么做这个」 |
| 分享 | 先留空位，内容以 Markdown 上传。**空态统一 `暂无分享。`**（见工单 05、06；原「以后会在这里写点东西」作废） |
| 明确不做 | RSS、站内搜索、评论、双语切换 |
| 图片 | 全部进仓库（不用外链图床），提交前压缩。**阈值已定：长边 ≤ 1600px、`.webp`、单张 ≤ 300 KB**（见工单 07） |
| **schema 判据** | **只管结构不变量，不管编辑品味**（#5 立、#4 沿用）——该管：slug 格式、必填缺失、图片路径不存在、`alt` 缺失；不该管：配几张图、摘要多长 |
| **全序判据** | **凡是依赖顺序的地方，比较器必须把每一级键写全，不许靠输入顺序或 `sort` 稳定性兜底**（#6 立）——`getCollection()` 的返回顺序**没有契约**（官方明说 non-deterministic and platform-dependent） |
| **字段命名** | 全 `snake_case`，不用 camelCase（#5 立、#4 沿用、#6 重申） |
| **验收判据** | **「构建通过」不是验收标准，因为它在最该报警的地方最安静**（#7 立）——`getStaticPaths()` 返回 `[]` 时组件函数体执行 0 次，写错了也全绿。凡「写错不报错、只是页面悄悄坏掉」处，验收必须换成能让它出声的手段 |
| 包管理器 | **npm**，提交 `package-lock.json`（见工单 07） |
| 设计稿位置 | **`docs/design/站点设计稿.md`**，单文件不拆（见工单 07） |

**产物形态**：设计文档（页面清单、字段定义、目录结构、选型结论）+ 可运行的骨架。

## Decisions so far

<!-- 每关闭一张票补一行：一行摘要 + 链接指向票里的详细答案 -->

- [EdgeOne Pages 构建 Astro 静态站的配置要求](https://github.com/zwxdogs/MyWeb/issues/2)：输出目录必须手填 `dist`（平台默认是根目录）、Node 选 24.18.0、纯静态不装 adapter、区域创建时选「全球可用区（不含大陆）」。**并查出一条推翻原决定的事实：平台免费二级域名对大陆访客仅 3 小时有效，故必须购买自定义域名（但无需备案）。**
- [页面清单与 URL 结构](https://github.com/zwxdogs/MyWeb/issues/3)：**URL 是本项目唯一会跨出仓库、被别人复制走的产物**，故必须与内容解耦。定下：8 条路由（首页 + 论文/项目/分享三类列表页 + 三类详情页 + 404，无「关于」页）；**目录式 URL**（`build.format` 默认 `'directory'`，零配置），不押注平台「美化 URL」；**slug 强制手填** frontmatter、正则 `^[a-z0-9]+(-[a-z0-9]+)*$`、集合内唯一、发布后不可变；**中文与 DOI 均不进 URL**（DOI 标识的是「某次寄存」而非论文，同一篇会有多个，且本身带斜杠、大小写不敏感、并非每篇都有）；栏目段名 `/papers/ /projects/ /notes/`，详情 URL 不带年份层级；**不分页也不预留** `/page/2/`。**已知风险**：Astro 官方明确 `trailingSlash` 管不了预渲染页，EdgeOne 又对无尾斜杠访问毫无承诺——实测需先部署，故移交下一个 effort，本 effort 内建验证用例。
- [项目条目与分享条目的内容模型](https://github.com/zwxdogs/MyWeb/issues/5)：定下一条贯穿全局的判据——**schema 只管结构不变量，不管编辑品味**（该管的：slug 格式、必填缺失、图片路径不存在、`alt` 缺失；不该管的：配几张图、摘要多长）。项目 9 字段（7 必填 2 可选，`repo`/`demo` 可选）、栈用数组、动机写正文、**截图不设上限且第一张即封面**、不做活跃/归档、按 `date` 倒序不加 `order`；分享不设 `summary`/`tags`/`draft`，标题必填，摘要从正文首段自动截取（须剥 Markdown 标记）；空态统一 `暂无{栏目名}。`；**一篇一目录** `src/content/<集合>/<slug>/index.md` + 同目录图片。**并修正 #3 两处**：`date` 不能用 `z.string()`（裸日期会被 YAML 层解析成 `Date`），重复 slug 不会让构建失败（须显式设 `prerenderConflictBehavior: 'error'`）。
- [论文内容模型与文件组织](https://github.com/zwxdogs/MyWeb/issues/4)：**这份契约的读者不是人，是 schema 和模板**——每个字段的存在理由必须是「模板要渲染它」或「schema 要校验它」。13 项裁定：`title_en` + `title_zh` 对称必填、`year`/`month` 用 number（顺带避开 #5 的 `Date` 坑）、单个 `venue` 字符串；作者为对象数组 `{name, me?}` 且 `me: true` **恰好一次**（否决「全局配置按名匹配」，因为变体会静默失配、构建不报错），一作/共一只在顶层 `my_role` 枚举、不给每位作者加标记；DOI 存**裸值**（它是标识符不是 URL）、可选，链接由模板拼；可选字段只留 `doi?` 与 `code_url?`，**录用率属范畴错误**（描述会议非论文、口径不一、要年年维护）、BibTeX 应由字段生成；`figures` 对象数组 `{src: image(), caption}`、`caption` 必填兼作 `alt`、**`min(1)` 不设上限且第一张即封面**；`summary` 放 frontmatter 用 `|-`（YAML 能保分段，原先「不能分段」是误解）；**每篇一目录** `src/content/papers/<slug>/index.md`。**两道防线防静默失效**：`prerenderConflictBehavior: 'error'` + 构建期预检（目录名 === slug、slug 唯一、DOI 查重）。**更正自己的错判**：重复 slug 默认只警告并**非确定性覆盖**，不会让构建失败。**字段命名已由第二条补遗（08:18）对齐 snake_case**。
- [首页四栏的内容来源与降级规则](https://github.com/zwxdogs/MyWeb/issues/6)：判据——**首页不是第二个列表页，是「为什么要点开」的橱窗**。九项：三栏统一 **3 条**（`HOME_LIMIT`）；**首页复用列表页的排序函数**（`src/lib/collections.ts` 是唯一真相），分享补 `slug asc` 作第三级，**比较器必须写全每一级键**（`sort` 的稳定性救不了，因为 `getCollection()` 的顺序本身无契约）；降级三档——`0` 条显示 `暂无{栏目名}。`、`1–2` 条**正常渲染不补占位**、`≥3` 取前 3；个人介绍与联系方式进 **`src/content/profile/index.md` 单条目集合**（正文 = 介绍文字，frontmatter = `name`/`email`/`github`/`scholar`），**改它不需要改代码**，schema 用 `z.literal('profile')` 锁死 id（单条目目录的 `entry.id` 实测是 `index`，官方文档对此完全空白）；联系方式三项保留、**不加 ORCID**、缺了整项不渲染；「查看全部 →」**仅在该栏总条数 > 3 时显示**；首页每条只显示封面图 + 标题 + `venue · year`（论文栏不显示 `summary`）；**不做 `featured`**；字段命名全 `snake_case` 与地图一致。
- [骨架的验收标准与设计稿交付形态](https://github.com/zwxdogs/MyWeb/issues/7)：**本图最后一站**。判据——**「构建通过」不是验收标准，因为它在最该报警的地方最安静**（实测：`getStaticPaths()` 返回 `[]` 时组件函数体执行 0 次，模板写错也全绿）。14 项：样例数据**全真实**（假数据证明不了「字段够用」）；图片压缩**长边 ≤ 1600px / `.webp` / 单张 ≤ 300 KB**；设计稿写结论 + 每字段示例 + 新增内容步骤 + 移交清单，放 **`docs/design/站点设计稿.md`**；样式要最简 CSS 且三条可验证硬约束（4 个变量、三档无横向滚动、不引框架与外部字体）；**8 条路由全落地**；验收分三组——自动 8 条（`npm run verify`）/ 人工 2 条（dev、preview）/ 人眼 5 条；**空集合警告走白名单不清零**（「警告为零」是永远打不上的勾）；`notes/[slug].astro` 用**往返验证**（塞 1 条→断言真实标题进产物→删→再构建干净）；`.gitkeep` 必须有但理由是**防 clone 退化不是消警告**；两样都落成仓库实体文件，`scripts/verify.mjs` 手写不引框架；设计稿是**唯一**进入下一个 effort 的产物且必须自带移交清单；包管理器 **npm**；开工前先提交规划期改动。

## Not yet specified

<!-- 还没到能写成票的清晰度，但确认在终点方向上的东西 -->

- 分享栏第一篇的形态：长文还是短记？（「列表页要不要标签」已由 #5 裁定为**不要**）
- **列表页**里中文标题与英文标题的主次与排列顺序（首页已由 #6 定为 `title_zh` 为主、`title_en` 小字为辅；列表页是否同构未裁）
- 论文列表页要不要按年份显示年份分组标题

> 上面三条**不阻塞骨架**：骨架期列表页可先按首页同构（`title_zh` 主、`title_en` 次），等内容积累后再定。
>
> 原第四条「图片压缩的具体阈值与工具」**已由 #7 裁定**（长边 ≤ 1600px、`.webp`、单张 ≤ 300 KB），从此节移除。

## 工单（GitHub Issues）

本图的权威工单在 GitHub Issues，仓库内 `.scratch/` 保留副本供离线阅读。

| GitHub | 类型 | 依赖 | 工单 |
| --- | --- | --- | --- |
| [#1](https://github.com/zwxdogs/MyWeb/issues/1) | 地图 | — | 探索地图（本文的远程副本） |
| [#2](https://github.com/zwxdogs/MyWeb/issues/2) | research | — | EdgeOne Pages 构建 Astro 静态站的配置要求 ✅ 已关闭 |
| [#3](https://github.com/zwxdogs/MyWeb/issues/3) | grilling | — | 页面清单与 URL 结构 ✅ 已关闭（含 #5 的两条补遗） |
| [#4](https://github.com/zwxdogs/MyWeb/issues/4) | grilling | #3 ✅ | 论文内容模型与文件组织 ✅ 已关闭（含与 #5 对齐、与 #6 的字段命名补遗） |
| [#5](https://github.com/zwxdogs/MyWeb/issues/5) | grilling | #3 ✅ | 项目条目与分享条目的内容模型 ✅ 已关闭 |
| [#6](https://github.com/zwxdogs/MyWeb/issues/6) | grilling | #3 ✅ #4 ✅ #5 ✅ | 首页四栏的内容来源与降级规则 ✅ 已关闭 |
| [#7](https://github.com/zwxdogs/MyWeb/issues/7) | grilling | #3 ✅ #4 ✅ #5 ✅ #6 ✅ | 骨架的验收标准与设计稿交付形态 ✅ 已关闭 |

**前沿：空。** 6 张子票全部关闭，无未阻塞未认领的工单，无未决决定。规划阶段到此结束。

## 下一步（执行怎么交棒）

按 wayfinder 的默认纪律，**决定做完即交棒，执行不进本图的票体系**。剩下的都是施工，不再是决策：

1. ~~**清工作区**~~ **已完成**：规划期那批改动已随提交 `2f59f4a` 入库。**新增一条**：把 `AGENTS.md` 与 `docs/agents/`（技能与议题跟踪器配置，当前仍是未跟踪文件）单独提交一次，别混进骨架的第一个 commit。
2. **写设计稿** `docs/design/站点设计稿.md`——只是把 #4/#5/#6/#7 的裁定收拢组装，不新写。
3. **搭骨架**：`npm create astro@latest` → `content.config.ts`（papers / projects / notes / profile）→ 8 条路由 → `src/lib/collections.ts` → `src/styles/global.css`。
4. **填真实内容**：2 篇真实论文（#4 已给可抄形态，从 PDF 截原图）+ 1 个真实项目（一张截图即可）。
5. **跑 `npm run verify`**（8 条自动断言）+ 人工 2 条 + 人眼 5 条。

## 交棒与收尾核对（2026-11-17）

**核对结论：探索真正完成，6/6 不是账面数字。**

- `deck_map_snapshot` 实测：子票 `total 6 / closed 6 / open 0 / 前沿 0 / 未认领 0`，阻塞边无残留。
- 六张票**正文 + 全部评论**逐票读完（#2 1 条、#3 2 条、#4 4 条、#5 3 条、#6 1 条、#7 1 条），补遗里的修正都已生效：字段命名全 `snake_case`（#4 第二条补遗，第三条补遗自己更正了误判）、`prerenderConflictBehavior: 'error'`（#5 更正 2 → #3 修正 1）、`date` 走 `z.coerce.date()`、`figures` 去掉上限且第一张即封面、`z.array(image())` 由「需实测」升为「实测通过」。
- 剩余事项分类判定：#3 与 #7 的「仍未决 / 移交」**全部是执行或上线阶段才做的事**（EdgeOne 尾斜杠与 404 状态码实测、`astro:assets` 在 EdgeOne 的实测、5+1 条已知风险回填设计稿），没有一条是还没做的决定；`Not yet specified` 三条已明写「不阻塞骨架」。⇒ **无未决事项。**
- 地图自身状态与实况一致：6 张子票全关、地图仍 `open` 只因为交接还没走完，**不是漏关**。

**结论需要接着做**（写设计稿 + 搭可运行骨架都是施工，不是决定）⇒ 走「交棒」，施工不进本图的票体系。本条另把仓库内副本 `.scratch/phd-personal-site/map.md` 与远端正文重新对齐（此前差一行：本图曾写「规划期 8 个未提交改动」，实况已在 `2f59f4a` 入库）。

### 交接状态

| 交接 | 状态 |
| --- | --- |
| `/to-spec` | **已生成：[规格：博士个人网站骨架（设计稿 + 8 条路由 + 一条 verify 命令）](https://github.com/zwxdogs/MyWeb/issues/8)**（2026-11-18，已带 `ready-for-agent`） |
| `/to-tickets` | **已完成**：拆成 7 张实施票（[#9](https://github.com/zwxdogs/MyWeb/issues/9)–[#15](https://github.com/zwxdogs/MyWeb/issues/15)），已用原生父子议题挂到 #8 下、原生阻塞边连好（2026-11-18） |

### 规格已生成（2026-11-18）

`/to-spec` 产出 **#8 规格：博士个人网站骨架（设计稿 + 8 条路由 + 一条 verify 命令）**，标签 `ready-for-agent`。

规格只收拢本图六张票的裁定，**没有新做任何决定**；它同时锁定了测试接缝：**整个项目只建一个接缝 —— `npm run verify`，跑在 `npm run build` 的产物上**（纯静态生成器对外的唯一契约就是 `dist/` 里有什么；更上层需要真实部署、本轮无条件，更下层会跟着实现漂移）。8 条自动断言、2 条人工、5 条人眼即由此展开。

下一步：`/to-tickets`。

### 拆分已落地（2026-11-18）

`/to-tickets` 把规格 #8 拆成 **7 张曳光弹工单**，全部用 GitHub 原生子议题挂在 #8 下、用原生阻塞边连好（`issue_dependencies_summary.blocked_by` 实测：#9 0、#10 0、#11 1、#12 2、#13 2、#14 4、#15 6）。

| 票 | 切片 | 被谁阻塞 |
| --- | --- | --- |
| [#9](https://github.com/zwxdogs/MyWeb/issues/9) | 骨架能打开：布局、导航、最简样式、404、三列表页空态 | 无（前沿） |
| [#10](https://github.com/zwxdogs/MyWeb/issues/10) | 设计稿：让三个月后的你不用回翻议题 | 无（前沿） |
| [#11](https://github.com/zwxdogs/MyWeb/issues/11) | 论文线端到端：契约、两篇真实论文、排序、两道防线 | #9 |
| [#12](https://github.com/zwxdogs/MyWeb/issues/12) | 项目线端到端：一个真实项目、可选链接、截图 | #9 #11 |
| [#13](https://github.com/zwxdogs/MyWeb/issues/13) | 分享线端到端：空态、往返验证、摘要截取 | #9 #11 |
| [#14](https://github.com/zwxdogs/MyWeb/issues/14) | 首页组装：介绍与联系方式、三档降级、条件显示 | #9 #11 #12 #13 |
| [#15](https://github.com/zwxdogs/MyWeb/issues/15) | 验收命令与收尾：verify 8 条断言、README 同步 | #9 #10 #11 #12 #13 #14 |

**前沿是 #9 与 #10**——两张都能立刻开工，且互不阻塞（一张搭骨架、一张写文档，不冲突）。

**切片理由（为什么是竖着切）**：每条内容线（论文/项目/分享）都自己走完「字段契约 → 校验 → 列表页 → 详情页 → 空态/边界」并自带给它自己的失败用例，而不是先「把所有 schema 写完」再「把所有页面写完」。这样每张票做完都是一个能演示的状态，且论文线做完时，后面两条线已经有可照抄的形状（所以 #12/#13 显式依赖 #11 而不是只依赖 #9）。

**#15 依赖 #10 的理由**：#15 要求「设计稿里的验收条数与脚本实际断言一致」，这条只有在设计稿已经存在时才可验证。

两个交接至此都已完成。

### 与上一条「下一步」的关系

上一条的第 1 条（清工作区）已过时，已就地改写成当前实况；第 2–5 条（设计稿 → 骨架 → 真实内容 → `verify`）不变，它们正是 `/to-spec` 要收拢成规格的内容。
## Out of scope

<!-- 明确排除在本 effort 之外，不会随前沿推进而"毕业" -->

- 站点部署上线、域名购买、ICP 备案 —— 本图终点是骨架，上线是下一个 effort
- 完整视觉 UI 设计（配色、字体、组件外观）—— owner 明确说等做 UI 时再定
- RSS / 站内搜索 / 评论 / 双语切换 —— 已明确不做
- 任何服务端能力（数据库、登录、后台）—— 静态站无此需求
- **EdgeOne 尾斜杠规范化与 404 状态码的实测** —— 需先部署才能测，属上线阶段；结论回来时以本 effort 的验证用例为依据

---

_仓库内的权威副本：`.scratch/phd-personal-site/map.md`。子工单以 GitHub Issues 为准。_