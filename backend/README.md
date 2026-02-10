# Unloop Backend (Mental Health Matching)

Production‑leaning backend with heavy encryption for PII and role‑based access.

## Security Principles
- PII is encrypted at rest using AES‑256‑GCM (`FIELD_ENCRYPTION_KEY_B64`).
- Deterministic hashes (HMAC‑SHA256) are stored for lookup/deduping (`HASH_PEPPER`).
- No plaintext PII in the database.
- JWT‑based RBAC (replace with your auth provider or integrate JWKS).
- Rate limiting and secure headers enabled.

## Setup
1. Create a Postgres DB and run the schema in `src/db/schema.sql`.
2. Copy `.env.example` to `.env` and set values.
3. Install deps and run:

```bash
cd backend
npm install
npm run dev
```

## Routes (Summary)
- `POST /clients`
- `PUT /clients/:id`
- `GET /clients`
- `GET /clients/search?email=...&phone=...`
- `POST /clients/:id/tags`
- `POST /mhps`
- `PUT /mhps/:id`
- `GET /mhps`
- `POST /matches`
- `PUT /matches/:id/status`
- `GET /matches`
- `POST /revenue`
- `GET /revenue/clients/:id/summary`
- `GET /revenue/mhps/:id/summary`

## Admin UI
A minimal admin console is served from `public/index.html`.

## JWT Payload
Expected payload structure:

```json
{
  "sub": "user-id",
  "roles": ["admin", "ops", "finance"]
}
```

## Notes
- Replace `requireAuth` with your real identity provider.
- Consider audit logging and row‑level security for multi‑tenant scenarios.
