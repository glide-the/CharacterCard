# 《任务规划说明》

## game-engine-package 接入“角色设定评价系统”执行方案（TypeScript）

## 假设

1. 假设当前目标运行时仍以 `/Users/dmeck/project/CharacterCard/types.ts` 中的数据结构为准，核心可读配置至少要能落到 `RuleCard[]`、三维属性（`credibility/stress/connections`）和任务 Prompt 片段。
2. 假设 `symbol_engine*.json` 为主事实源，`/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/*.md` 为补充语义源，允许存在字段不一致。
3. 假设允许新增独立转换模块与 CLI，不破坏现有 4-Task 编排（`/Users/dmeck/project/CharacterCard/services/turnOrchestrator.ts`）。
4. 假设 LLM 可通过当前 `gemini/openai` 配置调用（`/Users/dmeck/project/CharacterCard/services/aiEngine.ts`）。

---

## 1. 目标定义

### 1.1 业务目标

1. 将 `game-engine-package` 产物稳定接入现有角色设定评价系统。
2. 支持“规则 JSON + Prompt/素材文档”统一转换，避免人工手改。
3. 保证后续上游技能产物可持续接入，不因版本波动反复改代码。

### 1.2 技术目标

1. 实现独立转换模块：输入包目录，输出项目可读配置。
2. 建立“确定性解析 + LLM 语义映射 + Schema 校验 + 回退兜底”链路。
3. 提供源字段到目标字段的可追溯映射与审阅点。

### 1.3 验收目标

1. 单个包转换成功率 >= 95%。
2. 核心字段覆盖率 >= 98%（`engine_config/symbol_table/rules/state/outputs`）。
3. 转换后可直接驱动现有运行时完成至少 1 局完整回合流程（含规则触发和属性更新）。
4. 所有输出通过 JSON Schema 校验，关键字段有 source trace。

---

## 2. 范围界定

### In Scope

1. `/Users/dmeck/project/CharacterCard/docs/game-engine-package` 全量文件解析与标准化。
2. `symbol_engine*.json` 到目标配置的协议映射。
3. Markdown 资源中的 JSON 块抽取、Prompt 标准化、素材元数据归档。
4. 与现有系统集成：`constants.ts`、`services/*Task.ts`、`store/index.ts` 的配置注入点。
5. 自动化测试、样本回归、质量指标看板。

### Out of Scope

1. 重写现有游戏核心循环和 UI 交互。
2. 上游技能本体改造（仅消费其输出）。
3. 生成新视觉素材或外部资源下载。
4. 多人联网、后端持久化服务重构。

---

## 3. 现状与输入资产盘点

| 资产类型 | 代表文件 | 结构化程度 | 用途 |
| --- | --- | --- | --- |
| 规则主 JSON | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/symbol_engine_20260218_v2.0.json` | 高 | 主转换源（符号、变量、规则、状态、任务、输出索引） |
| 规则卡补充 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/02_rule_deck.md` | 中 | 命题边界/失败条件/rewrite hooks 补全 |
| O1-O5 输出样本 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/03_outputs_O1_O5.md` | 中 | fantasy knots/power chain/rewrite log/silence seeds 补全 |
| 数据结构规范 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/01_data_structures.md` | 中 | Schema 对齐、字段校验规则 |
| 概览与公理 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/data/data_summary.md`、`00_axiom_group.md` | 低-中 | 业务解释、术语归一 |
| Prompt 资源 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/game-engine-generator-prompt.md` | 低 | 转为运行时 prompt 片段库 |
| 状态流图 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/charts/state_flow.mmd` | 中 | 状态机可视化和一致性检查 |
| 日志/理论参考 | `/Users/dmeck/project/CharacterCard/docs/game-engine-package/logs/rule_engine_pseudo.txt`、`references/engine-theory.md` | 低 | 解释性证据，非主数据源 |

---

## 4. 转换模块架构设计

### 4.1 模块边界

1. `Collector`：收集文件、识别类型、计算哈希。
2. `Parser`：JSON 直读，Markdown 分段与 fenced JSON 抽取，Mermaid 抽取。
3. `Normalizer`：统一为 `NormalizedEnginePack`。
4. `Mapper`：确定性字段映射 + LLM 语义映射（仅处理语义缺口）。
5. `Validator`：Schema 校验、跨字段校验、范围校验。
6. `Emitter`：输出 `evaluation-pack.v1.json`、`review-queue.json`、`conversion-report.md`。
7. `RuntimeAdapter`：将转换结果注入当前系统配置。

### 4.2 目录建议（TypeScript）

- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/types.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/collector.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/parser/jsonParser.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/parser/markdownParser.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/normalizer.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/mapper/deterministicMapper.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/mapper/llmProtocolMapper.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/validator.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/runtimeAdapter.ts`
- `/Users/dmeck/project/CharacterCard/services/enginePackConverter/cli.ts`

### 4.3 与现有系统集成点

1. `constants.ts`：从静态 `INITIAL_RULES` 迁移为“转换产物优先，静态默认兜底”。
2. `services/narrativeTask.ts`、`realityMappingTask.ts`、`worldRulesTask.ts`、`choicesTask.ts`：支持外部 Prompt 片段注入。
3. `store/index.ts`：新增 `activeEnginePackId` 与 pack 配置缓存。
4. `App.tsx`：启动时加载 pack；加载失败回退当前静态模式。

---

## 5. 转换协议设计

### 5.1 映射策略表（核心）

| 源字段 | 目标字段 | 转换规则 | 校验规则 |
| --- | --- | --- | --- |
| `engine_config.name` | `meta.sourceName` | 直接映射 | 非空字符串 |
| `engine_config.version` | `meta.sourceVersion` | 语义化版本解析 | `x.y.z` |
| `engine_config.domain` | `meta.domain` | 枚举归一（narrative/decision等） | 枚举校验 |
| `metadata.*` | `metrics.*` | 直接映射数值 | 数值范围、非负 |
| `symbol_table.symbols[]` | `symbolDictionary[]` | `name->label`，保留 `definition/constraints` | `id` 唯一、必填字段完整 |
| `symbol_table.variables[]` | `variableModel.variables[]` | 变量名语义归一，映射到三维属性影响权重 | 默认值 0-1 或标记 review |
| `symbol_table.rules[]` | `ruleCatalog[].proposition` | 保留命题名/定义/约束 | `id` 唯一、约束不为空 |
| `rules[]` | `ruleCatalog[].execution` | `condition/action/priority` 解析成 trigger+effect DSL | priority 唯一排序、DSL 语法合法 |
| `symbol_table.rules + rules` | `runtimeRuleCards[]` | 按编号后缀 join（`prop_001` <-> `rule_001`） | join 成功率 >= 95% |
| `state.current/history/transitions` | `stateModel` | 直接映射并生成状态图索引 | 转移合法、无断链 |
| `tasks.parallel_tasks[]` | `pipelineHints.parallelTasks[]` | 保留任务名与输出路径 | 输出路径格式合法 |
| `outputs.summary` | `packSummary` | 直接映射 | 长度上限与编码合法 |
| `outputs.visualizations/logs/data_files` | `resourceManifest[]` | 路径标准化+存在性检查 | 文件存在或标记 missing |
| `02_rule_deck.md` JSON 块 | `ruleCatalog[].advanced` | 抽取 `boundary/failure/rewrite_hooks/risk` | 数值范围、字段完整 |
| `03_outputs_O1_O5.md` JSON 块 | `semanticArtifacts` | 抽取 `fantasy_knots/power_chains/rewrite_log/silence/seeds` | JSON 解析成功率 |
| `game-engine-generator-prompt.md` | `promptAssets.systemPrompt` | 清洗标题噪声，切段存储 | 必含系统角色与输出约束 |

### 5.2 非结构化 prompt/素材元数据标准化

1. 统一资产清单 `resourceManifest` 字段：`id/type/format/path/lang/tags/hash/parser/status`.
2. Markdown 解析顺序：标题分段 -> fenced JSON 抽取 -> 残余文本摘要。
3. 未结构化内容进入 `rawBlocks[]`，必须带 `sourcePath + lineRange + confidence`。
4. Prompt 资源拆分为 `system/constraints/examples` 三段，供 4-Task 按需注入。

### 5.3 版本兼容与向后兼容

1. Source 版本分流：`symbol-engine-v2.x` 使用 `v2 adapter`；未知版本走 `legacy adapter + review required`。
2. Target Schema 采用增量策略：`evaluation-pack.v1` 仅新增字段，不破坏旧字段语义。
3. 未识别字段保留到 `extensions.sourceRaw`，禁止直接丢弃。
4. 每次转换产出 `compatibilityReport`，记录字段降级和默认值填充点。

---

## 6. LLM 转换链路

### 6.1 Prompt 设计原则

1. 先给目标 Schema，再给源片段，最后给映射规则。
2. 明确“只输出 JSON，不解释”。
3. 强制输出 `confidence`、`evidence.sourcePath`、`unresolvedFields`。
4. 对规则类型判定提供受限枚举：`CONSTRAINT/BONUS/RISK/REALITY`。
5. 温度低（0.1-0.3），优先稳定。

### 6.2 结构化输出约束

1. LLM 输出必须通过 JSON Schema（`additionalProperties: false`）。
2. 校验失败进入“错误回灌重试”：把校验错误作为下一轮输入。
3. 每轮重试最多 2 次；仍失败则走 deterministic fallback。
4. 所有成功映射写入 trace：`sourcePath -> targetPath -> ruleId`.

### 6.3 失败回退机制

1. 重试策略：`maxRetries=2`，指数退避。
2. 规则兜底：关键字段用确定性映射，不依赖 LLM。
3. 人工审阅点触发条件：`confidence < 0.75`、关键字段缺失、join 失败、范围越界。
4. 审阅产物：`review-queue.json`（可逐条确认）。

---

## 7. 测试与验收

### 7.1 测试层次

1. 单测：Parser、Join、DSL 解析、版本路由、范围校验。
2. 集成测试：从包目录到 `evaluation-pack.v1.json` 全链路。
3. 样本回归：固定样本（含当前 `symbol_engine_20260218_v2.0.json`）做 golden diff。
4. 运行时回归：接入后跑一局，校验规则卡渲染、触发、属性变化。

### 7.2 质量指标

1. 准确率：人工标注关键字段一致率 >= 95%。
2. 覆盖率：可映射字段覆盖 >= 98%，必填字段覆盖 100%。
3. 可解释性：100% 目标字段带 source trace。
4. 稳定性：同输入多次转换，哈希一致率 >= 99%（非 LLM 段）。

---
## TypeScript 落地骨架（建议）

```tsx
// /Users/dmeck/project/CharacterCard/services/enginePackConverter/types.ts
export interface ConvertOptions {
  packageRoot: string;
  outputFile: string;
  targetSchemaVersion: "evaluation-pack.v1";
  useLLM: boolean;
}
export interface ConversionResult {
  outputPath: string;
  warnings: string[];
  reviewRequired: boolean;
}
export interface EvaluationPackV1 { /* meta, ruleCatalog, promptAssets, stateModel... */ }
```

```tsx
// /Users/dmeck/project/CharacterCard/services/enginePackConverter/index.ts
export async function convertGameEnginePackage(opts: ConvertOptions): Promise<ConversionResult>;
```

```tsx
// /Users/dmeck/project/CharacterCard/services/enginePackConverter/runtimeAdapter.ts
export function toRuntimeRules(pack: EvaluationPackV1): import("/Users/dmeck/project/CharacterCard/types").RuleCard[];
export function toTaskPromptOverrides(pack: EvaluationPackV1): Record<"narrative"|"realityMapping"|"worldRules"|"choices", string>;
```