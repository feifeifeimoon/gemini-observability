# Gemini CLI Observability Dashboard

## Project Context
A local-first observability dashboard for Gemini CLI.
- **Framework:** Next.js 16.2.0 (App Router)
- **Styling:** Tailwind CSS 4.0 (@tailwindcss/postcss)
- **Database:** SQLite with Prisma 7.5.0
- **Charts:** Recharts

## Commands
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Type Check:** `npx tsc --noEmit`
- **Database Push:** `npx prisma db push`
- **Database Studio:** `npx prisma studio`
- **Development:** `npm run dev` (starts on port 4318)

## Coding Guidelines
- **Architecture:** Next.js 16 App Router (React 19).
- **Telemetry:** Ingestion endpoints are located in `src/app/api/otlp/v1/`.
- **Database:** Refer to `prisma/schema.prisma` for the relational schema.
- **Components:** Use `src/components/` for reusable UI, preference for `lucide-react` for icons.

@AGENTS.md
