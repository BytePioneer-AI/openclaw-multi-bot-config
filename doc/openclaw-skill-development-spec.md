# OpenClaw Skill 开发与安装规范整理

## 1. 目的

本文用于整理 OpenClaw 参考项目中关于 Skill 的创建规范、加载规则、配置方式和安装接入方式。

目标是回答四个问题：

- OpenClaw 是否有关于创建 Skill 的正式文档
- Skill 的最小结构和推荐结构是什么
- OpenClaw 如何发现和加载 Skill
- 独立 Skill 应如何安装、分发和接入 OpenClaw

本文结论基于两类来源：

- 文档：`doc/reference-projects/openclaw/docs/**`
- 源码：`doc/reference-projects/openclaw/src/**`

其中：

- 文档用于了解官方设计意图
- 源码用于确认实际行为

若文档与实现细节存在差异，应以源码行为为准。

## 2. 结论总览

结论很明确：

1. OpenClaw 有专门的 Skill 文档，不是隐式功能。
2. OpenClaw 的 Skill 体系基于 `SKILL.md`，兼容 AgentSkills 风格目录。
3. Skill 可以作为独立目录直接被 OpenClaw 发现，不要求一定通过插件安装。
4. Skill 的“安装”分两类：
   - 安装 Skill 目录本体
   - 安装 Skill 依赖的外部二进制或运行环境
5. 独立 Skill 最适合放在：
   - `<workspace>/skills/<skill-name>`
   - 或 `~/.openclaw/skills/<skill-name>`
6. OpenClaw 自带 `openclaw skills` CLI 用于检查和调试 Skill，但不负责把本地 Skill 目录复制进目标位置。
7. OpenClaw 还支持通过 `metadata.openclaw.install` 为 Skill 声明依赖安装器，供网关或 macOS UI 调用。

## 3. OpenClaw 中与 Skill 相关的关键文档

### 3.1 创建 Skill 的快速文档

参考：

- `doc/reference-projects/openclaw/docs/tools/creating-skills.md`

这份文档回答的是：

- 什么是 Skill
- 如何创建第一个 Skill
- 默认放到哪里
- 如何让 OpenClaw 重新发现它

最直接的信息包括：

- Skill 通常放在 `~/.openclaw/workspace/skills/`
- 一个 Skill 至少包含一个目录和一个 `SKILL.md`
- `SKILL.md` 使用 YAML frontmatter + Markdown 正文

### 3.2 Skills 机制总文档

参考：

- `doc/reference-projects/openclaw/docs/tools/skills.md`

这份文档回答的是：

- Skill 从哪些位置加载
- 优先级是什么
- `SKILL.md` 支持哪些 frontmatter 字段
- `metadata.openclaw` 支持哪些能力
- `skills.entries` 如何注入 env 和 apiKey
- watcher、session snapshot、远程节点等运行时行为

### 3.3 Skills 配置文档

参考：

- `doc/reference-projects/openclaw/docs/tools/skills-config.md`

这份文档回答的是：

- `~/.openclaw/openclaw.json` 中 `skills` 配置块有哪些字段
- 如何配置额外目录、watcher、安装器偏好、按 Skill 注入 env

### 3.4 Skills CLI 文档

参考：

- `doc/reference-projects/openclaw/docs/cli/skills.md`

这份文档说明：

- `openclaw skills list`
- `openclaw skills info <name>`
- `openclaw skills check`

它们主要用于检查发现状态和 eligibility，不是 Skill 本体安装器。

### 3.5 内置 Skill 设计参考

参考：

- `doc/reference-projects/openclaw/skills/skill-creator/SKILL.md`

这个内置 Skill 比快速文档更进一步，补充了：

- 推荐目录结构
- `scripts/`、`references/`、`assets/` 的用法
- 初始化脚本 `init_skill.py`
- 校验与打包脚本
- `.skill` 分发包的思路

因此，如果要设计一个独立 Skill，这份内置 Skill 也是重要参考。

## 4. Skill 的基本概念

OpenClaw 把 Skill 视为一种“给模型补充可复用操作知识”的目录结构。

它的核心不是插件代码，而是：

- 一份 `SKILL.md`
- 可选的脚本、参考资料、资源文件

OpenClaw 在系统提示构建时不会直接把整个 Skill 全塞给模型，而是：

- 先把可用 Skill 的名称、描述、位置做成列表注入 prompt
- 当某个 Skill 明显适用时，再读取对应 `SKILL.md`

这也是为什么：

- `description` 很关键
- `SKILL.md` 正文要简洁
- 大量细节更适合拆进 `references/`

## 5. Skill 的最小结构

最小可运行结构如下：

```text
my-skill/
└── SKILL.md
```

最小 `SKILL.md` 至少应包含：

```markdown
---
name: my-skill
description: Briefly describe what this skill does and when it should be used.
---

# My Skill

Write the instructions the agent should follow when this skill is selected.
```

其中：

- `name` 必填
- `description` 必填

这是 OpenClaw 识别一个 Skill 的最基本前提。

## 6. 推荐目录结构

虽然最小结构只需要 `SKILL.md`，但从 OpenClaw 自带 `skill-creator` 的设计看，更推荐如下结构：

```text
my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

推荐含义：

- `scripts/`：放可执行脚本，适合重复性强、需要确定性的操作
- `references/`：放补充文档，避免把所有细节都堆进 `SKILL.md`
- `assets/`：放模板、图标、样板文件等输出资源

这个结构不是运行时强制要求，但很适合做可分发的独立 Skill。

## 7. `SKILL.md` frontmatter 规范

### 7.1 必填字段

```yaml
name: my-skill
description: ...
```

### 7.2 常见可选字段

根据 `docs/tools/skills.md` 和内置 Skill 示例，常见可选字段包括：

- `homepage`
- `user-invocable`
- `disable-model-invocation`
- `command-dispatch`
- `command-tool`
- `command-arg-mode`
- `metadata`

### 7.3 `metadata.openclaw`

`metadata` 中可包含 `openclaw` 配置块，用于声明加载条件和安装器。

典型结构：

```markdown
---
name: gemini
description: Gemini CLI for one-shot Q&A, summaries, and generation.
homepage: https://ai.google.dev/
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)"
            }
          ]
      }
  }
---
```

常用字段：

- `always`
- `emoji`
- `homepage`
- `skillKey`
- `primaryEnv`
- `os`
- `requires.bins`
- `requires.anyBins`
- `requires.env`
- `requires.config`
- `install`

### 7.4 关于 frontmatter 格式的一个实现细节

文档里偏向把 `metadata` 写成单行 JSON。

但从源码解析器看，OpenClaw 实际使用 YAML 解析 frontmatter，并会把结构化对象转换为字符串再继续解析。因此：

- 多行 YAML 结构并不一定会失败
- 仓库内置 Skill 也存在多行 `metadata` 示例

也就是说：

- 文档建议的是一种保守写法
- 源码行为比文档更宽松

如果要最大兼容性，仍建议优先采用文档示例风格，保持结构清晰、不要写复杂花样。

## 8. Skill 如何被 OpenClaw 发现

### 8.1 文档层面的发现位置

官方文档写明了 3 个主要位置：

1. Bundled skills
2. `~/.openclaw/skills`
3. `<workspace>/skills`

文档中的优先级为：

`<workspace>/skills` → `~/.openclaw/skills` → bundled skills`

另可通过：

- `skills.load.extraDirs`

添加额外目录，优先级最低。

### 8.2 源码层面的真实发现顺序

源码里实际还会加载额外两个位置：

- `~/.agents/skills`
- `<workspace>/.agents/skills`

源码中的实际优先级是：

`extraDirs` < `bundled` < `~/.openclaw/skills` < `~/.agents/skills` < `<workspace>/.agents/skills` < `<workspace>/skills`

因此，如果你只是做独立 Skill，最稳妥的分发目标仍然是：

- `<workspace>/skills/<name>`
- 或 `~/.openclaw/skills/<name>`

不要默认依赖 `.agents/skills`，除非你明确要对接 AgentSkills 兼容目录。

## 9. Skill 安装方式

这里必须区分两个概念：

### 9.1 安装 Skill 本体

这指的是把 `SKILL.md` 和附带目录放到 OpenClaw 能发现的地方。

常见方式：

#### 方式 A：直接复制到 workspace

```text
<workspace>/skills/<skill-name>/
```

适合：

- 当前项目独占使用
- 单 agent 使用
- 本地开发调试

#### 方式 B：直接复制到共享目录

```text
~/.openclaw/skills/<skill-name>/
```

适合：

- 多 agent 共用
- 本机所有 OpenClaw 工作区共享

#### 方式 C：使用 `skills.load.extraDirs`

在 `~/.openclaw/openclaw.json` 中配置：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/my-skills"]
    }
  }
}
```

适合：

- 维护一个集中式 skill 仓库
- 不想复制目录

但要注意：

- 这是最低优先级
- 适合共享包，不适合做局部覆盖

#### 方式 D：通过 ClawHub 安装

文档明确指出：

- `clawhub install <skill-slug>`

默认会把 Skill 安装到当前目录的 `./skills`，OpenClaw 会把它视为 `<workspace>/skills`。

这更适合公开分发的 Skill。

### 9.2 安装 Skill 依赖

这指的是安装 Skill 运行依赖的二进制或工具，例如：

- `brew install xxx`
- `npm install -g xxx`
- `uv tool install xxx`

这个能力不是在安装 Skill 目录，而是由 Skill 的 `metadata.openclaw.install` 描述安装器。

OpenClaw 支持的安装器类型包括：

- `brew`
- `node`
- `go`
- `uv`
- `download`

macOS UI 和网关 RPC `skills.install` 会调用这些安装器。

因此要区分：

- Skill 本体目录是否已被发现
- Skill 所需外部工具是否已安装

这两件事不是同一个流程。

## 10. Skill 与插件的关系

Skill 不要求必须做成插件。

独立 Skill 只要放到发现目录即可。

但 OpenClaw 也支持“插件附带 Skill”：

- 插件根目录中可以有 `skills/`
- 在 `openclaw.plugin.json` 中声明 `skills` 数组

这种方式适合：

- Skill 与某个插件能力强绑定
- 希望插件启用时顺带暴露 Skill

如果目标是“独立发布的通用 Skill”，不建议优先走插件路线。

## 11. OpenClaw 配置如何控制 Skill

所有 Skill 相关配置都在：

- `~/.openclaw/openclaw.json`

根路径：

- `skills`

关键字段包括：

### 11.1 `skills.load`

- `extraDirs`
- `watch`
- `watchDebounceMs`

### 11.2 `skills.install`

- `preferBrew`
- `nodeManager`

### 11.3 `skills.entries.<skillKey>`

按 Skill 做局部配置：

- `enabled`
- `apiKey`
- `env`
- `config`

作用包括：

- 启用/禁用单个 Skill
- 给 Skill 注入环境变量
- 给 Skill 提供 API key
- 给 Skill 存放自定义配置数据

## 12. Skill 的刷新与生效时机

### 12.1 新 Skill 如何生效

快速文档建议：

- “refresh skills”
- 或重启 gateway

更精确地说：

- OpenClaw 默认会 watch skill 目录中的 `SKILL.md`
- 变更后会刷新技能快照
- 但通常会在“下一次 agent turn”体现

### 12.2 Session snapshot

OpenClaw 会在 session 开始时快照 eligible skills。

这意味着：

- Skill 目录变了，不一定马上影响当前 session
- 开新会话最稳
- 开启 watcher 时，下一次 agent turn 有机会热更新

因此在测试独立 Skill 时，建议：

1. 放入目标目录
2. 执行 `openclaw skills check`
3. 开一个新 session 测试

## 13. Skill 检查与调试命令

OpenClaw 内置了专门的 CLI：

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

用途：

- `list`：看是否被发现
- `list --eligible`：看是否满足依赖、可实际使用
- `info`：看单个 Skill 的详情
- `check`：看 ready / missing requirements 摘要

这些命令很适合做独立 Skill 的接入验收。

## 14. 安全与边界

Skill 在 OpenClaw 中不是纯文本摆设，它可能会：

- 指导模型执行命令
- 使用外部工具
- 读取本地资源
- 安装外部依赖

因此需要注意：

### 14.1 不信任第三方 Skill

文档明确建议：

- 第三方 Skill 视为不可信代码
- 启用前要阅读

### 14.2 路径边界检查

源码会检查：

- `SKILL.md` realpath 是否逃逸出允许目录

安全审计中也有对应项：

- `skills.workspace.symlink_escape`

### 14.3 文件大小限制

源码中对 `SKILL.md` 有大小上限：

- 超过限制会跳过

因此不要把大体量说明都堆进 `SKILL.md`，应拆到 `references/`。

## 15. 对独立 Skill 的实际建议

如果目标是做一个独立分发、可安装到 OpenClaw 的 Skill，建议采用以下策略。

### 15.1 目录结构

建议：

```text
openclaw-my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

### 15.2 安装目标

开发阶段：

- 放到 `<workspace>/skills/openclaw-my-skill`

共享阶段：

- 放到 `~/.openclaw/skills/openclaw-my-skill`

公开分发阶段：

- 考虑 ClawHub
- 或打包成 `.skill`

### 15.3 元数据策略

最小先做：

- `name`
- `description`

稳定后再补：

- `homepage`
- `metadata.openclaw.requires`
- `metadata.openclaw.install`
- `primaryEnv`

### 15.4 验证流程

建议每次发布前至少验证：

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

### 15.5 不要混淆两种安装

要清楚区分：

- “把 Skill 目录放进 OpenClaw”
- “给 Skill 安装依赖工具”

前者是目录分发问题，后者是安装器问题。

## 16. 最终结论

OpenClaw 的 Skill 体系已经相当完整，不是临时能力。

关于“如何创建 Skill”和“如何安装到 OpenClaw”，可以归纳为一句话：

- **创建规范**：以 `SKILL.md` 为核心，推荐补充 `scripts/`、`references/`、`assets/`
- **接入方式**：把 Skill 目录放到 OpenClaw 的发现路径中
- **依赖安装**：通过 `metadata.openclaw.install` 声明
- **检查验证**：通过 `openclaw skills` CLI 完成

如果后续要为“独立 Skill”制定你自己的仓库规范，这份文档可以作为基础约束。
