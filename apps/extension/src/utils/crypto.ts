/**
 * Computes the SHA-256 hash of a string and returns the first `length` characters of the hex digest.
 * Compatible with Chrome Extension Manifest V3 (uses Web Crypto API, no Node modules).
 */
export async function getHashPrefix(text: string, length = 4): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, length);
}
