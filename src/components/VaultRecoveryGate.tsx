import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Clipboard,
  Sparkles,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  ArrowRight,
  Check,
} from 'lucide-react';

interface VaultRecoveryGateProps {
  storageError: string | null;
  onRecover: (secret: string) => Promise<void>;
  onResetStorage: () => Promise<void>;
  onLaunchDemo: () => void;
  onRetry: () => void;
}

export const VaultRecoveryGate: React.FC<VaultRecoveryGateProps> = ({
  storageError,
  onRecover,
  onResetStorage,
  onLaunchDemo,
  onRetry,
}) => {
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Compute word count and mode
  const cleanTrimmed = secret.trim().replace(/\s+/g, ' ');
  const wordCount = cleanTrimmed ? cleanTrimmed.split(' ').length : 0;
  const is12WordMnemonic = wordCount === 12;

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSecret(text.trim());
          setError(null);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2000);
        }
      }
    } catch {
      // Clipboard read may be blocked by browser permissions
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanTrimmed || isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      await onRecover(cleanTrimmed);
    } catch {
      setShake(true);
      setError('Could not unlock the vault with that secret phrase. Please check spelling, word spacing, or casing.');
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetWithConfirm = async () => {
    const confirmed = window.confirm(
      'Reset local encrypted storage and launch a fresh vault?\n\n' +
      'This will erase any orphaned temporary storage in this browser profile and start fresh with the pre-configured demo vault.\n\n' +
      'Proceed with reset?'
    );
    if (confirmed) {
      await onResetStorage();
    }
  };

  return (
    <div className="vault-recovery-overlay" role="dialog" aria-modal="true" aria-label="Vault Storage Unlock">
      {/* Ambient Cyber Auras */}
      <div className="vault-recovery-aura" aria-hidden="true" />
      <div className="vault-recovery-grid" aria-hidden="true" />

      <main className={`vault-recovery-card ${shake ? 'gate-shake' : ''}`}>
        {/* Top Header Badge */}
        <div className="vault-recovery-header">
          <div className="vault-shield-crest crest-alert" aria-hidden="true">
            <KeyRound size={22} className="text-solstice" />
          </div>

          <div className="vault-security-tagline">
            <span className="cyber-pulse-dot" />
            <span className="font-mono text-xs text-solstice font-semibold">AES-256-GCM · PBKDF2</span>
            <span className="text-muted">·</span>
            <span className="font-mono text-xs text-muted">100% PRIVATE & OFFLINE</span>
          </div>

          <h1 className="vault-recovery-title">
            Vault Unlock Required<span className="text-solstice">.</span>
          </h1>

          <p className="vault-recovery-sub">
            {storageError?.includes('upgrading device storage')
              ? 'This browser profile contains an encrypted vault created before automatic session unlock was configured. Enter your 12-word recovery mnemonic or passphrase to re-derive your Master Vault Key.'
              : (storageError ?? 'This browser contains an encrypted local vault. Enter your 12-word recovery mnemonic or passphrase to re-derive your Master Vault Key.')}
          </p>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleSubmit} className="vault-recovery-form">
          <div className="vault-input-group">
            <div className="vault-input-header">
              <label htmlFor="recovery-secret-input" className="vault-input-label">
                Recovery Secret / Seed Phrase
              </label>

              <div className="vault-input-actions">
                <button
                  type="button"
                  className="vault-action-micro-btn"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                >
                  {copiedNotification ? (
                    <>
                      <Check size={11} className="text-nebula" />
                      <span className="text-nebula">Pasted!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard size={11} />
                      <span>Paste</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="vault-action-micro-btn"
                  onClick={() => setShowSecret(!showSecret)}
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{showSecret ? 'Mask' : 'Reveal'}</span>
                </button>
              </div>
            </div>

            <div className="vault-textarea-wrapper">
              <textarea
                id="recovery-secret-input"
                name="recovery"
                rows={3}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="twelve words separated by single spaces or your custom vault passphrase..."
                className={`vault-textarea font-mono ${showSecret ? 'is-revealed' : 'is-masked'}`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                required
              />
            </div>

            {/* Smart Detection Tag */}
            <div className="vault-phrase-detector">
              {is12WordMnemonic ? (
                <span className="phrase-badge badge-mnemonic">
                  <ShieldCheck size={11} />
                  <span>12-Word Recovery Seed Detected</span>
                </span>
              ) : wordCount > 0 ? (
                <span className="phrase-badge badge-passphrase">
                  <Lock size={11} />
                  <span>Passphrase Mode ({wordCount} {wordCount === 1 ? 'word' : 'words'})</span>
                </span>
              ) : (
                <span className="phrase-badge badge-waiting">
                  <span>Awaiting 12-word seed or passphrase</span>
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="vault-error-alert" role="alert">
              <AlertCircle size={14} className="shrink-0 text-flare" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Unlock CTA */}
          <button
            type="submit"
            className="vault-cyber-gradient-btn"
            disabled={!cleanTrimmed || isVerifying}
          >
            {isVerifying ? (
              <>
                <RotateCcw size={15} className="animate-spin text-white" />
                <span>Deriving Master Vault Key (PBKDF2)...</span>
              </>
            ) : (
              <>
                <KeyRound size={15} />
                <span>Unlock &amp; Resume Vault</span>
              </>
            )}
          </button>
        </form>

        {/* Explainer Accordion */}
        <div className="vault-explainer-section">
          <button
            type="button"
            className="vault-explainer-toggle"
            onClick={() => setShowExplainer(!showExplainer)}
            aria-expanded={showExplainer}
          >
            <div className="flex-align gap-2">
              <HelpCircle size={13} className="text-solstice" />
              <span>Why am I seeing this authorization prompt?</span>
            </div>
            {showExplainer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showExplainer && (
            <div className="vault-explainer-content">
              <p>
                PsFi encrypts all financial portfolios inside your browser's IndexedDB using <strong>AES-256-GCM</strong>.
              </p>
              <p>
                When opening PsFi from an incognito window, clearing browser session cache, or visiting from a fresh tab before automatic device unlock is completed, authorization is required to safely decrypt your records.
              </p>
              <p className="text-muted text-xs">
                Your data is stored 100% on this computer and never transmitted to external servers.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="vault-divider-bar">
          <span className="vault-divider-line" />
          <span className="vault-divider-text font-mono">ALTERNATIVE OPTIONS</span>
          <span className="vault-divider-line" />
        </div>

        {/* Alternative Escape Hatches */}
        <div className="vault-alternative-actions">
          <button
            type="button"
            className="vault-alt-btn btn-launch-demo"
            onClick={onLaunchDemo}
            title="Open interactive demo profile without entering secret phrase"
          >
            <div className="alt-btn-left">
              <Sparkles size={14} className="text-quasar" />
              <div className="alt-btn-text">
                <span className="alt-btn-title">Explore with Demo Vault</span>
                <span className="alt-btn-desc">Pre-configured Indian tech professional model</span>
              </div>
            </div>
            <ArrowRight size={13} className="text-muted" />
          </button>

          <button
            type="button"
            className="vault-alt-btn btn-reset-clean"
            onClick={handleResetWithConfirm}
            title="Erase stranded local test storage and start completely clean"
          >
            <div className="alt-btn-left">
              <RotateCcw size={14} className="text-corona" />
              <div className="alt-btn-text">
                <span className="alt-btn-title">Reset Storage &amp; Start Fresh</span>
                <span className="alt-btn-desc">Wipe orphaned local database and reload cleanly</span>
              </div>
            </div>
            <ArrowRight size={13} className="text-muted" />
          </button>

          <button
            type="button"
            className="vault-retry-link"
            onClick={onRetry}
            title="Reload browser connection"
          >
            <RotateCcw size={12} />
            <span>Retry Connection</span>
          </button>
        </div>
      </main>
    </div>
  );
};
