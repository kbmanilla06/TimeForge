# Prompt 05 - Validate Sprint

Use this when Claude Code says the sprint is implemented:

```text
Run all relevant validation commands for the current sprint.

Check:
- install errors
- build errors
- test failures
- architecture consistency
- Laravel best practices
- React TypeScript best practices
- security risks
- performance risks
- unapproved business logic
- unresolved requirements that were guessed instead of clarified

Return PASS or FAIL.

If FAIL, list:
- problem
- severity
- explanation
- recommended fix

Then fix the issues and rerun validation.
```

