import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Shield,
  Download,
  Upload,
  EyeOff,
  Check,
  FileCheck,
} from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import {
  encodePayloadToPixels,
  decodePayloadFromPixels,
  createSyntheticStegoCanvas,
  createDecoyPlan,
} from '../lib/steganography';

interface SteganographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  onRestorePlan: (restored: FinancePlan) => void;
}

export const SteganographyModal: React.FC<SteganographyModalProps> = ({
  isOpen,
  onClose,
  plan,
  onRestorePlan,
}) => {
  const [activeTab, setActiveTab] = useState<'encode' | 'decode' | 'decoy'>('encode');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [encodeStatus, setEncodeStatus] = useState<string>('');
  const [decodeStatus, setDecodeStatus] = useState<string>('');
  const [decodedPlan, setDecodedPlan] = useState<FinancePlan | null>(null);
  const [appliedDecoy, setAppliedDecoy] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate default synthetic canvas when encode tab opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'encode') return;

    const timer = setTimeout(() => {
      const targetCanvas = previewCanvasRef.current;
      if (!targetCanvas) return;

      const sourceCanvas = createSyntheticStegoCanvas(640, 480);
      targetCanvas.width = 640;
      targetCanvas.height = 480;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(sourceCanvas, 0, 0);

      // Perform steganographic injection
      const imgData = ctx.getImageData(0, 0, 640, 480);
      const jsonPayload = JSON.stringify(plan);
      const success = encodePayloadToPixels(imgData.data, jsonPayload);

      if (success) {
        ctx.putImageData(imgData, 0, 0);
        const dataUrl = targetCanvas.toDataURL('image/png');
        setDownloadUrl(dataUrl);
        setEncodeStatus(`Vault successfully embedded! Payload: ${(jsonPayload.length / 1024).toFixed(1)} KB (occupies ~0.8% of pixel depth).`);
      } else {
        setEncodeStatus('Error: Payload exceeds image capacity.');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab, plan]);

  // Handle uploaded custom image for encoding
  const handleCustomImageForEncode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const targetCanvas = previewCanvasRef.current;
        if (!targetCanvas) return;

        targetCanvas.width = img.width;
        targetCanvas.height = img.height;
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const jsonPayload = JSON.stringify(plan);
        const success = encodePayloadToPixels(imgData.data, jsonPayload);

        if (success) {
          ctx.putImageData(imgData, 0, 0);
          setDownloadUrl(targetCanvas.toDataURL('image/png'));
          setEncodeStatus(`Custom wallpaper encoded! Size: ${img.width}x${img.height}. Zero visual artifacts.`);
        } else {
          setEncodeStatus('Error: Image resolution too small for payload.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle image upload for extraction/decoding
  const handleImageForDecode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDecodeStatus('Scanning image pixel buffer for hidden PsFi vault signature...');
    setDecodedPlan(null);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
          setDecodeStatus('Canvas initialization failed.');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const recoveredJson = decodePayloadFromPixels(imgData.data);

        if (!recoveredJson) {
          setDecodeStatus('No hidden PsFi vault found. Ensure the image was saved as lossless PNG and has not been compressed by social media (e.g. WhatsApp/Instagram compress PNGs to lossy JPEGs).');
          return;
        }

        try {
          const parsed = JSON.parse(recoveredJson) as FinancePlan;
          if (parsed.income && parsed.expenses) {
            setDecodedPlan(parsed);
            setDecodeStatus(`Success! Hidden vault extracted: Primary monthly salary ₹${parsed.income.salary?.toLocaleString('en-IN')}, Emergency Fund ₹${parsed.savings.emergencyFundBalance?.toLocaleString('en-IN')}.`);
          } else {
            setDecodeStatus('Vault extracted but payload structure does not match a valid PsFi portfolio.');
          }
        } catch {
          setDecodeStatus('Payload decoded but could not be parsed as valid JSON.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[50000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="modal-content w-full max-w-2xl bg-[#0e1320] border border-subtle rounded-2xl p-5 sm:p-6 shadow-2xl relative text-primary animate-fadeIn my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Steganographic PNG Vault & Decoy
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-600/40 text-purple-300">
                  LSB Pixel Cloaking
                </span>
              </h2>
              <p className="text-xs text-muted">
                Hide your complete financial ledger inside everyday wallpaper PNG pixels or generate plausible decoy vaults.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-subtle mt-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('encode')}
            className={`py-2 px-4 border-b-2 font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'encode'
                ? 'border-purple-400 text-purple-400 font-bold'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Download size={14} />
            <span>1. Embed into PNG</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decode')}
            className={`py-2 px-4 border-b-2 font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'decode'
                ? 'border-purple-400 text-purple-400 font-bold'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Upload size={14} />
            <span>2. Extract from PNG</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decoy')}
            className={`py-2 px-4 border-b-2 font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'decoy'
                ? 'border-purple-400 text-purple-400 font-bold'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Shield size={14} />
            <span>3. Decoy Vault</span>
          </button>
        </div>

        {/* TAB 1: ENCODE */}
        {activeTab === 'encode' && (
          <div className="pt-4 space-y-4">
            <p className="text-xs text-muted">
              PsFi modifies only the Least Significant Bit of image pixels. The resulting image looks completely indistinguishable from an ordinary abstract twilight desktop wallpaper to anyone viewing it.
            </p>

            {/* Canvas Preview */}
            <div className="relative rounded-xl overflow-hidden border border-subtle bg-black/40 flex flex-col items-center justify-center p-2">
              <canvas
                ref={previewCanvasRef}
                className="max-h-56 max-w-full rounded-lg shadow-inner object-contain"
              />
              <span className="absolute bottom-4 right-4 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-500/30">
                100% In-Memory · Lossless
              </span>
            </div>

            {encodeStatus && (
              <div className="text-[11.5px] font-mono text-purple-300 bg-purple-950/30 border border-purple-800/40 rounded-lg p-2.5">
                {encodeStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="cursor-pointer text-xs font-mono text-muted hover:text-primary flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-subtle bg-slate-900/60">
                <Upload size={13} />
                <span>Use Custom Wallpaper Image</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleCustomImageForEncode}
                  className="hidden"
                />
              </label>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download="twilight_wallpaper_psfi_vault.png"
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg"
                >
                  <Download size={14} />
                  <span>Download Stego PNG Wallpaper</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DECODE */}
        {activeTab === 'decode' && (
          <div className="pt-4 space-y-4">
            <p className="text-xs text-muted">
              Select or drop a PNG wallpaper created with PsFi. The LSB parser will extract and reconstruct your financial ledger completely client-side.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-subtle hover:border-purple-500/60 rounded-xl p-8 text-center cursor-pointer bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleImageForDecode}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-purple-950/50 border border-purple-600/30 flex items-center justify-center text-purple-400 mb-3">
                <Upload size={22} />
              </div>
              <span className="text-xs font-semibold block text-primary">Click to select Stego PNG</span>
              <span className="text-[11px] text-muted block mt-1">Must be an uncompressed .png file</span>
            </div>

            {decodeStatus && (
              <div className={`text-xs font-mono rounded-lg p-3 border ${
                decodedPlan 
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' 
                  : 'bg-slate-900/40 border-subtle text-muted'
              }`}>
                {decodeStatus}
              </div>
            )}

            {decodedPlan && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onRestorePlan(decodedPlan);
                    onClose();
                  }}
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                >
                  <FileCheck size={14} />
                  <span>Load Extracted Vault into PsFi</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DECOY VAULT */}
        {activeTab === 'decoy' && (
          <div className="pt-4 space-y-4">
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
              <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Duress & Privacy Defense Architecture</span>
                If someone demands to see your financial portfolio, a Decoy Vault loads a plausible, unremarkable Indian middle-class budget. It hides large SIP investments and high net worth reserves, showing an ordinary living profile with modest emergency savings and an average credit card balance.
              </div>
            </div>

            <div className="rounded-xl border border-subtle bg-slate-900/40 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-muted border-b border-subtle pb-1.5">
                <span>Decoy Monthly Inflow:</span>
                <span className="text-primary font-bold">₹52,000</span>
              </div>
              <div className="flex justify-between text-muted border-b border-subtle pb-1.5">
                <span>Decoy Rent & Utilities:</span>
                <span className="text-primary font-bold">₹22,200</span>
              </div>
              <div className="flex justify-between text-muted border-b border-subtle pb-1.5">
                <span>Decoy Credit Card Debt:</span>
                <span className="text-rose-400 font-bold">₹14,500</span>
              </div>
              <div className="flex justify-between text-muted border-b border-subtle pb-1.5">
                <span>Decoy Emergency Fund:</span>
                <span className="text-emerald-400 font-bold">₹65,000 (1.2 mos)</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Decoy Portfolio Value:</span>
                <span className="text-primary font-bold">₹3,20,000</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted">
                Your real vault is kept safe in browser memory and can be reloaded at any time.
              </span>

              <button
                type="button"
                onClick={() => {
                  const decoy = createDecoyPlan();
                  onRestorePlan(decoy);
                  setAppliedDecoy(true);
                  setTimeout(() => onClose(), 800);
                }}
                className="py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-colors"
              >
                {appliedDecoy ? <Check size={14} /> : <EyeOff size={14} />}
                <span>{appliedDecoy ? 'Decoy Vault Active' : 'Switch to Decoy Vault'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
