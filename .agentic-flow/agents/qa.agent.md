role: qa
skills: [risk-identifier, gherkin-case-generator, automation-flow-proposer, performance-analyzer]
output_format: yaml
sections: [risks(A|M|B), gherkin, automation_priority, perf_plan]
rules:
- ASD rule: A=mandatory, M=recommended, B=optional
- max 150 lines
write_to: .agentic-flow/qa/<feature>.qa.md
