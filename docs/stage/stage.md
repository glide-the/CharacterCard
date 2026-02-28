## 阶段任务表

| 阶段 | 任务 | 产出 | 依赖 | 风险 |
| --- | --- | --- | --- | --- |
| P0 | 术语与边界冻结（源素材层/转换产物层/运行时消费层） | 边界定义清单、术语对齐结论 | `/Users/dmeck/project/CharacterCard/docs/task/task2.md`、`/Users/dmeck/project/CharacterCard/docs/mapping-spec.v1.md` | 团队继续误解“运行时直读素材目录” |
| P1 | 资产采集与解析器对齐 | `collector/parser` 实现与资产清单 | P0 | Markdown 异构格式导致解析不稳定 |
| P2 | 协议映射与统一包生成 | `evaluation-pack.v1.json`、`conversion-report.md` | P1、`mapping-spec.v1` | 字段 join 失败或语义漂移 |
| P3 | Prompt/素材标准化与覆盖注入 | `promptAssets`、`TaskPromptOverrideMap` | P2、`runtimeAdapter` | Prompt 缺失导致风格偏移 |
| P4 | 校验、审阅与回退链路 | `validator`、`review-queue.json`、回退策略记录 | P2、P3 | 审阅积压，回退路径漏测 |
| P5 | 运行时消费边界集成 | `App/store/orchestrator` 对齐记录 | P3、P4 | 包加载失败时降级行为不一致 |
| P6 | 测试与 DoD 验收 | 单测/集成/回归报告、DoD 验收清单 | P5 | 覆盖率或可追溯性不达标 |
| P7 | 发布与阶段归档 | 阶段报告、已完成阶段备份更新 | P6 | 文档与实际进度不同步 |

## 当前进度

| 阶段 | 任务 | 状态 |
| --- | --- | --- |
| P0 | 术语与边界冻结（源素材层/转换产物层/运行时消费层） | 已完成 |
| P1 | 资产采集与解析器对齐 | 已完成 |
| P2 | 协议映射与统一包生成 | 已完成 |
| P3 | Prompt/素材标准化与覆盖注入 | 已完成 |
| P4 | 校验、审阅与回退链路 | 已完成 |
| P5 | 运行时消费边界集成 | 已完成 |
| P6 | 测试与 DoD 验收 | 已完成 |
| P7 | 发布与阶段归档 | 已完成 |

## P6 状态更新（2026-02-19）

- 当前阻塞：无。
- 已完成项：
  1. 统一包 `extensions.traceMap` 落地并持久化 trace 信息。
  2. `traceCoverage` 自动化测试已加入测试套件。

## P7 状态更新（2026-02-19）

- 已完成项：
  1. 生成阶段报告 `docs/stage/stage-report-2026-02-19.md`。
  2. 更新已完成阶段备份 `docs/stage/stage.completed.backup.md`。

