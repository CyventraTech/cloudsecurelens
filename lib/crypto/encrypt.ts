// lib/crypto/encrypt.ts
// AES-256-GCM symmetric encryption for sensitive fields stored in the DB.
// Key is derived from ENCRYPTION_KEY env var (32-byte hex string).
//
// Format: base64( iv[12] + authTag[16] + ciphertext )

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string safe for database storage.
 * Returns null if the input is null/undefined.
 */
export function encrypt(plaintext: string): string;
export function encrypt(plaintext: string | null | undefined): string | null;
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Pack: iv (12) + tag (16) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Returns the original plaintext, or null if input is null.
 * Throws if the data is tampered (auth tag mismatch).
 */
export function decrypt(encoded: string): string;
export function decrypt(encoded: string | null | undefined): string | null;
export function decrypt(encoded: string | null | undefined): string | null {
  if (encoded == null) return null;

  const key = getKey();
  const packed = Buffer.from(encoded, "base64");

  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Encrypted value is too short — data may be corrupted.");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Mask a string for display — shows first 4 chars then asterisks. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}${"•".repeat(Math.min(value.length - 4, 20))}`;
}
