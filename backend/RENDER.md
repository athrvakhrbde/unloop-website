# Render Deployment (Backend)

This repo includes `render.yaml` at the root and a Dockerfile in `backend/`.

## Deploy Steps
1. Create a new Render Web Service.
2. Connect the GitHub repo for this project.
3. Render will detect `render.yaml` automatically.
4. Set secrets in Render dashboard (these are marked `sync: false` in `render.yaml`):
   - `DATABASE_URL`
   - `FIELD_ENCRYPTION_KEY_B64`
   - `HASH_PEPPER`
   - `JWT_SECRET`
5. Deploy.

## After Deploy
- Render will give a URL like `https://unloop-backend.onrender.com`.
- Point `api.0.unloop.in` to that Render URL using a CNAME record.

## Health Check
- `GET /health`
