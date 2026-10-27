# Evidence-Based Resume Screening

给 AI Agent 用的简历评估 Skill。它把简历上每条核心成果落到可查的公开记录上：研究岗查论文作者列表，工程岗查代码仓和合并记录，设计岗查作品出处，产品、数据与业务岗查成果口径。然后按统一的评分表逐人打分、分档，每个分数都挂一条原文或核验证据。

An agent skill for evidence-based resume screening: verify each claimed achievement against public records, score with a shared rubric plus a role pack, and output a ranked shortlist with the evidence behind every score.

## 1 快速开始

### 1.1 Claude Code

```bash
git clone https://github.com/Mike-7777777/evidence-based-resume-screening.git ~/.claude/skills/evidence-based-resume-screening
```

在 Claude Code 里说：

```text
用 evidence-based-resume-screening 评估 ~/resumes 里的简历。岗位：后端工程师，全职；公司：50 人创业公司，北京。
```

### 1.2 其他 Agent

把整个目录交给 Agent，让它先读 `SKILL.md`，再按里面的步骤做。Agent 需要能读本地文件、能联网搜索；能看 PDF 页面图像更好，用于扫描件和版面判断。

## 2 产出

在你指定的工作目录里：

- `candidates/<id>.md`：每人一份分析，含概况、逐维度评分与证据、成果核验表、注水与折算、优势与短板、风险、接 offer 风险
- `candidates/<id>.json`：同一份结论的结构化数据
- `summary.md`：一行一人的汇总表，按分档、接 offer 风险、核心分排序

分档有六档：强推、可聊、存疑、信息不足、偏弱、不匹配。分档是排序建议，约不约面由人决定。

产出可以用自带脚本自查（需要 Node 18+，无依赖）：字段齐全、分数在 0-3 或 null、核验计数对得上、分档与规则一致、汇总表列全了每个人。

```bash
node scripts/check_screening_outputs.js <工作目录>
```

## 3 评分怎么来

- 通用内核 [rubric.md](rubric.md)：所有岗位共用的阶段与培养类型、12 个通用维度、分档规则、接 offer 风险、核验原则、注水识别、公平性边界
- 岗位包：[研究](role-research.md)、[工程](role-engineering.md)、[产品](role-product.md)、[设计](role-design.md)、[数据分析](role-data.md)、[业务](role-business.md)。每个包定义这类岗位的维度锚点、证据去哪查、这一行常见的注水写法
- 没有合适的岗位包时（律师、医生、教师等），Agent 按 [role-template.md](role-template.md) 读 JD 现场生成一个

几条贯穿全部规则的原则：

- 查不到就采信简历，只有查到的反证才改变分数
- 简历没说的维度填 null，说了而且是负面证据才打 0
- 姓名、性别、年龄、照片、民族、籍贯、婚育、宗教不进入任何分数

## 4 隐私

简历和评估结果含候选人个人信息。工作目录不要放进代码仓库，也不要上传到与核验无关的服务。核验只查与简历内容直接相关的学术与职业记录，不搜候选人的社交媒体和私人生活。

## 5 License

[MIT](LICENSE)
