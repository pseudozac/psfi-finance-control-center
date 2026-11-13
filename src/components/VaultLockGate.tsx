import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';
import type { UserAccount } from '../types/account';
import { verifyVaultPin } from '../lib/vaultSecurity';

interface VaultLockGateProps {
  account: UserAccount;
  accounts: UserAccount[];
  onUnlock: () => void;
  onSwitchAccount: (accountId: string) => void;
}

export const VaultLockGate: React.FC<VaultLockGateProps> = ({
  account,
  accounts,
  onUnlock,
  onSwitchAccount,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  // Focus and listen for hardware keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea if any
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          handleDigitPress(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          verifyPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, account]);

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 4 || isVerifying) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(null);

    // Auto verify when 4th digit is entered
    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = async (candidatePin: string) => {
    if (!account.pinHash || !account.pinSalt) {
      onUnlock();
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyVaultPin(candidatePin, account.pinSalt, account.pinHash);
      if (isValid) {
        onUnlock();
      } else {
        setShake(true);
        setError('Incorrect PIN. Access denied.');
        setTimeout(() => {
          setShake(false);
          setPin('');
        }, 500);
      }
    } catch {
      setError('Cryptographic verification failed.');
      setPin('');
    } finally {
      setIsProcessingFalse();
    }
  };

  const setIsProcessingFalse = () => {
    setIsVerifying(false);
  };

  // Other vaults that the user could switch to
  const otherAccounts = accounts.filter((a) => a.id !== account.id);

  return (
    <div className="modal-backdrop" style={{ zIndex: 99999, background: 'rgba(3, 5, 10, 0.94)' }}>
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(247, 141, 44, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className={`modal-card vault-lock-gate-card ${shake ? 'gate-shake' : ''}`}
        style={{ zIndex: 1 }}
      >
        {/* Emblem Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: 'rgba(247, 141, 44, 0.12)',
              border: '1px solid rgba(247, 141, 44, 0.35)',
              color: 'var(--colour-solstice)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(247, 141, 44, 0.25)',
              marginBottom: 14,
            }}
          >
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Vault Locked
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                padding: '2px 10px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--ink-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {account.name}
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8, marginBottom: 0 }}>
            Enter your 4-digit PIN to decrypt this ledger.
          </p>
        </div>

        {/* PIN Dot Indicators */}
        <div className="vault-pin-dots">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`vault-pin-dot ${isFilled ? 'dot-filled' : ''}`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--colour-corona)',
              marginBottom: 14,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <ShieldAlert size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="vault-keypad-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              disabled={isVerifying}
              className="vault-keypad-btn"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin('')}
            disabled={isVerifying || pin.length === 0}
            className="vault-keypad-btn btn-action"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            disabled={isVerifying}
            className="vault-keypad-btn"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            className="vault-keypad-btn btn-action"
            style={{ color: 'var(--colour-corona)' }}
          >
            Del
          </button>
        </div>

        {/* Footer / Switch Vault Option */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {otherAccounts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
              <span className="text-muted">Switch vault:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {otherAccounts.map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    onClick={() => onSwitchAccount(other.id)}
                    className="btn-secondary"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    {other.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <KeyRound size={11} />
            <span>Zero-Cloud SHA-256 Client-Side Enclave</span>
          </div>
        </div>
      </div>
    </div>
  );
};
