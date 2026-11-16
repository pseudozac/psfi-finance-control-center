import { describe, it, expect } from 'vitest';
import {
  encodePayloadToPixels,
  decodePayloadFromPixels,
  encodeSecurePayloadToPixels,
  decodeSecurePayloadFromPixels,
  createDecoyPlan,
} from './steganography';

describe('Sovereign Steganography Engine', () => {
  it('correctly injects and recovers a hidden JSON payload in an RGBA buffer (legacy v1)', () => {
    const pixels = new Uint8ClampedArray(100 * 100 * 4);
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

  it('embeds and extracts authenticated AES-256-GCM v2 steganographic payloads', async () => {
    const pixels = new Uint8ClampedArray(120 * 120 * 4);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = (i * 41) % 256;
    }

    const confidentialData = JSON.stringify({
      vault: 'Secret Off-Grid Assets',
      goldGrams: 250,
      emergencyCash: 1200000,
    });
    const passphrase = 'celestial-stego-pass';

    const success = await encodeSecurePayloadToPixels(pixels, confidentialData, passphrase);
    expect(success).toBe(true);

    // Extraction without passphrase
    const noSecretResult = await decodeSecurePayloadFromPixels(pixels);
    expect(noSecretResult.success).toBe(false);
    expect(noSecretResult.needsSecret).toBe(true);

    // Extraction with wrong passphrase
    const wrongSecretResult = await decodeSecurePayloadFromPixels(pixels, 'wrong-password-999');
    expect(wrongSecretResult.success).toBe(false);

    // Extraction with correct passphrase
    const correctResult = await decodeSecurePayloadFromPixels(pixels, passphrase);
    expect(correctResult.success).toBe(true);
    expect(correctResult.payload).toBe(confidentialData);
  });
});
