## 结论速览

**域名 + 境内对象存储（阿里云 OSS 或腾讯云 COS）+ ICP 备案**最现实。GitHub Pages / Cloudflare Pages / Vercel / Netlify 均可免备案，但四家官方文档**均未对大陆访问质量作承诺**。EdgeOne Pages 是唯一在文档中区分大陆／非大陆可用区并写明备案要求的免费产品。

## 一、海外四家

| 平台 | 免费额度（截至 2026-11-14 官方页） | push 自动构建 | 官方是否声明大陆可用性 |
|---|---|---|---|
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | 站点 ≤1 GB；带宽 100 GB/月（**软**限）；构建 10 次/小时（自定义 Actions 不占此限）；部署超 10 分钟超时 | 是（[分支或 Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)） | **官方未声明** |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) | 静态请求**免费不限量**；构建 500 次/月、1 并发；20,000 文件/站，单文件 25 MiB；100 项目/账号 | 是 | **Pages 未声明**。但 [China Network](https://developers.cloudflare.com/china-network/) 称：需 **Enterprise** 订阅、京东云运营、每个主域须有 ICP 备案 |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | Fast Data Transfer 前 100 GB；Fast Origin 前 10 GB；CDN 请求前 100 万；部署 100 次/天；超额多数需等 30 天 | 是 | **官方未声明**；[区域](https://vercel.com/docs/regions)仅 `hkg1`、`sin1`，无大陆 |
| [Netlify Free](https://www.netlify.com/pricing/) | **300 credits/月**：部署 15/次、带宽 20/GB、请求 2/万次（[折算](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)≈15 GB 带宽 + 15 次部署） | 是 | **官方未声明** |

## 二、境内平台

| 平台 | 免费额度 | 是否需备案 | 单价 / 备注 |
|---|---|---|---|
| [EdgeOne Pages](https://pages.edgeone.ai/pricing)（现名 Makers） | 长期 Free：40 项目、5 GB 存储、构建 500 次/月、带宽不限（无 SLA）、免费 SSL（[配额](https://pages.edgeone.ai/document/limits-and-quotas)） | **分区决定**：选大陆区或全球含大陆区→自定义域**须先备案**；不含大陆区→**无需**（[文档](https://pages.edgeone.ai/document/domain-overview)） | Pro $10/月起 |
| [阿里云 OSS](https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites) | 新用户一次性试用（规格**未核实**） | **是**：Bucket 在境内须备案；默认域名访问 HTML 被强制下载，**必须绑自定义域**（[备案场景](https://help.aliyun.com/zh/icp-filing/basic-icp-service/product-overview/use-oss)） | 标准存储 **0.12 元/GB/月**；流量单价**未核实** |
| [腾讯云 COS](https://cloud.tencent.com/document/product/436/32670) | 50 GB 标准存储包 **6 个月**，仅抵存储（[免费额度](https://cloud.tencent.com/document/product/436/6240)） | **是**：官方教程第一步即「注册域名与备案」；2024-01-01 后默认域名不可直连 | 存储 **0.118 元/GB/月**、外网下行 **0.5 元/GB**、请求 0.01 元/万次 |
| Gitee Pages | — | — | **已停止服务**：旧文档 URL 均 301 至 help.gitee.com 首页；Gitee 员工在[官方反馈仓](https://gitee.com/oschina/git-osc/issues/IA6DQ6) 2025-03-26 回复「pages 服务已经下线，暂无具体恢复时间」 |
| [七牛云 Kodo](https://www.qiniu.com/prices/kodo) | **有**：每月 10 GB 存储 + 10 GB 回源 + 10 万写 + 100 万读 | 需备案（**未核实**） | 外网流出按量计费 |
| [又拍云](https://www.upyun.com/pricing) | **未查到**公开免费额度，仅「免费试用」入口 | **未核实** | CDN 国内流量 0.29 元/GB |

## 三、ICP 备案（官方口径）

腾讯云称「所有对中国境内提供服务的网站/APP 都必须先进行 ICP 备案」，落地在**接入资源**：域名解析至境内服务器即被未备案系统阻断，HTTPS 同样拦截；阿里云 OSS 口径一致，且绑定的自定义域名也需备案。纯境外节点官方明确无需备案。官方分「单位／个人备案」，**个人可作为备案主体**（[概述](https://cloud.tencent.com/document/product/243/18907)、[限制说明](https://cloud.tencent.com/document/product/243/18911)）。工信部 `beian.miit.gov.cn` 持续 **HTTP 521**，逐条原文**未核实**。

## 四、大陆访问 GitHub Pages 是否稳定

**官方无数据，无法从一手来源证实。** GitHub Status 只有全球组件状态，**无按国家/地区的可用性指标，也无中国相关事件记录**。「时快时慢」属【社区反馈】。

## 五、免费 HTTPS

自带：GitHub Pages（自定义域自动向 **Let's Encrypt** 申请，[文档](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)）、[Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[Vercel](https://vercel.com/docs/domains/working-with-ssl)、[Netlify](https://www.netlify.com/pricing/)、[EdgeOne Pages](https://pages.edgeone.ai/document/limits-and-quotas)。需自备：阿里云 OSS 与腾讯云 COS，须自行申请（阿里云[数字证书服务](https://www.aliyun.com/product/cas)、腾讯云 SSL 或 Let's Encrypt）后绑定。

## 未核实

① 阿里云 OSS 新用户试用规格（帮助页 404）；② OSS 外网流出流量单价（定价页前端渲染）；③ 工信部备案逐条要求（站点 521，法条仅转引自腾讯云）；④ 七牛云／又拍云备案要求细节；⑤ 又拍云是否有长期免费额度；⑥ 海外平台在大陆实际可用性——无官方数据源。
