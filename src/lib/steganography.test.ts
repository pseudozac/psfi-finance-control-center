import { describe, it, expect } from 'vitest';
import {
  encodePayloadToPixels,
  decodePayloadFromPixels,
  createDecoyPlan,
} from './steganography';

describe('Sovereign Steganography Engine', () => {
  it('correctly injects and recovers a hidden JSON payload in an RGBA buffer', () => {
    // 100 x 100 pixel buffer = 10,000 pixels * 4 = 40,000 bytes
    // 10,000 pixels * 3 usable bits = 30,000 bits = 3,750 bytes payload capacity
    const pixels = new Uint8ClampedArray(100 * 100 * 4);
    // Fill with arbitrary pseudo-image pixel values
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = (i * 37) % 256;
    }

    const secretPayload = JSON.stringify({
      vaultName: 'Sovereign Core 2026',
      totalWealthINR: 8500000,
      paragParikhUnits: 1420.55,
      isEncrypted: true,
      nonce: 'a8b9c0d1e2f3',
    });

    const success = encodePayloadToPixels(pixels, secretPayload);
    expect(success).toBe(true);

    const recovered = decodePayloadFromPixels(pixels);
    expect(recovered).toBe(secretPayload);
    const parsed = JSON.parse(recovered!);
    expect(parsed.totalWealthINR).toBe(8500000);
  });

  it('returns null when buffer has no steganographic header', () => {
    const cleanPixels = new Uint8ClampedArray(50 * 50 * 4);
    for (let i = 0; i < cleanPixels.length; i++) {
      cleanPixels[i] = 128;
    }

    const decoded = decodePayloadFromPixels(cleanPixels);
    expect(decoded).toBeNull();
  });

  it('fails safely if buffer is too small for payload', () => {
    // 2 x 2 pixels = 4 pixels * 3 bits = 12 bits (cannot even fit 17-byte header)
    const tinyBuffer = new Uint8ClampedArray(2 * 2 * 4);
    const success = encodePayloadToPixels(tinyBuffer, 'Large secret message');
    expect(success).toBe(false);
  });

  it('generates a valid, realistic modest Decoy Plan', () => {
    const decoy = createDecoyPlan();
    expect(decoy.income.salary).toBe(52000);
    expect(decoy.expenses.housing).toBe(18000);
    expect(decoy.savings.emergencyFundBalance).toBe(65000);
    expect(decoy.debt.cardBalance).toBe(14500);
    expect(decoy.schemaVersion).toBe(2);
  });
});
