---
name: new-agent
description: "Interaktiver Wizard für einen neuen Claude-Code-Agent-Skill: Intake, Architektur, SKILL.md, Registrierung, Smoke-Test. Trigger: /new-agent"
trigger: /new-agent
category: meta
tags: [agent-builder, wizard, scaffold, meta]
architecture: solo
---
# /new-agent

Build a new Claude Code agent skill from scratch. This wizard takes you through a structured intake, architecture brainstorming (for multi-agent setups), template selection, generation, registration, and a post-build learning review.

> **Plan → Discuss → Execute.** The wizard collects all inputs first, shows the complete generated SKILL.md, waits for human confirmation, then writes. Nothing is written before the human confirms.

> **Templates are orientation, not constraints.** The generated SKILL.md is your starting point. You can freely add, remove, or modify steps after generation. The templates themselves are not changed mid-build — only via the post-build learning loop.

> **95% rule.** Ambiguous intake answer → ask before generating. A vague spec produces a vague agent.

---

## Step 0 — Pre-flight checks

Before starting the intake, run these checks silently:

**a) Skill count check:**
Count the skill lines — lines starting with ``- `/`` — across all `~/.claude/skills-*.md` files (currently skills-core.md, skills-coding.md, skills-agents.md — plus any others matching the pattern). Each file has one `# heading` for its category, so do not count headings. Sum = current registered **global** skill count. Project-local skills live in `<project>/.claude/skills/` and do **not** count against this global limit.
If count ≥ 19: warn "⚠️ You currently have [N] registered skills (limit: 20). Adding this skill will leave room for only [20-N] more. Consider whether to proceed."
If count ≥ 20: "❌ Skill limit reached (20/20). You must remove a skill from one of the ~/.claude/skills-*.md files before adding a new one." — stop here.

**b) Registry check:**
Verify `~/.claude/skills/REGISTRY.md` exists. If not, create it with the structure from `~/.claude/skills/new-agent/templates/README.md`.

---

## Step 1 — Intake (9 questions, one grouped message)

Send all questions in a **single message** — no drip-feeding:

```
I'll help you build a new agent skill. Please answer these 9 questions:

1. **Slug** (lowercase, hyphens only, no spaces)
   e.g. pr-summarizer, trading-analyst, invoice-parser

2. **One-sentence description** (this is the routing signal Claude uses to pick the agent)
   Start with a verb; say *what* it does and *when* it applies. For an always-on
   gate/check that should fire without being asked, add "use PROACTIVELY" / "MUST BE USED".
   e.g. "Reads a GitHub PR diff and writes a structured summary"

3. **Scope**
   G = Global   (available in all projects — stored in ~/.claude/skills/)
   P = Project  (this project only — stored in <project>/.claude/skills/)

   Note: Project-local skills live in <project>/.claude/skills/. The harness
   auto-lists them when you're working in that project, and they're invocable via
   the Skill tool there (directory-scoped). No global router or CLAUDE.md entry is
   needed. (Decided 2026-07-04 — see agent-knowledge/workflow/skills.md.)

4. **Architecture type**
   A = Solo    (independent, does everything itself)
   B = Lead    (orchestrates 2–5 subagents)
   C = Subagent (called by a lead agent, specialized)
   D = Team    (scaffold lead + all subagents at once)

   Not sure? Write your best guess — Step 3 will always discuss and confirm the right fit.

5. **Category** (pick one, or `?` to suggest):
   coding / research / content / data / finance / trading / workflow / domain / meta

6. **Tags** (comma-separated, 2–5 keywords, or `?` to suggest)
   e.g. github, review, diff, pull-request

7. **Template** (pick one):
   1 = Research       (search → synthesize → cited report)
   2 = Code-review    (read code → classify → merge gate)
   3 = Data-analysis  (read data → compute → visualize)
   4 = Content        (brief → outline → draft → deliver)
   5 = Workflow       (map → execute+checkpoints → verify)
   6 = Domain-expert  (load KB → understand → cite-grounded answer)
   7 = Config-synthesizer (scan project → detect stack → generate config/artifact file)
   new = No template fits → build custom, new template after build

8. **Tools needed** (letters, all that apply, or `?` for template defaults):
   W = WebSearch/WebFetch
   F = File read (Read/Glob/Grep)
   E = File write/edit (Write/Edit)
   B = Bash/PowerShell execution
   V = Visual output (show_widget)
   A = Spawn subagents (Agent tool)
   N = None beyond context reading

9. **Smoke test?** (yes / no)
   If yes: describe the test scenario in one sentence.
```

Wait for the human's answers before proceeding.

**Handling `?` answers:**
- Q5 (Category) = `?`: infer from Q2 description keywords (coding-related → coding, market/trading → trading, etc.). State: "Category → [inferred] — correct?"
- Q6 (Tags) = `?`: generate 3–5 tags from Q1 slug + Q2 description. State them and ask "Correct?"
- Q8 (Tools) = `?` or omitted: apply template defaults from the table in Step 4. State: "Tools → [defaults] based on Template [N] — add W / V / A?"

Always confirm inferred answers inline before proceeding — never silently adopt them.

---

## Step 2 — Collision check

After receiving the answers:

Read all `~/.claude/skills-*.md` files and search for the proposed slug from Q1 and the trigger from Q1 (which defaults to `/<slug>`). `~/.claude/CLAUDE.md` itself holds only the `@`-imports of these files, so searching it finds nothing.

Also scan `~/.claude/skills/REGISTRY.md` for the slug.

If a collision is found: "⚠️ The trigger `/<slug>` is already registered (skill: [existing skill name]). Please choose a different slug." — wait for a new slug before continuing.

**Near-collision check:**
After the exact check, scan REGISTRY.md entries for:
- Slugs that differ by ≤ 2 characters from the proposed slug (e.g. `github-action-builder` vs `github-actions-builder`)
- Slugs sharing the same first word (e.g. both start with `github-`)
- Descriptions with the same core verb + domain as Q2

If a near-match is found: "⚠️ Similar agent already exists: /[slug] — [description]. Is this intentional (global version, variant, replacement)? Or a different use case?" Wait for clarification before continuing.

If no collision or near-match: proceed.

---

## Step 3 — Architecture discussion (all builds)

**Always run this step.** Architecture affects the entire generated output — confirm it before generating.

**Governance profile (all builds).** Before the architecture rationale, assign the agent to one governance profile and state it — this determines which rules apply (see `~/.claude/agent-knowledge/workflow/governance.md`):
- **coding** — changes a code repo; stateful, runs under Tier × 5-phase, `code-reviewer` gates every merge. (Q5: coding / data)
- **research** — read-only analysis, fan-out → synthesis, stateless. (Q5: research / finance / trading)
- **meta** — a workflow/lifecycle slash-command (entry layer); when it invokes a coding/research agent, that agent's rules apply. (Q5: meta / workflow)

Write: "**Profile:** [coding/research/meta] — [1-line why]. Confirm?" An agent that fits none is a signal to stop, not to invent a third profile.

**Determinism check.** If the agent will combine **hard signals** (numbers, counts,
thresholds) into a **categorical verdict** — scoring, ranking, filtering, valuation, table math —
flag it: that mechanical part belongs in a **deterministic signal** (a tool/script, or a fixed
rule the agent applies), with the LLM only *interpreting* the signal, never doing the arithmetic.
Purely qualitative judgment stays with the LLM; don't hard-code a verdict that needs nuance.
State: "**Determinism:** [no hard-signal math / candidate: <what should be deterministic>] —
confirm?" (See `~/.claude/agent-knowledge/workflow/governance.md` § Determinism.)

**A (Solo) or C (Subagent):**
Give a 1–2 sentence rationale for why this type fits the described use case.
Consider: Are the tasks sequential or parallel? Does the agent use a single toolset? Would delegating to subagents add real value, or just complexity?

Write: "**Architecture check:** [Solo/Subagent] fits here because [reason]. Confirm, or explain why Lead/Team might be a better fit?"

Wait for confirmation. If the user wants to switch: update Q4 and continue with the new type.

**Model recommendation:**
Once architecture is confirmed, make a concrete model recommendation based on the agent's task scope:

- **haiku** — narrow, single-topic tasks: structured extraction, short fixed-format output, simple lookups. Fast and cheap.
- **sonnet** — general agents: research, code review, content, synthesis, multi-step workflows. Best quality/cost balance. **Default for most agents.**
- **opus** — complex reasoning: nuanced judgment, architecture decisions, multi-dimensional analysis where correctness matters more than cost.
- **fable** — the most capable model; use when the best-possible reasoning is required.

State: "**Model recommendation:** I suggest **[model]** because [1-sentence reason tied to this agent's specific task]. Options: haiku / sonnet / opus / fable. Confirm or specify a different model?"

Wait for model confirmation. Capture the chosen shortname as `{{MODEL}}`.

**B (Lead) or D (Team):** Full team design brainstorm first.

Send this brainstorming prompt in one message:

```
For a [Lead/Team] agent, we need to design the team structure before generating. 
Please answer:

1. What are the 3–5 distinct sub-tasks that the lead should delegate?
   (Each sub-task will become a separate subagent)

2. Which sub-tasks can run in parallel? Which must run sequentially?

3. What does each subagent receive as input from the lead?
   (Each subagent gets a self-contained prompt — no access to the lead's conversation)

4. What does each subagent return to the lead?
   (Format: structured text, JSON, a file path, a decision, etc.)

5. What are the failure cases?
   (What happens if a subagent produces bad output?)
```

After receiving answers, write a **Team Blueprint**:

```
TEAM BLUEPRINT: <team-name>
─────────────────────────────
Lead: <slug>-lead
  Role: [what the lead does]
  
Subagents:
  <slug>-<role1>: [input] → [output]
  <slug>-<role2>: [input] → [output]
  ...

Execution flow: [parallel / sequential / mixed]
Failure handling: [describe]

Model recommendation:
  Lead: sonnet — synthesis and judgment across all subagent results
  <slug>-<role1>: haiku — focused, bounded task (adjust to sonnet if complex multi-source synthesis needed)
  <slug>-<role2>: haiku — focused, bounded task
  ...
```

Show the blueprint and ask: "Does this team structure and model selection capture your intent? Confirm to proceed, or describe adjustments (structure or model choices)."

Capture confirmed model choices: lead model → `{{MODEL}}`, subagent models noted in the blueprint.

**Wait for explicit confirmation before generating any SKILL.md files.**

---

## Step 4 — Load template and build substitution map

Read the template file based on Q7:
- 1 → `~/.claude/skills/new-agent/templates/01-research-agent.md`
- 2 → `~/.claude/skills/new-agent/templates/02-code-review-agent.md`
- 3 → `~/.claude/skills/new-agent/templates/03-data-analysis-agent.md`
- 4 → `~/.claude/skills/new-agent/templates/04-content-agent.md`
- 5 → `~/.claude/skills/new-agent/templates/05-workflow-agent.md`
- 6 → `~/.claude/skills/new-agent/templates/06-domain-expert-agent.md`
- 7 → `~/.claude/skills/new-agent/templates/07-config-synthesizer-agent.md`
- new → use the minimal custom skeleton below

**Tool defaults by template** (used when Q8 = `?`):

| Template | Default tools | Optional additions |
|----------|--------------|-------------------|
| 1 Research | W, F | E (if report written to file) |
| 2 Code-review | F | E (auto-fix mode) |
| 3 Data-analysis | F, B | V (charts), E (output file) |
| 4 Content | F | E (if output written to file) |
| 5 Workflow | F, E, B | W (if web lookups needed) |
| 6 Domain-expert | F | W (if KB is web-based) |
| 7 Config-synthesizer | F, E, B | W (version/docs lookups) |

**Substitution map:**

| Placeholder | Value |
|-------------|-------|
| `{{AGENT_NAME}}` | Q1 slug |
| `{{AGENT_DESCRIPTION}}` | Q2 description |
| `{{TRIGGER}}` | Q1 slug (or override if Q1 provides one) |
| `{{DATE}}` | today's date YYYY-MM-DD |
| `{{TOOLS_LIST}}` | Q8 letters expanded: W→WebSearch/WebFetch, F→Read/Glob/Grep, E→Write/Edit, B→Bash, V→show_widget, A→Agent |
| `{{TAGS}}` | Q6 tags comma-separated |
| `{{ARCHITECTURE}}` | Q4: A→solo, B→lead, C→subagent, D→team |
| `{{CATEGORY}}` | Q5 category (used by the custom skeleton) |
| `{{ROLE}}` | persona derived from template (see role-defaults table below) |
| `{{MODEL}}` | model shortname confirmed in Step 3 — haiku / sonnet / opus / fable (see model-defaults table below) |

**Description quality (routing signal).** `{{AGENT_DESCRIPTION}}` is what Claude reads to
auto-select this agent — make it earn that: action-oriented (verb-first), naming *what* + *when*.
For an agent that should fire without being asked (a gate, an always-run check), include
"use PROACTIVELY" or "MUST BE USED". Vague or purely-noun descriptions route unreliably.
(Track 0 routing lever.)

**Role defaults by template:**

| Template | Default `{{ROLE}}` |
|----------|--------------------|
| 1 Research | `senior research analyst` |
| 2 Code-review | `senior software engineer specializing in code review` |
| 3 Data-analysis | `senior data analyst` |
| 4 Content | `senior content strategist` |
| 5 Workflow | `senior workflow automation engineer` |
| 6 Domain-expert | infer from Q2 — extract domain noun, e.g. "answers German tax questions" → `senior German tax advisor`; "answers Bundesliga rules questions" → `Bundesliga rules expert`. State the inferred role and confirm with the user before generating. |
| 7 Config-synthesizer | `senior DevOps engineer` |
| custom | infer from Q2 — extract expertise domain, e.g. `senior [domain] specialist`. State and confirm. |

**Model defaults by template:**

| Template | Default `{{MODEL}}` | Reason |
|----------|---------------------|--------|
| 1 Research | `sonnet` | Multi-source synthesis requires balanced reasoning |
| 2 Code-review | `sonnet` | Complex pattern analysis across code dimensions |
| 3 Data-analysis | `sonnet` | Computation + nuanced interpretation of results |
| 4 Content | `sonnet` | Quality writing benefits from balanced reasoning |
| 5 Workflow | `sonnet` | Multi-step orchestration with judgment calls |
| 6 Domain-expert | `sonnet` | Accurate knowledge retrieval and citation |
| 7 Config-synthesizer | `sonnet` | Stack detection + structured artifact generation |

**Category override:** Templates 1–7 hard-code a `category:` matching their archetype.
Set the generated file's `category:` field to the Q5 value, overriding the template
default when they differ. Q5 is authoritative — it must match the REGISTRY.md entry.

**Minimal custom skeleton (when Q7 = "new"):**

```markdown
---
name: {{AGENT_NAME}}
description: "{{AGENT_DESCRIPTION}}. Trigger: /{{TRIGGER}}"
trigger: /{{TRIGGER}}
category: {{CATEGORY}}
tags: [{{TAGS}}]
architecture: {{ARCHITECTURE}}
model: {{MODEL}}
---
# /{{TRIGGER}}

<!-- TEMPLATE: Custom | Generated: {{DATE}} -->
<!-- Tools used: {{TOOLS_LIST}} -->

You are a **{{ROLE}}**. {{AGENT_DESCRIPTION}}

## When to use

[TODO: describe the trigger condition]

## Inputs

- [TODO: list required inputs]

## Steps

### Step 1 — [TODO: first step name]

[TODO: describe what this step does]

### Step 2 — [TODO: next step]

[TODO: describe]

## Guardrails

- [TODO: add safety and quality constraints]

<!-- TEMPLATE-CUSTOMIZATION-NOTES:
  This agent was built with a custom structure (no matching template existed).
  After testing, consider extracting the pattern into a new template if it is reusable.
-->
```

**For Lead agents:** Generate one SKILL.md per agent (lead + each subagent). Substitute the team blueprint from Step 3 into the lead's Steps section to build the delegation logic.

**Lead delegation pattern in Steps:**
```markdown
### Step N — Delegate to <role>

Invoke the <slug>-<role> subagent:

Agent(
  subagent_type: "<slug>-<role>",
  model: "[subagent model from Step 3 blueprint — default: haiku for focused tasks]",
  prompt: "You are the <role> agent for [team name]. Your task: [specific task]. Input: [what to pass]. Return: [expected output format]."
)

Wait for the subagent result. If the result is empty or malformed: [describe error handling].
```

**Special warning for template 06:** If Q7 = 6, add this notice to the top of the rendered SKILL.md (below the frontmatter):

```
> ⚠️ **Customization required:** Step 1 contains a `[TODO: specify your knowledge source]`
> placeholder. This agent will not work correctly until Step 1 is filled in with your
> actual domain knowledge source. See the TEMPLATE-CUSTOMIZATION-NOTES at the bottom
> for options.
```

---

## Step 5 — Show rendered SKILL.md and confirm

Print the full rendered SKILL.md content (for each agent in a team, print each one in sequence).

Then ask: "This is the complete SKILL.md that will be written to `~/.claude/skills/<slug>/SKILL.md`. Confirm to write (yes), or describe adjustments."

**Do not write any files until the human confirms.**

If the human requests adjustments: apply them and show the revised version again. Repeat until confirmed.

---

## Step 6 — Write the skill file(s)

Determine the target directory based on Q3 (Scope):

- **G (Global):** `~/.claude/skills/<slug>/` (e.g. `C:\Users\<user>\.claude\skills\<slug>\`)
- **P (Project):** `<current-project-root>/.claude/skills/<slug>/`
  Determine the project root from the active working directory (the project's CLAUDE.md location).

For each SKILL.md to write:

**a)** Create the directory:
Use PowerShell: `New-Item -ItemType Directory -Force "<target-path>"`

**b)** Write the file using the Write tool.

**c)** Placeholder check: Search the written file content for `{{`. 
If any `{{` is found: "❌ Unresolved placeholder found: [list them]. This is a generation bug — fixing before proceeding." — fix and rewrite.

**d)** Confirm: "✅ Written: `<target-path>/SKILL.md`"

---

## Step 7 — Register in the category file

Registration target depends on Q3 (Scope):

**G (Global):** Append to the appropriate category file based on Q5, NOT to `~/.claude/CLAUDE.md` directly.

**Category → file routing:**
| Q5 category | Target file |
|-------------|-------------|
| meta, workflow | `~/.claude/skills-core.md` |
| coding, research, data, content, domain | `~/.claude/skills-coding.md` |
| trading, finance | `~/.claude/skills-agents.md` |

> **Project-specific skills are Q3 = P (Project-local), not a global category.** They go in
> `<project>/.claude/skills/` and need no registration (see the P section below) — the
> harness auto-lists them in-project. **Never** create a global
> `skills-<project>.md` router. (Decided 2026-07-04.)

Format to append — one line under the file's single `# …-Skills (Slash-Command-Dispatch)` heading,
matching the existing lines (the heading's dispatch sentence already says "invoke the Skill tool"):
```
- `/<slug>` — <short description, one line, in the file's language>
```
Do not add a `# <slug>` heading or an invocation line per skill — the files dropped that form on
2026-07-04 to keep the eagerly loaded text short.

**P (Project-local):** No CLAUDE.md registration and no router file are needed — the
harness **auto-lists** any skill under `<project>/.claude/skills/` when you're working in
that project, and it's invocable via the Skill tool there (directory-scoped name). Just
confirm the file landed at `<project>/.claude/skills/<slug>/SKILL.md` (Step 6). The global
catalog entry in `REGISTRY.md` (Step 8), flagged `⚑ project-local`, is the only index that
gets updated. **Never** create a global `skills-<project>.md` router. (Decided 2026-07-04 —
see `agent-knowledge/workflow/skills.md`.)

**Critical (Global registration):** Read the last 5 lines of the target file before appending. If the file does not end with a newline, prepend a newline to the appended line.

After appending, verify by reading back the last 10 lines and confirming the new line appears correctly.

For Lead/Team builds: register the lead agent AND all subagents, each as its own line.
Before registering, re-check the skill count from Step 0 — a team adds `1 + N` skills (lead +
subagents), not 1. If the total would exceed 20, warn and stop before appending any block.

---

## Step 8 — Update REGISTRY.md

Open `~/.claude/skills/REGISTRY.md` and add a new line under the correct category section:

- **G (Global):** `- [/<slug>](/<slug>) — <description> | <architecture-type>`
- **P (Project-local):** `- [/<slug>](/<slug>) — <description> | <architecture-type> | ⚑ project-local: <project-name>`

If the category section doesn't exist yet, add it as a new `## <category>` section before the `## System skills` section.

**For Lead/Team builds:** add a line for the lead **and** one for each subagent (mirroring
the multi-block registration in Step 7). Subagents use `| subagent`; the lead uses `| lead`.
A team that registers only the lead leaves its subagents undiscoverable in the registry.

---

## Step 9 — Optional smoke test

**Only if Q9 was "yes".**

Print: "Running smoke test: [Q9 scenario]"

Invoke the newly created skill:
- **Global (Q3 = G):** use `Skill(skill: "<slug>")` with the Q9 scenario as the effective user context.
- **Project-local (Q3 = P):** the harness auto-lists the skill in this project, so invoke it via `Skill(skill: "<slug>")` (directory-scoped) with the Q9 scenario — exactly as Claude would when the trigger is typed here. If it isn't listed yet (e.g. the project index hasn't refreshed), fall back to reading `.claude/skills/<slug>/SKILL.md` and following its Steps inline.

Observe the output. Evaluate:
- Did the skill follow its Steps? (structure check)
- Did the skill produce a coherent output? (content check)
- Any errors or unexpected behavior? (error check)
- If template 06: is the `[TODO]` still unresolved? (warn)

**Lead/Team builds:** a full lead smoke test spawns every subagent for real (slow, and it
fails confusingly if any subagent file is missing). Prefer smoke-testing each subagent
standalone first; only run the full lead once all subagent files exist and pass individually.

Report: **PASS** / **FAIL** with one-sentence reason.

If FAIL: "The smoke test failed because [reason]. Suggested fixes: [list]. Shall I revise the SKILL.md?"

---

## Step 10 — Post-build learning loop

Ask:

```
🔄 Post-build review: Did this build produce anything worth capturing?

  1 — Yes, new knowledge for agent-builder.md 
      (a technique, pattern, or lesson not currently documented)
  2 — Yes, an existing template should be updated
      (a step, guardrail, or note that would help future builds)
  3 — Yes, this build's structure deserves a new template
      (the pattern is reusable and no existing template covers it)
  4 — No, nothing new this time

(You can select multiple: e.g. "1 and 2")
```

**For 1:** Ask what specifically should be added. Draft the addition, show it, wait for confirmation, then append to `~/.claude/agent-knowledge/agent-builder.md`.

**For 2:** Ask which template and what change. Show the current section and the proposed change side by side. Wait for confirmation, then Edit the template file.

**For 3:** Ask for the new template's name and structure. Use the same scaffold as existing templates (YAML frontmatter + Steps + Guardrails + TEMPLATE-CUSTOMIZATION-NOTES). Write the new template to `~/.claude/skills/new-agent/templates/NN-<archetype>-agent.md` and register it in `~/.claude/skills/new-agent/templates/README.md`.

**For 4:** Skip to Step 11.

---

## Step 11 — Summary

```
✅ Agent built successfully
───────────────────────────────────────────
Trigger:       /<slug>
Scope:         <Global / Project-local: <project-name>>
SKILL.md:      <~/.claude/skills/<slug>/SKILL.md  OR  .claude/skills/<slug>/SKILL.md>
Category:      <category>
Architecture:  <type>
Template:      <template used>
Tools:         <tool list>
Registered:    <skills-<domain>.md router [Global]  |  none — harness auto-lists [Project-local]> ✓
               ~/.claude/skills/REGISTRY.md ✓
Smoke test:    <PASS / FAIL / skipped>
Post-build:    <what was captured / "nothing new">
───────────────────────────────────────────
NEXT STEPS:
→ Use it: type /<slug> in any session  [Global]
  OR: type /<slug> in this project only  [Project-local]
→ Note (project-local): auto-listed by the harness in this project — invocable via the Skill tool there (no CLAUDE.md entry needed)
→ Refine: edit <SKILL.md path> to tune behavior
→ For domain-expert agents: fill in the [TODO] knowledge source in Step 1
→ Team agents: test each subagent independently before the full lead run
```

---

## Guardrails

- **Never write before human confirms.** Show full preview in Step 5, wait for explicit "yes".
- **Never register before file exists.** SKILL.md written + placeholder-checked → then the category-file append.
- **Collision check is mandatory.** Always run Step 2 before accepting a slug.
- **No `{{` in final generated files.** Any unresolved placeholder = generation bug = fix before declaring done.
- **Match the category file's format exactly.** One line per skill under the file's heading; read an existing line before appending.
- **Templates = orientation.** Deviations from the template go into the generated file, not the template itself.
- **Architecture: always discuss in Step 3.** Solo/Subagent → confirm rationale. Lead/Team → full blueprint before generating.
- **No secrets in SKILL.md.** Skills are global files — no API keys, tokens, passwords, or PII.
- **Least-privilege tools.** Grant only the Q8 tools the task needs; read-only (F) is the default; `Write/Edit` (E) and `Bash` (B) require a task reason. Never `*`. **Scope:** a *skill* records its tools in a comment and runs with the full session toolset — so for skills this is a **convention** (documents intent), mechanically enforceable only when the agent is a tool-scoped `.claude/agents/` subagent def. Keep the selection honest either way. (See `~/.claude/agent-knowledge/workflow/governance.md` § Tool least-privilege.)
- **Determinism.** Flag hard-signal math (scoring / ranking / filtering / table-building) for a deterministic tool or rule; the LLM interprets the signal, it doesn't compute it — and don't hard-code a verdict that needs nuance. (`workflow/governance.md` § Determinism.)
- **Shell context:** Creating directories and writing files during wizard execution = PowerShell (Windows). Bash command examples inside generated SKILL.md files = bash syntax (they run in Claude Code's hook runner).
