import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  CreditCard,
  Building2,
  Briefcase,
  TrendingUp,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import {
  parseFinancialDocument,
  applyParsedParameters,
  formatINR,
  type StatementParseResult,
  type ExtractedFinancialParam,
} from '../lib/statementParser';
import { extractTextFromPDF } from '../lib/pdfReader';

interface StatementParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: FinancePlan;
  onApplyPlan: (updatedPlan: FinancePlan, summaryMsg: string) => void;
  onCreateVault?: (vaultName: string, plan: FinancePlan) => void;
}

// Built-in Demo Statements for 1-click testing
const SAMPLE_STATEMENTS = {
  cas: {
    name: 'CAMS Mutual Fund CAS',
    filename: 'cams_cas_oct2026.pdf',
    text: `Consolidated Account Statement - CAMS
Investor Name: Zac P.
Folio No: 101/456789
Scheme: Parag Parikh Flexi Cap Fund - Direct Plan - Growth
ISIN: INF879O01019
Valuation on 31-Oct-2026: INR 16,80,000.00
Transaction Details:
05-Oct-2026 SYSTEMATIC INVESTMENT PURCHASE: Rs. 25,000.00
05-Oct-2026 SIP PURCHASE UTI Nifty 50 Index: Rs. 15,000.00
05-Oct-2026 MONTHLY SIP Mirae Asset Emerging Bluechip: Rs. 10,000.00
Total Valuation: INR 28,50,000.00`,
  },
  bank: {
    name: 'HDFC Bank Statement',
    filename: 'hdfc_statement_oct2026.pdf',
    text: `HDFC BANK LIMITED
Statement of Account: 01/10/2026 to 31/10/2026
Account Number: 50100458923412
01/10/2026 ACH-CR-TECHCORP INDIA PAYROLL SALARY: INR 1,75,000.00
03/10/2026 NACH-HDFC HOME LOAN EMI: INR 45,000.00
05/10/2026 BESCOM BANGALORE ELECTRICITY: INR 2,200.00
07/10/2026 AIRTEL BROADBAND: INR 1,180.00
10/10/2026 SWIGGY BANGALORE: INR 750.00
14/10/2026 ZOMATO RESTAURANT: INR 1,450.00
20/10/2026 AMAZON PAYMENTS INDIA: INR 4,500.00
31/10/2026 Closing Balance: INR 4,85,000.00`,
  },
  card: {
    name: 'SBI Credit Card Statement',
    filename: 'sbicard_statement.pdf',
    text: `SBI Card Statement
Statement Period: 16 Sep 2026 - 15 Oct 2026
Credit Card Number: 4591-XXXX-XXXX-8822
Total Amount Due: INR 38,400.00
Minimum Amount Due: INR 2,800.00
Payment Due Date: 05 Nov 2026
Credit Limit: INR 3,50,000.00
Available Credit Limit: INR 3,11,600.00`,
  },
  payslip: {
    name: 'Corporate Salary Payslip',
    filename: 'payslip_oct2026.pdf',
    text: `Apex Cloud Systems India Private Limited
Payslip for the month of October 2026
Employee ID: APX-9821 | Designation: Lead Systems Architect
Earnings:
Basic Salary: INR 75,000.00
House Rent Allowance (HRA): INR 37,500.00
Special Allowance: INR 52,500.00
Gross Earnings: INR 1,65,000.00
Deductions:
Employee Provident Fund (EPF): INR 9,000.00
Professional Tax: INR 200.00
Income Tax (TDS): INR 18,500.00
Net Pay: INR 1,37,300.00`,
  },
  holdings: {
    name: 'Zerodha Demat Holdings CSV',
    filename: 'holdings_oct2026.csv',
    text: `Instrument,Qty,Avg. cost,LTP,Cur. val,P&L,Net chg
RELIANCE,30,2400.00,2850.00,85500.00,13500.00,18.75%
TCS,20,3400.00,3950.00,79000.00,11000.00,16.18%
INFY,50,1420.00,1880.00,94000.00,23000.00,32.39%
HDFCBANK,45,1550.00,1720.00,77400.00,7650.00,10.97%`,
  },
};

function playSound(type: 'click' | 'success' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.03);
    } else if (type === 'success') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.04, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.2);
      });
    }
  } catch {
    // Ignore audio restrictions
  }
}

export const StatementParserModal: React.FC<StatementParserModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  onApplyPlan,
  onCreateVault,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(null);
  const [editableParams, setEditableParams] = useState<ExtractedFinancialParam[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PDF password handling
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingPdfBuffer, setPendingPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pendingFilename, setPendingFilename] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleProcessText = (text: string, filename = '') => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = parseFinancialDocument(text, filename);
      setParseResult(result);
      setEditableParams(result.params);
      if (result.params.length === 0) {
        setErrorMsg('No standard financial parameters could be automatically identified from this text.');
      } else {
        playSound('success');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing document text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    const fname = file.name;

    try {
      if (fname.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const extraction = await extractTextFromPDF(buffer);

        if (extraction.isPasswordProtected) {
          setPendingPdfBuffer(buffer);
          setPendingFilename(fname);
          setIsPasswordModalOpen(true);
          setIsProcessing(false);
          return;
        }

        if (extraction.error === 'CORRUPTED') {
          setErrorMsg('The uploaded PDF appears corrupted or could not be read.');
          setIsProcessing(false);
          return;
        }

        handleProcessText(extraction.text, fname);
      } else {
        // Text / CSV
        const text = await file.text();
        handleProcessText(text, fname);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read file.');
      setIsProcessing(false);
    }
  };

  const handleDecryptPdf = async () => {
    if (!pendingPdfBuffer) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const extraction = await extractTextFromPDF(pendingPdfBuffer, pdfPassword);
    if (extraction.error === 'INVALID_PASSWORD') {
      setErrorMsg('Incorrect PDF password. Common formats: PAN in uppercase (e.g. ABCDE1234F), DOB (DDMMYYYY).');
      setIsProcessing(false);
      return;
    }

    if (extraction.error === 'CORRUPTED') {
      setErrorMsg('Failed to decrypt PDF.');
      setIsProcessing(false);
      return;
    }

    setIsPasswordModalOpen(false);
    setPdfPassword('');
    handleProcessText(extraction.text, pendingFilename);
  };

  const toggleParam = (index: number) => {
    playSound('click');
    setEditableParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const updateParamValue = (index: number, val: number) => {
    setEditableParams((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              detectedValue: val,
              formattedValue: formatINR(val),
            }
          : p
      )
    );
  };

  const handleApplyToActivePlan = () => {
    const updated = applyParsedParameters(currentPlan, editableParams);
    const appliedCount = editableParams.filter((p) => p.selected && p.detectedValue > 0).length;
    playSound('success');
    onApplyPlan(
      updated,
      `Applied ${appliedCount} verified parameter(s) from ${parseResult?.institutionName || 'Statement'} directly to your active plan.`
    );
    onClose();
  };

  const handleSaveAsVault = () => {
    if (!onCreateVault) return;
    const updated = applyParsedParameters(currentPlan, editableParams);
    const vName = `${parseResult?.institutionName || 'Imported'} Vault`;
    playSound('success');
    onCreateVault(vName, updated);
    onClose();
  };

  const resetAll = () => {
    playSound('click');
    setParseResult(null);
    setEditableParams([]);
    setPastedText('');
    setErrorMsg(null);
    setPendingPdfBuffer(null);
  };

  const renderBadgeIcon = (type: string) => {
    switch (type) {
      case 'cas':
        return <TrendingUp size={16} className="text-quasar" />;
      case 'bank_statement':
        return <Building2 size={16} className="text-nebula" />;
      case 'credit_card':
        return <CreditCard size={16} className="text-solstice" />;
      case 'payslip':
        return <Briefcase size={16} className="text-cyan-400" />;
      default:
        return <FileText size={16} className="text-muted" />;
    }
  };

  return (
    <div className="statement-modal-overlay" onClick={onClose}>
      <div
        className="statement-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Private Statement Parser"
      >
        {/* Modal Header */}
        <div className="statement-modal-header">
          <div className="flex items-center gap-3">
            <div className="statement-header-icon-box">
              <ShieldCheck size={20} className="text-nebula" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="statement-modal-title">Private Statement & Document Ingestion</h2>
                <span className="statement-client-badge">
                  <Lock size={10} /> 100% Client-Side In-Memory
                </span>
              </div>
              <p className="statement-modal-sub">
                Parse CAS, Bank Statements, Credit Cards & Salary Slips. Zero server storage, zero network transmission.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="statement-close-btn"
            onClick={onClose}
            aria-label="Close statement parser"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="statement-modal-body">
          {errorMsg && (
            <div className="statement-error-banner">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* If Result is Ready: Display Review Table */}
          {parseResult ? (
            <div className="statement-results-container">
              {/* Document Summary Card */}
              <div className="statement-doc-summary-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderBadgeIcon(parseResult.statementType)}
                    <span className="statement-doc-type-label">{parseResult.typeLabel}</span>
                    <span className="statement-doc-inst-label">• {parseResult.institutionName}</span>
                  </div>
                  <button
                    type="button"
                    className="statement-reparse-btn"
                    onClick={resetAll}
                    title="Upload or paste another document"
                  >
                    <RefreshCw size={12} />
                    <span>Upload Another</span>
                  </button>
                </div>
                <p className="statement-doc-summary-text">{parseResult.summaryText}</p>
              </div>

              {/* Extracted Parameters Section */}
              <div className="statement-params-header">
                <span className="statement-params-title">
                  Identified Financial Parameters ({editableParams.filter((p) => p.selected).length} selected)
                </span>
                <span className="statement-params-hint">
                  Review values before applying to your plan. You can edit any figure directly.
                </span>
              </div>

              <div className="statement-params-list">
                {editableParams.map((param, idx) => (
                  <div
                    key={param.key}
                    className={`statement-param-row ${param.selected ? 'statement-param-selected' : ''}`}
                    onClick={() => toggleParam(idx)}
                  >
                    <input
                      type="checkbox"
                      checked={param.selected}
                      onChange={() => toggleParam(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="statement-param-checkbox"
                    />

                    <div className="statement-param-info flex-1">
                      <div className="flex items-center gap-2">
                        <span className="statement-param-label">{param.label}</span>
                        <span className={`statement-category-tag tag-${param.category}`}>
                          {param.category}
                        </span>
                        <span className={`statement-confidence-pill conf-${param.confidence}`}>
                          {param.confidence}
                        </span>
                      </div>
                      <span className="statement-param-source">{param.sourceHint}</span>
                    </div>

                    <div className="statement-param-value-box" onClick={(e) => e.stopPropagation()}>
                      <span className="statement-currency-prefix">₹</span>
                      <input
                        type="number"
                        value={param.detectedValue}
                        onChange={(e) => updateParamValue(idx, parseFloat(e.target.value) || 0)}
                        className="statement-param-input"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="statement-actions-bar">
                <button
                  type="button"
                  className="statement-shred-btn"
                  onClick={resetAll}
                  title="Purge document buffer from memory"
                >
                  <Trash2 size={13} />
                  <span>Shred Memory</span>
                </button>

                <div className="flex items-center gap-2">
                  {onCreateVault && (
                    <button
                      type="button"
                      className="statement-vault-btn"
                      onClick={handleSaveAsVault}
                    >
                      <Layers size={13} />
                      <span>Save as New Vault</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="statement-apply-btn"
                    onClick={handleApplyToActivePlan}
                  >
                    <Sparkles size={14} className="text-solstice" />
                    <span>Apply to Active Plan</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload / Paste / Samples View */
            <div className="statement-input-container">
              {/* Mode Tabs */}
              <div className="statement-tabs-strip">
                <button
                  type="button"
                  className={`statement-tab-btn ${activeTab === 'upload' ? 'statement-tab-active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                >
                  <UploadCloud size={14} />
                  <span>Upload Statement File</span>
                </button>
                <button
                  type="button"
                  className={`statement-tab-btn ${activeTab === 'paste' ? 'statement-tab-active' : ''}`}
                  onClick={() => setActiveTab('paste')}
                >
                  <FileText size={14} />
                  <span>Paste Text</span>
                </button>
                <button
                  type="button"
                  className={`statement-tab-btn ${activeTab === 'samples' ? 'statement-tab-active' : ''}`}
                  onClick={() => setActiveTab('samples')}
                >
                  <Sparkles size={14} className="text-solstice" />
                  <span>Try Sample Demos</span>
                </button>
              </div>

              {/* Tab 1: Upload Dropzone */}
              {activeTab === 'upload' && (
                <div
                  className="statement-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.tsv,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="statement-dropzone-icon">
                    <UploadCloud size={32} className="text-solstice" />
                  </div>
                  <h3 className="statement-dropzone-title">
                    Drop your statement here, or <span className="text-quasar underline">browse</span>
                  </h3>
                  <p className="statement-dropzone-sub">
                    Supports <strong>PDF, CSV, TSV, TXT</strong> files up to 25MB
                  </p>

                  <div className="statement-support-chips">
                    <span className="chip">📄 Mutual Fund CAS</span>
                    <span className="chip">🏦 Bank Statement</span>
                    <span className="chip">💳 Credit Card Bill</span>
                    <span className="chip">💼 Corporate Payslip</span>
                    <span className="chip">📈 Zerodha / Groww CSV</span>
                  </div>

                  {isProcessing && (
                    <div className="statement-processing-radar">
                      <RefreshCw size={16} className="animate-spin text-nebula" />
                      <span>Reading file in secure browser memory...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Paste Statement Text */}
              {activeTab === 'paste' && (
                <div className="statement-paste-box">
                  <p className="statement-paste-hint">
                    Copy and paste text from your net banking transaction statement, payslip email, or credit card bill:
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste text here... (e.g. ACH-CR SALARY OCT: INR 1,65,000, Closing Balance: INR 4,50,000, Total Amount Due: INR 34,000...)"
                    className="statement-paste-textarea"
                    rows={8}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      disabled={!pastedText.trim() || isProcessing}
                      className="statement-apply-btn"
                      onClick={() => handleProcessText(pastedText, 'pasted_text.txt')}
                    >
                      <Sparkles size={14} className="text-solstice" />
                      <span>Analyze Text In-Memory</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Sample Demos */}
              {activeTab === 'samples' && (
                <div className="statement-samples-grid">
                  <p className="statement-samples-hint">
                    Test the extraction engine instantly without uploading personal files:
                  </p>

                  <div className="statement-sample-cards">
                    <button
                      type="button"
                      className="statement-sample-card"
                      onClick={() => handleProcessText(SAMPLE_STATEMENTS.cas.text, SAMPLE_STATEMENTS.cas.filename)}
                    >
                      <div className="statement-sample-icon text-quasar">
                        <TrendingUp size={18} />
                      </div>
                      <div className="text-left">
                        <div className="sample-name">CAMS Mutual Fund CAS</div>
                        <div className="sample-desc">Extracts ₹25k SIP, ₹28.5L portfolio across 3 folios</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="statement-sample-card"
                      onClick={() => handleProcessText(SAMPLE_STATEMENTS.bank.text, SAMPLE_STATEMENTS.bank.filename)}
                    >
                      <div className="statement-sample-icon text-nebula">
                        <Building2 size={18} />
                      </div>
                      <div className="text-left">
                        <div className="sample-name">HDFC Bank Statement</div>
                        <div className="sample-desc">Extracts ₹1.75L salary credit, ₹45k housing EMI, ₹4.85L balance</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="statement-sample-card"
                      onClick={() => handleProcessText(SAMPLE_STATEMENTS.card.text, SAMPLE_STATEMENTS.card.filename)}
                    >
                      <div className="statement-sample-icon text-solstice">
                        <CreditCard size={18} />
                      </div>
                      <div className="text-left">
                        <div className="sample-name">SBI Credit Card Statement</div>
                        <div className="sample-desc">Extracts ₹38.4k total due, ₹2.8k min payment, ₹3.5L limit</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="statement-sample-card"
                      onClick={() => handleProcessText(SAMPLE_STATEMENTS.payslip.text, SAMPLE_STATEMENTS.payslip.filename)}
                    >
                      <div className="statement-sample-icon text-cyan-400">
                        <Briefcase size={18} />
                      </div>
                      <div className="text-left">
                        <div className="sample-name">Corporate Salary Payslip</div>
                        <div className="sample-desc">Extracts ₹1.37L take-home, ₹9k EPF, HRA, Section 80C</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="statement-sample-card"
                      onClick={() => handleProcessText(SAMPLE_STATEMENTS.holdings.text, SAMPLE_STATEMENTS.holdings.filename)}
                    >
                      <div className="statement-sample-icon text-emerald-400">
                        <Layers size={18} />
                      </div>
                      <div className="text-left">
                        <div className="sample-name">Zerodha Demat Holdings CSV</div>
                        <div className="sample-desc">Extracts ₹3.35L stock portfolio (Reliance, TCS, Infy, HDFC)</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password Prompt Modal if PDF is Encrypted */}
        {isPasswordModalOpen && (
          <div className="statement-password-overlay">
            <div className="statement-password-box">
              <div className="statement-password-icon">
                <Lock size={22} className="text-solstice" />
              </div>
              <h3 className="statement-password-title">Encrypted Financial PDF</h3>
              <p className="statement-password-sub">
                This document is encrypted by your institution. Enter your password to decrypt locally in your browser memory:
              </p>

              <div className="statement-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="Enter PDF password (e.g. PAN or DOB)"
                  className="statement-password-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDecryptPdf();
                  }}
                />
                <button
                  type="button"
                  className="statement-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="statement-password-hints">
                <div className="hint-item">
                  <strong>CAS:</strong> PAN (uppercase, e.g. ABCDE1234F) or DOB (DDMMYYYY)
                </div>
                <div className="hint-item">
                  <strong>Bank / Card:</strong> DOB (DDMMYYYY) or first 4 letters of name + DOB
                </div>
                <div className="hint-item">
                  <strong>Payslip:</strong> Employee ID or PAN
                </div>
              </div>

              <div className="statement-password-actions">
                <button
                  type="button"
                  className="statement-btn-secondary"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPendingPdfBuffer(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="statement-btn-primary"
                  onClick={handleDecryptPdf}
                  disabled={!pdfPassword.trim() || isProcessing}
                >
                  <Unlock size={14} />
                  <span>Decrypt & Ingest</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
