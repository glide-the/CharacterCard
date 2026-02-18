## 阶段任务表

| 阶段 | 任务 | 产出 | 依赖 | 风险 |
| --- | --- | --- | --- | --- |
| P0 | 协议对齐与字段冻结 | `mapping-spec.v1.md` | 现有 types 与上游字段 | 字段语义歧义 |
| P1 | 资产采集与解析器实现 | `collector/parser` | 文件目录稳定 | Markdown 异构格式 |
| P2 | 规范化模型实现 | `NormalizedEnginePack` | P1 | 字段丢失 |
| P3 | 确定性映射器 | `deterministicMapper` | P2 | 规则 join 失败 |
| P4 | LLM 协议映射器 | `llmProtocolMapper` | P3, AI 配置 | JSON 输出不稳定 |
| P5 | 校验与回退链路 | `validator + review-queue` | P4 | 审阅量过大 |
| P6 | 运行时集成 | 动态加载规则与 prompt | P5 | 影响现有回合体验 |
| P7 | 测试与发布 | 测试报告与验收报告 | P6 | 指标不达标 |


## 当前进度

| 阶段 | 任务 | 状态 |
| --- | --- | --- |
| P0 | 协议对齐与字段冻结 | 未开始|