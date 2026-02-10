-- Mental Health Matching Platform schema (PostgreSQL)
-- Security/RBAC notes:
-- - Encrypt PII fields at application layer or with pgcrypto; never store plaintext PII.
-- - Store deterministic hashes for lookup/deduping (email_hash, phone_hash) using HMAC SHA-256 with a pepper.
-- - Restrict access to PII and revenue tables to privileged roles only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_encrypted      BYTEA NOT NULL,
  email_encrypted     BYTEA,
  phone_encrypted     BYTEA,
  email_hash          TEXT,
  phone_hash          TEXT,
  contact_date        TIMESTAMP NOT NULL,
  source              TEXT,
  primary_concern     TEXT,
  budget_cents        INTEGER CHECK (budget_cents >= 0),
  preferences         JSONB,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_clients_email_hash ON clients (email_hash) WHERE email_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_clients_phone_hash ON clients (phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX idx_clients_contact_date ON clients (contact_date);
CREATE INDEX idx_clients_source ON clients (source);

CREATE TABLE mhps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_encrypted      BYTEA NOT NULL,
  specializations     TEXT[] NOT NULL,
  languages           TEXT[] NOT NULL,
  fee_cents           INTEGER NOT NULL CHECK (fee_cents >= 0),
  revenue_share_pct   NUMERIC(5,2) NOT NULL CHECK (revenue_share_pct BETWEEN 0 AND 100),
  availability        JSONB,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mhps_specializations ON mhps USING GIN (specializations);
CREATE INDEX idx_mhps_languages ON mhps USING GIN (languages);

CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL
);

CREATE TABLE client_tags (
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, tag_id)
);

CREATE TABLE status_reasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status      TEXT NOT NULL CHECK (status IN ('matched','unmatched','pending')),
  reason      TEXT NOT NULL,
  UNIQUE (status, reason)
);

CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mhp_id              UUID NOT NULL REFERENCES mhps(id) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('matched','unmatched','pending')),
  current_reason_id   UUID REFERENCES status_reasons(id),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_client ON matches (client_id);
CREATE INDEX idx_matches_mhp ON matches (mhp_id);
CREATE INDEX idx_matches_status ON matches (status);

CREATE TABLE match_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  from_status   TEXT NOT NULL CHECK (from_status IN ('matched','unmatched','pending')),
  to_status     TEXT NOT NULL CHECK (to_status IN ('matched','unmatched','pending')),
  reason_id     UUID REFERENCES status_reasons(id),
  changed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by    UUID,
  note          TEXT
);

CREATE INDEX idx_match_status_history_match ON match_status_history (match_id);

CREATE TABLE revenue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mhp_id           UUID NOT NULL REFERENCES mhps(id) ON DELETE CASCADE,
  session_date     DATE NOT NULL,
  client_paid_cents INTEGER NOT NULL CHECK (client_paid_cents >= 0),
  platform_earned_cents INTEGER NOT NULL CHECK (platform_earned_cents >= 0),
  mhp_earned_cents INTEGER NOT NULL CHECK (mhp_earned_cents >= 0),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_client ON revenue (client_id);
CREATE INDEX idx_revenue_mhp ON revenue (mhp_id);
CREATE INDEX idx_revenue_date ON revenue (session_date);
