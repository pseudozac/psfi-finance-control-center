import React, { useState } from 'react';
import { Shield, Lock, Unlock, CheckCircle, AlertTriangle, X } from 'lucide-react';
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
      setError('PINs do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      const salt = generatePinSalt();
      const hash = await hashVaultPin(newPin, salt);
      setAccountPin(activeAccount.id, hash, salt, 0);
      onUpdateAccount();
      setSuccess('Vault PIN successfully configured! Vault is now secured.');
      setTimeout(() => {
        setMode('overview');
        resetForm();
      }, 1200);
    } catch {
      setError('Failed to configure PIN encryption.');
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
      }, 1200);
    } catch {
      setError('Failed to remove PIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f1422] p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isProtected ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Vault Security & PIN Lock</h3>
              <p className="text-xs text-slate-400">{activeAccount.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-5 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isProtected ? (
              <Lock className="w-5 h-5 text-amber-400" />
            ) : (
              <Unlock className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <div className="text-xs font-semibold text-white">
                {isProtected ? 'PIN Lock Enabled' : 'No PIN Configured'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isProtected
                  ? 'Vault locks on refresh, tab switch, or manual lock.'
                  : 'Anyone with access to this browser can inspect this vault.'}
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
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
            >
              Lock Now
            </button>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* View: Overview */}
        {mode === 'overview' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Master PIN locks protect your financial net worth, salary, investments, and projections against physical snoopers when leaving your device unattended.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              {!isProtected ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('set');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Lock className="w-4 h-4" />
                  <span>Set 4-Digit Vault PIN</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode('set');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Change PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode('remove');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-800/40 transition-colors"
                  >
                    Remove PIN
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View: Set / Change PIN */}
        {mode === 'set' && (
          <form onSubmit={handleSetNewPin} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('overview');
                  resetForm();
                }}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || newPin.length !== 4 || confirmPin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Hashing...' : 'Save & Protect'}
              </button>
            </div>
          </form>
        )}

        {/* View: Remove PIN */}
        {mode === 'remove' && (
          <form onSubmit={handleRemovePin} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your current 4-digit PIN to remove protection from this vault.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current PIN
              </label>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('overview');
                  resetForm();
                }}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || currentPin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Verifying...' : 'Confirm Remove'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
