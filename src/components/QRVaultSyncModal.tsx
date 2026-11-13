import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Scan,
  Send,
  Upload,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import type { FinancePlan } from '../types/finance';
import { encodeVaultBeam, decodeVaultBeam } from '../lib/vaultBeam';

interface QRVaultSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  activeAccountName: string;
  onImportPlan: (importedPlan: FinancePlan, vaultName?: string) => void;
}

// Zero-dependency audio recognition chime when QR is detected
function playScanChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio failures
  }
}

export const QRVaultSyncModal: React.FC<QRVaultSyncModalProps> = ({
  isOpen,
  onClose,
  plan,
  activeAccountName,
  onImportPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'beam' | 'scan'>('beam');
  const [pinProtection, setPinProtection] = useState(false);
  const [beamPin, setBeamPin] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedString, setCopiedString] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Incoming scan resolution states
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [promptPinInput, setPromptPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [importedPreview, setImportedPreview] = useState<{
    plan: FinancePlan;
    vaultName: string;
    monthlyIncome: number;
    monthlyOutflow: number;
  } | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Generate compact, high-speed beam payload
  const activePin = pinProtection && beamPin.length >= 4 ? beamPin : undefined;
  const beamString = encodeVaultBeam(plan, activeAccountName, activePin);
  const directUrl = `${window.location.origin}${window.location.pathname}#beam=${beamString}`;

  // Render high-contrast, clean QR code canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'beam' || !qrCanvasRef.current) return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      directUrl,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#12141a',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('QR Render Error:', err);
      }
    );
  }, [isOpen, activeTab, directUrl]);

  // Clean up camera stream
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  // Handle incoming decoded beam payload
  const handlePayloadString = (rawText: string, pinToUse?: string) => {
    const result = decodeVaultBeam(rawText, pinToUse);

    if (result.needsPin) {
      setScannedRaw(rawText);
      setPinError(null);
      stopCamera();
      return;
    }

    if (!result.success || !result.plan) {
      if (scannedRaw) {
        setPinError(result.error || 'Incorrect PIN.');
      } else {
        setCameraError(result.error || 'Unrecognized QR code format.');
      }
      return;
    }

    // Success! Play recognition audio chime
    playScanChime();

    const p = result.plan;
    const inc = p.income.salary + p.income.freelance + p.income.other;
    const exp =
      p.expenses.housing +
      p.expenses.groceries +
      p.expenses.utilities +
      p.expenses.transport +
      p.expenses.insurance +
      p.expenses.lifestyle +
      (p.expenses.custom?.reduce((acc, c) => acc + c.amount, 0) || 0) +
      (p.debt?.monthlyPayment || 0);

    setImportedPreview({
      plan: p,
      vaultName: result.vaultName || 'Beamed Vault',
      monthlyIncome: inc,
      monthlyOutflow: exp,
    });
    setScannedRaw(null);
    setPinError(null);
    setCameraError(null);
    stopCamera();
  };

  // Start live device camera
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setCameraError(e.message || 'Camera permission denied or camera not found.');
      setCameraActive(false);
    }
  };

  // Switch between front & back camera
  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    stopCamera();
    startCamera(nextMode);
  };

  // Continuous frame scanning loop using jsQR
  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const canvas = scanCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handlePayloadString(code.data);
      return;
    }

    animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Handle uploaded image file scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handlePayloadString(code.data);
        } else {
          setCameraError('No QR code detected in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const confirmImport = () => {
    if (!importedPreview) return;
    onImportPlan(importedPreview.plan, importedPreview.vaultName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cross-Device QR Vault Beam">
      <div className="modal-card qr-sync-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header flex items-center justify-between gap-3 mb-4 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <QrCode size={16} className="text-quasar shrink-0" />
            <h3 className="modal-title font-semibold text-sm m-0 truncate">Cross-Device QR Vault Beam</h3>
          </div>
          <button type="button" className="icon-pill shrink-0 ml-auto" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher: Beam (Send) vs Scan (Receive) */}
        <div className="pill-segmented mb-3 w-full flex" role="tablist">
          <button
            type="button"
            className={`flex-1 flex-align justify-center gap-1.5 ${activeTab === 'beam' ? 'pill-active' : ''}`}
            onClick={() => { setActiveTab('beam'); setImportedPreview(null); setScannedRaw(null); }}
            role="tab"
            aria-selected={activeTab === 'beam'}
          >
            <Send size={12} />
            <span>Beam from Here (Send)</span>
          </button>
          <button
            type="button"
            className={`flex-1 flex-align justify-center gap-1.5 ${activeTab === 'scan' ? 'pill-active' : ''}`}
            onClick={() => { setActiveTab('scan'); setImportedPreview(null); }}
            role="tab"
            aria-selected={activeTab === 'scan'}
          >
            <Scan size={12} />
            <span>Scan Beam (Receive)</span>
          </button>
        </div>

        {/* TAB 1: BEAM OUT (DESKTOP / SENDER) */}
        {activeTab === 'beam' && (
          <div className="qr-tab-content beam-tab-wrap flex-column items-center text-center">
            {/* High-Contrast Fast-Scanning QR Code */}
            <div className="qr-canvas-holder">
              <canvas ref={qrCanvasRef} className="qr-code-canvas" />
            </div>

            {/* Optional 4-Digit Security PIN */}
            <div className="qr-pin-control-box mt-3 p-2.5 border border-subtle rounded-lg w-full flex-between items-center gap-2">
              <div className="flex-align gap-2 text-left min-w-0">
                {pinProtection ? <Lock size={14} className="text-solstice shrink-0" /> : <Unlock size={14} className="text-muted shrink-0" />}
                <div>
                  <span className="font-semibold text-xs block text-primary whitespace-nowrap">Lock with 4-Digit PIN</span>
                  <span className="text-[11px] text-muted block">Prevent unauthorized camera scans</span>
                </div>
              </div>

              <div className="flex-align gap-2 shrink-0">
                {pinProtection && (
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="PIN"
                    value={beamPin}
                    onChange={(e) => setBeamPin(e.target.value.replace(/\D/g, ''))}
                    className="qr-pin-input font-mono text-center text-xs"
                    autoFocus
                  />
                )}
                <button
                  type="button"
                  className={`action-pill ${pinProtection ? 'pill-active-mode' : ''}`}
                  onClick={() => {
                    const next = !pinProtection;
                    setPinProtection(next);
                    if (!next) setBeamPin('');
                  }}
                >
                  <span className="font-mono text-xs">{pinProtection ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>

            <div className="qr-privacy-pill font-mono text-[11px] flex items-center justify-center gap-1.5 my-3 mx-auto px-3.5 py-1.5">
              <ShieldCheck size={13} className="text-nebula shrink-0" />
              <span>100% Peer-to-Peer Visual Beam · Zero Server Sync</span>
            </div>

            {/* Alternative Direct Link & Copy Tools */}
            <div className="qr-beam-actions-grid mt-3 pt-3 border-t border-subtle w-full">
              <button
                type="button"
                className="btn-secondary font-mono text-xs flex items-center justify-center gap-1.5 w-full py-2"
                onClick={() => {
                  navigator.clipboard.writeText(directUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                title="Copy shareable browser link containing encrypted vault payload"
              >
                {copiedLink ? <Check size={12} className="text-nebula" /> : <LinkIcon size={12} />}
                <span>{copiedLink ? 'Copied Direct Link!' : 'Copy Direct Link'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary font-mono text-xs flex items-center justify-center gap-1.5 w-full py-2"
                onClick={() => {
                  navigator.clipboard.writeText(beamString);
                  setCopiedString(true);
                  setTimeout(() => setCopiedString(false), 2000);
                }}
                title="Copy raw encoded beam payload string"
              >
                {copiedString ? <Check size={12} className="text-nebula" /> : <Copy size={12} />}
                <span>{copiedString ? 'Copied String!' : 'Copy String'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SCAN IN (RECEIVER) */}
        {activeTab === 'scan' && (
          <div className="qr-tab-content scan-tab-wrap">
            {/* PIN Unlock Prompt if Vault was PIN-Protected */}
            {scannedRaw ? (
              <div className="pin-prompt-card p-4 border border-solstice rounded-xl bg-surface-overlay text-center">
                <Lock size={28} className="text-solstice mx-auto mb-2" />
                <h4 className="font-semibold text-sm text-primary m-0">This Beamed Vault is PIN-Protected</h4>
                <p className="text-xs text-secondary mt-1">
                  Enter the 4-digit PIN set by the sender to decrypt the payload:
                </p>

                <div className="mt-3 flex-align justify-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="4-digit PIN"
                    value={promptPinInput}
                    onChange={(e) => setPromptPinInput(e.target.value.replace(/\D/g, ''))}
                    className="qr-pin-input-large font-mono text-center text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-primary font-mono text-xs px-3"
                    onClick={() => handlePayloadString(scannedRaw, promptPinInput)}
                    disabled={promptPinInput.length < 4}
                  >
                    Unlock
                  </button>
                </div>

                {pinError && (
                  <p className="text-xs text-corona font-mono mt-2 m-0">{pinError}</p>
                )}

                <button
                  type="button"
                  className="link-btn font-mono text-xs mt-3 block mx-auto text-muted"
                  onClick={() => { setScannedRaw(null); setPromptPinInput(''); }}
                >
                  Cancel & Rescan
                </button>
              </div>
            ) : importedPreview ? (
              /* Confirmation Box */
              <div className="imported-confirmation-card p-4 border border-quasar rounded-xl bg-surface-overlay text-center">
                <Sparkles size={24} className="text-quasar mx-auto mb-2" />
                <h4 className="font-semibold text-sm text-primary m-0">Valid PsFi Beam Detected!</h4>
                <p className="text-xs text-secondary mt-1">
                  Ready to import vault: <strong>"{importedPreview.vaultName}"</strong>
                </p>

                <div className="metrics-preview-box font-mono text-xs mt-3 p-2.5 bg-surface-dock rounded-lg flex-between">
                  <span>Monthly Inflow: <strong className="text-nebula">+₹{importedPreview.monthlyIncome.toLocaleString('en-IN')}</strong></span>
                  <span>Living Outflows: <strong className="text-corona">-₹{importedPreview.monthlyOutflow.toLocaleString('en-IN')}</strong></span>
                </div>

                <div className="flex-align justify-center gap-2 mt-4">
                  <button
                    type="button"
                    className="btn-secondary font-mono text-xs"
                    onClick={() => setImportedPreview(null)}
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    className="btn-primary font-mono text-xs px-4"
                    onClick={confirmImport}
                  >
                    Import & Switch Vault
                  </button>
                </div>
              </div>
            ) : (
              /* Active Camera Scanner View */
              <div className="scanner-container flex-column items-center">
                {cameraActive ? (
                  <div className="video-viewport-wrapper">
                    <video ref={videoRef} className="scanner-video" />
                    <canvas ref={scanCanvasRef} hidden />
                    <div className="scanner-reticle">
                      <div className="reticle-corner corner-tl" />
                      <div className="reticle-corner corner-tr" />
                      <div className="reticle-corner corner-bl" />
                      <div className="reticle-corner corner-br" />
                      <div className="scanner-laser" />
                    </div>

                    {/* Camera Flip Button */}
                    <button
                      type="button"
                      className="camera-flip-btn"
                      onClick={flipCamera}
                      title="Flip between front and rear camera"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="camera-standby-box p-6 text-center border border-dashed border-subtle rounded-xl w-full">
                    <Scan size={36} className="text-muted mx-auto mb-2" />
                    <p className="text-xs text-secondary m-0">Camera is currently standby</p>
                    <button
                      type="button"
                      className="btn-primary font-mono text-xs mt-3 flex-align gap-1.5 mx-auto"
                      onClick={() => startCamera()}
                    >
                      <Scan size={13} />
                      <span>Start Camera Scanner</span>
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="error-banner font-mono text-xs text-corona flex-align gap-1.5 mt-2.5">
                    <AlertCircle size={13} />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Upload Image Fallback */}
                <div className="fallback-options-row flex-between items-center w-full mt-3 pt-3 border-t border-subtle">
                  <button
                    type="button"
                    className="btn-secondary font-mono text-xs flex-align gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={12} />
                    <span>Upload QR Screenshot</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    hidden
                  />

                  {cameraActive && (
                    <button
                      type="button"
                      className="btn-secondary font-mono text-xs"
                      onClick={stopCamera}
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
