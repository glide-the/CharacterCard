# 各 Task AI 配置设计

> **文档类型**：独立配置设计文档
> **关联文档**：[决策流程设计.md](./决策流程设计.md) § 3.9、各 Task 流程文档
> **涉及文件**：`types.ts`、`constants.ts`、`services/aiEngine.ts`、`store/index.ts`、`components/AiSettingsModal.tsx`

------

## 1. 概述

当前 `AIProviderConfig` 仅包含 provider 类型和 API Key 信息，不含任何生成参数（temperature、maxOutputTokens 等）。在 4-Task 架构中，每个 Task 的 AI 调用特性差异显著：

- **Task 3（叙事）** — 需要中等 temperature + streaming + 较长超时
- **Task 1（现实映射）** — 需要低 temperature + JSON 结构化 + 短超时
- **Task 2（世界法则）** — 需要低 temperature + JSON 结构化 + 短超时
- **Task 4（选项生成）** — 需要高 temperature + JSON 结构化 + 短超时

为实现各 Task 独立调优，需要在现有配置系统上增加一层 **Task 级参数配置（TaskAIConfig）**，并保持与现有全局 Provider 配置的向后兼容。

------

## 2. 现有配置系统分析

### 2.1 类型层（`types.ts`）

```typescript
// 当前已有的 AI 配置类型

export type ServiceProvider = 'gemini' | 'openai';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIConfig {
  provider: ServiceProvider;
  gemini?: { apiKey?: string };
  openai?: OpenAIConfig;
}
```

**特点**：仅定义了 Provider 选择和连接凭证，不含任何生成参数。

### 2.2 引擎层（`services/aiEngine.ts`）

```typescript
// 当前引擎层的核心接口和函数

interface AIProviderConfig {
  provider: 'gemini' | 'openai';
  gemini?: { apiKey?: string };
  openai?: { apiKey: string; baseUrl?: string; model?: string };
}

interface CompletionRequest {
  prompt: string;
  systemInstruction?: string;
  jsonSchema?: any;
  jsonMode?: boolean;
}

// 两个核心函数 —— 均不接受生成参数
generateContent(config: AIProviderConfig, request: CompletionRequest): Promise<string>
generateStream(config: AIProviderConfig, request: CompletionRequest): AsyncGenerator<string>
```

**关键缺失**：

| 缺失参数 | 影响 |
|---------|------|
| `temperature` | 无法按任务调控创意程度 |
| `maxOutputTokens` | 无法限制各 Task 输出长度 |
| `topP` / `topK` | 无法精细控制采样策略 |
| 模型选择 | Gemini 硬编码为 `gemini-3-flash-preview`，无法按 Task 切换 |
| 超时/重试 | 完全无超时和重试机制 |

### 2.3 状态层（`store/index.ts`）

```typescript
// Zustand Store 中的 AI 配置部分

interface GameStoreState {
  // ... 游戏状态 ...
  provider: ServiceProvider;        // 'gemini' | 'openai'
  geminiKey: string;                // Gemini API Key
  openaiConfig: OpenAIConfig;       // { apiKey, baseUrl, model }
}

// persist 中间件持久化字段
partialize: (state) => ({
  provider: state.provider,
  geminiKey: state.geminiKey,
  openaiConfig: state.openaiConfig,
})

// 便捷 hooks
useProvider(), useGeminiKey(), useOpenaiConfig()
useSetProvider(), useSetGeminiKey(), useSetOpenaiConfig()
```

**特点**：扁平的全局配置，无 Task 级别区分。持久化到 localStorage。

### 2.4 UI 层（`components/AiSettingsModal.tsx`）

当前 Modal 提供：
- Provider 单选（Gemini / OpenAI）
- Gemini：API Key 输入框
- OpenAI：Base URL + API Key + Model Name 输入框
- 保存按钮

**特点**：单层扁平 UI，无高级参数配置，无 Task 维度区分。

### 2.5 常量层（`constants.ts`）

当前仅包含游戏内容常量（`CHARACTERS`、`INITIAL_RULES`、`INTRO_STORY`），**不含任何 AI 配置常量**。

------

## 3. 扩展接口设计

### 3.1 TaskAIConfig 接口

```typescript
// types.ts 新增

/** 单个 Task 的 AI 生成参数配置 */
export interface TaskAIConfig {
  // --- 模型选择 ---
  geminiModel?: string;             // Gemini 模型名称，覆盖默认
  openaiModel?: string;             // OpenAI 模型名称，覆盖默认

  // --- 生成参数 ---
  temperature: number;              // 创意程度 0.0-2.0
  maxOutputTokens: number;          // 最大输出 token
  topP?: number;                    // nucleus sampling
  topK?: number;                    // top-k sampling (Gemini only)

  // --- 输出格式 ---
  jsonMode: boolean;                // 是否启用 JSON 结构化输出
  streaming: boolean;               // 是否启用流式输出

  // --- 超时与重试 ---
  timeoutMs: number;                // 超时阈值（毫秒）
  maxRetries: number;               // 最大重试次数
  retryDelayMs: number;             // 重试间隔（毫秒）
}
```

### 3.2 TurnAIConfig 接口

```typescript
// types.ts 新增

/** 完整的回合 AI 配置，包含全局 provider + 各 Task 独立参数 */
export interface TurnAIConfig {
  provider: AIProviderConfig;       // 全局 provider 配置（API Key 等）
  tasks: {
    narrative: TaskAIConfig;        // Task 3: 纯叙事
    realityMapping: TaskAIConfig;   // Task 1: 现实映射
    worldRules: TaskAIConfig;       // Task 2: 世界法则
    choices: TaskAIConfig;          // Task 4: 选项生成
  };
}
```

### 3.3 类型关系

```
┌──────────────────────────────────────────────────┐
│                  TurnAIConfig                     │
│  ┌────────────────────────────────────────────┐  │
│  │  provider: AIProviderConfig                │  │ ← 现有类型，不改动
│  │  ├─ provider: 'gemini' | 'openai'          │  │
│  │  ├─ gemini?: { apiKey }                    │  │
│  │  └─ openai?: { apiKey, baseUrl, model }    │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  tasks                                     │  │ ← 新增 Task 级配置
│  │  ├─ narrative:      TaskAIConfig           │  │
│  │  ├─ realityMapping: TaskAIConfig           │  │
│  │  ├─ worldRules:     TaskAIConfig           │  │
│  │  └─ choices:        TaskAIConfig           │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

------

## 4. 各 Task 默认预设

```typescript
// constants.ts 新增

import type { TaskAIConfig, TurnAIConfig } from './types';

export const DEFAULT_TASK_CONFIGS: TurnAIConfig['tasks'] = {

  // ═══════════════════════════════════════════
  // Task 3 — 纯叙事生成 (Phase A)
  // 设计思路：中等 temperature 保持叙事连贯又不失生动
  //          streaming 模式逐字渲染，不使用 jsonMode
  //          超时较长（Phase A 是关键路径）
  // ═══════════════════════════════════════════
  narrative: {
    geminiModel: 'gemini-2.5-flash-preview-05-20',
    openaiModel: 'gpt-4.1-mini',
    temperature: 0.75,
    maxOutputTokens: 1024,
    topP: 0.95,
    jsonMode: false,
    streaming: true,         // ★ 唯一启用 streaming 的 Task
    timeoutMs: 30_000,       // 30s — Phase A 关键路径
    maxRetries: 1,
    retryDelayMs: 1_000,
  },

  // ═══════════════════════════════════════════
  // Task 1 — 现实映射规则解析 (Phase B-1)
  // 设计思路：低 temperature 保证属性计算的确定性
  //          jsonMode 直出结构化数据
  // ═══════════════════════════════════════════
  realityMapping: {
    geminiModel: 'gemini-2.5-flash-preview-05-20',
    openaiModel: 'gpt-4.1-mini',
    temperature: 0.3,
    maxOutputTokens: 512,
    topP: 0.85,
    jsonMode: true,
    streaming: false,
    timeoutMs: 15_000,
    maxRetries: 2,
    retryDelayMs: 800,
  },

  // ═══════════════════════════════════════════
  // Task 2 — 世界法则触发判定 (Phase B-2)
  // 设计思路：低 temperature 保证规则判定的严谨性
  //          jsonMode 直出，输出可能较长（多规则）
  // ═══════════════════════════════════════════
  worldRules: {
    geminiModel: 'gemini-2.5-flash-preview-05-20',
    openaiModel: 'gpt-4.1-mini',
    temperature: 0.3,
    maxOutputTokens: 768,
    topP: 0.85,
    jsonMode: true,
    streaming: false,
    timeoutMs: 15_000,
    maxRetries: 2,
    retryDelayMs: 800,
  },

  // ═══════════════════════════════════════════
  // Task 4 — 回合选项生成 (Phase B-3)
  // 设计思路：较高 temperature 提升选项多样性
  //          jsonMode 直出选项列表
  // ═══════════════════════════════════════════
  choices: {
    geminiModel: 'gemini-2.5-flash-preview-05-20',
    openaiModel: 'gpt-4.1-mini',
    temperature: 0.9,
    maxOutputTokens: 512,
    topP: 0.95,
    jsonMode: true,
    streaming: false,
    timeoutMs: 15_000,
    maxRetries: 2,
    retryDelayMs: 800,
  },
};
```

------

## 5. 配置对比表

| 参数 | Task 3 叙事 | Task 1 现实映射 | Task 2 世界法则 | Task 4 选项生成 |
|------|------------|----------------|----------------|----------------|
| **阶段** | Phase A | Phase B-1 | Phase B-2 | Phase B-3 |
| **temperature** | 0.75 | 0.3 | 0.3 | 0.9 |
| **maxOutputTokens** | 1024 | 512 | 768 | 512 |
| **topP** | 0.95 | 0.85 | 0.85 | 0.95 |
| **jsonMode** | ✗ | ✓ | ✓ | ✓ |
| **streaming** | ✓ | ✗ | ✗ | ✗ |
| **timeoutMs** | 30s | 15s | 15s | 15s |
| **maxRetries** | 1 | 2 | 2 | 2 |
| **Gemini 模型** | gemini-2.5-flash-preview-05-20 | gemini-2.5-flash-preview-05-20 | gemini-2.5-flash-preview-05-20 | gemini-2.5-flash-preview-05-20 |
| **OpenAI 模型** | gpt-4.1-mini | gpt-4.1-mini | gpt-4.1-mini | gpt-4.1-mini |

------

## 6. 设计决策说明

| 决策 | 理由 |
|------|------|
| Task 3 不用 jsonMode | Gemini jsonMode 与 streaming 不兼容；流结束后手动解析 JSON |
| Task 3 temperature=0.75 | 叙事需要一定创意但不能过于发散，0.75 是连贯性和生动性的平衡点 |
| Task 1/2 temperature=0.3 | 属性计算和规则判定需要高度确定性，低 temperature 减少随机波动 |
| Task 4 temperature=0.9 | 选项生成需要最大多样性，高 temperature 避免每轮生成雷同选项 |
| Phase A timeout=30s | 叙事是关键路径，流式输出需更长时间；且 Phase B 依赖其结果 |
| Phase B timeout=15s | 三个 Task 并行，独立超时互不阻塞，15s 已涵盖大多数正常响应 |
| Task 3 maxRetries=1 | Phase A 重试会阻塞整个 Phase B 启动，限制为 1 次 |
| Task 1/2/4 maxRetries=2 | Phase B 并行执行，重试不阻塞其他 Task，可多尝试一次 |
| 统一使用 flash 模型 | Flash 模型延迟低、成本低，适合多路并行调用场景 |

------

## 7. 现有系统扩展方案

以下按文件逐一说明如何在现有代码基础上进行最小化侵入式扩展。

### 7.1 `types.ts` — 新增类型定义

在现有 `AIConfig` 接口之后追加 `TaskAIConfig` 和 `TurnAIConfig`：

```typescript
// ============================================
// === 现有代码（保持不变）====================
// ============================================
export type ServiceProvider = 'gemini' | 'openai';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIConfig {
  provider: ServiceProvider;
  gemini?: { apiKey?: string };
  openai?: OpenAIConfig;
}

// ============================================
// === 新增：Task 级 AI 配置 =================
// ============================================
export interface TaskAIConfig {
  geminiModel?: string;
  openaiModel?: string;
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  topK?: number;              // Gemini only
  jsonMode: boolean;
  streaming: boolean;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

/** Task 名称联合类型，便于索引 */
export type TaskName = 'narrative' | 'realityMapping' | 'worldRules' | 'choices';

export interface TurnAIConfig {
  provider: AIProviderConfig;
  tasks: Record<TaskName, TaskAIConfig>;
}
```

**扩展要点**：
- `TaskAIConfig` 与 `AIConfig`/`AIProviderConfig` 正交，不修改任何现有接口
- 新增 `TaskName` 联合类型方便按名称索引特定 Task 的配置
- `TurnAIConfig.provider` 复用现有 `AIProviderConfig`，保证全局凭证配置不重复

### 7.2 `constants.ts` — 新增默认预设常量

在文件末尾追加 `DEFAULT_TASK_CONFIGS`（完整代码见 §4），需要：

```typescript
// constants.ts 末尾新增

import type { TaskAIConfig, TurnAIConfig } from './types';

export const DEFAULT_TASK_CONFIGS: TurnAIConfig['tasks'] = {
  narrative:      { /* ... 见 §4 ... */ },
  realityMapping: { /* ... 见 §4 ... */ },
  worldRules:     { /* ... 见 §4 ... */ },
  choices:        { /* ... 见 §4 ... */ },
};
```

**扩展要点**：
- 不修改现有常量（`CHARACTERS`、`INITIAL_RULES`、`INTRO_STORY`）
- `DEFAULT_TASK_CONFIGS` 作为 Store 初始值和"恢复默认"的数据源
- 类型安全：通过 `TurnAIConfig['tasks']` 确保结构与接口一致

### 7.3 `services/aiEngine.ts` — 注入生成参数

这是改动最核心的文件。需要在两个函数中注入 `TaskAIConfig` 参数：

#### 7.3.1 函数签名扩展

```typescript
// 修改前
export const generateContent = async (
  config: AIProviderConfig,
  request: CompletionRequest
): Promise<string> => { ... }

// 修改后 — 第三个参数为可选，保证向后兼容
export const generateContent = async (
  config: AIProviderConfig,
  request: CompletionRequest,
  taskConfig?: TaskAIConfig          // ★ 新增
): Promise<string> => { ... }
```

`generateStream` 同理。

#### 7.3.2 Gemini 侧注入

```typescript
// 修改前：geminiConfig 只有 systemInstruction 和 jsonMode
const geminiConfig: any = {
  systemInstruction: request.systemInstruction,
};

// 修改后：注入 Task 级生成参数
const geminiConfig: any = {
  systemInstruction: request.systemInstruction,
  // ★ 从 taskConfig 注入生成参数（若提供）
  ...(taskConfig && {
    temperature: taskConfig.temperature,
    maxOutputTokens: taskConfig.maxOutputTokens,
    topP: taskConfig.topP,
    topK: taskConfig.topK,
  }),
};

// 模型选择：优先使用 taskConfig 指定的模型
const modelName = taskConfig?.geminiModel || 'gemini-2.5-flash-preview-05-20';

const response = await ai.models.generateContent({
  model: modelName,           // ★ 不再硬编码
  contents: request.prompt,
  config: geminiConfig,
});
```

#### 7.3.3 OpenAI 侧注入

```typescript
// 修改前
const requestOptions: any = {
  messages,
  model: config.openai.model || 'gpt-4-turbo-preview',
};

// 修改后
const modelName = taskConfig?.openaiModel
  || config.openai.model
  || 'gpt-4-turbo-preview';

const requestOptions: any = {
  messages,
  model: modelName,          // ★ 优先 taskConfig 模型
  // ★ 注入生成参数
  ...(taskConfig && {
    temperature: taskConfig.temperature,
    max_tokens: taskConfig.maxOutputTokens,
    top_p: taskConfig.topP,
  }),
};
```

#### 7.3.4 超时与重试封装

在 `aiEngine.ts` 中新增工具函数，供各 Task 调用：

```typescript
// aiEngine.ts 新增

/**
 * 带超时和重试的请求包装器
 * 各 Task 通过此函数调用 generateContent / generateStream
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  taskConfig: TaskAIConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= taskConfig.maxRetries; attempt++) {
    try {
      // 超时控制
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), taskConfig.timeoutMs)
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Task attempt ${attempt + 1}/${taskConfig.maxRetries + 1} failed:`,
        lastError.message
      );
      if (attempt < taskConfig.maxRetries) {
        await new Promise(r => setTimeout(r, taskConfig.retryDelayMs));
      }
    }
  }

  throw lastError || new Error('All retries exhausted');
}
```

#### 7.3.5 向后兼容性保证

| 调用方 | 行为 |
|-------|------|
| 传入 `taskConfig` | 使用 Task 级参数（temperature、model 等） |
| 不传 `taskConfig` | 完全回退到现有行为（硬编码模型、无 temperature 等） |
| 现有代码（`geminiService.ts` 等） | 无需任何修改，继续正常工作 |

### 7.4 `store/index.ts` — 扩展状态管理

#### 7.4.1 State 新增字段

```typescript
// 在 GameStoreState 接口中新增
interface GameStoreState {
  // ... 现有字段保持不变 ...
  provider: ServiceProvider;
  geminiKey: string;
  openaiConfig: OpenAIConfig;

  // ★ 新增：Task 级 AI 配置
  taskConfigs: TurnAIConfig['tasks'];
}
```

#### 7.4.2 初始值

```typescript
import { DEFAULT_TASK_CONFIGS } from '../constants';

const initialState: GameStoreState = {
  // ... 现有初始值 ...
  provider: 'gemini',
  geminiKey: '',
  openaiConfig: { apiKey: '', baseUrl: '', model: '' },

  // ★ 新增：默认使用预设配置
  taskConfigs: DEFAULT_TASK_CONFIGS,
};
```

#### 7.4.3 Actions 新增

```typescript
interface GameStoreActions {
  // ... 现有 actions 保持不变 ...
  setProvider: (p: ServiceProvider) => void;
  setGeminiKey: (key: string) => void;
  setOpenaiConfig: (config: OpenAIConfig) => void;

  // ★ 新增
  setTaskConfigs: (configs: TurnAIConfig['tasks']) => void;
  updateTaskConfig: (taskName: TaskName, patch: Partial<TaskAIConfig>) => void;
  resetTaskConfigs: () => void;      // 恢复全部为默认预设
}
```

实现：

```typescript
setTaskConfigs: (configs) => set({ taskConfigs: configs }),

updateTaskConfig: (taskName, patch) => set((state) => ({
  taskConfigs: {
    ...state.taskConfigs,
    [taskName]: { ...state.taskConfigs[taskName], ...patch },
  },
})),

resetTaskConfigs: () => set({ taskConfigs: DEFAULT_TASK_CONFIGS }),
```

#### 7.4.4 持久化扩展

```typescript
// persist partialize 新增 taskConfigs
partialize: (state) => ({
  provider: state.provider,
  geminiKey: state.geminiKey,
  openaiConfig: state.openaiConfig,
  taskConfigs: state.taskConfigs,      // ★ 新增
}),
```

#### 7.4.5 新增 Hooks

```typescript
// 便捷 hooks
export const useTaskConfigs = () => useGameStore(s => s.taskConfigs);
export const useSetTaskConfigs = () => useGameStore(s => s.setTaskConfigs);
export const useUpdateTaskConfig = () => useGameStore(s => s.updateTaskConfig);
export const useResetTaskConfigs = () => useGameStore(s => s.resetTaskConfigs);

// 获取单个 Task 配置
export const useTaskConfig = (taskName: TaskName) =>
  useGameStore(s => s.taskConfigs[taskName]);
```

### 7.5 `components/AiSettingsModal.tsx` — UI 扩展

#### 7.5.1 布局策略

从单层扁平 UI 扩展为**两级结构**：

```
┌─────────────────────────────────────────┐
│  AI Settings                            │
│  ┌───────────────────────────────────┐  │
│  │ 🔹 Provider 配置（现有）          │  │
│  │   ○ Gemini  ● OpenAI              │  │
│  │   API Key: [________]             │  │
│  │   Base URL: [________]            │  │
│  │   Model: [________]               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔹 Task 参数配置（新增）          │  │
│  │                                   │  │
│  │  [叙事] [现实映射] [世界法则] [选项] │  ← Tab 切换
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Temperature: ───○─── 0.75   │  │  │
│  │  │ Model:    [gemini-2.5-...]  │  │  │
│  │  │ ▶ 高级设置                   │  │  │ ← 折叠展开
│  │  │   Max Tokens: [1024]        │  │  │
│  │  │   Timeout:    [30] s        │  │  │
│  │  │   Max Retries: [1]         │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  [恢复默认]                        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [保存]  [取消]                          │
└─────────────────────────────────────────┘
```

#### 7.5.2 组件拆分建议

```
AiSettingsModal.tsx          ← 现有文件，保持为入口
├─ ProviderConfigSection     ← 抽取现有 Provider 配置为子组件
└─ TaskConfigSection (新增)
   ├─ TaskConfigTabs         ← Tab 切换 4 个 Task
   └─ TaskConfigPanel        ← 单个 Task 的参数表单
      ├─ TemperatureSlider
      ├─ ModelSelector
      └─ AdvancedSettings    ← 折叠区域
```

#### 7.5.3 关键交互

| 交互 | 行为 |
|------|------|
| 切换 Tab | 展示对应 Task 的当前配置值 |
| 拖动 Temperature | 实时更新预览值，保存时写入 Store |
| 修改 Model 名称 | 输入框，根据 Provider 显示对应模型字段 |
| 点击"恢复默认" | 调用 `resetTaskConfigs()`，全部回复 `DEFAULT_TASK_CONFIGS` |
| 保存 | 同时保存 Provider 配置和 Task 配置到 Store（localStorage 持久化） |

------

## 8. 各 Task 调用方式

### 8.1 `aiEngine.ts` 扩展后的调用示例

```typescript
// narrativeTask.ts — Task 3: 流式叙事
const stream = generateStream(
  ctx.provider,
  { prompt, systemInstruction: NARRATIVE_SYSTEM_PROMPT },
  ctx.taskConfigs.narrative
);

// realityMappingTask.ts — Task 1: 现实映射
const result = await executeWithRetry(
  () => generateContent(
    ctx.provider,
    { prompt, systemInstruction: REALITY_SYSTEM_PROMPT, jsonSchema, jsonMode: true },
    ctx.taskConfigs.realityMapping
  ),
  ctx.taskConfigs.realityMapping
);

// worldRulesTask.ts — Task 2: 世界法则
const result = await executeWithRetry(
  () => generateContent(
    ctx.provider,
    { prompt, systemInstruction: RULES_SYSTEM_PROMPT, jsonSchema, jsonMode: true },
    ctx.taskConfigs.worldRules
  ),
  ctx.taskConfigs.worldRules
);

// choicesTask.ts — Task 4: 选项生成
const result = await executeWithRetry(
  () => generateContent(
    ctx.provider,
    { prompt, systemInstruction: CHOICES_SYSTEM_PROMPT, jsonSchema, jsonMode: true },
    ctx.taskConfigs.choices
  ),
  ctx.taskConfigs.choices
);
```

### 8.2 turnOrchestrator 中构建 TurnAIConfig

```typescript
// services/turnOrchestrator.ts

import { DEFAULT_TASK_CONFIGS } from '../constants';

function buildTurnAIConfig(store: GameStoreState): TurnAIConfig {
  return {
    provider: {
      provider: store.provider,
      gemini: store.provider === 'gemini' ? { apiKey: store.geminiKey } : undefined,
      openai: store.provider === 'openai' ? store.openaiConfig : undefined,
    },
    tasks: store.taskConfigs,     // 直接从 Store 取，已包含用户自定义
  };
}
```

------

## 9. 用户可配置性

### 9.1 配置分层

| 层级 | 可配置项 | 默认值 | 持久化 |
|------|---------|--------|--------|
| 全局 | provider (gemini/openai) | gemini | ✓ localStorage |
| 全局 | API Key | — | ✓ localStorage |
| 全局 | base URL (OpenAI) | https://api.openai.com/v1 | ✓ localStorage |
| 按 Task | temperature | 各 Task 预设值 | ✓ localStorage |
| 按 Task | 模型名称 | 各 Task 预设值 | ✓ localStorage |
| 高级 | maxOutputTokens | 各 Task 预设值 | ✓ localStorage |
| 高级 | timeout | 各 Task 预设值 | ✓ localStorage |

### 9.2 配置优先级

```
用户在 UI 中修改的值 (Store)
    ↓ 覆盖
DEFAULT_TASK_CONFIGS (constants.ts)
    ↓ 降级
引擎默认行为 (aiEngine.ts 无 taskConfig 时的硬编码值)
```

------

## 10. 迁移路径

### 10.1 向后兼容策略

| 现有代码路径 | 迁移后行为 | 是否需要修改 |
|-------------|-----------|-------------|
| `geminiService.ts` 直接调用 `generateContent` | 不传 `taskConfig`，行为不变 | 否 |
| Store 中 `provider` / `geminiKey` / `openaiConfig` | 保留，继续作为全局配置 | 否 |
| `AiSettingsModal` 现有 Provider UI | 保留，新增 Task 配置区域在下方 | 最小改动 |
| localStorage 已有的持久化数据 | `taskConfigs` 字段不存在时自动使用 `DEFAULT_TASK_CONFIGS` | 否 |

### 10.2 localStorage 兼容

由于 Zustand `persist` 中间件的 `merge` 策略，旧版本 localStorage 数据中不存在的 `taskConfigs` 字段会自动使用 `initialState` 中的默认值。无需手动迁移。

如需更精细的版本控制，可使用 Zustand persist 的 `version` + `migrate` 机制：

```typescript
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'game-store',
    version: 2,   // 从 1 升级到 2
    migrate: (persisted, version) => {
      if (version < 2) {
        // 旧版本无 taskConfigs，补充默认值
        return { ...persisted, taskConfigs: DEFAULT_TASK_CONFIGS };
      }
      return persisted;
    },
    partialize: (state) => ({
      provider: state.provider,
      geminiKey: state.geminiKey,
      openaiConfig: state.openaiConfig,
      taskConfigs: state.taskConfigs,
    }),
  }
)
```

### 10.3 实施顺序建议

```
Step 1: types.ts 新增 TaskAIConfig / TurnAIConfig / TaskName
        ↓ 纯类型变更，零风险
Step 2: constants.ts 新增 DEFAULT_TASK_CONFIGS
        ↓ 纯常量新增，零风险
Step 3: store/index.ts 扩展 State + Actions + persist
        ↓ 有默认值兜底，现有功能不受影响
Step 4: aiEngine.ts 扩展函数签名 + 新增 executeWithRetry
        ↓ 可选参数，不传则保持原行为
Step 5: AiSettingsModal.tsx 新增 Task 配置 UI
        ↓ 增量 UI，现有区域不变
Step 6: 各 Task 实现中接入 taskConfig
        ↓ 新代码，不影响现有路径
```

每一步都保证现有功能不受影响，可独立合并和测试。
