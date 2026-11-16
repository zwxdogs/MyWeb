# 博士个人网站 · 探索地图

## Destination

一份可直接开工的站点设计稿，外加一个能跑起来的最小骨架：信息架构、每个栏目的内容模型（字段契约）、目录结构与技术选型全部定下来，并且骨架里真的填进了 2 篇论文和 1 个项目，能证明字段够用。

**不含**：把站点部署上线、买域名、完整视觉 UI 设计 —— 那些是下一个 effort。

## Notes

**背景**：在读博士生，要做一个全中文的个人网站，四个内容区：个人介绍、论文发表、开发项目、日常分享。

**领域约定**：纯静态站，内容以 Markdown 文件为唯一来源；没有数据库、没有登录、没有服务端逻辑。

**每个 session 开工前应当先读**：

- [`docs/research/个人网站制作调研.md`](../../docs/research/个人网站制作调研.md) —— 六类建站路线、平台限额、部署流程的一手来源汇总
- [`docs/research/个人网站执行清单.md`](../../docs/research/个人网站执行清单.md) —— 阶段 0–10 的验收清单
- [`research/hosting-mainland.md`](research/hosting-mainland.md) —— 托管与备案的一手调研
- [`research/astro-url-and-slug-facts.md`](research/astro-url-and-slug-facts.md) —— Astro 的 URL 形态、slug 机制、分页、404 产物的一手事实
- [`research/astro-content-schema-facts.md`](research/astro-content-schema-facts.md) —— content collections 的字段机制：`image()`、正文渲染、日期解析、重复 slug、正文插图（10 节）
- [`research/edgeone-static-routing.md`](research/edgeone-static-routing.md) —— EdgeOne 的 URL 解析、404 约定、`edgeone.json` 路由能力

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
| 版本管理 | 建骨架前先 `git init` 并完成首次提交（含 `.gitignore`） |
| 导航 | 4 项：首页 / 论文 / 项目 / 分享 |
| 首页 | 单页可下滑：介绍 → 论文 → 项目 → 分享，每栏最新 2–3 条，可点开看详情 |
| 个人介绍 | 只有一段 owner 自己写的文字；下方固定一条联系方式栏（邮箱 / GitHub / Google Scholar），页脚再出现一次。**不做独立「关于」页**（见工单 03） |
| 论文字段 | 英文标题、中文标题、年份、作者、DOI、期刊/会议、中文简介（1–2 段）、图片（1–2 张） |
| 论文排序 | 纯按年份倒序，不展示发表状态 |
| 作者标记 | 加粗 owner 姓名，并显式标注第一作者 / 共同一作 |
| 论文详情 | 独立页面、独立 URL；URL 一旦定下不再随标题改动 |
| 项目 | 全部项目都带截图 +「为什么做这个」 |
| 分享 | 先留空位，内容以 Markdown 上传；空时首页该栏显示占位文字 |
| 明确不做 | RSS、站内搜索、评论、双语切换 |
| 图片 | 全部进仓库（不用外链图床），提交前压缩 |

**产物形态**：设计文档（页面清单、字段定义、目录结构、选型结论）+ 可运行的骨架。

## Decisions so far

<!-- 每关闭一张票补一行：一行摘要 + 链接指向票里的详细答案 -->

- [EdgeOne Pages 构建 Astro 静态站的配置要求](https://github.com/zwxdogs/MyWeb/issues/2)：输出目录必须手填 `dist`（平台默认是根目录）、Node 选 24.18.0、纯静态不装 adapter、区域创建时选「全球可用区（不含大陆）」。**并查出一条推翻原决定的事实：平台免费二级域名对大陆访客仅 3 小时有效，故必须购买自定义域名（但无需备案）。**
- [页面清单与 URL 结构](https://github.com/zwxdogs/MyWeb/issues/3)：**URL 是本项目唯一会跨出仓库、被别人复制走的产物**，故必须与内容解耦。定下：8 条路由（首页 + 论文/项目/分享三类列表页 + 三类详情页 + 404，无「关于」页）；**目录式 URL**（`build.format` 默认 `'directory'`，零配置），不押注平台「美化 URL」；**slug 强制手填** frontmatter、正则 `^[a-z0-9]+(-[a-z0-9]+)*$`、集合内唯一、发布后不可变；**中文与 DOI 均不进 URL**（DOI 标识的是「某次寄存」而非论文，同一篇会有多个，且本身带斜杠、大小写不敏感、并非每篇都有）；栏目段名 `/papers/ /projects/ /notes/`，详情 URL 不带年份层级；**不分页也不预留** `/page/2/`。**已知风险**：Astro 官方明确 `trailingSlash` 管不了预渲染页，EdgeOne 又对无尾斜杠访问毫无承诺——实测需先部署，故移交下一个 effort，本 effort 内建验证用例。
- [项目条目与分享条目的内容模型](https://github.com/zwxdogs/MyWeb/issues/5)：定下一条贯穿全局的判据——**schema 只管结构不变量，不管编辑品味**（该管的：slug 格式、必填缺失、图片路径不存在、`alt` 缺失；不该管的：配几张图、摘要多长）。项目 9 字段（7 必填 2 可选，`repo`/`demo` 可选）、栈用数组、动机写正文、**截图不设上限且第一张即封面**、不做活跃/归档、按 `date` 倒序不加 `order`；分享不设 `summary`/`tags`/`draft`，标题必填，摘要从正文首段自动截取（须剥 Markdown 标记）；空态统一 `暂无{栏目名}。`；**一篇一目录** `src/content/<集合>/<slug>/index.md` + 同目录图片。**并修正 #3 两处**：`date` 不能用 `z.string()`（裸日期会被 YAML 层解析成 `Date`），重复 slug 不会让构建失败（须显式设 `prerenderConflictBehavior: 'error'`）。

## Not yet specified

<!-- 还没到能写成票的清晰度，但确认在终点方向上的东西 -->

- 分享栏第一篇的形态：长文还是短记？（「列表页要不要标签」已由 #5 裁定为**不要**）
- 中文标题与英文标题在列表页的主次与排列顺序
- 论文列表页要不要按年份显示年份分组标题
- 图片压缩的具体阈值与工具（长边像素、目标格式、**单张体积上限**）——#5 确认：该设限的是体积不是张数
- 联系方式栏在 owner 没有 Google Scholar / ORCID 时怎么降级显示
- 首页各栏要不要 `featured` 之类的置顶机制（与下方 #6 相关，落地前先在 #6 判）

## 工单（GitHub Issues）

本图的权威工单在 GitHub Issues，仓库内 `.scratch/` 保留副本供离线阅读。

| GitHub | 类型 | 依赖 | 工单 |
| --- | --- | --- | --- |
| [#1](https://github.com/zwxdogs/MyWeb/issues/1) | 地图 | — | 探索地图（本文的远程副本） |
| [#2](https://github.com/zwxdogs/MyWeb/issues/2) | research | — | EdgeOne Pages 构建 Astro 静态站的配置要求 ✅ 已关闭 |
| [#3](https://github.com/zwxdogs/MyWeb/issues/3) | grilling | — | 页面清单与 URL 结构 ✅ 已关闭（含 #5 的两条补遗） |
| [#4](https://github.com/zwxdogs/MyWeb/issues/4) | grilling | #3 ✅ | 论文内容模型与文件组织 |
| [#5](https://github.com/zwxdogs/MyWeb/issues/5) | grilling | #3 ✅ | 项目条目与分享条目的内容模型 ✅ 已关闭 |
| [#6](https://github.com/zwxdogs/MyWeb/issues/6) | grilling | #3 ✅ #4 #5 ✅ | 首页四栏的内容来源与降级规则 |
| [#7](https://github.com/zwxdogs/MyWeb/issues/7) | grilling | #3 #4 #5 #6 | 骨架的验收标准与设计稿交付形态 |

**前沿（现在可动）**：#4 仍在办（论文内容模型），#5 已关闭。**#6 现在只差 #4**——#4 一关，#6 即解锁。

## Out of scope

<!-- 明确排除在本 effort 之外，不会随前沿推进而"毕业" -->

- 站点部署上线、域名购买、ICP 备案 —— 本图终点是骨架，上线是下一个 effort
- 完整视觉 UI 设计（配色、字体、组件外观）—— owner 明确说等做 UI 时再定
- RSS / 站内搜索 / 评论 / 双语切换 —— 已明确不做
- 任何服务端能力（数据库、登录、后台）—— 静态站无此需求
- **EdgeOne 尾斜杠规范化与 404 状态码的实测** —— 需先部署才能测，属上线阶段；结论回来时以本 effort 的验证用例为依据

---

_仓库内的权威副本：`.scratch/phd-personal-site/map.md`。子工单以 GitHub Issues 为准。_
