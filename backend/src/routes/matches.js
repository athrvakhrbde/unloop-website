import { Router } from "express";
import { pool } from "../db/pool.js";

export const matchesRouter = Router();

// Create match
matchesRouter.post("/", async (req, res) => {
  const { client_id, mhp_id, status = "pending" } = req.body || {};
  if (!client_id || !mhp_id) return res.status(400).json({ error: "client_id and mhp_id required" });

  const result = await pool.query(
    `INSERT INTO matches (client_id, mhp_id, status)
     VALUES ($1,$2,$3)
     RETURNING id, status`,
    [client_id, mhp_id, status]
  );

  return res.status(201).json(result.rows[0]);
});

// Update match status with reason and history
matchesRouter.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { to_status, reason } = req.body || {};
  if (!to_status) return res.status(400).json({ error: "to_status required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query(`SELECT status FROM matches WHERE id = $1`, [id]);
    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }

    const from_status = current.rows[0].status;

    let reasonId = null;
    if (reason) {
      const reasonRes = await client.query(
        `INSERT INTO status_reasons (status, reason)
         VALUES ($1,$2)
         ON CONFLICT (status, reason) DO UPDATE SET reason = EXCLUDED.reason
         RETURNING id`,
        [to_status, reason]
      );
      reasonId = reasonRes.rows[0].id;
    }

    await client.query(
      `UPDATE matches SET status = $1, current_reason_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [to_status, reasonId, id]
    );

    await client.query(
      `INSERT INTO match_status_history (match_id, from_status, to_status, reason_id, changed_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, from_status, to_status, reasonId, req.user?.id || null]
    );

    await client.query("COMMIT");
    return res.json({ id, status: to_status, reason: reason || null });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

// List matches
matchesRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, client_id, mhp_id, status, created_at, updated_at
     FROM matches
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return res.json({ items: result.rows });
});
