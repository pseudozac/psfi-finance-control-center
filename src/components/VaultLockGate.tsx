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
        }, 600);
      }
    } catch {
      setError('Cryptographic verification failed.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Other vaults that the user could switch to
  const otherAccounts = accounts.filter((a) => a.id !== account.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e] p-4 text-white select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div
        className={`relative w-full max-w-sm rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#131722]/95 to-[#0b0e17]/95 p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Emblem Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Vault Locked</span>
          </h2>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
              {account.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Enter your 4-digit master PIN to decrypt and unlock this vault.
          </p>
        </div>

        {/* PIN Dot Indicators */}
        <div className="flex items-center justify-center gap-4 my-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-110'
                    : 'border-2 border-slate-700 bg-slate-900/50'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-400 animate-fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              disabled={isVerifying}
              className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-xl font-semibold text-slate-100 hover:bg-slate-700/50 active:scale-95 transition-all shadow-sm focus:outline-none focus:border-amber-500/50"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin('')}
            disabled={isVerifying || pin.length === 0}
            className="h-14 rounded-2xl bg-transparent border border-transparent text-xs font-medium text-slate-400 hover:text-slate-200 active:scale-95 transition-all disabled:opacity-30"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            disabled={isVerifying}
            className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-xl font-semibold text-slate-100 hover:bg-slate-700/50 active:scale-95 transition-all shadow-sm focus:outline-none focus:border-amber-500/50"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            className="h-14 rounded-2xl bg-transparent border border-transparent text-xs font-medium text-slate-400 hover:text-rose-300 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
          >
            Delete
          </button>
        </div>

        {/* Footer / Switch Vault Option */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-2">
          {otherAccounts.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Switch vault:</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {otherAccounts.map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    onClick={() => onSwitchAccount(other.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs transition-colors"
                  >
                    {other.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5 pt-1">
            <KeyRound className="w-3 h-3 text-slate-500" />
            <span>Zero-Cloud SHA-256 Salted Cryptographic Enclave</span>
          </div>
        </div>
      </div>
    </div>
  );
};
