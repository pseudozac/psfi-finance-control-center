import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock,
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
  Copy,
  Download,
  Upload,
  FolderArchive,
} from 'lucide-react';
import type { UserAccount } from '../types/account';
import { generatePinSalt, hashVaultPin, verifyVaultPin } from '../lib/vaultSecurity';
import { setAccountPin, removeAccountPin } from '../lib/accountStorage';
import { ensureActiveMasterKey, getLiveSessionMnemonic } from '../lib/encryptedVaultStorage';

interface VaultSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: UserAccount;
  onUpdateAccount: () => void;
  onLockNow: () => void;
  onExportAllVaults?: (secret: string) => Promise<void>;
  onImportAllVaults?: (file: File, secret: string) => Promise<{ accountsImported: number }>;
}

export const VaultSecurityModal: React.FC<VaultSecurityModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  onUpdateAccount,
  onLockNow,
  onExportAllVaults,
  onImportAllVaults,
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

  const [mnemonicPhrase, setMnemonicPhrase] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);

  const [archivePassword, setArchivePassword] = useState('');
  const [importArchivePassword, setImportArchivePassword] = useState('');
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getLiveSessionMnemonic();
      if (existing) {
        setMnemonicPhrase(existing);
      } else {
        ensureActiveMasterKey()
          .then(({ mnemonic }) => {
            setMnemonicPhrase(mnemonic);
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  const handleCopyMnemonic = useCallback(() => {
    if (!mnemonicPhrase) return;
    navigator.clipboard.writeText(mnemonicPhrase);
    setCopiedMnemonic(true);
    setTimeout(() => setCopiedMnemonic(false), 2000);
  }, [mnemonicPhrase]);

  const handleDownloadRecoveryKit = useCallback(() => {
    if (!mnemonicPhrase) return;
    const content = `================================================================================
PSFI PERSONAL FINANCE CONTROL CENTER — SOVEREIGN RECOVERY KIT
================================================================================

Vault Name: ${activeAccount.name}
Generated At: ${new Date().toISOString()}
Encryption: AES-256-GCM (W3C SubtleCrypto)
Key Derivation: PBKDF2-HMAC-SHA256 (600,000 rounds)

12-WORD BIP-39 RECOVERY MNEMONIC:
${mnemonicPhrase}

--------------------------------------------------------------------------------
INSTRUCTIONS FOR RESTORATION:
1. Open PsFi (https://pseudo-fi.vercel.app or local offline instance).
2. If your device is replaced or browser storage wiped, import your vault or
   use this 12-word recovery mnemonic to reconstruct your Master Vault Key.
3. Keep this file offline on a secure encrypted drive or paper backup.
4. Never share this recovery kit with anyone. Zero servers store your key.
================================================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psfi-recovery-kit-${activeAccount.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mnemonicPhrase, activeAccount.name]);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleExportArchive = useCallback(async () => {
    if (!onExportAllVaults) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const secret = archivePassword.trim() || mnemonicPhrase || '';
      await onExportAllVaults(secret);
      setSuccess('Master archive (.psfi.json) exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive export failed.');
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  }, [onExportAllVaults, archivePassword, mnemonicPhrase, triggerShake]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportAllVaults) return;
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      try {
        const secret = importArchivePassword.trim() || mnemonicPhrase || '';
        const result = await onImportAllVaults(file, secret);
        setSuccess(`Successfully restored ${result.accountsImported} vault(s) from encrypted master archive!`);
        onUpdateAccount();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to decrypt/restore archive. Check password.');
        triggerShake();
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onImportAllVaults, importArchivePassword, mnemonicPhrase, onUpdateAccount, triggerShake]
  );

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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
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
            <div className="vault-status-hud-card status-active">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} className="text-nebula" />
                  <span className="vault-enclave-title" style={{ fontSize: 13, fontWeight: 700 }}>
                    AES-256-GCM Sovereign Enclave Active
                  </span>
                </div>

                <span className="vault-enclave-tag font-mono">
                  INDEXEDDB ENCRYPTED
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                All accounts, salaries, emergency funds, and liabilities are encrypted at rest with an isolated 256-bit Master Vault Key. Zero servers, 100% offline.
              </p>
            </div>

            {/* 12-Word BIP-39 Recovery Seed Section */}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-xl)', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showMnemonic ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyRound size={14} className="text-solstice" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                    12-Word Sovereign Recovery Seed
                  </span>
                </div>
                <button
                  type="button"
                  className="link-btn font-mono"
                  style={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={() => setShowMnemonic(!showMnemonic)}
                >
                  {showMnemonic ? 'Hide Seed' : 'Reveal Seed'}
                </button>
              </div>

              {showMnemonic && mnemonicPhrase && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                    Write down these 12 words or download your recovery kit. This seed phrase allows complete disaster recovery across any device without a cloud account.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                    {mnemonicPhrase.split(' ').map((word, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 8,
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                        }}
                      >
                        <span style={{ color: 'var(--ink-muted)', fontSize: 10, width: 16 }}>{idx + 1}.</span>
                        <strong style={{ color: 'var(--ink-primary)' }}>{word}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      style={{ fontSize: 11, padding: '7px 10px', justifyContent: 'center', gap: 6 }}
                      onClick={handleCopyMnemonic}
                    >
                      <Copy size={12} />
                      <span>{copiedMnemonic ? 'Copied Seed!' : 'Copy 12 Words'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      style={{ fontSize: 11, padding: '7px 10px', justifyContent: 'center', gap: 6 }}
                      onClick={handleDownloadRecoveryKit}
                    >
                      <Download size={12} />
                      <span>Download Kit (.txt)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Master Vault Archive (Unified Multi-Vault Backup & Restore) */}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-xl)', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: archiveExpanded ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderArchive size={14} className="text-solstice" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                    Unified Encrypted Master Archive (.psfi.json)
                  </span>
                </div>
                <button
                  type="button"
                  className="link-btn font-mono"
                  style={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={() => setArchiveExpanded(!archiveExpanded)}
                >
                  {archiveExpanded ? 'Collapse' : 'Manage Archive'}
                </button>
              </div>

              {archiveExpanded && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                    Back up all vaults, plans, and baselines into one client-side AES-256-GCM bundle (PBKDF2 600,000 rounds). 100% portable disaster recovery across browsers or devices.
                  </p>

                  {/* Export subsection */}
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={12} className="text-emerald-400" />
                      <span>Export All Vaults (Encrypted Bundle)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="password"
                        placeholder="Passphrase (or leave blank to use 12-word seed)"
                        value={archivePassword}
                        onChange={(e) => setArchivePassword(e.target.value)}
                        className="vault-passphrase-input font-mono"
                        style={{
                          flex: 1,
                          minWidth: 180,
                          fontSize: 11,
                          padding: '6px 10px',
                          borderRadius: 6,
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isProcessing}
                        onClick={handleExportArchive}
                        style={{ fontSize: 11, padding: '6px 12px', gap: 6 }}
                      >
                        <Download size={12} />
                        <span>Download Archive</span>
                      </button>
                    </div>
                  </div>

                  {/* Restore subsection */}
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={12} className="text-solstice" />
                      <span>Restore All Vaults from Archive</span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json,.psfi.json"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="password"
                        placeholder="Archive decryption passphrase"
                        value={importArchivePassword}
                        onChange={(e) => setImportArchivePassword(e.target.value)}
                        className="vault-passphrase-input font-mono"
                        style={{
                          flex: 1,
                          minWidth: 180,
                          fontSize: 11,
                          padding: '6px 10px',
                          borderRadius: 6,
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isProcessing}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: 11, padding: '6px 12px', gap: 6 }}
                      >
                        <Upload size={12} />
                        <span>Select .psfi.json &amp; Restore</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

              <h4 style={{ margin: '4px 0 2px 0', fontSize: 15, fontWeight: 700, color: 'var(--ink-primary)' }}>
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
              <h4 style={{ margin: '4px 0 2px 0', fontSize: 15, fontWeight: 700, color: 'var(--ink-primary)' }}>
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
