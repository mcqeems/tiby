import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { ValueTransformer } from "typeorm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEFAULT_KEY_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function getKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY || DEFAULT_KEY_HEX;
  return Buffer.from(keyHex, "hex");
}

export class EncryptedColumnTransformer implements ValueTransformer {
  to(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, getKey(), iv);
      let encrypted = cipher.update(value, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch {
      return value;
    }
  }

  from(value: string | null | undefined): string | null {
    if (!value) return null;
    const parts = value.split(":");
    if (parts.length !== 3) {
      return value;
    }
    try {
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return value;
    }
  }
}
