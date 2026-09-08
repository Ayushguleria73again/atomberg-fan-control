import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export const KEY_VERSION = 1;

export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

function getMasterKey(): Buffer {
  const keyBase64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY environment variable is not set");
  }
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(`CREDENTIAL_ENCRYPTION_KEY must be exactly 32 bytes (got ${key.length} bytes)`);
  }
  return key;
}

export interface EncryptedCredentialsRecord {
  encCredentials: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

/**
 * Encrypts API Key and Refresh Token together as an authenticated JSON blob.
 * A fresh 12-byte IV is generated on every encryption call.
 */
export function encryptCredentials(
  apiKey: string,
  refreshToken: string
): EncryptedCredentialsRecord {
  const masterKey = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);

  const payload = JSON.stringify({
    apiKey: apiKey.trim(),
    refreshToken: refreshToken.trim(),
  });

  const ciphertext = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encCredentials: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

/**
 * Decrypts the stored AES-256-GCM ciphertext payload and returns { apiKey, refreshToken }.
 */
export function decryptCredentials(record: {
  encCredentials: string;
  iv: string;
  authTag: string;
}): { apiKey: string; refreshToken: string } {
  const masterKey = getMasterKey();
  const iv = Buffer.from(record.iv, "base64");
  const authTag = Buffer.from(record.authTag, "base64");
  const ciphertext = Buffer.from(record.encCredentials, "base64");

  const decipher = createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const parsed = JSON.parse(decrypted.toString("utf8"));
  if (!parsed.apiKey || !parsed.refreshToken) {
    throw new Error("Decrypted credential payload is missing apiKey or refreshToken");
  }

  return {
    apiKey: parsed.apiKey,
    refreshToken: parsed.refreshToken,
  };
}
