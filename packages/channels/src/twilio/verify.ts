import { createBase64HmacSha1, safeCompare } from '../shared/hmac';

export function verifyTwilioSignature(
  authToken: string,
  requestUrl: string,
  params: Record<string, string | number | boolean | undefined>,
  signatureHeader?: string,
): boolean {
  if (!authToken || !signatureHeader) return false;

  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key] ?? ''}`)
    .join('');

  const expected = createBase64HmacSha1(authToken, `${requestUrl}${sorted}`);
  return safeCompare(expected, signatureHeader.trim());
}
