import crypto from "crypto";

const PEPPER = process.env.HASH_PEPPER;
if (!PEPPER) {
  throw new Error("HASH_PEPPER is required");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D+/g, "");
}

export function hashEmail(email) {
  if (!email) return null;
  const norm = normalizeEmail(email);
  return crypto.createHmac("sha256", PEPPER).update(norm).digest("hex");
}

export function hashPhone(phone) {
  if (!phone) return null;
  const norm = normalizePhone(phone);
  return crypto.createHmac("sha256", PEPPER).update(norm).digest("hex");
}
