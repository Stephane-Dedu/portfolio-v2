# Blog post ideas

Posts to write about my work at WTTJ. The team has approved all of them. Each one gets a French and an English version, like the other posts in `src/content/blog/`.

## 1. Migrating Dependency-Track v4 to v5 on AWS, with both running in parallel

Possible angles:

- Why run them side by side instead of upgrading in place
- How BOM uploads reached both versions
- How the results were compared
- The switch to v5 and shutting down v4

## 2. Terragrunt: where it fits, pros and cons

Possible angles:

- How it sits on top of plain Terraform
- What it fixed: shared config, remote state, dependencies between stacks
- What it costs: complexity, onboarding, debugging

## 3. How FinOps was brought into WTTJ

Possible angles:

- Where we started
- Tooling
- Tagging and cost allocation
- Who owns the numbers
- Results

## Before publishing

- Remove internal-only details: real costs, account IDs, internal hostnames.
