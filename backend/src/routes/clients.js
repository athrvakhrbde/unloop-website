import { Router } from "express";
import { pool } from "../db/pool.js";
import { encryptField, decryptField } from "../security/crypto.js";
import { hashEmail, hashPhone } from "../security/hash.js";

export const clientsRouter = Router();

// Create client
clientsRouter.post("/", async (req, res) => {
  const {
    name,
    email,
    phone,
    contact_date,
    source,
    primary_concern,
    budget_cents,
    preferences,
    tags = []
  } = req.body || {};

  if (!name || !contact_date) {
    return res.status(400).json({ error: "name and contact_date are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertClient = await client.query(
      `INSERT INTO clients
        (name_encrypted, email_encrypted, phone_encrypted, email_hash, phone_hash, contact_date, source, primary_concern, budget_cents, preferences)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        encryptField(name),
        encryptField(email),
        encryptField(phone),
        hashEmail(email),
        hashPhone(phone),
        contact_date,
        source || null,
        primary_concern || null,
        budget_cents ?? null,
        preferences || null
      ]
    );

    const clientId = insertClient.rows[0].id;

    for (const tagName of tags) {
      const tagRes = await client.query(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [tagName]
      );
      const tagId = tagRes.rows[0].id;
      await client.query(
        `INSERT INTO client_tags (client_id, tag_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [clientId, tagId]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({ id: clientId, status: "created" });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

// Update client
clientsRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    source,
    primary_concern,
    budget_cents,
    preferences
  } = req.body || {};

  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name_encrypted = $${idx++}`); values.push(encryptField(name)); }
  if (email !== undefined) {
    fields.push(`email_encrypted = $${idx++}`); values.push(encryptField(email));
    fields.push(`email_hash = $${idx++}`); values.push(hashEmail(email));
  }
  if (phone !== undefined) {
    fields.push(`phone_encrypted = $${idx++}`); values.push(encryptField(phone));
    fields.push(`phone_hash = $${idx++}`); values.push(hashPhone(phone));
  }
  if (source !== undefined) { fields.push(`source = $${idx++}`); values.push(source); }
  if (primary_concern !== undefined) { fields.push(`primary_concern = $${idx++}`); values.push(primary_concern); }
  if (budget_cents !== undefined) { fields.push(`budget_cents = $${idx++}`); values.push(budget_cents); }
  if (preferences !== undefined) { fields.push(`preferences = $${idx++}`); values.push(preferences); }

  if (fields.length === 0) return res.status(400).json({ error: "no_changes" });

  values.push(id);
  const sql = `UPDATE clients SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING id`;

  const result = await pool.query(sql, values);
  if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
  return res.json({ id, status: "updated" });
});

// Add tag to client
clientsRouter.post("/:id/tags", async (req, res) => {
  const { id } = req.params;
  const { tag } = req.body || {};
  if (!tag) return res.status(400).json({ error: "tag_required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tagRes = await client.query(
      `INSERT INTO tags (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tag]
    );

    await client.query(
      `INSERT INTO client_tags (client_id, tag_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [id, tagRes.rows[0].id]
    );

    await client.query("COMMIT");
    return res.json({ client_id: id, tag });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

// List clients (admin only; decrypt on server)
clientsRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, name_encrypted, email_encrypted, phone_encrypted, contact_date, source, primary_concern, budget_cents, preferences, created_at
     FROM clients
     ORDER BY created_at DESC
     LIMIT 100`
  );

  const items = result.rows.map((row) => ({
    id: row.id,
    name: decryptField(row.name_encrypted),
    email: decryptField(row.email_encrypted),
    phone: decryptField(row.phone_encrypted),
    contact_date: row.contact_date,
    source: row.source,
    primary_concern: row.primary_concern,
    budget_cents: row.budget_cents,
    preferences: row.preferences,
    created_at: row.created_at
  }));

  return res.json({ items });
});

// Search client by email or phone (admin only)
clientsRouter.get("/search", async (req, res) => {
  const { email, phone } = req.query || {};
  const emailHash = email ? hashEmail(email) : null;
  const phoneHash = phone ? hashPhone(phone) : null;
  if (!emailHash && !phoneHash) return res.status(400).json({ error: "email_or_phone_required" });

  const result = await pool.query(
    `SELECT id, name_encrypted, email_encrypted, phone_encrypted, contact_date, source, primary_concern, budget_cents, preferences, created_at
     FROM clients
     WHERE (email_hash = $1 AND $1 IS NOT NULL)
        OR (phone_hash = $2 AND $2 IS NOT NULL)
     LIMIT 50`,
    [emailHash, phoneHash]
  );

  const items = result.rows.map((row) => ({
    id: row.id,
    name: decryptField(row.name_encrypted),
    email: decryptField(row.email_encrypted),
    phone: decryptField(row.phone_encrypted),
    contact_date: row.contact_date,
    source: row.source,
    primary_concern: row.primary_concern,
    budget_cents: row.budget_cents,
    preferences: row.preferences,
    created_at: row.created_at
  }));

  return res.json({ items });
});
