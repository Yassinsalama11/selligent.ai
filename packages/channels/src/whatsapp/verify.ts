import { createHexHmacSha256, normalizeBuffer, safeCompare } from '../shared/hmac';

export function verifyWhatsAppSignature(secret: string, payload: Buffer | string, signatureHeader?: string): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = `sha256=${createHexHmacSha256(secret, normalizeBuffer(payload))}`;
  return safeCompare(expected, signatureHeader.trim());
}
