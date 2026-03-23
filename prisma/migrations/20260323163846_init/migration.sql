-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_name" TEXT NOT NULL,
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Span" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "parent_span_id" TEXT,
    "traceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "started_at" DATETIME,
    CONSTRAINT "Span_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
