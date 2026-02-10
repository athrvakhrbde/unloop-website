import crypto from "crypto";

const KEY_B64 = process.env.FIELD_ENCRYPTION_KEY_B64;
if (!KEY_B64) {
  throw new Error("FIELD_ENCRYPTION_KEY_B64 is required");
}

const KEY = Buffer.from(KEY_B64, "base64");
if (KEY.length !== 32) {
  throw new Error("FIELD_ENCRYPTION_KEY_B64 must decode to 32 bytes");
}

export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptField(blob) {
  if (!blob) return null;
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
