import { Router } from "express";
import { pool } from "../db/pool.js";

export const revenueRouter = Router();

// Add revenue per session
revenueRouter.post("/", async (req, res) => {
  const { client_id, mhp_id, session_date, client_paid_cents } = req.body || {};
  if (!client_id || !mhp_id || !session_date || client_paid_cents === undefined) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const mhp = await client.query(
      `SELECT revenue_share_pct FROM mhps WHERE id = $1`,
      [mhp_id]
    );
    if (mhp.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "mhp_not_found" });
    }

    const pct = Number(mhp.rows[0].revenue_share_pct);
    const mhpEarned = Math.round(Number(client_paid_cents) * (pct / 100));
    const platformEarned = Number(client_paid_cents) - mhpEarned;

    const result = await client.query(
      `INSERT INTO revenue
        (client_id, mhp_id, session_date, client_paid_cents, platform_earned_cents, mhp_earned_cents)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, client_paid_cents, platform_earned_cents, mhp_earned_cents`,
      [client_id, mhp_id, session_date, client_paid_cents, platformEarned, mhpEarned]
    );

    await client.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

// Revenue summary per client
revenueRouter.get("/clients/:id/summary", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT client_id,
            SUM(client_paid_cents) AS total_paid_cents,
            SUM(platform_earned_cents) AS platform_earned_cents,
            SUM(mhp_earned_cents) AS mhp_earned_cents
     FROM revenue
     WHERE client_id = $1
     GROUP BY client_id`,
    [id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
  return res.json(result.rows[0]);
});

// Revenue summary per therapist
revenueRouter.get("/mhps/:id/summary", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT mhp_id,
            SUM(client_paid_cents) AS total_paid_cents,
            SUM(platform_earned_cents) AS platform_earned_cents,
            SUM(mhp_earned_cents) AS mhp_earned_cents
     FROM revenue
     WHERE mhp_id = $1
     GROUP BY mhp_id`,
    [id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
  return res.json(result.rows[0]);
});
