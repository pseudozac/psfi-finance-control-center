/**
 * Sovereign Steganography & Decoy Engine
 * Embeds AES-GCM encrypted or raw JSON vault payloads into ordinary PNG pixel buffers
 * using Least Significant Bit (LSB) encoding. Invisible to the human eye.
 * 
 * Signature Header: 'PSFI_STEGO_V1' (13 bytes) + 4-byte BigEndian length + payload bytes
 */

import type { FinancePlan } from '../types/finance';

const MAGIC_HEADER = 'PSFI_STEGO_V1';

/**
 * Encodes a string payload into a raw Uint8ClampedArray (RGBA pixel buffer).
 * Uses the LSB of R, G, B channels (skips Alpha to prevent alpha-blending corruption).
 */
export function encodePayloadToPixels(pixels: Uint8ClampedArray, payload: string): boolean {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const headerBytes = encoder.encode(MAGIC_HEADER);

  // Total bytes to encode: header (13) + length (4) + payload
  const totalLength = headerBytes.length + 4 + payloadBytes.length;
  const bitsNeeded = totalLength * 8;

  // Each pixel has 3 usable color channels (R, G, B)
  const availableBits = Math.floor(pixels.length / 4) * 3;
  if (bitsNeeded > availableBits) {
    return false; // Image buffer too small
  }

  // Construct byte buffer: [Header][Length 4-byte BE][Payload]
  const buffer = new Uint8Array(totalLength);
  buffer.set(headerBytes, 0);

  // 4-byte Big-Endian length
  const view = new DataView(buffer.buffer);
  view.setUint32(headerBytes.length, payloadBytes.length, false);

  // Set payload
  buffer.set(payloadBytes, headerBytes.length + 4);

  // Inject bits into RGB LSBs
  let bitIndex = 0;
  for (let byte of buffer) {
    for (let b = 7; b >= 0; b--) {
      const bit = (byte >> b) & 1;

      // Find corresponding pixel channel (skip alpha: index % 4 === 3)
      const pixelIndex = Math.floor(bitIndex / 3);
      const channelOffset = bitIndex % 3; // 0=R, 1=G, 2=B
      const arrayIndex = pixelIndex * 4 + channelOffset;

      // Clear LSB and write bit
      pixels[arrayIndex] = (pixels[arrayIndex] & ~1) | bit;
      bitIndex++;
    }
  }

  return true;
}

/**
 * Extracts hidden string payload from a raw Uint8ClampedArray (RGBA pixel buffer).
 * Returns null if magic header is not found or buffer corrupted.
 */
export function decodePayloadFromPixels(pixels: Uint8ClampedArray): string | null {
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(MAGIC_HEADER);
  const headerLength = headerBytes.length;

  // We need at least header (13) + length (4) = 17 bytes * 8 = 136 bits
  const minBits = (headerLength + 4) * 8;
  const availableBits = Math.floor(pixels.length / 4) * 3;
  if (availableBits < minBits) {
    return null;
  }

  // Helper to extract n bytes starting from bit offset
  function readBytes(startBit: number, numBytes: number): Uint8Array {
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

  // 1. Read and verify Magic Header
  const readHeaderBytes = readBytes(0, headerLength);
  const decoder = new TextDecoder();
  const readHeader = decoder.decode(readHeaderBytes);
  if (readHeader !== MAGIC_HEADER) {
    return null; // No hidden PsFi vault found
  }

  // 2. Read 4-byte payload length
  const lengthBytes = readBytes(headerLength * 8, 4);
  const view = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 4);
  const payloadLength = view.getUint32(0, false);

  if (payloadLength <= 0 || (headerLength + 4 + payloadLength) * 8 > availableBits) {
    return null; // Corrupted length
  }

  // 3. Read payload
  const payloadBytes = readBytes((headerLength + 4) * 8, payloadLength);
  try {
    return decoder.decode(payloadBytes);
  } catch {
    return null;
  }
}

/**
 * Generates an organic aesthetic wallpaper canvas (gradient with subtle celestial geometry)
 * sized adequately to hold standard PsFi vault JSON payloads (typically 4KB-12KB).
 */
export function createSyntheticStegoCanvas(width = 640, height = 480): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Deep twilight gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(0.5, '#12182c');
  grad.addColorStop(1, '#1e1633');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soft organic aura rings
  for (let i = 0; i < 12; i++) {
    const rx = (width / 12) * i + 30;
    const ry = (height / 12) * (12 - i) + 20;
    const rad = 40 + i * 15;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${60 + i * 10}, ${80 + i * 8}, ${140 + i * 8}, 0.04)`;
    ctx.fill();
  }

  return canvas;
}

/**
 * Generates an unremarkable, modest Indian household Decoy Plan.
 * Used when under duress to demonstrate an ordinary, un-invested average profile.
 */
export function createDecoyPlan(): FinancePlan {
  return {
    schemaVersion: 2,
    income: {
      salary: 52000,
      freelance: 0,
      other: 2500,
    },
    expenses: {
      housing: 18000,
      groceries: 9500,
      utilities: 4200,
      transport: 3500,
      lifestyle: 6000,
      insurance: 1200,
      custom: [],
    },
    debt: {
      cardBalance: 14500,
      aprPercent: 38,
      monthlyPayment: 2500,
    },
    savings: {
      emergencyFundBalance: 65000,
      monthlySavings: 5000,
      monthlySip: 7000,
      stepUpSipPercent: 5,
      expectedReturnPercent: 11,
      inflationPercent: 6.5,
      epfMonthly: 3600,
      ppfAnnual: 0,
    },
    tax: {
      deductions80C: 43200,
      deductions80D: 15000,
      deductionsNPS: 0,
      rentPaidMonthly: 18000,
      isMetroCity: true,
    },
  };
}
