# Evo ERP Template

A workspace-scoped ERP built with Next.js, React, Prisma and PostgreSQL: CRM, Finance, Inventory, HR and Projects, with Settings/RBAC and a shared dashboard.

Start with the [Developer Guide](INSTRUCTIONS.md): setup, Docker, environment variables, module examples, Server Actions, all ten architecture laws and known limitations.

## Run the sample

Prerequisites: Node.js 24, npm, Docker Engine and Compose v2. Follow [Quick Start](INSTRUCTIONS.md) to copy `.env.example` on a new checkout, generate an authentication secret, then run:

```powershell
npm ci
docker compose up --build -d
docker compose run --rm seed
```

Keep an existing `.env`. Open http://localhost:3000/login — admin@erp.dev / Admin123! is created only by the explicit sample seed. Use custom bootstrap credentials for real installations. Seed preserves an initialized workspace on reruns; it never replaces failed PostgreSQL with demo data.

## Documentation

- [Architecture: ADR-001—010, dependencies, RBAC](docs/architecture.md)
- [Developer Guide and contribution rules](INSTRUCTIONS.md)
- [Requirement clarifications](docs/contradictions.md)
- [Task status](docs/roadmap.md) and [verification history](docs/verification.md)
- [Docker/sample initialization evidence](docs/TASK-027.md)
- [Deployment](docs/DEPLOYMENT.md) and [English/Russian localization](docs/LOCALIZATION.md)

English is the default; Russian is available in Settings. Business currency is EUR. Company configuration belongs to each workspace. Legacy documents coexist with normalized module records; see the guide for boundaries and limitations.

## License

[MIT](LICENSE). Bundled fonts retain their [OFL license](public/fonts/OFL-Geist.txt).
