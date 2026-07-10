const fs = require('node:fs');
const path = require('node:path');

const content = `# GoldOS

Enterprise cloud ERP, POS, inventory, CRM, and AI platform for jewelry and gold retailers.

## Monorepo Structure

\`\`\`
goldos/
├── apps/
│   ├── web/          # Customer-facing web application (Next.js 15)
│   ├── api/          # REST API service (Next.js Route Handlers)
│   └── docs/         # Documentation portal
├── packages/
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── database/     # Prisma client and database infrastructure
│   ├── auth/         # Authentication architecture (types and interfaces)
│   ├── config/       # Environment validation (Zod)
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── eslint-config/
│   └── tsconfig/
└── docs/             # Product and architecture documentation
\`\`\`

## Prerequisites

- Node.js >= 20.11.0
- pnpm >= 9.0.0
- PostgreSQL >= 16

## Getting Started

\`\`\`bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
\`\`\`

## Development URLs

| Application | URL |
|-------------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Docs | http://localhost:3002 |

## Scripts

| Command | Description |
|---------|-------------|
| \`pnpm dev\` | Start all apps in development mode |
| \`pnpm build\` | Build all packages and applications |
| \`pnpm lint\` | Run ESLint across the monorepo |
| \`pnpm typecheck\` | Run TypeScript type checking |
| \`pnpm format\` | Format code with Prettier |
| \`pnpm format:check\` | Check code formatting |
| \`pnpm db:generate\` | Generate Prisma client |
| \`pnpm db:migrate\` | Run database migrations (dev) |
| \`pnpm db:migrate:deploy\` | Deploy migrations (production) |
| \`pnpm db:studio\` | Open Prisma Studio |

## Technology Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- PostgreSQL, Prisma
- Auth.js architecture in \`@goldos/auth\`
- Zod, TanStack Query, Zustand, React Hook Form
- Turborepo, pnpm workspaces

## Phase 1 Status

- [x] Monorepo foundation
- [x] Shared packages and tooling
- [x] Prisma infrastructure (no domain models yet)
- [x] Auth package architecture (no implementation)
- [x] Web, API, and Docs applications
- [x] CI/CD pipeline
- [ ] Authentication implementation
- [ ] Domain database models
- [ ] Core business modules

## Documentation

See [\`/docs\`](./docs) and run the docs app with \`pnpm --filter @goldos/docs-app dev\`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT — see [LICENSE](./LICENSE).
`;

fs.writeFileSync(path.join(__dirname, '..', 'README.md'), content, 'utf8');
console.log('README.md written');
