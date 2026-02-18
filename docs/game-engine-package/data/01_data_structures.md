# 数据结构与 JSON Schema
## Data Structures & JSON Schema Specification

**版本**: v2.0
**兼容性**: 所有输入输出必须兼容 JSON 格式

---

## 核心数据结构（5类）

### 3.1 符号（Symbol）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Symbol",
  "type": "object",
  "required": ["id", "label", "valence", "carrier", "origin", "time_form"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^sym_[0-9]{3}$",
      "description": "符号唯一标识符"
    },
    "label": {
      "type": "string",
      "description": "抽象命名（禁止具体文化符号）",
      "examples": ["中心载体", "全能变体", "欲望载体", "稳定载体", "对立存在", "超越存在", "路径", "文本"]
    },
    "valence": {
      "type": "object",
      "description": "情绪色彩向量（抽象维度）",
      "properties": {
        "张力": {"type": "number", "minimum": 0, "maximum": 1},
        "压迫": {"type": "number", "minimum": 0, "maximum": 1},
        "诱惑": {"type": "number", "minimum": 0, "maximum": 1},
        "迟疑": {"type": "number", "minimum": 0, "maximum": 1},
        "清明": {"type": "number", "minimum": 0, "maximum": 1}
      }
    },
    "carrier": {
      "type": "string",
      "description": "所属工具类型",
      "enum": ["叙事主体", "叙事客体", "环境载体", "目的论对象", "抽象概念"]
    },
    "origin": {
      "type": "string",
      "description": "来源片段引用（文本索引或哈希）",
      "examples": ["text_line_4", "para_2_sent_3"]
    },
    "time_form": {
      "type": "string",
      "description": "时间化标记（作为感性空间的分配，不是物理时间）",
      "enum": ["过去-记忆", "现在-持续", "未来-承诺", "循环-重复"]
    },
    "antonyms": {
      "type": "array",
      "items": {"type": "string"},
      "description": "对立符号列表（可选）"
    },
    "synonyms": {
      "type": "array",
      "items": {"type": "string"},
      "description": "近义符号列表（可选）"
    }
  }
}
```

**符号示例**:

```json
{
  "id": "sym_001",
  "label": "中心载体",
  "valence": {
    "张力": 0.6,
    "压迫": 0.3,
    "诱惑": 0.2,
    "迟疑": 0.1,
    "清明": 0.7
  },
  "carrier": "叙事主体",
  "origin": "text_line_4",
  "time_form": "现在-持续",
  "antonyms": ["对立存在", "混乱力量"],
  "synonyms": ["秩序载体", "引导者"]
}
```

---

### 3.2 幻想结（FantasyKnot）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FantasyKnot",
  "type": "object",
  "required": ["id", "repetition_pattern", "force_index", "exclusivity_filters"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^fk_[0-9]{3}$",
      "description": "幻想结唯一标识符"
    },
    "repetition_pattern": {
      "type": "string",
      "description": "重复信息模式",
      "examples": [
        "试炼-克服-转变",
        "阻碍-干预-突破",
        "诱惑-偏离-纠正",
        "冲突-合作-前进"
      ]
    },
    "force_index": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "力量指数 = 重复频次 × 排他筛选强度 × 权力链触发度"
    },
    "exclusivity_filters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["允许", "排除", "强化", "遮蔽"]
          },
          "condition": {
            "type": "string",
            "description": "筛选条件（禁止具体文化符号）"
          }
        }
      },
      "description": "排他性筛选机制列表"
    },
    "related_symbols": {
      "type": "array",
      "items": {"type": "string"},
      "description": "关联符号ID列表"
    }
  }
}
```

**幻想结示例**:

```json
{
  "id": "fk_001",
  "repetition_pattern": "试炼-克服-转变",
  "force_index": 0.85,
  "exclusivity_filters": [
    {"type": "允许", "condition": "成功叙事"},
    {"type": "排除", "condition": "失败终局"},
    {"type": "排除", "condition": "路径放弃"},
    {"type": "强化", "condition": "线性进步"},
    {"type": "遮蔽", "condition": "循环停滞"}
  ],
  "related_symbols": ["sym_001", "sym_007", "sym_010"]
}
```

---

### 3.3 范指动作（IndexicalOperation）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IndexicalOperation",
  "type": "object",
  "required": ["slice", "freeze", "stitch"],
  "properties": {
    "slice": {
      "type": "object",
      "required": ["rule", "unit"],
      "properties": {
        "rule": {
          "type": "string",
          "description": "切片规则（如何从话语流中切出符号单位）"
        },
        "unit": {
          "type": "string",
          "description": "切片单位类型"
        },
        "threshold": {
          "type": "number",
          "description": "最小切片长度阈值（可选）"
        }
      }
    },
    "freeze": {
      "type": "object",
      "required": ["trigger", "output"],
      "properties": {
        "trigger": {
          "type": "string",
          "description": "凝固触发条件（何时把流动变为定义/命题）"
        },
        "output": {
          "type": "string",
          "enum": ["符号定义", "命题", "假设"],
          "description": "凝固输出类型"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "凝固置信度"
        }
      }
    },
    "stitch": {
      "type": "object",
      "required": ["rule", "output"],
      "properties": {
        "rule": {
          "type": "string",
          "description": "缝合规则（何时把多符号缝成模式/结构）"
        },
        "output": {
          "type": "string",
          "description": "缝合输出结构类型"
        },
        "stability": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "缝合结构稳定性"
        }
      }
    }
  }
}
```

**范指动作示例**:

```json
{
  "slice": {
    "rule": "按角色功能切分单位",
    "unit": "载体类型",
    "threshold": 1
  },
  "freeze": {
    "trigger": "同一描述重复出现3次以上",
    "output": "符号定义",
    "confidence": 0.8
  },
  "stitch": {
    "rule": "冲突-试炼-解决序列",
    "output": "叙事结构",
    "stability": 0.7
  }
}
```

---

### 3.4 命题（Proposition / Rule）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Proposition",
  "type": "object",
  "required": ["id", "statement", "causal_form", "boundary", "failure_conditions", "rewrite_hooks", "witchcraft_risk"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^prop_[0-9]{3}$",
      "description": "命题唯一标识符"
    },
    "statement": {
      "type": "string",
      "description": "规则文本（抽象，禁止具体文化符号）"
    },
    "causal_form": {
      "type": "string",
      "description": "因果表达结构（可重写）",
      "examples": [
        "[A] → [B] → [C]",
        "[重复] + [积累] → [质变]",
        "[试炼] × [时间] → [转变]"
      ]
    },
    "boundary": {
      "type": "string",
      "description": "适用边界（必须声明）"
    },
    "failure_conditions": {
      "type": "array",
      "items": {"type": "string"},
      "description": "失败条件列表（触发即降级为沉默/假设）"
    },
    "rewrite_hooks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["statement", "causal_form", "boundary", "filters"]
      },
      "description": "可改写字段列表"
    },
    "witchcraft_risk": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "巫术风险分（定义反向制造原因的倾向）"
    },
    "risk_reasons": {
      "type": "array",
      "items": {"type": "string"},
      "description": "风险理由列表"
    },
    "alternatives": {
      "type": "array",
      "items": {"type": "string"},
      "description": "通过否定生成的替代命题列表"
    }
  }
}
```

**命题示例**:

```json
{
  "id": "prop_001",
  "statement": "试炼序列必然导致终极转变",
  "causal_form": "[试炼重复] → [积累] → [质变]",
  "boundary": "适用于线性进步叙事",
  "failure_conditions": [
    "试炼无限循环无出口",
    "载体中途消解",
    "外部干预切断路径",
    "时间债务耗尽"
  ],
  "rewrite_hooks": ["causal_form", "boundary"],
  "witchcraft_risk": 0.4,
  "risk_reasons": [
    "因果倒置：目的论承诺预先存在于起始点",
    "排他性封闭：排除失败和放弃的可能"
  ],
  "alternatives": [
    "试炼序列不必然导致转变",
    "非试炼因素导致转变",
    "终极转变不是目的"
  ]
}
```

---

### 3.5 权力链（PowerChain）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PowerChain",
  "type": "object",
  "required": ["id", "motion_links", "active_carriers", "effect_on_rules"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^pc_[0-9]{3}$",
      "description": "权力链唯一标识符"
    },
    "motion_links": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "stage": {
            "type": "string",
            "description": "抽象链条阶段（禁止具体历史/政治名称）"
          },
          "description": {
            "type": "string",
            "description": "阶段描述（抽象哲学语言）"
          }
        }
      },
      "description": "意识形态 → 权力聚合 → 原则化 → 意志集中 → 集体认同 → 主权表达（抽象链条）"
    },
    "active_carriers": {
      "type": "array",
      "items": {"type": "string"},
      "description": "当前临时载体列表（符号ID或抽象名称）"
    },
    "effect_on_rules": {
      "type": "object",
      "description": "对命题的改写倾向",
      "additionalProperties": {
        "type": "string",
        "enum": ["强化", "排他", "扩张", "收缩", "遮蔽"]
      }
    },
    "power_distance": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "权力距离指数（来自 I4 输入）"
    },
    "information_asymmetry": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "信息不对称指数（来自 I4 输入）"
    }
  }
}
```

**权力链示例**:

```json
{
  "id": "pc_001",
  "motion_links": [
    {"stage": "意识形态", "description": "超越意识形态与自然意识形态的融合叙事"},
    {"stage": "权力聚合", "description": "师徒结构形成层级化集体"},
    {"stage": "原则化", "description": "取经使命抽象为绝对原则"},
    {"stage": "意志集中", "description": "向西行进集中所有行动"},
    {"stage": "集体认同", "description": "师徒共同体消融个体欲望"},
    {"stage": "主权表达", "description": "取得终极文本确证主权"}
  ],
  "active_carriers": [
    "sym_001",
    "sym_002",
    "sym_003",
    "sym_004"
  ],
  "effect_on_rules": {
    "prop_001": "强化",
    "prop_002": "排他",
    "prop_003": "遮蔽"
  },
  "power_distance": 0.8,
  "information_asymmetry": 0.5
}
```

---

## 完整符号图谱（Symbol Graph）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SymbolGraph",
  "type": "object",
  "required": ["symbols", "fantasy_knots", "indexical_operations", "propositions", "power_chains"],
  "properties": {
    "symbols": {
      "type": "array",
      "items": {"$ref": "#/definitions/Symbol"}
    },
    "fantasy_knots": {
      "type": "array",
      "items": {"$ref": "#/definitions/FantasyKnot"}
    },
    "indexical_operations": {
      "type": "array",
      "items": {"$ref": "#/definitions/IndexicalOperation"}
    },
    "propositions": {
      "type": "array",
      "items": {"$ref": "#/definitions/Proposition"}
    },
    "power_chains": {
      "type": "array",
      "items": {"$ref": "#/definitions/PowerChain"}
    },
    "metadata": {
      "type": "object",
      "properties": {
        "engine_version": {"type": "string"},
        "generated_at": {"type": "string", "format": "date-time"},
        "input_hash": {"type": "string"},
        "observer_stance": {"type": "object"}
      }
    }
  },
  "definitions": {
    "Symbol": {"$ref": "#Symbol"},
    "FantasyKnot": {"$ref": "#FantasyKnot"},
    "IndexicalOperation": {"$ref": "#IndexicalOperation"},
    "Proposition": {"$ref": "#Proposition"},
    "PowerChain": {"$ref": "#PowerChain"}
  }
}
```

---

## 输入数据结构（Inputs）

### I1: 话语流（DiscourseFlow）

```json
{
  "type": "string",
  "description": "自然语言段落（包含情绪、判断、因果、定义、命题）",
  "example": "叙事文本包含重复模式、角色描述、冲突结构"
}
```

### I2: 工具描述（ToolDescription）

```json
{
  "type": "object",
  "required": ["tool_type", "constraints"],
  "properties": {
    "tool_type": {
      "type": "string",
      "enum": ["文本", "语音", "图像", "交互界面", "流程", "制度"],
      "description": "工具类型"
    },
    "constraints": {
      "type": "array",
      "items": {"type": "string"},
      "description": "工具约束列表"
    },
    "linearity": {
      "type": "boolean",
      "description": "是否为线性载体"
    },
    "reversibility": {
      "type": "boolean",
      "description": "是否可逆（可编辑/修改）"
    }
  }
}
```

### I3: 观察者立场（ObserverStance）

```json
{
  "type": "object",
  "required": ["interrogation_intensity", "silence_threshold", "tolerance_preference"],
  "properties": {
    "interrogation_intensity": {
      "type": "number",
      "minimum": 0,
      "maximum": 10,
      "description": "追问强度（0=被动接受，10=激进追问）"
    },
    "silence_threshold": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "沉默阈值（0=从不沉默，1=高度谨慎）"
    },
    "tolerance_preference": {
      "type": "string",
      "enum": ["strict", "loose"],
      "description": "容错偏好"
    },
    "subjectivity_mode": {
      "type": "string",
      "enum": ["external", "internal", "hybrid"],
      "description": "主体性模式"
    }
  }
}
```

### I4: 现实映射变量（RealityMappingVariables）

```json
{
  "type": "object",
  "properties": {
    "credit": {"type": "number", "description": "信誉"},
    "commitment_cost": {"type": "number", "description": "承诺成本"},
    "information_asymmetry": {"type": "number", "description": "信息不对称"},
    "compliance_pressure": {"type": "number", "description": "合规压力"},
    "time_debt": {"type": "number", "description": "时间债务"},
    "power_distance": {"type": "number", "description": "权力距离"}
  },
  "description": "抽象变量集（禁止具体社会机构名）"
}
```

---

## 输出数据结构（Outputs）

### O1: 符号图谱快照（SymbolGraphSnapshot）

```json
{
  "type": "object",
  "required": ["symbols", "fantasy_knots", "power_chains_current"],
  "properties": {
    "symbols": {"type": "array", "items": {"$ref": "#Symbol"}},
    "fantasy_knots": {"type": "array", "items": {"$ref": "#FantasyKnot"}},
    "power_chains_current": {"type": "array", "items": {"$ref": "#PowerChain"}},
    "graph_metrics": {
      "type": "object",
      "properties": {
        "symbol_count": {"type": "integer"},
        "connection_density": {"type": "number"},
        "fantasy_force_average": {"type": "number"}
      }
    }
  }
}
```

### O2: 规则卡组（RuleDeck）

```json
{
  "type": "object",
  "required": ["proposition_cards"],
  "properties": {
    "proposition_cards": {
      "type": "array",
      "items": {"$ref": "#Proposition"}
    },
    "deck_statistics": {
      "type": "object",
      "properties": {
        "total_cards": {"type": "integer"},
        "high_risk_count": {"type": "integer"},
        "average_risk": {"type": "number"}
      }
    }
  }
}
```

### O3: 改写日志（RewriteLog）

```json
{
  "type": "object",
  "required": ["rewrite_entries"],
  "properties": {
    "rewrite_entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {"type": "string", "format": "date-time"},
          "proposition_id": {"type": "string"},
          "trigger_source": {
            "type": "string",
            "enum": ["工具差异", "排他筛选", "权力链", "追问"]
          },
          "changed_fields": {
            "type": "array",
            "items": {"type": "string"}
          },
          "before": {"type": "object"},
          "after": {"type": "object"},
          "reasoning": {"type": "string"}
        }
      }
    }
  }
}
```

### O4: 沉默报告（SilenceReport）

```json
{
  "type": "object",
  "required": ["silence_entries"],
  "properties": {
    "silence_entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "reason": {
            "type": "string",
            "enum": ["边界外", "失败条件触发", "巫术风险过高", "信息不足"]
          },
          "details": {"type": "string"},
          "alternative_questions": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      }
    }
  }
}
```

### O5: 追问种子（InterrogationSeeds）

```json
{
  "type": "object",
  "required": ["questions"],
  "properties": {
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string",
            "description": "可检验问题（禁止引导式废话）"
          },
          "target_proposition": {"type": "string"},
          "testability": {
            "type": "string",
            "enum": ["直接可检验", "间接可检验", "理论可检验"],
            "description": "可检验性等级"
          },
          "priority": {
            "type": "number",
            "minimum": 1,
            "maximum": 10,
            "description": "优先级"
          }
        }
      }
    }
  }
}
```

---

**下一步**: 生成完整的 O1-O5 输出结果与规则卡组
