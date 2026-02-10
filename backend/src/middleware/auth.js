import { jwtVerify } from "jose";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET is required");
}
const SECRET_KEY = new TextEncoder().encode(SECRET);

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ["HS256"] });
    // expected payload: { sub, roles: ["admin", "ops", "finance"], ... }
    req.user = { id: payload.sub || null, roles: payload.roles || [] };
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return res.status(403).json({ error: "forbidden" });
    next();
  };
}
