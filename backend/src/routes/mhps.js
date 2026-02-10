import { Router } from "express";
import { pool } from "../db/pool.js";
import { encryptField } from "../security/crypto.js";

export const mhpsRouter = Router();

// Create MHP
mhpsRouter.post("/", async (req, res) => {
  const { name, specializations, languages, fee_cents, revenue_share_pct, availability } = req.body || {};
  if (!name || !Array.isArray(specializations) || !Array.isArray(languages) || fee_cents === undefined || revenue_share_pct === undefined) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const result = await pool.query(
    `INSERT INTO mhps (name_encrypted, specializations, languages, fee_cents, revenue_share_pct, availability)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [encryptField(name), specializations, languages, fee_cents, revenue_share_pct, availability || null]
  );

  return res.status(201).json({ id: result.rows[0].id, status: "created" });
});

// Update MHP
mhpsRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, specializations, languages, fee_cents, revenue_share_pct, availability } = req.body || {};

  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name_encrypted = $${idx++}`); values.push(encryptField(name)); }
  if (specializations !== undefined) { fields.push(`specializations = $${idx++}`); values.push(specializations); }
  if (languages !== undefined) { fields.push(`languages = $${idx++}`); values.push(languages); }
  if (fee_cents !== undefined) { fields.push(`fee_cents = $${idx++}`); values.push(fee_cents); }
  if (revenue_share_pct !== undefined) { fields.push(`revenue_share_pct = $${idx++}`); values.push(revenue_share_pct); }
  if (availability !== undefined) { fields.push(`availability = $${idx++}`); values.push(availability); }

  if (fields.length === 0) return res.status(400).json({ error: "no_changes" });

  values.push(id);
  const sql = `UPDATE mhps SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING id`;

  const result = await pool.query(sql, values);
  if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
  return res.json({ id, status: "updated" });
});

// List MHPs (admin only, decrypt on server if needed later)
mhpsRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, specializations, languages, fee_cents, revenue_share_pct, availability, created_at
     FROM mhps
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return res.json({ items: result.rows });
});
