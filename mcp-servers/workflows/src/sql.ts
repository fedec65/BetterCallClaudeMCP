export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agents_manifest (
    id              SERIAL PRIMARY KEY,
    agent_id        TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    input_types     TEXT[] NOT NULL,
    output_types    TEXT[] NOT NULL,
    mcp_servers     TEXT[] NOT NULL,
    is_terminal     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    pipeline        JSONB NOT NULL,
    output_spec     TEXT NOT NULL,
    visibility      TEXT NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private','team','public')),
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft','active','archived')),
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    started_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          TEXT CHECK (status IN ('running','completed','failed','abandoned')),
    output_summary  TEXT
);

CREATE TABLE IF NOT EXISTS claimed_ids (
    user_id         TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now()
);
`;
