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
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import type { FinancePlan } from '../types/finance';

interface QRVaultSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  activeAccountName: string;
  onImportPlan: (importedPlan: FinancePlan, vaultName?: string) => void;
}

export const QRVaultSyncModal: React.FC<QRVaultSyncModalProps> = ({
  isOpen,
  onClose,
  plan,
  activeAccountName,
  onImportPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'beam' | 'scan'>('beam');
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  // Compact payload structure for high-density QR representation
  const payloadObject = {
    v: 1,
    app: 'psfi',
    name: activeAccountName,
    plan,
    ts: Date.now(),
  };
  const payloadString = JSON.stringify(payloadObject);

  // Generate QR code when Beam tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'beam' || !qrCanvasRef.current) return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      payloadString,
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
  }, [isOpen, activeTab, payloadString]);

  // Clean up camera stream when closing or switching tabs
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

  // Process incoming scanned text payload
  const handlePayloadString = (rawText: string) => {
    try {
      const parsed = JSON.parse(rawText);
      if (!parsed || parsed.app !== 'psfi' || !parsed.plan) {
        setCameraError('Unrecognized QR code. Please scan a valid PsFi vault QR code.');
        return;
      }

      const p = parsed.plan as FinancePlan;
      const inc = p.income.salary + p.income.freelance + p.income.other;
      const exp =
        p.expenses.housing +
        p.expenses.groceries +
        p.expenses.utilities +
        p.expenses.transport +
        p.expenses.insurance +
        p.expenses.lifestyle +
        (p.expenses.custom?.reduce((acc: number, c: { amount: number }) => acc + c.amount, 0) || 0) +
        (p.debt?.monthlyPayment || 0);

      setImportedPreview({
        plan: p,
        vaultName: parsed.name || 'Beamed Vault',
        monthlyIncome: inc,
        monthlyOutflow: exp,
      });
      stopCamera();
      setCameraError(null);
    } catch {
      setCameraError('Failed to parse QR code data. Invalid JSON structure.');
    }
  };

  // Start live device camera for QR scanning
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
        <div className="modal-header flex-between items-center">
          <div className="flex-align gap-2">
            <QrCode size={16} className="text-quasar" />
            <h3 className="modal-title font-semibold text-sm m-0">Cross-Device QR Vault Beam</h3>
          </div>
          <button type="button" className="icon-pill" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher: Beam (Send) vs Scan (Receive) */}
        <div className="pill-segmented mt-2 mb-3 w-full flex" role="tablist">
          <button
            type="button"
            className={`flex-1 flex-align justify-center gap-1.5 ${activeTab === 'beam' ? 'pill-active' : ''}`}
            onClick={() => { setActiveTab('beam'); setImportedPreview(null); }}
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
            <div className="qr-canvas-holder">
              <canvas ref={qrCanvasRef} className="qr-code-canvas" />
            </div>

            <div className="qr-instructions mt-3">
              <h4 className="font-semibold text-sm m-0 text-primary">Scan with Mobile Camera</h4>
              <p className="text-xs text-secondary mt-1 leading-relaxed max-w-sm">
                Open PsFi on your mobile phone and tap <strong>Tools &gt; QR Vault Beam &gt; Scan</strong>, or point your phone camera at this QR code.
              </p>
            </div>

            <div className="qr-privacy-pill font-mono text-[11px] flex-align gap-1.5 mt-2.5">
              <ShieldCheck size={13} className="text-nebula" />
              <span>100% Peer-to-Peer Visual Beam · Zero Server Sync</span>
            </div>

            {/* Manual String Copy Alternative */}
            <div className="mt-3 pt-3 border-t border-subtle w-full flex-between items-center">
              <span className="text-xs text-muted font-mono">Vault: {activeAccountName}</span>
              <button
                type="button"
                className="btn-secondary font-mono text-xs flex-align gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(payloadString);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={12} className="text-nebula" /> : <Copy size={12} />}
                <span>{copied ? 'Copied Payload!' : 'Copy Beam String'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SCAN IN (RECEIVER) */}
        {activeTab === 'scan' && (
          <div className="qr-tab-content scan-tab-wrap">
            {importedPreview ? (
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
              /* Active Scanning View */
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
                  </div>
                ) : (
                  <div className="camera-standby-box p-6 text-center border border-dashed border-subtle rounded-xl w-full">
                    <Scan size={36} className="text-muted mx-auto mb-2" />
                    <p className="text-xs text-secondary m-0">Camera is currently standby</p>
                    <button
                      type="button"
                      className="btn-primary font-mono text-xs mt-3 flex-align gap-1.5 mx-auto"
                      onClick={startCamera}
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
