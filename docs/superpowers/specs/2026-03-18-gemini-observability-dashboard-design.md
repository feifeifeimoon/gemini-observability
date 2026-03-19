# Design Spec: Gemini CLI Local Observability Dashboard

## 1. Overview
A local-first, lightweight observability dashboard for the Gemini CLI. It acts as an OpenTelemetry (OTLP/HTTP) collector, persisting data to SQLite and providing a React-based UI for debugging tool calls, performance monitoring, and cost tracking.

### Goals
- **Debugging:** Visualize "trace waterfalls" of agent sessions and tool calls.
- **Performance:** Track latency and success/failure rates of tools and model requests.
- **Cost & Usage:** Monitor token consumption and estimate costs based on local model rates.
- **Local Persistence:** Store history in SQLite for long-term analysis.

---

## 2. Architecture & Data Flow

### Components
1. **Gemini CLI (Data Source):** Configured to export telemetry via OTLP/HTTP.
2. **Next.js App (Backend/Collector):**
   - **OTLP Receiver:** API routes (`/api/otlp/v1/traces`, `/api/otlp/v1/metrics`) to ingest JSON telemetry.
   - **Data Processor:** Simplifies raw OTLP spans into a flattened relational schema.
   - **Persistence:** SQLite database via Prisma/Drizzle.
3. **Next.js App (Frontend):**
   - **Dashboard UI:** React/Tailwind CSS components for visualization.
   - **Charts:** Recharts for token/cost analytics.

### Data Flow
`Gemini CLI` -> `POST (OTLP/HTTP)` -> `Next.js Collector` -> `SQLite` -> `React UI`

---

## 3. Data Model (SQLite)

### `sessions`
Groups spans into logical interactions.
- `id`: UUID (Primary Key)
- `started_at`: Timestamp
- `model_name`: String (e.g., `gemini-1.5-pro`)
- `total_input_tokens`: Integer
- `total_output_tokens`: Integer
- `estimated_cost`: Float (USD)

### `spans`
Stores individual execution steps (traces).
- `id`: String (OTEL Span ID)
- `session_id`: UUID (Foreign Key)
- `parent_span_id`: String (for nesting)
- `name`: String (e.g., `model.generate`, `tool.execute`)
- `status`: Enum (SUCCESS, ERROR, UNSET)
- `attributes`: JSON (Raw OTEL attributes)
- `duration_ms`: Integer

### `tool_calls` (Specialized View)
- `id`: Integer (Primary Key)
- `span_id`: String (Foreign Key to `spans`)
- `name`: String (e.g., `read_file`)
- `input`: JSON (Arguments)
- `output`: JSON (Result or Error)

---

## 4. UI/UX Design

### Views
1. **Session History:** A list of recent CLI runs with status icons and quick cost/token summaries.
2. **Trace Waterfall:** A hierarchical view of a single session.
   - Expandable rows for tool calls showing input/output JSON.
   - Error highlighting for failed spans.
3. **Analytics Dashboard:**
   - Bar chart: Daily token usage.
   - Pie chart: Cost distribution by model.
   - Table: Top failing tools.

---

## 5. Implementation Strategy

### Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + Lucide Icons
- **Database:** SQLite + Prisma ORM
- **Charts:** Recharts
- **Integration:** Standard OTLP/HTTP listener on port `4318`.

### Integration Command
Users will configure their Gemini CLI with:
```bash
gemini settings set telemetry.enabled true
gemini settings set telemetry.target local
gemini settings set telemetry.otlpEndpoint http://localhost:4318
```
