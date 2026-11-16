/**
 * Sovereign Cryptographic Core for PsFi
 * 
 * Provides:
 * - 100% Client-Side Web Crypto API (SubtleCrypto)
 * - 256-bit AES-GCM Authenticated Encryption
 * - PBKDF2-HMAC-SHA256 (600,000 iterations per OWASP recommendations)
 * - BIP-39 12-Word Mnemonic Seed Generation & Recovery
 * - Master Vault Key (MVK) Generation, Wrapping & Unwrapping
 * - Versioned Secure Envelope Packaging
 */

export { BIP39_WORDLIST } from './bip39Wordlist';
import { BIP39_WORDLIST } from './bip39Wordlist';

export const CURRENT_CRYPTO_VERSION = 3;
export const PBKDF2_RECOMMENDED_ITERATIONS = 600_000;

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

export interface KdfParams {
  algorithm: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  salt: string; // base64
}

export interface EncryptedVaultEnvelope {
  psfi_version: number;
  type: 'encrypted_vault';
  created_at: string;
  kdf: KdfParams;
  mvk: {
    wrapped: string; // base64
    iv: string; // base64
  };
  payload: {
    ciphertext: string; // base64
    iv: string; // base64
  };
}

// ============================================================================
// Isomorphic Binary / Base64 Helpers
// ============================================================================

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ============================================================================
// BIP-39 12-Word Mnemonic Engine
// ============================================================================

/**
 * Generates a standard BIP-39 12-word recovery mnemonic seed phrase.
 * (128 bits of cryptographic entropy + 4 bits SHA-256 checksum = 132 bits / 11 bits per word = 12 words)
 */
export async function generateMnemonic12(): Promise<string> {
  const entropy = generateRandomBytes(16); // 128 bits
  const hashBuffer = await crypto.subtle.digest('SHA-256', entropy as unknown as BufferSource);
  const hashArray = new Uint8Array(hashBuffer);
  const checksumByte = hashArray[0]; // first byte contains the 4-bit checksum

  // Convert entropy + 4 checksum bits into binary string
  let binary = '';
  for (let i = 0; i < entropy.length; i++) {
    binary += entropy[i].toString(2).padStart(8, '0');
  }
  binary += checksumByte.toString(2).padStart(8, '0').slice(0, 4); // 132 bits

  // Split into 12 chunks of 11 bits each
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    const chunk = binary.slice(i * 11, (i + 1) * 11);
    const index = parseInt(chunk, 2);
    words.push(BIP39_WORDLIST[index]);
  }

  return words.join(' ');
}

/**
 * Validates whether a given mnemonic phrase is a valid 12-word BIP-39 phrase with valid checksum.
 */
export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  if (!mnemonic || typeof mnemonic !== 'string') return false;
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) return false;

  let binary = '';
  for (const word of words) {
    const index = BIP39_WORDLIST.indexOf(word);
    if (index === -1) return false;
    binary += index.toString(2).padStart(11, '0');
  }

  // First 128 bits = entropy; remaining 4 bits = checksum
  const entropyBits = binary.slice(0, 128);
  const checksumBits = binary.slice(128, 132);

  const entropy = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    entropy[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', entropy as unknown as BufferSource);
  const hashArray = new Uint8Array(hashBuffer);
  const expectedChecksumBits = hashArray[0].toString(2).padStart(8, '0').slice(0, 4);

  return checksumBits === expectedChecksumBits;
}

// ============================================================================
// PBKDF2 Key Derivation
// ============================================================================

/**
 * Derives a 256-bit AES-GCM CryptoKey from a passphrase or 12-word mnemonic using PBKDF2-HMAC-SHA256.
 */
export async function deriveWrappingKeyFromSecret(
  secret: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const normalized = secret.trim();
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalized),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    secretKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

// ============================================================================
// Master Vault Key (MVK) Generation & Key Wrapping
// ============================================================================

/**
 * Generates an isolated, random 256-bit AES-GCM Master Vault Key (MVK).
 */
export async function generateMasterVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so it can be wrapped with the user's recovery key
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Wraps (encrypts) the Master Vault Key using a wrapping key derived from the user's passphrase/mnemonic.
 */
export async function wrapMasterVaultKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: Uint8Array; iv: Uint8Array }> {
  const iv = generateRandomBytes(12);
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    masterKey,
    wrappingKey,
    { name: 'AES-GCM', iv: iv as unknown as BufferSource }
  );
  return {
    wrappedKey: new Uint8Array(wrapped),
    iv,
  };
}

/**
 * Unwraps (decrypts) the Master Vault Key using the user's passphrase/mnemonic wrapping key.
 */
export async function unwrapMasterVaultKey(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey as unknown as BufferSource,
    wrappingKey,
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// Core AES-256-GCM Encryption & Decryption
// ============================================================================

/**
 * Encrypts arbitrary text or data with an AES-GCM key using a freshly generated 12-byte IV.
 */
export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateRandomBytes(12);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    data
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    iv,
  };
}

/**
 * Decrypts AES-GCM ciphertext using the given key and IV.
 * Throws an Error if authentication tag does not match (tampering detected or invalid key).
 */
export async function decryptWithKey(
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array
): Promise<string> {
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    ciphertext as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// ============================================================================
// Versioned Encrypted Vault Envelope Export & Import
// ============================================================================

/**
 * Packages a vault payload into an encrypted, portable JSON envelope protected by a passphrase or mnemonic.
 */
export async function createEncryptedEnvelope(
  payloadText: string,
  secret: string,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<EncryptedVaultEnvelope> {
  const salt = generateRandomBytes(16);
  const wrappingKey = await deriveWrappingKeyFromSecret(secret, salt, iterations);
  const masterKey = await generateMasterVaultKey();

  const wrappedMvk = await wrapMasterVaultKey(masterKey, wrappingKey);
  const encryptedPayload = await encryptWithKey(masterKey, payloadText);

  return {
    psfi_version: CURRENT_CRYPTO_VERSION,
    type: 'encrypted_vault',
    created_at: new Date().toISOString(),
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations,
      salt: bytesToBase64(salt),
    },
    mvk: {
      wrapped: bytesToBase64(wrappedMvk.wrappedKey),
      iv: bytesToBase64(wrappedMvk.iv),
    },
    payload: {
      ciphertext: bytesToBase64(encryptedPayload.ciphertext),
      iv: bytesToBase64(encryptedPayload.iv),
    },
  };
}

/**
 * Decrypts a versioned EncryptedVaultEnvelope back to its original plaintext string.
 */
export async function decryptEncryptedEnvelope(
  envelope: EncryptedVaultEnvelope,
  secret: string
): Promise<string> {
  if (envelope.type !== 'encrypted_vault') {
    throw new Error('Invalid envelope type: expected "encrypted_vault"');
  }

  const salt = base64ToBytes(envelope.kdf.salt);
  const iterations = envelope.kdf.iterations || PBKDF2_RECOMMENDED_ITERATIONS;
  const wrappingKey = await deriveWrappingKeyFromSecret(secret, salt, iterations);

  const wrappedMvk = base64ToBytes(envelope.mvk.wrapped);
  const mvkIv = base64ToBytes(envelope.mvk.iv);
  const masterKey = await unwrapMasterVaultKey(wrappedMvk, wrappingKey, mvkIv);

  const ciphertext = base64ToBytes(envelope.payload.ciphertext);
  const payloadIv = base64ToBytes(envelope.payload.iv);

  return decryptWithKey(masterKey, ciphertext, payloadIv);
}
