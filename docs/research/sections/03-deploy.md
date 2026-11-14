## 域名：注册、后缀、合规与解析

- gTLD 须经 ICANN 认证的 registrar 注册，双方受 Registration Agreement 约束；注册商资质可在 ICANN 认证名单核验；ccTLD 归各 registry，名单见 IANA（[ICANN](https://www.icann.org/en/contracted-parties/accredited-registrars)、[IANA](https://www.iana.org/domains/root/db)）。
- 选后缀查 IANA 根区库，确认状态 Active 与类型；注册资格、续费价由 registry/registrar 规定（[IANA](https://www.iana.org/domains/root/db)）。
- 中国大陆：工信部备案系统为官方入口，政策栏含《互联网域名管理办法》《非经营性互联网信息服务备案管理办法》；实名与 ICP 备案要求以该系统及属地管局为准。截至 2026-11-04 未取得逐条要求，标“未核实”（[备案系统](https://beian.miit.gov.cn/)）；非法律意见。
- 解析：A/AAAA 指向 IPv4/IPv6，CNAME 指向另一域名，MX 管收信，TXT 常用于所有权验证与邮件认证，CAA 限定可签发证书的 CA；TTL 决定缓存时长，Cloudflare 代理模式默认 Auto=300 秒（[Cloudflare DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/)）。

## 托管：静态优先

以下数据截至 2026-11-04 官方页面所示。

- GitHub Pages：公共仓库 Free 可用，私有仓库发布需 Pro；仅托管静态内容，不含服务端逻辑；源仓库建议 ≤1GB，站点 ≤1GB、带宽软限 100GB/月、构建软限 10 次/小时（自定义 Actions 构建不受此限）、部署超时 10 分钟；构建可走分支发布或 Actions；禁电商/SaaS；自定义域子域用 CNAME、apex 用 A/ALIAS，绑定前先验证以防域名被抢占（[limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)、[自定义域](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)）。
- Cloudflare Pages：全计划可用；Free 档 500 构建/月、2 万文件、单文件 25MiB、100 项目、每项目 100 域，构建超时 20 分钟，预览部署不限；apex 自定义域需将站点接入 Cloudflare（[limits](https://developers.cloudflare.com/pages/platform/limits/)、[overview](https://developers.cloudflare.com/pages/)、[自定义域](https://developers.cloudflare.com/pages/configuration/custom-domains/)）。
- Vercel Hobby：仅非商业个人用途；100 部署/天、构建 45 分钟、传输 100GB/月、50 域/项目、日志 1 小时；超额须升级 Pro（[limits](https://vercel.com/docs/limits)、[fair use](https://vercel.com/docs/limits/fair-use-guidelines)、[pricing](https://vercel.com/pricing)）。
- Netlify Free：300 credits/月；production deploy 15 credits、带宽 20 credits/GB、请求 2 credits/万次；含自定义域与 SSL、global CDN、不限量 deploy previews（[pricing](https://www.netlify.com/pricing/)）。
- 对象存储 + CDN：S3 可开静态网站端点，SSE-KMS 桶须配 CloudFront + OAC；网站端点不支持 HTTPS，需 HTTPS 时前置 CloudFront（[S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)）；OSS 同样支持静态托管，但 Bucket 域名访问 HTML 会强制下载，需绑定自定义域；Bucket 在中国内地时域名须完成 ICP 备案（[OSS](https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites)）。
- VPS：EC2 按秒计费，系统、安全组与备份自管，OS 补丁、TLS 与防火墙均需自己维护；仅需常驻进程、数据库或自定义服务端逻辑时才用（[EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html)）。
- 取舍：静态非商业站优先 GitHub Pages 或 Cloudflare Pages；商业用途避开 Vercel Hobby；VPS 只补服务端能力。
- 最小上线路径：域名 → 静态托管 → DNS → 自动 HTTPS → CI 部署 → 拨测与依赖更新。

## HTTPS：免费证书与平台代管

- Let's Encrypt 只发 DV，默认 90 天，建议每 60 天续；6 天短效证书每 3 天续；私钥只在己方生成；证书与续期免费，托管商可能另收管理费（[FAQ](https://letsencrypt.org/docs/faq/)）。
- ACME（RFC 8555）自动验证并签发：用 HTTP 文件或 DNS 记录证明控制权，CA 多视角校验；续期即重签，通配符必须用 DNS-01，HTTP-01 要求 80 端口可达（[how it works](https://letsencrypt.org/how-it-works/)、[FAQ](https://letsencrypt.org/docs/faq/)）。
- 平台代管：GitHub Pages 在 DNS 检查通过后自动申请 Let's Encrypt 证书；Cloudflare 为自定义域签发证书，CAA 须放行其 CA。省去续期脚本，但私钥与 CA 由平台掌控（[GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)、[Cloudflare](https://developers.cloudflare.com/pages/configuration/custom-domains/)）。

## CI/CD：GitHub Actions 静态站流水线

- 官方 starter workflow：push 默认分支或手动触发，先 checkout 源码，再依次 configure-pages → upload-pages-artifact → deploy-pages（[static.yml](https://raw.githubusercontent.com/actions/starter-workflows/main/pages/static.yml)）。
- deploy job 需 `pages: write`、`id-token: write`，environment 为 `github-pages`（[官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)）。

## 上线后运维

- 可用性：外部拨测 + 告警；UptimeRobot 有免费入口，付费 $9/月（年付）起，免费额度未核实（[pricing](https://uptimerobot.com/pricing/)）。
- 备份：源码以 Git 为准，`git clone --bare` + `git push --mirror` 镜像到第二远端；DNS 与平台配置入库（[GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)）。
- 依赖：`.github/dependabot.yml` 声明生态与频率，Dependabot 自动开 PR；另开 alerts（[updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates)、[alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts)）。
- 日志与分析：Cloudflare Web Analytics 全计划可用，含 Core Web Vitals；Vercel Hobby 日志仅 1 小时（[analytics](https://developers.cloudflare.com/web-analytics/)、[limits](https://vercel.com/docs/limits)）。

## 成本表

截至 2026-11-04 官方页面所示；币种按页面原样，未核实项不作推算。

| 方案 | 免费额度 | 超出 / 付费 | 自定义域名 |
| --- | --- | --- | --- |
| GitHub Pages | $0；公共仓库；1GB 站点、100GB/月带宽软限 | 无按量账单 | 免费，含 HTTPS |
| Cloudflare Pages | Free：$0；500 构建/月、100 项目 | 超额计价未核实 | 免费，含 SSL |
| Vercel Hobby | $0；100GB 传输/月、100 部署/天 | Pro $20/月（USD，不含税） | 可绑定；Pro [送首年一个域名](https://vercel.com/docs/domains/free-domain-with-pro) |
| Netlify Free | $0；300 credits/月 | Personal $9/月起（$ 显示，币种未标注） | 免费，含 SSL |
| S3 + CloudFront | 有 Free Tier，额度未核实 | 按存储、请求、流量计费，单价未核实 | 需自购域名；绑定费未核实 |
| 阿里云 OSS | 未核实 | 计费与单价未核实 | 需自购域名；绑定费未核实 |
| VPS（EC2） | 有 Free Tier，额度未核实 | 按秒计费，单价见[定价页](https://aws.amazon.com/ec2/pricing/) | 自建，无平台限制 |

价格来源：[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)、[GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)、[Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)、[Cloudflare Pages 自定义域](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[Vercel Pricing](https://vercel.com/pricing)、[Netlify Pricing](https://www.netlify.com/pricing/)、[S3 文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)、[OSS 文档](https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites)、[EC2 文档](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html)。
