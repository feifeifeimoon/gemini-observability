# Gemini CLI Local Observability Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Next.js dashboard that collects Gemini CLI telemetry via OTLP/HTTP and persists it to SQLite for debugging and cost tracking.

**Architecture:** Next.js App Router acting as an OTLP collector. API routes ingest JSON telemetry, a processor flattens the data into a relational SQLite schema, and a React frontend visualizes traces and metrics.

**Tech Stack:** Next.js 14, Tailwind CSS, Prisma, SQLite, Recharts, Lucide Icons.

---

## Task 1: Project Scaffolding & DB Schema

**Files:**
- Create: `package.json`, `prisma/schema.prisma`, `lib/db.ts`, `.env`
- Test: `tests/db.test.ts`

- [ ] **Step 1: Initialize Next.js project**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`

- [ ] **Step 2: Install dependencies**
Run: `npm install @prisma/client lucide-react recharts clsx tailwind-merge`
Run: `npm install -D prisma ts-node @types/node`

- [ ] **Step 3: Configure Port**
Create a `.env` file and set `PORT=4318` to ensure the dashboard listens on the default OTLP port.

- [ ] **Step 4: Define Prisma Schema**
Create `prisma/schema.prisma` with `Session`, `Span`, and `ToolCall` models. Ensure `Span` has a `traceId` field for session grouping.

- [ ] **Step 5: Initialize DB**
Run: `npx prisma migrate dev --name init`

- [ ] **Step 6: Verify DB connection**
Write a script `scripts/test-db.ts` that creates a dummy session and reads it back.
Run: `npx ts-node scripts/test-db.ts`
Expected: "Session created successfully"

---

## Task 2: OTLP Trace Ingestion & Tool Call Extraction

**Files:**
- Create: `src/app/api/otlp/v1/traces/route.ts`, `src/lib/telemetry/processor.ts`
- Test: `tests/api/traces.test.ts`

- [ ] **Step 1: Create the API route**
Implement `POST` in `src/app/api/otlp/v1/traces/route.ts`. Handle JSON parsing and response formatting for OTLP.

- [ ] **Step 2: Implement Tool Call Extraction**
In `src/lib/telemetry/processor.ts`, add logic to identify spans with `tool.execute` and extract the tool's name, input, and output from the `attributes` array.

- [ ] **Step 3: Write the Processor logic**
Implement mapping for OTEL `resourceSpans` to our models. Group spans by `traceId` and link them to a single `Session`.

- [ ] **Step 4: Write the failing test**
Mock a sample JSON payload from Gemini CLI and `POST` it to the route.
Expected: 200 OK, data in DB, `tool_calls` table populated.

- [ ] **Step 5: Implement minimal code and verify**
Run the test and check SQLite for the spans and tool calls.

---

## Task 3: Cost Calculation & Model Rates

**Files:**
- Create: `src/lib/telemetry/cost-calculator.ts`, `src/lib/constants/model-rates.ts`
- Test: `tests/lib/cost.test.ts`

- [ ] **Step 1: Define model rates**
Create `src/lib/constants/model-rates.ts` with current Gemini pricing (e.g., $3.50/1M input for 1.5 Pro).

- [ ] **Step 2: Implement cost logic**
Write `calculateCost(model, inputTokens, outputTokens)` in `cost-calculator.ts`.

- [ ] **Step 3: Integrate into ingestion**
Update Task 2's processor to call `calculateCost` and update the `Session` record.

- [ ] **Step 4: Verify**
Add a test case with specific token counts and check if the `estimated_cost` in DB matches expectation.

---

## Task 4: Dashboard UI - Session List

**Files:**
- Create: `src/app/page.tsx`, `src/components/SessionCard.tsx`
- Test: Manual verification in browser.

- [ ] **Step 1: Build the Session List page**
Fetch recent `Session` records from Prisma and display them in a table/list.

- [ ] **Step 2: Create SessionCard component**
Show status (success/error), model, tokens, cost, and relative time (using `date-fns`).

- [ ] **Step 3: Add basic usage chart**
Use `Recharts` to show token usage over the last 7 days on the home page.

---

## Task 5: Dashboard UI - Trace Waterfall

**Files:**
- Create: `src/app/sessions/[id]/page.tsx`, `src/components/TraceWaterfall.tsx`
- Test: Manual verification in browser.

- [ ] **Step 1: Build Session Detail page**
Fetch a session and its related `Span` records.

- [ ] **Step 2: Implement Waterfall component**
Recursive component to render nested spans based on `parentSpanId`.
Highlight `tool.execute` spans with a different color/icon.

- [ ] **Step 3: Add JSON inspector**
Clicking a span shows its `attributes` and `tool_calls` data in a code block.

---

## Task 6: Final Integration & CLI Connection

- [ ] **Step 1: Start the dashboard**
Run: `npm run dev` (on port 4318 via `.env` or proxy).

- [ ] **Step 2: Configure Gemini CLI**
Run: `gemini settings set telemetry.enabled true && gemini settings set telemetry.target local && gemini settings set telemetry.otlpEndpoint http://localhost:4318`

- [ ] **Step 3: Run a test command**
Run: `gemini "What time is it?"`
Verify that the session and tool calls (if any) appear in the dashboard instantly.
