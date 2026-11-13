import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  X,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
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

  const [mode, setMode] = useState<'overview' | 'set' | 'remove' | 'change'>('overview');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPlainPin, setShowPlainPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
    setSuccess(null);
  };

  const handleSetNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Please verify.');
      return;
    }

    setIsProcessing(true);
    try {
      const salt = generatePinSalt();
      const hash = await hashVaultPin(newPin, salt);
      setAccountPin(activeAccount.id, hash, salt, 0);
      onUpdateAccount();
      setSuccess('Vault secured! Master PIN is active.');
      setTimeout(() => {
        setMode('overview');
        resetForm();
      }, 1000);
    } catch {
      setError('Cryptographic key generation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activeAccount.pinSalt || !activeAccount.pinHash) return;

    setIsProcessing(true);
    try {
      const isValid = await verifyVaultPin(currentPin, activeAccount.pinSalt, activeAccount.pinHash);
      if (!isValid) {
        setError('Current PIN is incorrect.');
        setIsProcessing(false);
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
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vault Security & Master PIN Lock"
    >
      <div
        className="modal-card vault-security-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align gap-2.5">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isProtected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                border: isProtected ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-subtle)',
                color: isProtected ? 'var(--colour-solstice)' : 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isProtected ? <ShieldCheck size={18} /> : <Shield size={18} />}
            </div>
            <div>
              <h3 className="modal-title font-semibold text-sm m-0">Vault Security &amp; PIN Lock</h3>
              <span className="font-mono text-xs text-muted">
                {activeAccount.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-pill"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Security Status Card */}
        <div className={`vault-security-status-card ${isProtected ? 'status-active' : ''}`}>
          <div className="flex-align gap-2.5">
            {isProtected ? (
              <Lock size={16} className="text-solstice" />
            ) : (
              <Unlock size={16} className="text-muted" />
            )}
            <div>
              <div className="font-semibold text-xs" style={{ color: isProtected ? '#fef3c7' : 'inherit' }}>
                {isProtected ? '4-Digit Master PIN Enabled' : 'No PIN Configured'}
              </div>
              <div className="font-mono text-xs text-muted" style={{ fontSize: 11 }}>
                {isProtected
                  ? 'Guarded with SHA-256 salted client-side encryption.'
                  : 'Open vault — anyone on this machine can view financial data.'}
              </div>
            </div>
          </div>

          {isProtected && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLockNow();
              }}
              className="btn-secondary"
              style={{
                borderColor: 'rgba(245,158,11,0.4)',
                color: 'var(--colour-solstice)',
                padding: '4px 10px',
                fontSize: 11,
              }}
              title="Lock immediately (Alt+L)"
            >
              <Lock size={11} />
              <span>Lock Now</span>
            </button>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#6ee7b7',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <CheckCircle size={14} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* VIEW: OVERVIEW */}
        {mode === 'overview' && (
          <div>
            <p className="text-xs text-muted leading-relaxed mb-4">
              A 4-digit master PIN encrypts your on-screen balances, salary, and investments. PsFi will automatically prompt for this PIN on launch, refresh, or when you trigger <strong>Alt + L</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!isProtected ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('set');
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: 12.5,
                  }}
                >
                  <Lock size={14} />
                  <span>Set 4-Digit Vault PIN</span>
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode('set');
                    }}
                    className="btn-secondary flex-1"
                    style={{ justifyContent: 'center', padding: '8px 12px' }}
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
                      padding: '8px 12px',
                      color: 'var(--colour-corona)',
                      borderColor: 'rgba(242, 139, 173, 0.35)',
                    }}
                  >
                    Remove Protection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SET / CHANGE PIN */}
        {mode === 'set' && (
          <form onSubmit={handleSetNewPin}>
            <div className="vault-pin-input-group">
              <div className="flex-between items-center">
                <label className="text-xs font-semibold">Enter 4-Digit PIN</label>
                <button
                  type="button"
                  onClick={() => setShowPlainPin(!showPlainPin)}
                  className="text-xs text-muted flex-align gap-1 hover:text-white"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPlainPin ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{showPlainPin ? 'Hide' : 'Peek'}</span>
                </button>
              </div>
              <input
                type={showPlainPin ? 'text' : 'password'}
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="vault-pin-input-field"
              />
            </div>

            <div className="vault-pin-input-group">
              <label className="text-xs font-semibold">Confirm 4-Digit PIN</label>
              <input
                type={showPlainPin ? 'text' : 'password'}
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="vault-pin-input-field"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
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
              <button
                type="submit"
                disabled={isProcessing || newPin.length !== 4 || confirmPin.length !== 4}
                className="btn-primary flex-1"
                style={{ justifyContent: 'center' }}
              >
                {isProcessing ? 'Hashing...' : 'Save & Secure'}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: REMOVE PIN */}
        {mode === 'remove' && (
          <form onSubmit={handleRemovePin}>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Enter your current 4-digit PIN to disable lock protection on this vault.
            </p>

            <div className="vault-pin-input-group">
              <label className="text-xs font-semibold">Current 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="vault-pin-input-field"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
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
              <button
                type="submit"
                disabled={isProcessing || currentPin.length !== 4}
                className="btn-secondary flex-1"
                style={{
                  justifyContent: 'center',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#fca5a5',
                }}
              >
                {isProcessing ? 'Verifying...' : 'Remove PIN'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Note */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'var(--ink-muted)',
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <KeyRound size={11} />
          <span>Zero-Cloud SHA-256 Salted WebCrypto Enclave</span>
        </div>
      </div>
    </div>
  );
};
