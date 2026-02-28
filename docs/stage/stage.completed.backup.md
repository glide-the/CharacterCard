# 已完成阶段备份

备份时间：2026-02-19
备份来源：`/Users/dmeck/project/CharacterCard/docs/stage/stage.md`

## 已完成阶段任务

| 阶段 | 任务 | 产出 | 依赖 | 风险 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P0 | 协议对齐与字段冻结 | `mapping-spec.v1.md` | 现有 `types` 与上游字段 | 字段语义歧义 | 已完成 |
| P1 | 资产采集与解析器实现 | `collector/parser` | 包目录结构稳定 | Markdown 异构格式导致抽取失败 | 已完成 |
| P2 | 规范化模型实现 | `NormalizedEnginePack` | P1 | 字段丢失或类型漂移 | 已完成 |
| P3 | 确定性映射器 | `deterministicMapper` | P2 | 规则 join 失败 | 已完成 |
| P4 | LLM 协议映射器 | `llmProtocolMapper` | P3、AI 配置可用 | JSON 输出不稳定 | 已完成 |
| P5 | 校验与回退链路 | `validator`、`review-queue.json` | P4 | 审阅量过大，影响交付节奏 | 已完成 |
| P6 | 运行时消费边界对齐 | `services/enginePackRuntime.ts`、`services/enginePackConverter/runtimeAdapter.ts`、`store/index.ts` 接入说明 | P5 | 误将源素材层当作运行时输入 | 已完成 |
| P6-DOC-1 | 文档语义澄清（Prompt/素材职责边界） | `docs/task/task1.md` 新增边界专节与术语表 | P6 | 团队继续沿用旧口径 | 已完成 |
| P6-DOC-2 | 验收标准更新（理解一致性） | `docs/task/task1.md` DoD 更新 | P6-DOC-1 | 验收只看功能，不看语义一致性 | 已完成 |
| P7 | 发布与阶段归档 | 阶段报告、已完成阶段备份更新 | P6 | 文档与实际进度不同步 | 已完成 |

## 备份时进度快照

| 模块 | 最新状态 | 说明 |
| --- | --- | --- |
| 转换与运行时主链路 | 已完成 | 运行时读取 `evaluation-pack.v1.json`，并通过 runtime adapter 提取 `rules/promptOverrides`。 |
| 文档语义澄清 | 已完成 | 已明确“源素材层 -> 转换产物层 -> 运行时消费层”三层边界。 |
| 运行时消费边界对齐 | 已完成 | 文档已声明 `docs/game-engine-package/*.md|*.json|*.mmd|*.txt` 为转换输入，非运行时直读输入。 |
| 验收标准同步 | 已完成 | DoD 新增“理解一致性”与“降级策略可验证”条目。 |
