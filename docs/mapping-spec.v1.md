# mapping-spec.v1

## 1. 目的
将 `game-engine-package` 的结构化/半结构化资产稳定映射为项目运行时可消费的配置，冻结字段语义与命名，作为后续转换与校验的唯一协议依据。

## 2. 范围
- 源数据：`/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/*.json` 与 `*.md`
- 目标：`evaluation-pack.v1`（运行时消费的统一包）
- 输出：本映射协议 + 转换产物（由转换模块生成）

## 3. 术语
- 源字段：上游 `symbol_engine*.json` + Markdown 中抽取的 JSON 块
- 目标字段：`evaluation-pack.v1` 中的字段（供运行时加载）
- Trace：字段映射时的来源路径与证据

## 4. 目标结构（概览）
- `meta`: 来源信息、版本、域
- `metrics`: 上游统计/计量字段
- `symbolDictionary`: 符号与定义
- `variableModel`: 变量模型（含三维属性影响权重）
- `ruleCatalog`: 规则与命题
- `runtimeRuleCards`: 运行时规则卡（用于触发）
- `stateModel`: 状态机模型
- `pipelineHints`: 任务并行/输出提示
- `packSummary`: 产物摘要
- `resourceManifest`: 资源清单
- `semanticArtifacts`: 语义补充材料
- `promptAssets`: Prompt 片段
- `extensions`: 未识别字段的保留区

## 5. 字段映射表（冻结）

| 源字段 | 目标字段 | 规则 | 校验 |
| --- | --- | --- | --- |
| `engine_config.name` | `meta.sourceName` | 直接映射 | 非空字符串 |
| `engine_config.version` | `meta.sourceVersion` | 语义化版本 `x.y.z` | 版本格式 |
| `engine_config.domain` | `meta.domain` | 枚举归一 | 枚举合法 |
| `metadata.*` | `metrics.*` | 数值直映 | 非负范围 |
| `symbol_table.symbols[]` | `symbolDictionary[]` | `name -> label`，保留 `definition/constraints` | `id` 唯一、必填字段 |
| `symbol_table.variables[]` | `variableModel.variables[]` | 语义归一 + 映射三维属性权重 | 默认 0-1 或 review |
| `symbol_table.rules[]` | `ruleCatalog[].proposition` | 命题名/定义/约束 | `id` 唯一、约束不为空 |
| `rules[]` | `ruleCatalog[].execution` | `condition/action/priority` 解析为 DSL | priority 唯一排序 |
| `symbol_table.rules + rules` | `runtimeRuleCards[]` | `prop_001 <-> rule_001` join | join 成功率 >= 95% |
| `state.current/history/transitions` | `stateModel` | 直接映射 + 索引 | 转移合法 |
| `tasks.parallel_tasks[]` | `pipelineHints.parallelTasks[]` | 保留任务名/输出路径 | 路径合法 |
| `outputs.summary` | `packSummary` | 直接映射 | 长度限制 |
| `outputs.visualizations/logs/data_files` | `resourceManifest[]` | 路径标准化 + 存在性检查 | missing 标记 |
| `02_rule_deck.md` JSON | `ruleCatalog[].advanced` | `boundary/failure/rewrite_hooks/risk` | 字段完整 |
| `03_outputs_O1_O5.md` JSON | `semanticArtifacts` | `fantasy_knots/power_chains/rewrite_log/silence/seeds` | JSON 解析成功 |
| `game-engine-generator-prompt.md` | `promptAssets.systemPrompt` | 清洗标题噪声，切段存储 | 必含系统角色与输出约束 |

## 6. Prompt/素材标准化
- Markdown 解析顺序：标题分段 -> fenced JSON 抽取 -> 残余文本摘要
- 未结构化内容进入 `rawBlocks[]`，必须携带 `sourcePath + lineRange + confidence`
- Prompt 拆分为 `system/constraints/examples` 三段

## 7. 兼容与回退
- 版本路由：`symbol-engine-v2.x` 走 v2 adapter；未知版本走 legacy + review
- 未识别字段保留到 `extensions.sourceRaw`，禁止丢弃
- LLM 映射失败走确定性回退

## 8. 完成判据
- `mapping-spec.v1.md` 已提交并冻结字段语义
- 核心字段覆盖 >= 98%
- 每个目标字段可追溯到源路径或明确标注为默认值

## 9. 变更记录
- v1.0: 初版冻结（2026-02-18）
