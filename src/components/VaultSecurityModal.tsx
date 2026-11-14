import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Delete,
  Zap,
} from 'lucide-react';
import type { UserAccount } from '../types/account';
import { generatePinSalt, hashVaultPin, verifyVaultPin } from '../lib/vaultSecurity';
import { setAccountPin, removeAccountPin } from '../lib/accountStorage';

interface VaultSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: UserAccount;
  onUpdateAccount: () => void;
  onLockNow: () => void;
}

export const VaultSecurityModal: React.FC<VaultSecurityModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  onUpdateAccount,
  onLockNow,
}) => {
  const isProtected = Boolean(activeAccount.pinHash && activeAccount.pinSalt);

  const [mode, setMode] = useState<'overview' | 'set' | 'remove'>('overview');
  const [setStep, setSetStep] = useState<'create' | 'confirm'>('create');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [removePin, setRemovePin] = useState('');
  const [showPlainPin, setShowPlainPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shake, setShake] = useState(false);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const resetForm = useCallback(() => {
    setNewPin('');
    setConfirmPin('');
    setRemovePin('');
    setSetStep('create');
    setError(null);
    setSuccess(null);
    setShowPlainPin(false);
  }, []);

  // When opening or mode changes, auto-focus hidden input for physical keyboard entry
  useEffect(() => {
    if (isOpen) {
      hiddenInputRef.current?.focus();
    }
  }, [isOpen, mode, setStep]);

  // Current active value for keypad / display depending on mode & step
  const activeValue =
    mode === 'remove'
      ? removePin
      : setStep === 'create'
      ? newPin
      : confirmPin;

  // Handle digit input
  const handleDigitPress = useCallback(
    (digit: string) => {
      setError(null);
      if (mode === 'set') {
        if (setStep === 'create') {
          if (newPin.length < 4) {
            const updated = newPin + digit;
            setNewPin(updated);
            if (updated.length === 4) {
              // Automatically advance to confirm step after slight delay
              setTimeout(() => {
                setSetStep('confirm');
              }, 180);
            }
          }
        } else {
          if (confirmPin.length < 4) {
            const updated = confirmPin + digit;
            setConfirmPin(updated);
            if (updated.length === 4) {
              // Automatically verify confirmation
              if (updated !== newPin) {
                triggerShake();
                setError('PINs do not match. Please re-enter.');
                setTimeout(() => {
                  setConfirmPin('');
                }, 350);
              } else {
                // Save new PIN
                (async () => {
                  setIsProcessing(true);
                  try {
                    const salt = generatePinSalt();
                    const hash = await hashVaultPin(newPin, salt);
                    setAccountPin(activeAccount.id, hash, salt, 0);
                    onUpdateAccount();
                    setSuccess('Vault Defense Active! Master PIN is set.');
                    setTimeout(() => {
                      setMode('overview');
                      resetForm();
                    }, 1200);
                  } catch {
                    setError('Cryptographic key generation failed.');
                  } finally {
                    setIsProcessing(false);
                  }
                })();
              }
            }
          }
        }
      } else if (mode === 'remove') {
        if (removePin.length < 4) {
          const updated = removePin + digit;
          setRemovePin(updated);
          if (updated.length === 4) {
            // Verify and remove
            (async () => {
              if (!activeAccount.pinSalt || !activeAccount.pinHash) return;
              setIsProcessing(true);
              try {
                const isValid = await verifyVaultPin(updated, activeAccount.pinSalt, activeAccount.pinHash);
                if (!isValid) {
                  triggerShake();
                  setError('Current PIN is incorrect.');
                  setTimeout(() => setRemovePin(''), 350);
                  return;
                }
                removeAccountPin(activeAccount.id);
                onUpdateAccount();
                setSuccess('Vault PIN lock removed.');
                setTimeout(() => {
                  setMode('overview');
                  resetForm();
                }, 1000);
              } catch {
                setError('Failed to remove PIN.');
              } finally {
                setIsProcessing(false);
              }
            })();
          }
        }
      }
    },
    [mode, setStep, newPin, confirmPin, removePin, activeAccount, onUpdateAccount, resetForm, triggerShake]
  );

  // Handle backspace / delete
  const handleDeletePress = useCallback(() => {
    setError(null);
    if (mode === 'set') {
      if (setStep === 'create') {
        setNewPin((prev) => prev.slice(0, -1));
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    } else if (mode === 'remove') {
      setRemovePin((prev) => prev.slice(0, -1));
    }
  }, [mode, setStep]);

  // Handle clear all
  const handleClearPress = useCallback(() => {
    setError(null);
    if (mode === 'set') {
      if (setStep === 'create') {
        setNewPin('');
      } else {
        setConfirmPin('');
      }
    } else if (mode === 'remove') {
      setRemovePin('');
    }
  }, [mode, setStep]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode !== 'overview') {
          setMode('overview');
          resetForm();
        } else {
          onClose();
        }
        return;
      }

      if (mode === 'overview') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeletePress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, handleDigitPress, handleDeletePress, onClose, resetForm]);

  if (!isOpen) return null;

  return (
    <div
      className="vault-security-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vault Defense & Master PIN Lock"
    >
      {/* Background radial ambient halo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className={`vault-security-modal-card ${shake ? 'gate-shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invisible input to capture physical keyboard focus */}
        <input
          ref={hiddenInputRef}
          type="text"
          inputMode="numeric"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`vault-shield-crest ${isProtected ? 'crest-active' : ''}`}>
              {isProtected ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Vault Security &amp; Defense
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: isProtected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: isProtected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                    color: isProtected ? '#34d399' : '#f87171',
                  }}
                >
                  {isProtected ? 'ARMED' : 'EXPOSED'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  Vault: <strong style={{ color: 'var(--ink-secondary)' }}>{activeAccount.name}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="icon-pill"
            onClick={onClose}
            title="Close (Esc)"
            style={{ width: 34, height: 34 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Alerts / Notifications */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#6ee7b7',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <CheckCircle size={15} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ---------------- VIEW 1: OVERVIEW DASHBOARD ---------------- */}
        {mode === 'overview' && (
          <div>
            {/* Status HUD Card */}
            <div className={`vault-status-hud-card ${isProtected ? 'status-active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isProtected ? (
                    <Lock size={16} className="text-solstice" />
                  ) : (
                    <Unlock size={16} style={{ color: '#f87171' }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: isProtected ? '#fef3c7' : '#fecaca' }}>
                    {isProtected ? 'SHA-256 Client Enclave Active' : 'Unencrypted Local Storage'}
                  </span>
                </div>

                {/* Defense Meter */}
                <div className="vault-meter-dots">
                  <div className={`vault-meter-bar ${isProtected ? 'active-emerald' : 'active-amber'}`} />
                  <div className={`vault-meter-bar ${isProtected ? 'active-emerald' : ''}`} />
                  <div className={`vault-meter-bar ${isProtected ? 'active-emerald' : ''}`} />
                  <div className={`vault-meter-bar ${isProtected ? 'active-emerald' : ''}`} />
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                {isProtected
                  ? 'Your net worth, income, investments, and fire projections are shielded behind your 4-digit master PIN. The vault auto-locks on refresh or inactivity.'
                  : 'Anyone with access to this browser tab can view your net worth, salary, and assets. Arm a 4-digit master PIN to secure your financial records.'}
              </p>
            </div>

            {/* 3 Tactical Feature Highlights */}
            <div className="vault-features-grid">
              <div className="vault-feature-mini-card">
                <div className="vault-feature-mini-title">
                  <Zap size={13} className="text-solstice" />
                  <span>Alt + L Lock</span>
                </div>
                <div className="vault-feature-mini-desc">
                  Instant panic key drops the blast shield immediately.
                </div>
              </div>

              <div className="vault-feature-mini-card">
                <div className="vault-feature-mini-title">
                  <KeyRound size={13} style={{ color: 'var(--colour-quasar)' }} />
                  <span>Zero-Cloud</span>
                </div>
                <div className="vault-feature-mini-desc">
                  16-byte random salt + SHA-256 never leaves device.
                </div>
              </div>

              <div className="vault-feature-mini-card">
                <div className="vault-feature-mini-title">
                  <ShieldCheck size={13} className="text-nebula" />
                  <span>Auto-Arm</span>
                </div>
                <div className="vault-feature-mini-desc">
                  Locks upon reload, tab restore, or manual trigger.
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!isProtected ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('set');
                    setSetStep('create');
                  }}
                  className="vault-cyber-gradient-btn"
                >
                  <Lock size={16} />
                  <span>SET 4-DIGIT VAULT PIN</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockNow();
                    }}
                    className="vault-cyber-lock-now-btn"
                    title="Lock vault immediately (Alt + L)"
                  >
                    <Lock size={15} />
                    <span>Lock Vault Immediately (Alt + L)</span>
                  </button>

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setMode('set');
                        setSetStep('create');
                      }}
                      className="btn-secondary flex-1"
                      style={{ justifyContent: 'center', padding: '10px 14px', fontSize: 12 }}
                    >
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setMode('remove');
                      }}
                      className="btn-secondary flex-1"
                      style={{
                        justifyContent: 'center',
                        padding: '10px 14px',
                        fontSize: 12,
                        color: 'var(--colour-corona)',
                        borderColor: 'rgba(242, 139, 173, 0.35)',
                      }}
                    >
                      Remove Protection
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---------------- VIEW 2: SET / CHANGE PIN ---------------- */}
        {mode === 'set' && (
          <div>
            {/* Step Header */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-muted)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: setStep === 'create' ? 'var(--colour-solstice)' : 'var(--ink-muted)', fontWeight: 700 }}>
                  1. Set PIN
                </span>
                <ArrowRight size={10} />
                <span style={{ color: setStep === 'confirm' ? 'var(--colour-solstice)' : 'var(--ink-muted)', fontWeight: 700 }}>
                  2. Confirm
                </span>
              </div>

              <h4 style={{ margin: '4px 0 2px 0', fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                {setStep === 'create' ? 'Choose Your 4-Digit Master PIN' : 'Confirm Your 4-Digit Master PIN'}
              </h4>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)' }}>
                {setStep === 'create'
                  ? 'Type on your keyboard or tap the keypad below.'
                  : 'Re-enter the exact 4-digit code to activate encryption.'}
              </p>
            </div>

            {/* Peek / Hide toggle */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => setShowPlainPin(!showPlainPin)}
                className="text-xs text-muted flex-align gap-1 hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  padding: '3px 9px',
                  fontSize: 11,
                }}
              >
                {showPlainPin ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showPlainPin ? 'Hide' : 'Peek'}</span>
              </button>
            </div>

            {/* 4-Digit Holographic Glass Slots */}
            <div className="vault-pin-slots-row">
              {[0, 1, 2, 3].map((idx) => {
                const char = activeValue[idx];
                const isActive = activeValue.length === idx;
                const isFilled = activeValue.length > idx;
                return (
                  <div
                    key={idx}
                    className={`vault-pin-slot ${isActive ? 'slot-active' : ''} ${isFilled ? 'slot-filled' : ''}`}
                  >
                    {isFilled ? (
                      showPlainPin ? (
                        <span>{char}</span>
                      ) : (
                        <div className="vault-slot-dot" />
                      )
                    ) : isActive ? (
                      <span style={{ color: 'var(--colour-solstice)', fontSize: 16, opacity: 0.6 }}>•</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Tactile 3x4 Cyber Keypad */}
            <div className="vault-keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="vault-keypad-btn"
                  onClick={() => handleDigitPress(digit)}
                  disabled={isProcessing}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="vault-keypad-btn btn-action"
                onClick={handleClearPress}
                disabled={isProcessing || activeValue.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="vault-keypad-btn"
                onClick={() => handleDigitPress('0')}
                disabled={isProcessing}
              >
                0
              </button>
              <button
                type="button"
                className="vault-keypad-btn btn-action"
                onClick={handleDeletePress}
                disabled={isProcessing || activeValue.length === 0}
                title="Backspace"
              >
                <Delete size={18} />
              </button>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {setStep === 'confirm' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSetStep('create');
                    setConfirmPin('');
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                  style={{ justifyContent: 'center' }}
                >
                  <ArrowLeft size={13} />
                  <span>Back to Step 1</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('overview');
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                  style={{ justifyContent: 'center' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------------- VIEW 3: REMOVE PIN ---------------- */}
        {mode === 'remove' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: '4px 0 2px 0', fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Disable Vault Protection
              </h4>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)' }}>
                Enter your current 4-digit Master PIN to unlock and remove encryption.
              </p>
            </div>

            {/* 4-Digit Glass Slots */}
            <div className="vault-pin-slots-row">
              {[0, 1, 2, 3].map((idx) => {
                const char = removePin[idx];
                const isActive = removePin.length === idx;
                const isFilled = removePin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`vault-pin-slot ${isActive ? 'slot-active' : ''} ${isFilled ? 'slot-filled' : ''}`}
                  >
                    {isFilled ? (
                      showPlainPin ? (
                        <span>{char}</span>
                      ) : (
                        <div className="vault-slot-dot" />
                      )
                    ) : isActive ? (
                      <span style={{ color: 'var(--colour-solstice)', fontSize: 16, opacity: 0.6 }}>•</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Tactile Keypad */}
            <div className="vault-keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="vault-keypad-btn"
                  onClick={() => handleDigitPress(digit)}
                  disabled={isProcessing}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="vault-keypad-btn btn-action"
                onClick={handleClearPress}
                disabled={isProcessing || removePin.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="vault-keypad-btn"
                onClick={() => handleDigitPress('0')}
                disabled={isProcessing}
              >
                0
              </button>
              <button
                type="button"
                className="vault-keypad-btn btn-action"
                onClick={handleDeletePress}
                disabled={isProcessing || removePin.length === 0}
                title="Backspace"
              >
                <Delete size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setMode('overview');
                  resetForm();
                }}
                disabled={isProcessing}
                className="btn-secondary flex-1"
                style={{ justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* High-Tech Telemetry Footer */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'var(--ink-muted)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          <KeyRound size={11} className="text-solstice" />
          <span>ZERO-CLOUD SHA-256 SALTED ENCLAVE • NEVER TRANSMITTED</span>
        </div>
      </div>
    </div>
  );
};
