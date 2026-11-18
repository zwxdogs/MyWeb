# 分诊标签

这些技能都用五个规范分诊角色来表述。这份文件把这些角色映射到这个仓库的议题跟踪器实际使用的标签字符串。

| mattpocock/skills 里的标签 | 我们跟踪器里的标签 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 维护者需要评估这条议题 |
| `needs-info` | `needs-info` | 等待报告者补充更多信息 |
| `ready-for-agent` | `ready-for-agent` | 已经完整说明，可以交给 AFK 代理 |
| `ready-for-human` | `ready-for-human` | 需要由人来实现 |
| `wontfix` | `wontfix` | 不打算处理 |

当某个技能提到某个角色时（例如「套用 AFK 就绪的分诊标签」），就使用这张表里对应的标签字符串。

这个仓库用的是默认的五角色词汇：五个标签字符串与角色名一一相同，仓库里已经建好 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。
