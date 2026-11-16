/**
 * Sovereign Steganography & Decoy Engine
 * Embeds AES-GCM encrypted or raw JSON vault payloads into ordinary PNG pixel buffers
 * using Least Significant Bit (LSB) encoding. Invisible to the human eye.
 * 
 * Signature Headers:
 * - 'PSFI_STEGO_V2' (13 bytes): Authenticated AES-GCM encryption with 16B salt + 12B IV + 4B length + ciphertext
 * - 'PSFI_STEGO_V1' (13 bytes): Legacy unencrypted LSB payload + 4B length
 */

import {
  deriveWrappingKeyFromSecret,
  generateRandomBytes,
} from './vaultCrypto';

export const MAGIC_HEADER_V1 = 'PSFI_STEGO_V1';
export const MAGIC_HEADER_V2 = 'PSFI_STEGO_V2';

/**
 * Raw bit injector into RGB LSBs of an RGBA pixel buffer (skips Alpha channel).
 */
function injectBufferIntoPixels(pixels: Uint8ClampedArray, buffer: Uint8Array): boolean {
  const bitsNeeded = buffer.length * 8;
  const availableBits = Math.floor(pixels.length / 4) * 3;
  if (bitsNeeded > availableBits) {
    return false;
  }

  let bitIndex = 0;
  for (const byte of buffer) {
    for (let b = 7; b >= 0; b--) {
      const bit = (byte >> b) & 1;
      const pixelIndex = Math.floor(bitIndex / 3);
      const channelOffset = bitIndex % 3; // 0=R, 1=G, 2=B
      const arrayIndex = pixelIndex * 4 + channelOffset;

      pixels[arrayIndex] = (pixels[arrayIndex] & ~1) | bit;
      bitIndex++;
    }
  }
  return true;
}

/**
 * Raw bit extractor from RGB LSBs of an RGBA pixel buffer.
 */
function extractBytesFromPixels(
  pixels: Uint8ClampedArray,
  startBit: number,
  numBytes: number
): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  let curBit = startBit;
  for (let i = 0; i < numBytes; i++) {
    let byteVal = 0;
    for (let b = 7; b >= 0; b--) {
      const pixelIndex = Math.floor(curBit / 3);
      const channelOffset = curBit % 3;
      const arrayIndex = pixelIndex * 4 + channelOffset;
      const bit = pixels[arrayIndex] & 1;
      byteVal = (byteVal << 1) | bit;
      curBit++;
    }
    bytes[i] = byteVal;
  }
  return bytes;
}

/**
 * Modern authenticated AES-256-GCM steganographic encoder.
 */
export async function encodeSecurePayloadToPixels(
  pixels: Uint8ClampedArray,
  payload: string,
  secret?: string
): Promise<boolean> {
  if (!secret || secret.length < 4) {
    // If no secret provided, fall back to legacy v1 encoder
    return encodePayloadToPixels(pixels, payload);
  }

  const salt = generateRandomBytes(16);
  const iv = generateRandomBytes(12);
  const key = await deriveWrappingKeyFromSecret(secret, salt, 20_000);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    new TextEncoder().encode(payload)
  );

  const ciphertext = new Uint8Array(encryptedBuffer);
  const headerBytes = new TextEncoder().encode(MAGIC_HEADER_V2); // 13 bytes

  // Layout: [Header 13B][Salt 16B][IV 12B][Length 4B BE][Ciphertext]
  const totalLength = headerBytes.length + 16 + 12 + 4 + ciphertext.length;
  const buffer = new Uint8Array(totalLength);

  let offset = 0;
  buffer.set(headerBytes, offset);
  offset += headerBytes.length;

  buffer.set(salt, offset);
  offset += 16;

  buffer.set(iv, offset);
  offset += 12;

  const view = new DataView(buffer.buffer);
  view.setUint32(offset, ciphertext.length, false);
  offset += 4;

  buffer.set(ciphertext, offset);

  return injectBufferIntoPixels(pixels, buffer);
}

export interface StegoDecodeResult {
  success: boolean;
  payload?: string;
  needsSecret?: boolean;
  error?: string;
}

/**
 * Modern authenticated steganographic decoder supporting both v2 (AES-GCM) and v1 (legacy).
 */
export async function decodeSecurePayloadFromPixels(
  pixels: Uint8ClampedArray,
  secret?: string
): Promise<StegoDecodeResult> {
  const availableBits = Math.floor(pixels.length / 4) * 3;
  if (availableBits < 13 * 8) {
    return { success: false, error: 'Pixel buffer too small' };
  }

  // 1. Read 13-byte header
  const headerBytes = extractBytesFromPixels(pixels, 0, 13);
  const header = new TextDecoder().decode(headerBytes);

  if (header === MAGIC_HEADER_V2) {
    // Format: [Header 13B][Salt 16B][IV 12B][Length 4B BE][Ciphertext]
    const headerBits = 13 * 8;
    if (availableBits < headerBits + (16 + 12 + 4) * 8) {
      return { success: false, error: 'Corrupted v2 header buffer' };
    }

    if (!secret || secret.length < 4) {
      return { success: false, needsSecret: true, error: 'Image contains an encrypted PsFi vault. Secret required.' };
    }

    let bitOffset = headerBits;
    const salt = extractBytesFromPixels(pixels, bitOffset, 16);
    bitOffset += 16 * 8;

    const iv = extractBytesFromPixels(pixels, bitOffset, 12);
    bitOffset += 12 * 8;

    const lengthBytes = extractBytesFromPixels(pixels, bitOffset, 4);
    bitOffset += 4 * 8;
    const view = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 4);
    const ciphertextLength = view.getUint32(0, false);

    if (ciphertextLength <= 0 || bitOffset + ciphertextLength * 8 > availableBits) {
      return { success: false, error: 'Corrupted payload length in image' };
    }

    const ciphertext = extractBytesFromPixels(pixels, bitOffset, ciphertextLength);
    const key = await deriveWrappingKeyFromSecret(secret, salt, 20_000);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
        key,
        ciphertext as unknown as BufferSource
      );
      const payload = new TextDecoder().decode(decryptedBuffer);
      return { success: true, payload };
    } catch {
      return { success: false, error: 'Incorrect passphrase or recovery seed for this image.' };
    }
  }

  if (header === MAGIC_HEADER_V1) {
    const legacyPayload = decodePayloadFromPixels(pixels);
    if (legacyPayload) {
      return { success: true, payload: legacyPayload };
    }
    return { success: false, error: 'Failed to extract legacy payload' };
  }

  return { success: false, error: 'No hidden PsFi vault signature found in image.' };
}

/**
 * Synchronous legacy encoder (for v1 backward compatibility).
 */
export function encodePayloadToPixels(pixels: Uint8ClampedArray, payload: string): boolean {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const headerBytes = encoder.encode(MAGIC_HEADER_V1);

  const totalLength = headerBytes.length + 4 + payloadBytes.length;
  const buffer = new Uint8Array(totalLength);
  buffer.set(headerBytes, 0);

  const view = new DataView(buffer.buffer);
  view.setUint32(headerBytes.length, payloadBytes.length, false);
  buffer.set(payloadBytes, headerBytes.length + 4);

  return injectBufferIntoPixels(pixels, buffer);
}

/**
 * Synchronous legacy decoder.
 */
export function decodePayloadFromPixels(pixels: Uint8ClampedArray): string | null {
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(MAGIC_HEADER_V1);
  const headerLength = headerBytes.length;

  const minBits = (headerLength + 4) * 8;
  const availableBits = Math.floor(pixels.length / 4) * 3;
  if (availableBits < minBits) {
    return null;
  }

  const readHeaderBytes = extractBytesFromPixels(pixels, 0, headerLength);
  const decoder = new TextDecoder();
  const readHeader = decoder.decode(readHeaderBytes);
  if (readHeader !== MAGIC_HEADER_V1) {
    return null;
  }

  const lengthBytes = extractBytesFromPixels(pixels, headerLength * 8, 4);
  const view = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 4);
  const payloadLength = view.getUint32(0, false);

  if (payloadLength <= 0 || (headerLength + 4 + payloadLength) * 8 > availableBits) {
    return null;
  }

  const payloadBytes = extractBytesFromPixels(pixels, (headerLength + 4) * 8, payloadLength);
  try {
    return decoder.decode(payloadBytes);
  } catch {
    return null;
  }
}

/**
 * Generates an organic aesthetic wallpaper canvas sized adequately to hold standard PsFi vault payloads.
 */
export function createSyntheticStegoCanvas(width = 640, height = 480): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(0.5, '#12182c');
  grad.addColorStop(1, '#1e1633');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  return canvas;
}

import type { FinancePlan } from '../types/finance';

/**
 * Generates a realistic, plausible modest Decoy Plan for plausible deniability.
 */
export function createDecoyPlan(): FinancePlan {
  return {
    schemaVersion: 2,
    income: {
      salary: 52000,
      freelance: 0,
      other: 0,
    },
    expenses: {
      housing: 18000,
      groceries: 8500,
      utilities: 3500,
      transport: 4000,
      lifestyle: 6000,
      insurance: 2500,
      custom: [],
    },
    savings: {
      emergencyFundBalance: 65000,
      monthlySavings: 5000,
      monthlySip: 4500,
      stepUpSipPercent: 5,
      expectedReturnPercent: 11,
      inflationPercent: 6,
    },
    debt: {
      cardBalance: 14500,
      aprPercent: 24,
      monthlyPayment: 2500,
    },
    tax: {
      deductions80C: 50000,
      deductions80D: 10000,
      deductionsNPS: 0,
      rentPaidMonthly: 12000,
      isMetroCity: true,
    },
  };
}
