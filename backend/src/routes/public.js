import { Router } from "express";
import { pool } from "../db/pool.js";
import { encryptField } from "../security/crypto.js";
import { hashEmail, hashPhone } from "../security/hash.js";

export const publicRouter = Router();

publicRouter.post("/clients", async (req, res) => {
  const {
    name,
    email,
    phone,
    primary_concern,
    budget_cents,
    preferences,
    tags = [],
    notes
  } = req.body || {};

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertClient = await client.query(
      `INSERT INTO clients
        (name_encrypted, email_encrypted, phone_encrypted, email_hash, phone_hash, contact_date, source, primary_concern, budget_cents, preferences)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9)
       RETURNING id`,
      [
        encryptField(name),
        encryptField(email),
        encryptField(phone),
        hashEmail(email),
        hashPhone(phone),
        "web",
        primary_concern || null,
        budget_cents ?? null,
        { ...preferences, notes: notes || null }
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
    return res.status(201).json({ id: clientId, status: "received" });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

publicRouter.post("/mhps", async (req, res) => {
  const {
    name,
    email,
    phone,
    qualifications,
    specializations,
    languages,
    fee_cents,
    availability,
    experience_years,
    notes
  } = req.body || {};

  if (!name || !email || !phone || !specializations || !languages) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const specList = String(specializations).split(",").map(s => s.trim()).filter(Boolean);
  const langList = String(languages).split(",").map(s => s.trim()).filter(Boolean);

  const result = await pool.query(
    `INSERT INTO mhps (name_encrypted, specializations, languages, fee_cents, revenue_share_pct, availability)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      encryptField(name),
      specList,
      langList,
      fee_cents ?? 0,
      70,
      {
        qualifications: qualifications || null,
        availability: availability || null,
        experience_years: experience_years || null,
        notes: notes || null,
        contact: {
          email: encryptField(email),
          phone: encryptField(phone)
        }
      }
    ]
  );

  return res.status(201).json({ id: result.rows[0].id, status: "received" });
});
