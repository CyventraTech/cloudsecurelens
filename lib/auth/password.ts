// lib/auth/password.ts
// Password hashing using Node.js built-in crypto (no extra deps).
// Uses PBKDF2 with SHA-512, 310000 iterations — NIST recommended for 2024.

import crypto from "crypto";

const ALGORITHM = "sha512";
const ITERATIONS = 310_000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

/**
 * Hash a plaintext password. Returns a string in the format:
 *   iterations:algorithm:saltHex:hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");

  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      ALGORITHM,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });

  return `${ITERATIONS}:${ALGORITHM}:${salt}:${hash.toString("hex")}`;
}

/**
 * Compare a plaintext password against a stored hash.
 * Returns true if they match.
 */
export async function comparePassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4) return false;

  const [iterStr, algorithm, salt, storedHash] = parts;
  const iterations = parseInt(iterStr, 10);

  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      iterations,
      KEY_LENGTH,
      algorithm,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });

  // Use timingSafeEqual to prevent timing attacks
  const hashBuffer = Buffer.from(storedHash, "hex");
  if (hash.length !== hashBuffer.length) return false;

  return crypto.timingSafeEqual(hash, hashBuffer);
}
