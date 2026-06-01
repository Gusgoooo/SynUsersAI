# SynUsers.AI

**Research-backed AI personas and group chat for social simulation.**

SynUsers.AI is not a scripted chatbot demo. It is an AI social simulation workspace built on source-backed persona construction: uploaded audience material can be distilled into memory, consumption habits, education/cognitive style, social identity, emotional triggers, language register, and decision heuristics. Multiple virtual users then respond to one another in live group discussions, A/B concept tests, and other research scenarios. The value is in the interaction loop: each agent reads the shared context, reacts from its own memory-shaped persona, updates its stance through the conversation, and helps the group arrive at an emergent conclusion.

**SynUsers.AI 不是一个按脚本跑完的聊天机器人 Demo。** 它更接近一个基于 AI 人设底座的社会模拟工作台：系统可以把真实来源数据蒸馏成虚拟用户的记忆、消费习惯、教育与认知方式、社会身份、情绪触发点、语言风格和决策捷径，再让这些用户在群聊、A/B 测试和更多研究场景中互相回应、互相影响，并在多轮互动后逐步推导出结论。它的核心不是“预设答案”，而是“让多个 AI 个体在同一个社会情境中进行推理、碰撞和涌现”。

## 中文

### 项目定位

SynUsers.AI 面向早期用户研究、产品概念验证、营销信息测试和观点分歧分析。它把大语言模型放进一个有理论约束的群体互动场景中：每个虚拟用户不是简单复读 prompt，而是带着自己的角色背景、人格参数、当前立场、发言风格、风险偏好、社会认同倾向和损失厌恶程度参与讨论。

这类模拟的本质是 **social simulation**：用多个可交互 agent 近似观察群体行为如何从个体差异中产生。它不能替代真实用户访谈或统计调查，但可以帮助团队更早发现潜在分歧、反对理由、说服路径、概念误读和用户采纳障碍。

### 来源数据与记忆蒸馏

SynUsers.AI 的核心优势不是让 AI 在聊天里不断引用材料，而是把真实来源材料转化为 **可行动的人类式记忆系统**。用户可以导入 CSV、Excel、Word 或文本材料，系统会先把它们切分为来源锚点，再通过主题分析和持续比较，蒸馏出每个虚拟用户的内在结构：

- **语义记忆**：这个人群稳定相信什么、知道什么、误解什么。
- **复合经历记忆**：由多条真实材料组合出的典型经历，不伪装成某个真实个人的隐私故事。
- **消费习惯**：价格敏感、订阅疲劳、品牌忠诚、替代方案、预算审批和使用频率。
- **教育与认知方式**：抽象理解能力、词汇密度、行业术语、推理方式和信息加工深度。
- **社会身份**：职业角色、团队责任、家庭责任、圈层压力和身份顾虑。
- **情绪触发点**：什么会让它兴奋、警惕、防御、厌烦或觉得被冒犯。
- **语言风格**：句长、直接程度、口语化程度、行业表达和文化语境。
- **决策捷径**：判断产品、价格、风险和可信度时常用的经验法则。

这意味着，前台看到的是自然对话；后台保留的是来源锚点和记忆激活记录。AI 用户不应该说“根据 E12 证据”，而应该像真人一样说：“我可能不会马上买，我已经有几个订阅了，再多一个月费会有点烦。”来源材料仍然影响了发言，但影响是内化的。

### RAG机制

RAG 很适合做事实问答和证据追溯，但直接把 RAG 暴露在群聊中，会让虚拟用户像检索机器人，而不是像人。SynUsers.AI 因此采用 **Distillation-first, RAG-backed** 的架构：

- **先蒸馏**：把来源材料变成 persona 的记忆、习惯、语言和判断方式。
- **再激活**：每轮发言前，系统只在后台检索相关来源锚点，作为私有记忆线索。
- **自然表达**：agent 发言时禁止机械引用 evidence id、文件名、行号或“数据显示”。
- **可追溯**：需要解释时，分析层可以展示“这句话受哪些记忆影响”以及背后的来源锚点。

什么时候突出 RAG 引用：

- 用户在审核 persona 可信度时。
- 用户查看“为什么会这样想”分析面板时。
- 研究报告需要解释结论来源时。
- 团队需要审计某个洞察是否被原始材料支持时。

什么时候让用户无感：

- 实时群聊发言时。
- persona 自我介绍时。
- A/B 测试里的自然评价和选择理由。
- 任何需要像真人表达而不是像研究报告的场景。

这种设计保留了 RAG 的可追溯性，同时避免它破坏人类仿真的自然度。

### AI 人设基座

SynUsers.AI 的底层不是某一个单点功能，而是一套可以复用的 **AI 人设与社会互动基座**。这个基座从人格特质、记忆蒸馏、决策偏差、社会影响和观点演化等维度构造虚拟用户，再把这些用户放入不同任务场景中观察他们如何反应。

因此，圆桌讨论只是第一个场景；在同一套 AI 人设基础之上，还可以自然孵化出更多研究流程，例如：

- **A/B 测试**：让同一批或不同分层的虚拟用户评估多个产品方案、广告文案、功能包装或定价策略。
- **用户访谈**：让单个 persona 围绕体验、动机、顾虑和替代方案展开深挖式访谈。
- **概念压力测试**：观察一个新想法会在哪些人群中被误读、反对或快速接受。
- **舆情预演**：模拟不同立场的人如何围绕争议议题形成支持、反驳、沉默或阵营分裂。
- **销售和客服演练**：让 agent 扮演不同购买意向、预算约束和风险偏好的客户。

这使 SynUsers.AI 更像一个可扩展的社会模拟平台，而不是单一的“AI 群聊页面”。

### 核心思想

SynUsers.AI 不是把一段固定脚本依次播放出来。一次模拟会经历这样的循环：

1. 根据目标人群和议题生成多个虚拟用户。
2. 为每个用户建立背景、人格、偏差、知识领域、触发词和初始立场。
3. 每一轮中，系统根据上下文选择更可能发言的用户。
4. 发言用户结合自己的 persona、最近对话、内在立场和他人观点生成回应。
5. 其他用户接收新信息后，状态、张力、沉默倾向和立场可能发生变化。
6. 多轮互动之后，系统汇总分歧点、态度变化、关键转折和最终结论。

换句话说，结论不是预先写好的结果，而是由多个 agent 在同一社会情境中一步一步互动出来的。

### 技术架构思路

SynUsers.AI 的架构刻意把“来源处理”“人格生成”“对话模拟”“解释追溯”拆成不同层，避免所有逻辑堆在一个 prompt 里。

```text
Source Files
  -> Population Parser
  -> Source Anchors
  -> Memory Distillation
  -> Persona Core
  -> Private Memory Activation
  -> Natural Conversation
  -> Traceable Analysis / Report
```

各层职责：

- `lib/population/parse.ts`：解析 CSV、Excel、Word、TXT，把原始材料切成来源锚点。
- `lib/population/persona-synthesis.ts`：把来源锚点蒸馏成 memory profile、人格参数、消费习惯和语言风格。
- `lib/population/retrieval.ts`：对话中做后台记忆激活，只给 agent 私有参考，不要求它在发言中引用。
- `lib/persona/types.ts`：统一定义 persona、memory、evidence、activated memory 等核心领域模型。
- `lib/persona/defaults.ts`：统一 OCEAN、bias 和运行态默认值，保证不同入口生成的人格参数一致。
- `lib/engine/prompts.ts`：把自然表达、人类式记忆、偏见、情绪和对话阶段组合成发言 prompt。
- `lib/engine/speaker-selector.ts`：根据发言冲动、沉默补偿和认知张力选择下一位说话者。
- `lib/engine/state-updater.ts`：更新能量、沉默轮次、认知张力和情绪状态。
- `lib/engine/reporter.ts`：把模拟过程整理成可读报告。

这种架构的优越性：

- **人格生产效率更高**：文件解析、记忆蒸馏和 persona 生成拆开后，可以分别缓存、替换或优化。
- **对话质量更稳**：发言 prompt 不直接塞满原文材料，而是读取蒸馏后的记忆结构，减少引用腔和报告腔。
- **自然仿真更强**：消费习惯、教育程度、社会身份和语言风格成为内在变量，而不是外部引用。
- **可追溯但不生硬**：来源锚点保留在后台，分析时可展开，聊天时不打断真人感。
- **后续扩展更清晰**：A/B 测试、访谈、舆情预演都可以复用同一个 persona/memory 层。
- **模型可替换**：LLM、embedding、向量库和报告生成可以独立替换，不破坏产品核心。

### 理论来源

项目中的 persona、发言冲动、态度变化、沉默补偿、群体收敛和 A/B 选择，并不是随意拍脑袋设计的。它们受到以下研究方向启发：

| 理论方向 | 在 SynUsers.AI 中的用途 | 代表文献 |
| --- | --- | --- |
| Agent-based social simulation | 将社会现象视为个体 agent 互动后的涌现结果 | Epstein & Axtell, *Growing Artificial Societies* (1996) |
| Generative agents | 使用 LLM agent 的记忆、反思和规划能力模拟可信的人类行为 | Park et al., *Generative Agents* (2023) |
| LLM human simulation | 用语言模型模拟人群样本、复现实验或构建 silicon samples | Aher et al. (2023), Argyle et al. (2023) |
| Cognitive dissonance | 衡量新观点与既有立场之间的冲突，以及冲突如何推动回应或态度调整 | Festinger, *A Theory of Cognitive Dissonance* (1957) |
| Opinion dynamics | 观察群体意见如何收敛、分裂或形成多个阵营 | Hegselmann & Krause (2002) |
| Elaboration Likelihood Model | 区分深度加工和线索驱动的说服路径，影响用户如何评价信息 | Petty & Cacioppo (1986) |
| Big Five / OCEAN | 用开放性、尽责性、外向性、宜人性、神经质塑造差异化 persona | McCrae & John (1992) |
| Heuristics and biases | 用启发式、锚定、确认偏差等解释不完全理性的判断 | Tversky & Kahneman (1974) |
| Prospect theory | 用损失厌恶、风险感知和收益/损失框架解释方案接受度 | Kahneman & Tversky (1979) |
| Theory of Planned Behavior | 从态度、主观规范和感知控制解释行为意向 | Ajzen (1991) |
| Spiral of Silence | 模拟少数派或低外向个体为什么沉默，以及何时重新参与 | Noelle-Neumann (1974) |

### 核心功能

- **AI 群聊社会模拟**：围绕一个议题生成多位虚拟用户，让他们进行实时圆桌讨论。
- **多来源人群导入**：支持 CSV、Excel、Word 和文本材料，自动切分为来源锚点。
- **记忆蒸馏式人设生成**：把来源材料转化成语义记忆、复合经历、消费习惯、教育/认知方式、社会身份、情绪触发、语言风格和决策捷径。
- **虚拟用户生成**：根据目标人群、话题、来源材料和模型配置生成不同 persona。
- **角色差异建模**：为每个用户生成背景、人格、立场、说话方式、知识领域、触发词和偏见参数。
- **可复用人设底座**：同一套虚拟用户建模能力可以服务圆桌讨论、A/B 测试、访谈、舆情预演等多个场景。
- **群体互动追踪**：观察谁更想发言、谁在沉默、哪些观点造成分歧、群体是否逐渐收敛。
- **A/B 概念测试**：输入多个产品方案和人群分层，让虚拟用户逐一评价、打分并最终选择。
- **强制选择分析**：在多个方案之间模拟用户最终选择，同时记录拒绝其他方案的理由。
- **记忆解释与来源追溯**：聊天中默认保持自然表达，分析时可查看某句话被哪些内在记忆影响，以及背后来源锚点。
- **研究报告输出**：将模拟结果整理为 Markdown 报告，支持复制和下载。
- **多模型支持**：支持 OpenAI-compatible Chat Completions 协议和 Gemini Vertex-style 协议。

### 适用场景

- 产品概念在正式调研前的早期压力测试。
- 对比多个 slogan、功能包装、定价叙事或落地页主张。
- 探索不同用户群体对同一议题的可能分歧。
- 找出用户对新产品的第一反应、顾虑、误读和反对理由。
- 为真实访谈、问卷或可用性测试生成更好的假设。

### 不适合什么

- 不应把模拟结果当成真实市场数据。
- 不应把 agent 的回答当成真实用户访谈记录。
- 不适合直接替代统计显著性测试。
- 不适合在没有人工判断的情况下自动做高风险商业决策。

SynUsers.AI 更像一个研究前置工具：它帮助你更快提出问题、发现盲点和构建假设，但最终仍需要真实世界数据校验。

### 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand
- assistant-ui
- Recharts

### 快速开始

```bash
npm install
```

创建 `.env` 文件并填写模型服务配置：

```bash
LLM_API_KEY=your_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-5.4-2026-03-05

# 可选：Gemini 模式
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://your-gemini-endpoint
GEMINI_MODEL=gemini-3-pro-preview
```

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问：

```text
http://localhost:3000
```

构建生产版本：

```bash
npm run build
npm run start
```

### 使用流程

1. 在首页选择「圆桌讨论」或「A/B测试」。
2. 输入目标人群、讨论话题或待测试方案；也可以导入 CSV、Excel、Word 或文本材料。
3. 选择虚拟用户数量、对话时长和模型。
4. 生成并审核虚拟用户画像、内在记忆系统和来源锚点。
5. 启动模拟，查看实时对话、记忆解释、评估日志和群体互动指标。
6. 生成报告并复制或下载 Markdown 文件。

### 主要页面

| 路径 | 功能 |
| --- | --- |
| `/` | 首页配置入口，支持圆桌讨论和 A/B 测试入口 |
| `/personas` | 圆桌讨论 persona 预览 |
| `/chat` | 圆桌讨论实时模拟页面 |
| `/report` | 圆桌讨论 Markdown 报告 |
| `/abtest/config` | A/B 测试方案和画像审核 |
| `/abtest/process` | A/B 测试实时评估日志 |
| `/abtest` | A/B 测试结果页 |

### 主要目录

```text
app/                      Next.js App Router 页面和 API routes
components/               页面组件和 UI 组件
lib/persona/              人格、记忆、来源锚点和默认参数的核心领域模型
lib/population/           文件解析、来源锚点、记忆蒸馏和后台检索
lib/engine/               agent 对话模拟、发言选择、状态更新、LLM 调用和报告逻辑
lib/abtest-store.ts       A/B 测试状态管理
lib/simulation-store.ts   圆桌讨论状态管理
public/                   静态资源
```

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `LLM_API_KEY` | OpenAI-compatible 接口密钥 |
| `LLM_API_URL` | Chat Completions 接口地址，默认 `https://api.openai.com/v1/chat/completions` |
| `LLM_MODEL` | OpenAI-compatible 模型名，默认 `gpt-5.4-2026-03-05` |
| `GEMINI_API_KEY` | Gemini 模式接口密钥，未设置时会回退到 `LLM_API_KEY` |
| `GEMINI_API_URL` | Gemini Vertex-style 接口基础地址 |
| `GEMINI_MODEL` | Gemini 模型名，默认 `gemini-3-pro-preview` |

### 参考文献

- Epstein, J. M., & Axtell, R. (1996). *Growing Artificial Societies: Social Science from the Bottom Up*. MIT Press. https://mitpress.mit.edu/9780262050531/growing-artificial-societies/
- Park, J. S., O'Brien, J., Cai, C. J., Morris, M. R., Liang, P., & Bernstein, M. S. (2023). *Generative Agents: Interactive Simulacra of Human Behavior*. UIST 2023. https://doi.org/10.1145/3586183.3606763
- Aher, G. V., Arriaga, R. I., & Kalai, A. T. (2023). *Using Large Language Models to Simulate Multiple Humans and Replicate Human Subject Studies*. ICML 2023. https://proceedings.mlr.press/v202/aher23a.html
- Argyle, L. P., Busby, E. C., Fulda, N., Gubler, J. R., Rytting, C., & Wingate, D. (2023). *Out of One, Many: Using Language Models to Simulate Human Samples*. Political Analysis. https://www.cambridge.org/core/product/identifier/S1047198723000025/type/journal_article
- Lewis, P., Perez, E., Piktus, A., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. NeurIPS 2020. https://arxiv.org/abs/2005.11401
- Braun, V., & Clarke, V. (2006). *Using Thematic Analysis in Psychology*. Qualitative Research in Psychology. https://doi.org/10.1191/1478088706qp063oa
- Salminen, J., Jansen, B. J., Jung, S.-G., et al. (2022). *Data-Driven Personas*. Springer. https://link.springer.com/book/10.1007/978-3-031-02231-9
- Festinger, L. (1957). *A Theory of Cognitive Dissonance*. Stanford University Press. https://psycnet.apa.org/record/1993-97948-000
- Hegselmann, R., & Krause, U. (2002). *Opinion Dynamics and Bounded Confidence: Models, Analysis and Simulation*. Journal of Artificial Societies and Social Simulation. https://www.jasss.org/5/3/2.html
- Petty, R. E., & Cacioppo, J. T. (1986). *The Elaboration Likelihood Model of Persuasion*. Advances in Experimental Social Psychology. https://doi.org/10.1016/S0065-2601(08)60214-2
- McCrae, R. R., & John, O. P. (1992). *An Introduction to the Five-Factor Model and Its Applications*. Journal of Personality. https://doi.org/10.1111/j.1467-6494.1992.tb00970.x
- Tversky, A., & Kahneman, D. (1974). *Judgment under Uncertainty: Heuristics and Biases*. Science. https://doi.org/10.1126/science.185.4157.1124
- Kahneman, D., & Tversky, A. (1979). *Prospect Theory: An Analysis of Decision under Risk*. Econometrica. https://www.econometricsociety.org/publications/econometrica/browse/1979/03/01/prospect-theory-analysis-decision-under-risk
- Ajzen, I. (1991). *The Theory of Planned Behavior*. Organizational Behavior and Human Decision Processes. https://doi.org/10.1016/0749-5978(91)90020-T
- Noelle-Neumann, E. (1974). *The Spiral of Silence: A Theory of Public Opinion*. Journal of Communication. https://doi.org/10.1111/j.1460-2466.1974.tb00367.x

### 注意事项

- 当前项目没有内置用户登录或权限系统。
- 页面状态主要存储在浏览器内存中，刷新页面可能丢失当前模拟状态。
- `.env` 已被 `.gitignore` 忽略，请不要提交真实密钥。
- 「用户访谈」模式目前在 UI 中为预留入口。
- 模拟结果是理论启发下的探索性输出，不是实证结论。

## English

### Positioning

SynUsers.AI is a research-backed AI persona and social simulation platform for early user research, product concept validation, messaging tests, and disagreement analysis. It places large language model agents inside a shared social context, where each virtual user carries a background, personality, stance, communication style, risk preference, social-proof tendency, and loss-aversion profile.

The core idea is **social simulation**: group-level behavior emerges from interactions among differentiated agents. SynUsers.AI does not replace real interviews, surveys, or experiments, but it can help teams discover objections, misreadings, adoption barriers, persuasion paths, and sharper hypotheses before running real-world research.

### Source Data and Memory Distillation

The main advantage of SynUsers.AI is not that virtual users can quote source material. The advantage is that real audience material can be distilled into a human-like memory system. Users can import CSV, Excel, Word, or text files; the system extracts source anchors, compares them thematically, and turns them into each persona's internal structure:

- **Semantic memory**: stable beliefs, knowledge, misconceptions, and expectations.
- **Episodic composite memory**: typical situations synthesized from multiple source units, not private stories from one real person.
- **Consumption habits**: price sensitivity, subscription fatigue, brand loyalty, alternatives, budget approval, and usage frequency.
- **Education and cognitive style**: abstraction level, vocabulary, jargon density, reasoning style, and depth of processing.
- **Social identity**: job role, team responsibility, family responsibility, peer pressure, and status concerns.
- **Emotional triggers**: what makes the persona excited, skeptical, defensive, bored, or annoyed.
- **Language register**: sentence length, directness, casualness, domain language, and cultural context.
- **Decision heuristics**: shortcuts used to judge products, pricing, risk, and credibility.

In the foreground, users see natural conversation. In the background, SynUsers.AI keeps source anchors and memory activation records. A virtual user should not say "according to evidence E12"; it should say something like, "I probably would not buy right away. I already pay for a few subscriptions, and another monthly charge feels annoying." The source still shapes the statement, but the influence is internalized.

### RAG Mechanism

RAG is excellent for factual answering and audit trails. But if RAG is exposed directly inside a group chat, synthetic users begin to sound like retrieval bots instead of people. SynUsers.AI therefore follows a **Distillation-first, RAG-backed** architecture:

- **Distill first**: source material becomes memory, habits, language, and judgment style.
- **Activate privately**: before each turn, relevant source anchors are retrieved only as private memory cues.
- **Speak naturally**: agents are instructed not to cite evidence IDs, filenames, rows, or "the data says" in conversation.
- **Remain traceable**: the analysis layer can still show which memories shaped a message and which source anchors support them.

When RAG should be visible:

- Persona review and trust inspection.
- "Why they think this" panels.
- Research reports that need source-backed explanations.
- Audit workflows where a team needs to verify an insight against original material.

When RAG should stay invisible:

- Live group-chat messages.
- Persona introductions.
- Natural A/B evaluation and choice reasoning.
- Any moment where the experience should feel like human expression rather than a research report.

This keeps the traceability of RAG without letting citation mechanics damage human simulation quality.

### Persona Foundation

The foundation of SynUsers.AI is not a single feature. It is a reusable **AI persona and social-interaction layer**. The system first constructs virtual users from cognitive dynamics, personality traits, decision biases, social influence, and opinion dynamics, then places those users into different research tasks.

Roundtable discussion is only one scenario. The same persona foundation can support more workflows, such as:

- **A/B testing**: ask the same or segmented virtual users to evaluate product concepts, ad copy, feature packaging, or pricing narratives.
- **User interviews**: let one persona explain motivations, concerns, alternatives, and decision criteria in depth.
- **Concept stress-testing**: see where a new idea may be misunderstood, rejected, or adopted quickly.
- **Public-opinion rehearsal**: simulate how different stances may produce support, rebuttal, silence, or factional split.
- **Sales and support roleplay**: model customers with different purchase intent, budgets, and risk preferences.

This makes SynUsers.AI closer to an extensible social simulation platform than a single AI group-chat screen.

### How It Works

SynUsers.AI does not replay a fixed script. A simulation follows an interaction loop:

1. Generate virtual users from a target audience and topic.
2. Assign each user a background, personality, bias profile, knowledge domain, trigger keywords, and initial stance.
3. Select the next likely speaker based on the current conversation state.
4. Let that agent respond from its own persona and recent shared context.
5. Update the other agents' tension, silence tendency, engagement, and stance after each new message.
6. Summarize the resulting disagreement, attitude shifts, turning points, and group conclusion.

The final output is therefore not a prewritten answer. It is an emergent result produced by multiple agents reasoning and reacting in the same simulated social setting.

### Technical Architecture

SynUsers.AI separates source processing, persona construction, conversation simulation, and traceable analysis instead of packing everything into one prompt.

```text
Source Files
  -> Population Parser
  -> Source Anchors
  -> Memory Distillation
  -> Persona Core
  -> Private Memory Activation
  -> Natural Conversation
  -> Traceable Analysis / Report
```

Layer responsibilities:

- `lib/population/parse.ts`: parses CSV, Excel, Word, and TXT into source anchors.
- `lib/population/persona-synthesis.ts`: distills source anchors into memory profiles, persona parameters, consumption habits, and language style.
- `lib/population/retrieval.ts`: activates relevant memory cues during conversation without forcing visible citations.
- `lib/persona/types.ts`: defines the shared persona, memory, evidence, and activated-memory domain model.
- `lib/persona/defaults.ts`: centralizes OCEAN, bias, and runtime defaults so every generation path stays consistent.
- `lib/engine/prompts.ts`: combines natural speech, human-like memory, biases, emotion, and conversation phase into agent prompts.
- `lib/engine/speaker-selector.ts`: selects the next speaker using speaking impulse, silence compensation, and tension.
- `lib/engine/state-updater.ts`: updates energy, silence, dissonance, and emotion after each turn.
- `lib/engine/reporter.ts`: turns the simulation trace into a readable Markdown report.

Why this architecture helps:

- **Faster persona production**: parsing, distillation, and persona generation can be cached or optimized independently.
- **Higher conversation quality**: prompts consume distilled memory rather than raw source dumps, reducing citation-speak and report-speak.
- **More natural simulation**: consumption habits, education level, social identity, and language register become internal variables.
- **Traceable without being stiff**: source anchors remain available in analysis, but they do not interrupt natural dialogue.
- **Reusable foundation**: roundtables, A/B tests, interviews, and public-opinion rehearsal can share the same persona/memory layer.
- **Replaceable infrastructure**: LLMs, embeddings, vector stores, and report generation can evolve without changing the core product model.

### Research Foundations

The persona design, speaking impulse, attitude shift, silence compensation, opinion convergence, and A/B choice logic are inspired by research across social simulation, psychology, persuasion, decision science, and LLM-based agent simulation.

| Research Area | How It Informs SynUsers.AI | Representative Work |
| --- | --- | --- |
| Agent-based social simulation | Treats social outcomes as emergent results of individual agent interactions | Epstein & Axtell, *Growing Artificial Societies* (1996) |
| Generative agents | Uses LLM-based agents with memory, reflection, and planning to simulate believable human behavior | Park et al., *Generative Agents* (2023) |
| LLM human simulation | Explores language models as simulated samples or experimental participants | Aher et al. (2023), Argyle et al. (2023) |
| Cognitive dissonance | Models tension between incoming claims and existing beliefs | Festinger, *A Theory of Cognitive Dissonance* (1957) |
| Opinion dynamics | Tracks convergence, fragmentation, and group-level opinion clusters | Hegselmann & Krause (2002) |
| Elaboration Likelihood Model | Distinguishes deeper argument processing from cue-driven persuasion | Petty & Cacioppo (1986) |
| Big Five / OCEAN | Shapes differentiated agents through personality traits | McCrae & John (1992) |
| Heuristics and biases | Explains non-perfectly-rational judgment under uncertainty | Tversky & Kahneman (1974) |
| Prospect theory | Models loss aversion, risk framing, and perceived value | Kahneman & Tversky (1979) |
| Theory of Planned Behavior | Connects attitude, norms, perceived control, and intention | Ajzen (1991) |
| Spiral of Silence | Explains why minority or low-extraversion agents may stay silent, and when they may re-enter | Noelle-Neumann (1974) |

### Features

- **AI group-chat simulation**: run live roundtable discussions around a topic.
- **Multi-source population import**: ingest CSV, Excel, Word, and text files as source anchors.
- **Memory-distilled persona generation**: turn source material into semantic memory, composite experiences, consumption habits, education/cognitive style, social identity, emotional triggers, language register, and decision heuristics.
- **Persona generation**: create diverse virtual users from a target audience, topic, source material, and model configuration.
- **Agent differentiation**: model background, personality, stance, communication style, knowledge domains, triggers, and biases.
- **Reusable persona layer**: apply the same virtual-user foundation to roundtables, A/B tests, interviews, public-opinion rehearsal, and more.
- **Group interaction tracking**: observe who wants to speak, who stays silent, where disagreement spikes, and whether the group converges.
- **A/B concept testing**: evaluate multiple concepts across audience segments and custom dimensions.
- **Forced-choice analysis**: simulate final user choices and rejection reasons across competing concepts.
- **Memory explanation and source traceability**: keep live conversation natural, while analysis views can show which internal memories shaped a message and which source anchors support them.
- **Research reports**: export simulation findings as Markdown.
- **Multi-model support**: works with OpenAI-compatible Chat Completions APIs and Gemini Vertex-style APIs.

### Good Fits

- Early product concept stress-testing before formal research.
- Comparing slogans, value propositions, landing-page claims, feature bundles, or pricing narratives.
- Exploring how different user groups may disagree on the same topic.
- Surfacing first reactions, objections, confusion, and adoption barriers.
- Generating stronger hypotheses for interviews, surveys, and usability tests.

### Not Designed For

- It should not be treated as real market data.
- It should not be treated as a transcript from real users.
- It does not replace statistically significant testing.
- It should not make high-risk business decisions without human review and real-world validation.

SynUsers.AI is a pre-research tool: it helps teams ask better questions earlier.

### Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand
- assistant-ui
- Recharts

### Getting Started

```bash
npm install
```

Create a `.env` file with your model provider settings:

```bash
LLM_API_KEY=your_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-5.4-2026-03-05

# Optional: Gemini mode
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://your-gemini-endpoint
GEMINI_MODEL=gemini-3-pro-preview
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
npm run start
```

### Workflow

1. Choose Roundtable Discussion or A/B Test from the home page.
2. Enter a target audience, discussion topic, or product concepts; optionally import CSV, Excel, Word, or text files.
3. Select the number of virtual users, simulation duration, and model.
4. Generate and review personas, internal memory systems, and source anchors.
5. Run the simulation and inspect live conversations, memory explanations, evaluation logs, and group interaction metrics.
6. Generate a report and copy or download it as Markdown.

### Main Pages

| Path | Purpose |
| --- | --- |
| `/` | Home configuration page for roundtable and A/B test workflows |
| `/personas` | Persona preview for roundtable simulation |
| `/chat` | Live roundtable simulation |
| `/report` | Markdown report for roundtable simulation |
| `/abtest/config` | A/B test concept and persona review |
| `/abtest/process` | Live A/B test evaluation log |
| `/abtest` | A/B test results |

### Project Structure

```text
app/                      Next.js App Router pages and API routes
components/               Page components and UI primitives
lib/persona/              Core persona, memory, source-anchor, and default-parameter models
lib/population/           File parsing, source anchors, memory distillation, and private retrieval
lib/engine/               Agent simulation, speaker selection, state updates, LLM, and reporting logic
lib/abtest-store.ts       A/B test state store
lib/simulation-store.ts   Roundtable simulation state store
public/                   Static assets
```

### Environment Variables

| Variable | Description |
| --- | --- |
| `LLM_API_KEY` | API key for the OpenAI-compatible endpoint |
| `LLM_API_URL` | Chat Completions endpoint, defaults to `https://api.openai.com/v1/chat/completions` |
| `LLM_MODEL` | OpenAI-compatible model name, defaults to `gpt-5.4-2026-03-05` |
| `GEMINI_API_KEY` | API key for Gemini mode; falls back to `LLM_API_KEY` when unset |
| `GEMINI_API_URL` | Base URL for the Gemini Vertex-style endpoint |
| `GEMINI_MODEL` | Gemini model name, defaults to `gemini-3-pro-preview` |

### References

- Epstein, J. M., & Axtell, R. (1996). *Growing Artificial Societies: Social Science from the Bottom Up*. MIT Press. https://mitpress.mit.edu/9780262050531/growing-artificial-societies/
- Park, J. S., O'Brien, J., Cai, C. J., Morris, M. R., Liang, P., & Bernstein, M. S. (2023). *Generative Agents: Interactive Simulacra of Human Behavior*. UIST 2023. https://doi.org/10.1145/3586183.3606763
- Aher, G. V., Arriaga, R. I., & Kalai, A. T. (2023). *Using Large Language Models to Simulate Multiple Humans and Replicate Human Subject Studies*. ICML 2023. https://proceedings.mlr.press/v202/aher23a.html
- Argyle, L. P., Busby, E. C., Fulda, N., Gubler, J. R., Rytting, C., & Wingate, D. (2023). *Out of One, Many: Using Language Models to Simulate Human Samples*. Political Analysis. https://www.cambridge.org/core/product/identifier/S1047198723000025/type/journal_article
- Lewis, P., Perez, E., Piktus, A., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. NeurIPS 2020. https://arxiv.org/abs/2005.11401
- Braun, V., & Clarke, V. (2006). *Using Thematic Analysis in Psychology*. Qualitative Research in Psychology. https://doi.org/10.1191/1478088706qp063oa
- Salminen, J., Jansen, B. J., Jung, S.-G., et al. (2022). *Data-Driven Personas*. Springer. https://link.springer.com/book/10.1007/978-3-031-02231-9
- Festinger, L. (1957). *A Theory of Cognitive Dissonance*. Stanford University Press. https://psycnet.apa.org/record/1993-97948-000
- Hegselmann, R., & Krause, U. (2002). *Opinion Dynamics and Bounded Confidence: Models, Analysis and Simulation*. Journal of Artificial Societies and Social Simulation. https://www.jasss.org/5/3/2.html
- Petty, R. E., & Cacioppo, J. T. (1986). *The Elaboration Likelihood Model of Persuasion*. Advances in Experimental Social Psychology. https://doi.org/10.1016/S0065-2601(08)60214-2
- McCrae, R. R., & John, O. P. (1992). *An Introduction to the Five-Factor Model and Its Applications*. Journal of Personality. https://doi.org/10.1111/j.1467-6494.1992.tb00970.x
- Tversky, A., & Kahneman, D. (1974). *Judgment under Uncertainty: Heuristics and Biases*. Science. https://doi.org/10.1126/science.185.4157.1124
- Kahneman, D., & Tversky, A. (1979). *Prospect Theory: An Analysis of Decision under Risk*. Econometrica. https://www.econometricsociety.org/publications/econometrica/browse/1979/03/01/prospect-theory-analysis-decision-under-risk
- Ajzen, I. (1991). *The Theory of Planned Behavior*. Organizational Behavior and Human Decision Processes. https://doi.org/10.1016/0749-5978(91)90020-T
- Noelle-Neumann, E. (1974). *The Spiral of Silence: A Theory of Public Opinion*. Journal of Communication. https://doi.org/10.1111/j.1460-2466.1974.tb00367.x

### Notes

- Authentication and user permissions are not built in.
- Most page state is kept in browser memory, so refreshing may clear the active simulation.
- `.env` is ignored by Git. Do not commit real API keys.
- The User Interview mode is currently a placeholder in the UI.
- Simulation outputs are exploratory and theory-inspired, not empirical proof.
