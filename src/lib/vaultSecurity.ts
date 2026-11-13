/**
 * Client-Side Vault Security & Master PIN Cryptography Engine
 *
 * All operations use Web Crypto API (SubtleCrypto) with SHA-256 and salted hashing.
 * 100% Zero-Cloud: PINs and hashes NEVER leave the user's browser or device.
 */

export interface VaultSecurityConfig {
  pinHash?: string;
  pinSalt?: string;
  autoLockMinutes?: number; // 0 = immediately on refresh/unfocus/lock, 5 = 5m idle, -1 = manual only
}

/**
 * Generate a cryptographically secure 16-byte random hex salt
 */
export function generatePinSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a 4-digit PIN with a salt using SHA-256 via SubtleCrypto
 */
export async function hashVaultPin(pin: string, salt: string): Promise<string> {
  const normalizedPin = pin.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`psfi_vault_pin:${salt}:${normalizedPin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a candidate PIN against stored salt and expected hash
 */
export async function verifyVaultPin(
  candidatePin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!candidatePin || !salt || !expectedHash) return false;
  const candidateHash = await hashVaultPin(candidatePin, salt);
  return candidateHash === expectedHash;
}
