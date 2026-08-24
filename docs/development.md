# Development Guidelines

## General Principles
1. **Simplicity First**: Implement the simplest clean solution. Avoid over-engineering.
2. **Small Functions**: Single responsibility.
3. **Strictness**: Avoid `any` in backend TS. Use Zod for runtime validation.

## Module Development Flow
When adding a new feature, work in the following order:
1. **Database**: Update schema in Supabase.
2. **Backend**: Add module (`routes`, `controller`, `service`, `schema`).
3. **Frontend**: Add types, API hooks, and UI components.

## Commits
Use semantic commit messages:
`feat: add study session tracking`
`fix: prevent unauthorized file access`
