import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { requireAuth, requireRole } from "./middleware/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { matchesRouter } from "./routes/matches.js";
import { revenueRouter } from "./routes/revenue.js";
import { mhpsRouter } from "./routes/mhps.js";
import { publicRouter } from "./routes/public.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Explicitly disable Topics API in modern browsers
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "browsing-topics=()");
  next();
});

app.use(helmet({
  contentSecurityPolicy: false
}));

const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : false
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));

app.use(express.json({ limit: "1mb" }));

// Public endpoints (no auth)
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Public admin UI
app.use(express.static("public"));
app.use("/public", publicRouter);

// Auth & RBAC (high-level)
app.use(requireAuth);

// Routes
app.use("/clients", requireRole("admin", "ops"), clientsRouter);
app.use("/mhps", requireRole("admin", "ops"), mhpsRouter);
app.use("/matches", requireRole("admin", "ops"), matchesRouter);
app.use("/revenue", requireRole("admin", "finance"), revenueRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Backend listening on :${port}`);
});
