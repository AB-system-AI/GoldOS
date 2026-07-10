# Contributing to GoldOS

Thank you for contributing to GoldOS. This document outlines the development workflow and standards for the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and configure values
4. Run `pnpm db:generate` and `pnpm db:migrate`
5. Start development: `pnpm dev`

## Branch Strategy

| Branch      | Purpose                         |
| ----------- | ------------------------------- |
| `main`      | Production-ready code           |
| `develop`   | Integration branch for features |
| `feature/*` | New features                    |
| `fix/*`     | Bug fixes                       |
| `chore/*`   | Tooling and maintenance         |

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples:**

```
feat(pos): add barcode scanning support
fix(inventory): correct gold weight precision rounding
docs(api): update webhook documentation
```

## Pull Request Process

1. Create a feature branch from `develop`
2. Make changes following coding standards
3. Run quality checks locally:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
4. Push and open a PR using the PR template
5. Ensure CI passes and request review
6. Squash merge after approval

## Coding Standards

- **TypeScript:** Strict mode enabled; no `any` without justification
- **Imports:** Use `type` imports for type-only imports
- **Naming:** `camelCase` for variables/functions, `PascalCase` for types/components
- **Files:** `kebab-case` for file names
- **Exports:** Prefer named exports; barrel exports at package boundaries
- **Error handling:** Never swallow errors; use typed error responses in API routes
- **Security:** Never commit secrets; validate all inputs with Zod

## Package Guidelines

- Shared logic belongs in `packages/`, not duplicated across apps
- Apps should be thin — routing, UI composition, and app-specific config only
- Every package must have `build`, `lint`, and `typecheck` scripts
- Database access only through `@goldos/database`
- Environment variables validated through `@goldos/config`

## Database Changes

1. Modify `packages/database/prisma/schema.prisma`
2. Run `pnpm db:migrate` to create a migration
3. Include migration files in the PR
4. Migrations must be backward compatible for zero-downtime deploys

## Testing

- Write unit tests for business logic in packages
- Write integration tests for API routes
- Financial calculations require exhaustive test coverage
- Tenant isolation must be tested for every data access path

## Code Review Checklist

- [ ] Follows TypeScript strict standards
- [ ] No secrets or credentials
- [ ] Environment variables validated
- [ ] Tenant isolation enforced (for data access)
- [ ] Audit logging considered (for mutations)
- [ ] Documentation updated if needed

## Getting Help

- Open a GitHub issue for bugs or feature requests
- Reference architecture docs in `/docs` for design decisions
