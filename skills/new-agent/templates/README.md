# /new-agent Templates

Starting-point scaffolds for generated agent SKILL.md files. Each template contains `{{PLACEHOLDER}}` markers substituted by the `/new-agent` wizard at generation time.

## Template Roster

| # | File | Use for |
|---|------|---------|
| 01 | research-agent.md | Web search + synthesize + citation-backed report |
| 02 | code-review-agent.md | Code analysis + MUST-FIX/SHOULD-FIX classification + merge gate |
| 03 | data-analysis-agent.md | Read files + compute statistics + optional chart |
| 04 | content-agent.md | Write / edit / format with tone and length control |
| 05 | workflow-agent.md | Multi-step automation with checkpoints + stop-on-failure |
| 06 | domain-expert-agent.md | Q&A grounded in a defined knowledge source |
| 07 | config-synthesizer-agent.md | Scan project → detect stack → generate config/artifact file |

## Placeholders Reference

| Placeholder | Source |
|-------------|--------|
| `{{AGENT_NAME}}` | Q1 slug |
| `{{AGENT_DESCRIPTION}}` | Q2 description |
| `{{TRIGGER}}` | Q1 slug (trigger defaults to /<slug>) |
| `{{DATE}}` | generation date YYYY-MM-DD |
| `{{TOOLS_LIST}}` | Q8 tool selections (expanded names) |
| `{{TAGS}}` | Q6 tags (comma-separated) |
| `{{CATEGORY}}` | Q5 category (custom skeleton; also overrides the template default) |
| `{{ARCHITECTURE}}` | Q4 architecture type (solo/lead/subagent/team) |

## Rules

1. **Templates are orientation, not constraints.** The wizard generates an agent SKILL.md from a template — then the human can add, remove, or modify steps freely in the generated file. The template itself is not changed.
2. **Templates are append-only.** New templates are added when a build requires a pattern not covered by existing templates. Existing templates are only modified after an explicit post-build review and user confirmation.
3. **No unresolved placeholders in generated files.** After generation, grep for `{{` in the output. Any hit is a bug.
4. **Template 06 requires manual customization.** The `[TODO: specify your knowledge source]` in Step 1 must be filled in before the domain-expert template is useful. The wizard warns when template 06 is selected.

## Adding a New Template

When a build requires a pattern not covered by the 8 existing templates:
1. Complete the build first (generate the agent SKILL.md with a custom structure)
2. Run the post-build learning loop
3. If the pattern is reusable: extract it into a new `NN-<archetype>-agent.md` file here
4. Use the same structure: YAML frontmatter with `{{PLACEHOLDERS}}`, Steps section, Guardrails section, TEMPLATE-CUSTOMIZATION-NOTES comment at the bottom
5. Register the new template in this README
