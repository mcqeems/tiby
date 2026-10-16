import { describe, it, expect, beforeEach } from "vitest";
import { EncryptedColumnTransformer } from "../src/database/transformers/encrypted-column.transformer.js";

describe("EncryptedColumnTransformer", () => {
  let transformer: EncryptedColumnTransformer;

  beforeEach(() => {
    process.env.PII_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    transformer = new EncryptedColumnTransformer();
  });

  it("encrypts and decrypts text correctly (round-trip)", () => {
    const original = "Budi Santoso - 081234567890";
    const encrypted = transformer.to(original);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:authTag:ciphertext format

    const decrypted = transformer.from(encrypted);
    expect(decrypted).toBe(original);
  });

  it("returns null for null or undefined input", () => {
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeNull();
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeNull();
  });

  it("returns invalid ciphertext string as-is gracefully", () => {
    const invalidCiphertext = "not-a-valid-ciphertext";
    expect(transformer.from(invalidCiphertext)).toBe(invalidCiphertext);
  });
});
