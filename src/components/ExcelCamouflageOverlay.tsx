import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { UserAccount } from '../types/account';
import { verifyVaultPin } from '../lib/vaultSecurity';
import {
  FileSpreadsheet,
  Search,
  Lock,
  Plus,
  Table,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Save,
  Undo,
  Redo,
  Scissors,
  Clipboard,
  Paintbrush,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Filter,
  AlertTriangle,
  Cloud,
  Printer,
} from 'lucide-react';

interface ExcelCamouflageOverlayProps {
  isOpen: boolean;
  onExit: () => void;
  account?: UserAccount | null;
  vaultPin?: string;
}

type DisguisePersona = 'excel_365' | 'google_sheets' | 'aws_cloudwatch';

interface FleetRow {
  id: string;
  date: string;
  region: string;
  fleetId: string;
  vehicleType: string;
  baseFare: number;
  fuelSurcharge: number;
  tollExpense: number;
  netYield: number;
  status: 'Audited' | 'Pending' | 'Reconciled';
  waybill: string;
  slaCompliance: string;
  reconciledBy: string;
  varianceNote: string;
}

const INITIAL_FLEET_ROWS: FleetRow[] = [
  { id: '101', date: '2026-10-01', region: 'North - NCR', fleetId: 'FL-DL-8821', vehicleType: 'Heavy 16T', baseFare: 42500, fuelSurcharge: 6800, tollExpense: 2150, netYield: 33550, status: 'Audited', waybill: 'WB-882104', slaCompliance: '99.4%', reconciledBy: 'ops.audit', varianceNote: 'None' },
  { id: '102', date: '2026-10-02', region: 'West - MH', fleetId: 'FL-MH-1044', vehicleType: 'Medium 8T', baseFare: 28000, fuelSurcharge: 4200, tollExpense: 1400, netYield: 22400, status: 'Reconciled', waybill: 'WB-882105', slaCompliance: '98.8%', reconciledBy: 'auto.batch', varianceNote: 'Cleared' },
  { id: '103', date: '2026-10-03', region: 'South - KA', fleetId: 'FL-KA-3920', vehicleType: 'Reefer 12T', baseFare: 56000, fuelSurcharge: 9100, tollExpense: 3200, netYield: 43700, status: 'Audited', waybill: 'WB-882106', slaCompliance: '100.0%', reconciledBy: 'fin.ctrl', varianceNote: 'Cold chain verified' },
  { id: '104', date: '2026-10-04', region: 'West - GJ', fleetId: 'FL-GJ-5512', vehicleType: 'LCV 4T', baseFare: 18500, fuelSurcharge: 2600, tollExpense: 850, netYield: 15050, status: 'Reconciled', waybill: 'WB-882107', slaCompliance: '97.9%', reconciledBy: 'auto.batch', varianceNote: 'Port gate delay 12m' },
  { id: '105', date: '2026-10-05', region: 'East - WB', fleetId: 'FL-WB-7419', vehicleType: 'Heavy 16T', baseFare: 44200, fuelSurcharge: 7200, tollExpense: 2400, netYield: 34600, status: 'Pending', waybill: 'WB-882108', slaCompliance: '98.2%', reconciledBy: 'pending.ops', varianceNote: 'Toll slip pending review' },
  { id: '106', date: '2026-10-06', region: 'South - TN', fleetId: 'FL-TN-6102', vehicleType: 'Medium 8T', baseFare: 31000, fuelSurcharge: 4900, tollExpense: 1800, netYield: 24300, status: 'Audited', waybill: 'WB-882109', slaCompliance: '99.1%', reconciledBy: 'ops.audit', varianceNote: 'None' },
  { id: '107', date: '2026-10-07', region: 'Central - MP', fleetId: 'FL-MP-2088', vehicleType: 'Heavy 16T', baseFare: 39500, fuelSurcharge: 6100, tollExpense: 1950, netYield: 31450, status: 'Audited', waybill: 'WB-882110', slaCompliance: '99.5%', reconciledBy: 'fin.ctrl', varianceNote: 'None' },
  { id: '108', date: '2026-10-08', region: 'North - HR', fleetId: 'FL-HR-9931', vehicleType: 'LCV 4T', baseFare: 16800, fuelSurcharge: 2400, tollExpense: 720, netYield: 13680, status: 'Reconciled', waybill: 'WB-882111', slaCompliance: '100.0%', reconciledBy: 'auto.batch', varianceNote: 'Local express' },
  { id: '109', date: '2026-10-09', region: 'South - TS', fleetId: 'FL-TS-4411', vehicleType: 'Reefer 12T', baseFare: 52000, fuelSurcharge: 8400, tollExpense: 2900, netYield: 40700, status: 'Audited', waybill: 'WB-882112', slaCompliance: '99.7%', reconciledBy: 'ops.audit', varianceNote: 'Pharma spec cleared' },
  { id: '110', date: '2026-10-10', region: 'North - PB', fleetId: 'FL-PB-1802', vehicleType: 'Medium 8T', baseFare: 29500, fuelSurcharge: 4600, tollExpense: 1550, netYield: 23350, status: 'Pending', waybill: 'WB-882113', slaCompliance: '96.5%', reconciledBy: 'pending.ops', varianceNote: 'Fuel receipt re-scan needed' },
  { id: '111', date: '2026-10-11', region: 'West - MH', fleetId: 'FL-MH-8219', vehicleType: 'Heavy 16T', baseFare: 45000, fuelSurcharge: 7100, tollExpense: 2300, netYield: 35600, status: 'Audited', waybill: 'WB-882114', slaCompliance: '99.0%', reconciledBy: 'fin.ctrl', varianceNote: 'None' },
  { id: '112', date: '2026-10-12', region: 'South - KL', fleetId: 'FL-KL-3094', vehicleType: 'LCV 4T', baseFare: 19200, fuelSurcharge: 2800, tollExpense: 920, netYield: 15480, status: 'Reconciled', waybill: 'WB-882115', slaCompliance: '98.9%', reconciledBy: 'auto.batch', varianceNote: 'Highway FASTag verified' },
];

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const TOTAL_GRID_ROWS = 35;

export const ExcelCamouflageOverlay: React.FC<ExcelCamouflageOverlayProps> = ({
  isOpen,
  onExit,
  account,
  vaultPin,
}) => {
  const [persona, setPersona] = useState<DisguisePersona>('excel_365');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeSheetTab, setActiveSheetTab] = useState<'fleet' | 'margins' | 'vendors' | 'depr'>('fleet');
  const [activeRibbonTab, setActiveRibbonTab] = useState<string>('Home');
  const [showBackstage, setShowBackstage] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Active Grid Selection & In-Cell Editing
  const [selectedCell, setSelectedCell] = useState<{ col: string; row: number }>({ col: 'H', row: 4 });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [rows, setRows] = useState<FleetRow[]>(INITIAL_FLEET_ROWS);

  // Zoom control
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Unprotect Sheet Dialog (Native Excel Replica)
  const [showUnprotectDialog, setShowUnprotectDialog] = useState<boolean>(false);
  const [unprotectPassword, setUnprotectPassword] = useState<string>('');
  const [showPasswordAlert, setShowPasswordAlert] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const cellInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [isEditing]);

  // Focus password input when unprotect dialog opens
  useEffect(() => {
    if (showUnprotectDialog && passwordInputRef.current) {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [showUnprotectDialog]);

  // Handle Covert Exit Trigger
  const triggerExit = () => {
    // Check if account has PIN protection
    const hasPinProtection = (account?.pinHash && account?.pinSalt) || (vaultPin && vaultPin.length === 4);
    if (hasPinProtection) {
      setUnprotectPassword('');
      setShowPasswordAlert(false);
      setShowUnprotectDialog(true);
    } else {
      onExit();
    }
  };

  // Verify PIN against vault credentials
  const handleUnprotectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      let isMatch = false;

      if (account?.pinHash && account?.pinSalt) {
        isMatch = await verifyVaultPin(unprotectPassword, account.pinSalt, account.pinHash);
      } else if (vaultPin) {
        isMatch = unprotectPassword === vaultPin;
      }

      if (isMatch) {
        setShowUnprotectDialog(false);
        setUnprotectPassword('');
        setShowPasswordAlert(false);
        onExit();
      } else {
        setShowPasswordAlert(true);
      }
    } catch {
      setShowPasswordAlert(true);
    } finally {
      setIsVerifying(false);
    }
  };

  // Keyboard navigation & hotkeys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey Alt + X to exit
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        triggerExit();
        return;
      }

      // Dialog is open: Esc closes dialog
      if (showUnprotectDialog) {
        if (e.key === 'Escape') {
          if (showPasswordAlert) {
            setShowPasswordAlert(false);
          } else {
            setShowUnprotectDialog(false);
          }
        }
        return;
      }

      // Backstage is open: Esc returns to sheet
      if (showBackstage) {
        if (e.key === 'Escape') {
          setShowBackstage(false);
        }
        return;
      }

      // If user is editing a cell
      if (isEditing) {
        if (e.key === 'Escape') {
          setIsEditing(false);
        } else if (e.key === 'Enter') {
          commitCellEdit();
          // Move down
          setSelectedCell((prev) => ({ ...prev, row: Math.min(TOTAL_GRID_ROWS, prev.row + 1) }));
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commitCellEdit();
          // Move right
          const colIdx = COLUMNS.indexOf(selectedCell.col);
          if (colIdx < COLUMNS.length - 1) {
            setSelectedCell((prev) => ({ ...prev, col: COLUMNS[colIdx + 1] }));
          }
        }
        return;
      }

      // Normal spreadsheet view navigation
      if (e.key === 'Escape') {
        // Esc triggers unprotect / exit naturally
        triggerExit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell((prev) => ({ ...prev, row: Math.max(1, prev.row - 1) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell((prev) => ({ ...prev, row: Math.min(TOTAL_GRID_ROWS, prev.row + 1) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const colIdx = COLUMNS.indexOf(selectedCell.col);
        if (colIdx > 0) {
          setSelectedCell((prev) => ({ ...prev, col: COLUMNS[colIdx - 1] }));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const colIdx = COLUMNS.indexOf(selectedCell.col);
        if (colIdx < COLUMNS.length - 1) {
          setSelectedCell((prev) => ({ ...prev, col: COLUMNS[colIdx + 1] }));
        }
      } else if (e.key === 'Enter') {
        // Start in-cell edit or move down
        startEditing();
      } else if (e.key === 'F2') {
        e.preventDefault();
        startEditing();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Typing begins editing cell with typed character
        if (selectedCell.row >= 2 && selectedCell.row <= 13) {
          startEditing(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showUnprotectDialog, showPasswordAlert, showBackstage, isEditing, selectedCell, editValue, account, vaultPin]);

  // Computed Totals
  const totalBase = useMemo(() => rows.reduce((acc, r) => acc + r.baseFare, 0), [rows]);
  const totalSurcharge = useMemo(() => rows.reduce((acc, r) => acc + r.fuelSurcharge, 0), [rows]);
  const totalToll = useMemo(() => rows.reduce((acc, r) => acc + r.tollExpense, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((acc, r) => acc + r.netYield, 0), [rows]);

  const cellCoordLabel = `${selectedCell.col}${selectedCell.row}`;

  // Get current cell display and formula values
  const currentCellValue = useMemo(() => {
    if (selectedCell.row === 1) {
      const headers: Record<string, string> = {
        A: 'Dispatch Date',
        B: 'Region Code',
        C: 'Fleet Unit ID',
        D: 'Vehicle Class',
        E: 'Base Freight (INR)',
        F: 'Fuel Surcharge (INR)',
        G: 'Tolls & Levies (INR)',
        H: 'Net Freight Margin (INR)',
        I: 'Audit Status',
        J: 'Waybill Reference',
        K: 'SLA On-Time',
        L: 'Reconciled By',
        M: 'Variance Note',
      };
      return headers[selectedCell.col] || '';
    }

    if (selectedCell.row === 14) {
      if (selectedCell.col === 'A') return 'TOTAL FLEET YIELD (Q3)';
      if (selectedCell.col === 'E') return `₹${totalBase.toLocaleString('en-IN')}.00`;
      if (selectedCell.col === 'F') return `₹${totalSurcharge.toLocaleString('en-IN')}.00`;
      if (selectedCell.col === 'G') return `₹${totalToll.toLocaleString('en-IN')}.00`;
      if (selectedCell.col === 'H') return `₹${totalNet.toLocaleString('en-IN')}.00`;
      if (selectedCell.col === 'I') return '100% RECONCILED';
      return '';
    }

    const targetRow = rows[selectedCell.row - 2];
    if (!targetRow) return '';

    switch (selectedCell.col) {
      case 'A': return targetRow.date;
      case 'B': return targetRow.region;
      case 'C': return targetRow.fleetId;
      case 'D': return targetRow.vehicleType;
      case 'E': return `₹${targetRow.baseFare.toLocaleString('en-IN')}.00`;
      case 'F': return `₹${targetRow.fuelSurcharge.toLocaleString('en-IN')}.00`;
      case 'G': return `₹${targetRow.tollExpense.toLocaleString('en-IN')}.00`;
      case 'H': return `₹${targetRow.netYield.toLocaleString('en-IN')}.00`;
      case 'I': return targetRow.status;
      case 'J': return targetRow.waybill;
      case 'K': return targetRow.slaCompliance;
      case 'L': return targetRow.reconciledBy;
      case 'M': return targetRow.varianceNote;
      default: return '';
    }
  }, [selectedCell, rows, totalBase, totalSurcharge, totalToll, totalNet]);

  // Derive formula text for active cell in formula bar
  const formulaValue = useMemo(() => {
    if (selectedCell.row === 14) {
      if (['E', 'F', 'G', 'H'].includes(selectedCell.col)) {
        return `=SUM(${selectedCell.col}2:${selectedCell.col}13)`;
      }
      return 'TOTAL FLEET YIELD (Q3)';
    }
    if (selectedCell.col === 'H' && selectedCell.row >= 2 && selectedCell.row <= 13) {
      return `=E${selectedCell.row}-(F${selectedCell.row}+G${selectedCell.row})`;
    }
    return currentCellValue;
  }, [selectedCell, currentCellValue]);

  // Start in-cell editing
  const startEditing = (initialChar?: string) => {
    if (selectedCell.row >= 2 && selectedCell.row <= 13) {
      const targetRow = rows[selectedCell.row - 2];
      if (!targetRow) return;

      let val = '';
      if (initialChar !== undefined) {
        val = initialChar;
      } else {
        switch (selectedCell.col) {
          case 'A': val = targetRow.date; break;
          case 'B': val = targetRow.region; break;
          case 'C': val = targetRow.fleetId; break;
          case 'D': val = targetRow.vehicleType; break;
          case 'E': val = String(targetRow.baseFare); break;
          case 'F': val = String(targetRow.fuelSurcharge); break;
          case 'G': val = String(targetRow.tollExpense); break;
          case 'H': val = String(targetRow.netYield); break;
          case 'I': val = targetRow.status; break;
          case 'J': val = targetRow.waybill; break;
          case 'K': val = targetRow.slaCompliance; break;
          case 'L': val = targetRow.reconciledBy; break;
          case 'M': val = targetRow.varianceNote; break;
          default: val = '';
        }
      }

      setEditValue(val);
      setIsEditing(true);
    }
  };

  // Commit in-cell edit
  const commitCellEdit = () => {
    if (!isEditing) return;
    const rowIndex = selectedCell.row - 2;
    if (rowIndex >= 0 && rowIndex < rows.length) {
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[rowIndex] };
        const numVal = parseFloat(editValue.replace(/[₹,]/g, '')) || 0;

        switch (selectedCell.col) {
          case 'A': row.date = editValue; break;
          case 'B': row.region = editValue; break;
          case 'C': row.fleetId = editValue; break;
          case 'D': row.vehicleType = editValue; break;
          case 'E':
            row.baseFare = numVal;
            row.netYield = row.baseFare - (row.fuelSurcharge + row.tollExpense);
            break;
          case 'F':
            row.fuelSurcharge = numVal;
            row.netYield = row.baseFare - (row.fuelSurcharge + row.tollExpense);
            break;
          case 'G':
            row.tollExpense = numVal;
            row.netYield = row.baseFare - (row.fuelSurcharge + row.tollExpense);
            break;
          case 'I':
            if (['Audited', 'Pending', 'Reconciled'].includes(editValue)) {
              row.status = editValue as 'Audited' | 'Pending' | 'Reconciled';
            }
            break;
          case 'J': row.waybill = editValue; break;
          case 'K': row.slaCompliance = editValue; break;
          case 'L': row.reconciledBy = editValue; break;
          case 'M': row.varianceNote = editValue; break;
        }

        next[rowIndex] = row;
        return next;
      });
    }
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`excel-disguise-viewport ${isDarkMode ? 'theme-dark' : 'theme-light'} persona-${persona}`}
      role="region"
      aria-label="Corporate Logistics Spreadsheets Disguise"
      style={{ fontSize: `${zoomLevel}%` }}
    >
      {/* =========================================================================
          PERSONA 1: MICROSOFT EXCEL 365 DESKTOP (PIXEL-PERFECT AUTHENTIC)
          ========================================================================= */}
      {persona === 'excel_365' && (
        <>
          {/* 1. Office 365 Green Titlebar & Windows Chrome */}
          <div className="excel-titlebar">
            {/* Left: Quick Access Toolbar */}
            <div className="excel-title-left">
              <div className="excel-autosave-toggle" title="AutoSave">
                <span className="excel-autosave-label">AutoSave</span>
                <span className="excel-autosave-switch active">
                  <span className="excel-autosave-thumb" />
                </span>
              </div>
              <div className="excel-quick-access">
                <button type="button" className="excel-qa-btn" title="Save (Ctrl+S)">
                  <Save size={13} />
                </button>
                <button type="button" className="excel-qa-btn" title="Undo (Ctrl+Z)">
                  <Undo size={13} />
                </button>
                <button type="button" className="excel-qa-btn" title="Redo (Ctrl+Y)">
                  <Redo size={13} />
                </button>
                <span className="excel-qa-caret">▾</span>
              </div>
            </div>

            {/* Center: File Name & Search Box */}
            <div className="excel-title-center">
              <div className="excel-doc-header">
                <span className="excel-file-name">Q3_Logistics_Fleet_Yield_Audit_FY26.xlsx</span>
                <span className="excel-save-status">- Saved to OneDrive</span>
              </div>
              <div className="excel-search-box">
                <Search size={12} className="excel-search-icon" />
                <input
                  type="text"
                  placeholder="Search (Alt+Q)"
                  readOnly
                  className="excel-search-input"
                />
              </div>
            </div>

            {/* Right: User Profile & Windows Controls */}
            <div className="excel-title-right">
              {/* Profile Avatar with Covert Settings Menu */}
              <div className="excel-profile-wrapper">
                <button
                  type="button"
                  className="excel-profile-badge"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  title="Anish Zafar (Fleet Operations)"
                >
                  <span className="excel-avatar-text">AZ</span>
                </button>

                {showProfileMenu && (
                  <div className="excel-profile-dropdown">
                    <div className="excel-profile-card">
                      <div className="excel-profile-initials">AZ</div>
                      <div className="excel-profile-info">
                        <strong>Anish Zafar</strong>
                        <span>ops.fleet@corporate.internal</span>
                        <small>Microsoft 365 Enterprise E5</small>
                      </div>
                    </div>
                    <div className="excel-dropdown-divider" />
                    <div className="excel-dropdown-section">
                      <span className="excel-dropdown-heading">Office Theme</span>
                      <div className="excel-theme-options">
                        <button
                          type="button"
                          className={`excel-theme-pill ${!isDarkMode ? 'active' : ''}`}
                          onClick={() => { setIsDarkMode(false); setShowProfileMenu(false); }}
                        >
                          Colorful
                        </button>
                        <button
                          type="button"
                          className={`excel-theme-pill ${isDarkMode ? 'active' : ''}`}
                          onClick={() => { setIsDarkMode(true); setShowProfileMenu(false); }}
                        >
                          Dark Gray
                        </button>
                      </div>
                    </div>
                    <div className="excel-dropdown-divider" />
                    <div className="excel-dropdown-section">
                      <span className="excel-dropdown-heading">Application Persona</span>
                      <button
                        type="button"
                        className="excel-menu-item"
                        onClick={() => { setPersona('excel_365'); setShowProfileMenu(false); }}
                      >
                        <FileSpreadsheet size={13} />
                        <span>Microsoft Excel 365</span>
                      </button>
                      <button
                        type="button"
                        className="excel-menu-item"
                        onClick={() => { setPersona('google_sheets'); setShowProfileMenu(false); }}
                      >
                        <Table size={13} />
                        <span>Google Sheets</span>
                      </button>
                      <button
                        type="button"
                        className="excel-menu-item"
                        onClick={() => { setPersona('aws_cloudwatch'); setShowProfileMenu(false); }}
                      >
                        <Cloud size={13} />
                        <span>AWS CloudWatch APM</span>
                      </button>
                    </div>
                    <div className="excel-dropdown-divider" />
                    <button
                      type="button"
                      className="excel-menu-item text-danger"
                      onClick={() => { setShowProfileMenu(false); triggerExit(); }}
                    >
                      <Lock size={13} />
                      <span>Close Workbook (Return to PsFi)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Native Windows Chrome Controls */}
              <div className="excel-window-controls">
                <button
                  type="button"
                  className="excel-win-btn win-min"
                  title="Minimize"
                  onClick={triggerExit}
                >
                  ─
                </button>
                <button
                  type="button"
                  className="excel-win-btn win-max"
                  title="Maximize / Restore"
                >
                  ▢
                </button>
                <button
                  type="button"
                  className="excel-win-btn win-close"
                  title="Close (Exit to PsFi)"
                  onClick={triggerExit}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* 2. Ribbon Tabs Strip */}
          <div className="excel-ribbon-tabs-strip">
            <button
              type="button"
              className="excel-file-tab-btn"
              onClick={() => setShowBackstage(true)}
              title="File (Backstage)"
            >
              File
            </button>
            {['Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveRibbonTab(tab)}
                className={`excel-ribbon-tab-btn ${activeRibbonTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 3. Ribbon Toolbars */}
          <div className="excel-ribbon-bar">
            {activeRibbonTab === 'Home' ? (
              <div className="excel-ribbon-content">
                {/* Group 1: Clipboard */}
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools">
                    <button type="button" className="excel-btn-split-paste" title="Paste (Ctrl+V)">
                      <Clipboard size={18} className="text-amber-600" />
                      <span>Paste ▾</span>
                    </button>
                    <div className="excel-btn-col-stack">
                      <button type="button" className="excel-micro-btn" title="Cut (Ctrl+X)"><Scissors size={11} /></button>
                      <button type="button" className="excel-micro-btn" title="Copy (Ctrl+C)"><FileSpreadsheet size={11} /> ▾</button>
                      <button type="button" className="excel-micro-btn" title="Format Painter"><Paintbrush size={11} /></button>
                    </div>
                  </div>
                  <div className="excel-group-label">Clipboard ⇲</div>
                </div>

                {/* Group 2: Font */}
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools">
                    <div className="excel-font-row-1">
                      <div className="excel-select-fake font-family-select">
                        <span>Aptos (Body)</span>
                        <ChevronDown size={10} />
                      </div>
                      <div className="excel-select-fake font-size-select">
                        <span>11</span>
                        <ChevronDown size={10} />
                      </div>
                      <button type="button" className="excel-tool-square" title="Increase Font Size">A<span className="superscript">▲</span></button>
                      <button type="button" className="excel-tool-square" title="Decrease Font Size">A<span className="subscript">▼</span></button>
                    </div>
                    <div className="excel-font-row-2">
                      <button type="button" className="excel-tool-square font-bold" title="Bold (Ctrl+B)"><Bold size={11} /></button>
                      <button type="button" className="excel-tool-square italic" title="Italic (Ctrl+I)"><Italic size={11} /></button>
                      <button type="button" className="excel-tool-square underline" title="Underline (Ctrl+U)"><Underline size={11} /> ▾</button>
                      <button type="button" className="excel-tool-square" title="Borders">⊞ ▾</button>
                      <button type="button" className="excel-tool-square fill-bucket" title="Fill Color">
                        <span>🪣</span>
                        <span className="color-strip-yellow" />
                      </button>
                      <button type="button" className="excel-tool-square font-color" title="Font Color">
                        <span className="font-bold">A</span>
                        <span className="color-strip-red" />
                      </button>
                    </div>
                  </div>
                  <div className="excel-group-label">Font ⇲</div>
                </div>

                {/* Group 3: Alignment */}
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools">
                    <div className="excel-align-grid">
                      <button type="button" className="excel-tool-square" title="Top Align">▲</button>
                      <button type="button" className="excel-tool-square" title="Middle Align">▬</button>
                      <button type="button" className="excel-tool-square" title="Bottom Align">▼</button>
                      <button type="button" className="excel-tool-square" title="Orientation">ab↗ ▾</button>
                    </div>
                    <div className="excel-align-grid">
                      <button type="button" className="excel-tool-square" title="Align Left"><AlignLeft size={11} /></button>
                      <button type="button" className="excel-tool-square" title="Center"><AlignCenter size={11} /></button>
                      <button type="button" className="excel-tool-square" title="Align Right"><AlignRight size={11} /></button>
                      <button type="button" className="excel-tool-square" title="Wrap Text">Wrap</button>
                    </div>
                  </div>
                  <div className="excel-group-label">Alignment ⇲</div>
                </div>

                {/* Group 4: Number */}
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools">
                    <div className="excel-select-fake number-format-select">
                      <span>Accounting</span>
                      <ChevronDown size={10} />
                    </div>
                    <div className="excel-number-tools-row">
                      <button type="button" className="excel-tool-square font-mono font-bold" title="Currency (₹)">₹ ▾</button>
                      <button type="button" className="excel-tool-square font-bold" title="Percent Style (%)">%</button>
                      <button type="button" className="excel-tool-square font-bold" title="Comma Style">,</button>
                      <button type="button" className="excel-tool-square font-mono text-[9px]" title="Increase Decimal">.00→.0</button>
                      <button type="button" className="excel-tool-square font-mono text-[9px]" title="Decrease Decimal">.0→.00</button>
                    </div>
                  </div>
                  <div className="excel-group-label">Number ⇲</div>
                </div>

                {/* Group 5: Styles */}
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools flex-row gap-1">
                    <button type="button" className="excel-large-ribbon-btn" title="Conditional Formatting">
                      <span className="excel-icon-glyph">📊</span>
                      <span>Conditional<br />Formatting ▾</span>
                    </button>
                    <button type="button" className="excel-large-ribbon-btn" title="Format as Table">
                      <span className="excel-icon-glyph">▦</span>
                      <span>Format as<br />Table ▾</span>
                    </button>
                    <button type="button" className="excel-large-ribbon-btn" title="Cell Styles">
                      <span className="excel-icon-glyph">🎨</span>
                      <span>Cell<br />Styles ▾</span>
                    </button>
                  </div>
                  <div className="excel-group-label">Styles</div>
                </div>

                {/* Group 6: Cells */}
                <div className="excel-ribbon-group">
                  <div className="excel-btn-col-stack justify-center">
                    <button type="button" className="excel-text-btn" title="Insert Cells">➕ Insert ▾</button>
                    <button type="button" className="excel-text-btn" title="Delete Cells">✖ Delete ▾</button>
                    <button type="button" className="excel-text-btn" title="Format Cells">⚙ Format ▾</button>
                  </div>
                  <div className="excel-group-label">Cells</div>
                </div>

                {/* Group 7: Editing */}
                <div className="excel-ribbon-group border-r-0">
                  <div className="excel-group-tools">
                    <div className="excel-btn-col-stack">
                      <button type="button" className="excel-text-btn font-semibold" title="AutoSum">∑ AutoSum ▾</button>
                      <button type="button" className="excel-text-btn" title="Fill">↓ Fill ▾</button>
                      <button type="button" className="excel-text-btn" title="Clear">🧹 Clear ▾</button>
                    </div>
                    <div className="excel-btn-col-stack ml-2">
                      <button type="button" className="excel-text-btn" title="Sort & Filter"><Filter size={11} /> Sort ▾</button>
                      <button type="button" className="excel-text-btn" title="Find & Select"><Search size={11} /> Find ▾</button>
                    </div>
                  </div>
                  <div className="excel-group-label">Editing</div>
                </div>
              </div>
            ) : activeRibbonTab === 'Review' ? (
              <div className="excel-ribbon-content">
                <div className="excel-ribbon-group">
                  <div className="excel-group-tools flex-row gap-2">
                    <button type="button" className="excel-large-ribbon-btn">
                      <Check size={16} className="text-emerald-600" />
                      <span>Spelling</span>
                    </button>
                    <button type="button" className="excel-large-ribbon-btn">
                      <FileSpreadsheet size={16} />
                      <span>Workbook<br />Statistics</span>
                    </button>
                  </div>
                  <div className="excel-group-label">Proofing</div>
                </div>

                <div className="excel-ribbon-group">
                  <div className="excel-group-tools flex-row gap-2">
                    <button type="button" className="excel-large-ribbon-btn" onClick={triggerExit} title="Unprotect Worksheet">
                      <Lock size={16} className="text-amber-500" />
                      <span>Unprotect<br />Sheet</span>
                    </button>
                    <button type="button" className="excel-large-ribbon-btn">
                      <FileSpreadsheet size={16} />
                      <span>Protect<br />Workbook</span>
                    </button>
                  </div>
                  <div className="excel-group-label">Protect</div>
                </div>
              </div>
            ) : (
              <div className="excel-ribbon-content p-3 text-xs opacity-75 flex items-center gap-4">
                <span>Standard Office 365 {activeRibbonTab} controls loaded for corporate domain.</span>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('Home')}
                  className="px-2 py-0.5 border border-neutral-400 rounded hover:bg-neutral-200 text-xs"
                >
                  Return to Home Tab
                </button>
              </div>
            )}
          </div>

          {/* 4. Formula Bar */}
          <div className="excel-formula-bar">
            <div className="excel-name-box" title="Name Box">
              <span>{cellCoordLabel}</span>
              <ChevronDown size={10} className="text-neutral-500" />
            </div>
            <div className="excel-fx-divider" />
            <div className="excel-fx-actions">
              <button
                type="button"
                className="excel-fx-btn btn-cancel"
                onClick={() => setIsEditing(false)}
                title="Cancel (Esc)"
              >
                <X size={12} />
              </button>
              <button
                type="button"
                className="excel-fx-btn btn-enter"
                onClick={commitCellEdit}
                title="Enter"
              >
                <Check size={12} />
              </button>
              <span className="excel-fx-symbol" title="Insert Function">fx</span>
            </div>
            <div className="excel-formula-input-wrapper">
              <input
                ref={formulaInputRef}
                type="text"
                className="excel-formula-input"
                value={isEditing ? editValue : formulaValue}
                onChange={(e) => {
                  if (!isEditing) setIsEditing(true);
                  setEditValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitCellEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                placeholder=""
              />
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          PERSONA 2: GOOGLE SHEETS WEB APP (AUTHENTIC BROWSER EXPERIENCE)
          ========================================================================= */}
      {persona === 'google_sheets' && (
        <div className="gsheets-header-wrapper">
          <div className="gsheets-top-bar">
            <div className="gsheets-left-brand">
              <div className="gsheets-logo-icon" title="Sheets home">
                <Table size={20} />
              </div>
              <div className="gsheets-doc-details">
                <div className="gsheets-title-line">
                  <span className="gsheets-title-text">Q3_Logistics_Fleet_Yield_Audit_FY26</span>
                  <span className="gsheets-star-icon" title="Star">★</span>
                  <span className="gsheets-folder-icon" title="Move">📁</span>
                  <span className="gsheets-status-pill">All changes saved in Drive</span>
                </div>
                <div className="gsheets-menu-row">
                  {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'].map((item) => (
                    <span key={item} className="gsheets-menu-item">{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="gsheets-right-controls">
              <button
                type="button"
                className="gsheets-share-btn"
                onClick={triggerExit}
                title="Share & Permissions (Click to exit to PsFi)"
              >
                <Lock size={12} />
                <span>Share</span>
              </button>
              <div
                className="gsheets-avatar-circle"
                onClick={() => setPersona('excel_365')}
                title="Corporate Google Workspace Account (Click to switch to Excel)"
              >
                AZ
              </div>
            </div>
          </div>

          {/* Google Sheets Action Toolbar */}
          <div className="gsheets-action-toolbar">
            <button type="button" className="gsheets-tb-btn" title="Undo"><Undo size={12} /></button>
            <button type="button" className="gsheets-tb-btn" title="Redo"><Redo size={12} /></button>
            <button type="button" className="gsheets-tb-btn" title="Print"><Printer size={12} /></button>
            <button type="button" className="gsheets-tb-btn" title="Paint format"><Paintbrush size={12} /></button>
            <span className="gsheets-tb-sep" />
            <span className="gsheets-tb-text">100% ▾</span>
            <span className="gsheets-tb-sep" />
            <button type="button" className="gsheets-tb-btn font-mono font-bold" title="Format as currency">₹</button>
            <button type="button" className="gsheets-tb-btn font-bold" title="Format as percent">%</button>
            <button type="button" className="gsheets-tb-btn font-mono" title="Decrease decimal places">.0←</button>
            <button type="button" className="gsheets-tb-btn font-mono" title="Increase decimal places">.00→</button>
            <span className="gsheets-tb-sep" />
            <span className="gsheets-tb-text">Roboto ▾</span>
            <span className="gsheets-tb-text">10 ▾</span>
            <span className="gsheets-tb-sep" />
            <button type="button" className="gsheets-tb-btn font-bold" title="Bold"><Bold size={11} /></button>
            <button type="button" className="gsheets-tb-btn italic" title="Italic"><Italic size={11} /></button>
            <button type="button" className="gsheets-tb-btn underline" title="Underline"><Underline size={11} /></button>
            <span className="gsheets-tb-sep" />
            <button type="button" className="gsheets-tb-btn" title="Create a filter"><Filter size={12} /></button>
            <button type="button" className="gsheets-tb-btn font-semibold" title="Functions">∑ ▾</button>
          </div>

          {/* Formula bar for Sheets */}
          <div className="gsheets-formula-bar">
            <div className="gsheets-name-box">{cellCoordLabel}</div>
            <div className="gsheets-fx-label">fx</div>
            <input
              type="text"
              className="gsheets-formula-input"
              value={formulaValue}
              readOnly
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          PERSONA 3: AWS CLOUDWATCH METRICS & APM CONSOLE
          ========================================================================= */}
      {persona === 'aws_cloudwatch' && (
        <div className="aws-console-header">
          <div className="aws-top-nav">
            <div className="aws-brand-left">
              <span className="aws-logo-glyph">☁</span>
              <span className="aws-title-brand">AWS</span>
              <div className="aws-services-menu">
                <span>Services</span>
                <ChevronDown size={10} />
              </div>
              <div className="aws-global-search">
                <Search size={12} />
                <input type="text" placeholder="Search for services, features, docs (Alt+S)" readOnly />
              </div>
            </div>
            <div className="aws-user-right">
              <span className="aws-region-pill">ap-south-1 (Mumbai) ▾</span>
              <span className="aws-account-pill">psfi-infra-admin @ 4910-2291-8841 ▾</span>
              <button
                type="button"
                className="aws-switch-btn"
                onClick={() => setPersona('excel_365')}
                title="Switch back to Excel Disguise"
              >
                Excel Mode
              </button>
            </div>
          </div>

          <div className="aws-breadcrumbs-bar">
            <span>CloudWatch</span>
            <span>&gt;</span>
            <span>Metrics</span>
            <span>&gt;</span>
            <span>All metrics</span>
            <span>&gt;</span>
            <span className="font-semibold text-amber-400">Logistics / Fleet-Pipeline-Ingest</span>
          </div>

          {/* Telemetry APM Metrics Ribbon */}
          <div className="aws-telemetry-strip">
            <div className="aws-stat-card">
              <span className="aws-stat-label">Ingest Throughput</span>
              <strong className="aws-stat-val text-emerald-400">14,820 req/s</strong>
              <small>+2.4% vs 1h baseline</small>
            </div>
            <div className="aws-stat-card">
              <span className="aws-stat-label">P99 Latency (APM)</span>
              <strong className="aws-stat-val text-cyan-300">42.1 ms</strong>
              <small>SLO &lt; 85ms Target</small>
            </div>
            <div className="aws-stat-card">
              <span className="aws-stat-label">Error Rate (5xx)</span>
              <strong className="aws-stat-val text-emerald-400">0.0018%</strong>
              <small>Nominal threshold</small>
            </div>
            <div className="aws-stat-card">
              <span className="aws-stat-label">Worker Nodes</span>
              <strong className="aws-stat-val text-amber-400">14 / 14 Healthy</strong>
              <small>Cluster ap-south-1a/b</small>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. CORE SPREADSHEET GRID (TRUE EXCEL HEADERS, INFINITE CELLS, EDITABLE)
          ========================================================================= */}
      <div className="excel-grid-container" tabIndex={0}>
        <table className="excel-main-grid">
          <thead>
            {/* Real Excel Column Letter Header (A, B, C, D...) */}
            <tr>
              <th className="excel-corner-th" title="Select All (Ctrl+A)">
                <div className="excel-corner-triangle" />
              </th>
              {COLUMNS.map((col) => {
                const isColActive = selectedCell.col === col;
                return (
                  <th
                    key={col}
                    className={`excel-col-header ${isColActive ? 'col-active' : ''}`}
                    onClick={() => setSelectedCell((prev) => ({ ...prev, col }))}
                  >
                    <span>{col}</span>
                    <div className="excel-col-resizer" />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* ROW 1: Real Corporate Table Column Headers (with filter dropdowns) */}
            <tr className="excel-table-header-row">
              <td
                className={`excel-row-header ${selectedCell.row === 1 ? 'row-active' : ''}`}
                onClick={() => setSelectedCell((prev) => ({ ...prev, row: 1 }))}
              >
                1
              </td>
              {[
                { col: 'A', title: 'Dispatch Date', width: '110px', align: 'center' },
                { col: 'B', title: 'Region Code', width: '130px', align: 'left' },
                { col: 'C', title: 'Fleet Unit ID', width: '120px', align: 'center' },
                { col: 'D', title: 'Vehicle Class', width: '120px', align: 'left' },
                { col: 'E', title: 'Base Freight (INR)', width: '135px', align: 'right' },
                { col: 'F', title: 'Fuel Surcharge (INR)', width: '135px', align: 'right' },
                { col: 'G', title: 'Tolls & Levies (INR)', width: '135px', align: 'right' },
                { col: 'H', title: 'Net Freight Margin (INR)', width: '160px', align: 'right' },
                { col: 'I', title: 'Audit Status', width: '115px', align: 'center' },
                { col: 'J', title: 'Waybill Reference', width: '130px', align: 'center' },
                { col: 'K', title: 'SLA On-Time', width: '105px', align: 'center' },
                { col: 'L', title: 'Reconciled By', width: '120px', align: 'left' },
                { col: 'M', title: 'Variance Note', width: '160px', align: 'left' },
              ].map((header) => {
                const isSelected = selectedCell.col === header.col && selectedCell.row === 1;
                return (
                  <td
                    key={header.col}
                    className={`excel-table-th-cell ${isSelected ? 'cell-selected' : ''}`}
                    style={{ width: header.width, textAlign: header.align as any }}
                    onClick={() => {
                      if (isEditing) commitCellEdit();
                      setSelectedCell({ col: header.col, row: 1 });
                    }}
                  >
                    <div className="excel-th-inner">
                      <span>{header.title}</span>
                      <span className="excel-filter-caret" title="Filter / Sort">▾</span>
                    </div>
                    {isSelected && <div className="excel-selection-handle" />}
                  </td>
                );
              })}
            </tr>

            {/* ROWS 2 TO 13: Realistic Corporate Fleet Logistics Data */}
            {rows.map((row, idx) => {
              const rowNum = idx + 2;
              const isRowActive = selectedCell.row === rowNum;

              return (
                <tr key={row.id} className={`excel-data-row ${idx % 2 === 1 ? 'row-zebra' : ''}`}>
                  {/* Row Coordinate Header */}
                  <td
                    className={`excel-row-header ${isRowActive ? 'row-active' : ''}`}
                    onClick={() => {
                      if (isEditing) commitCellEdit();
                      setSelectedCell((prev) => ({ ...prev, row: rowNum }));
                    }}
                  >
                    {rowNum}
                  </td>

                  {/* Cell A: Date */}
                  <td
                    className={`excel-cell text-center ${selectedCell.col === 'A' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'A' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'A', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'A' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-center"
                      />
                    ) : (
                      row.date
                    )}
                    {selectedCell.col === 'A' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell B: Region Code */}
                  <td
                    className={`excel-cell font-medium ${selectedCell.col === 'B' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'B' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'B', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'B' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input"
                      />
                    ) : (
                      row.region
                    )}
                    {selectedCell.col === 'B' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell C: Fleet Unit ID */}
                  <td
                    className={`excel-cell text-center font-mono font-semibold text-blue-700 dark:text-blue-400 ${selectedCell.col === 'C' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'C' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'C', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'C' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-center"
                      />
                    ) : (
                      row.fleetId
                    )}
                    {selectedCell.col === 'C' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell D: Vehicle Class */}
                  <td
                    className={`excel-cell ${selectedCell.col === 'D' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'D' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'D', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'D' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input"
                      />
                    ) : (
                      row.vehicleType
                    )}
                    {selectedCell.col === 'D' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell E: Base Freight */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'E' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'E' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'E', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'E' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-right font-mono"
                      />
                    ) : (
                      `₹${row.baseFare.toLocaleString('en-IN')}.00`
                    )}
                    {selectedCell.col === 'E' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell F: Fuel Surcharge */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'F' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'F' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'F', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'F' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-right font-mono"
                      />
                    ) : (
                      `₹${row.fuelSurcharge.toLocaleString('en-IN')}.00`
                    )}
                    {selectedCell.col === 'F' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell G: Tolls & Levies */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'G' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'G' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'G', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'G' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-right font-mono"
                      />
                    ) : (
                      `₹${row.tollExpense.toLocaleString('en-IN')}.00`
                    )}
                    {selectedCell.col === 'G' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell H: Net Freight Margin */}
                  <td
                    className={`excel-cell text-right font-mono font-bold cell-highlight-margin ${selectedCell.col === 'H' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'H' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'H', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'H' && isRowActive ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-input text-right font-mono"
                      />
                    ) : (
                      `₹${row.netYield.toLocaleString('en-IN')}.00`
                    )}
                    {selectedCell.col === 'H' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell I: Audit Status */}
                  <td
                    className={`excel-cell text-center ${selectedCell.col === 'I' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'I' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'I', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {isEditing && selectedCell.col === 'I' && isRowActive ? (
                      <select
                        ref={cellInputRef as any}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitCellEdit}
                        className="excel-cell-inline-select"
                      >
                        <option value="Audited">Audited</option>
                        <option value="Reconciled">Reconciled</option>
                        <option value="Pending">Pending</option>
                      </select>
                    ) : (
                      <span className={`excel-status-badge status-${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    )}
                    {selectedCell.col === 'I' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell J: Waybill */}
                  <td
                    className={`excel-cell text-center font-mono text-[11px] text-neutral-600 dark:text-neutral-400 ${selectedCell.col === 'J' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'J' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'J', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {row.waybill}
                    {selectedCell.col === 'J' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell K: SLA */}
                  <td
                    className={`excel-cell text-center font-mono ${selectedCell.col === 'K' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'K' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'K', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {row.slaCompliance}
                    {selectedCell.col === 'K' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell L: Reconciled By */}
                  <td
                    className={`excel-cell text-left font-mono text-[11px] ${selectedCell.col === 'L' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'L' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'L', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {row.reconciledBy}
                    {selectedCell.col === 'L' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>

                  {/* Cell M: Variance Note */}
                  <td
                    className={`excel-cell text-left text-[11px] text-neutral-600 dark:text-neutral-400 ${selectedCell.col === 'M' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => {
                      if (isEditing && (selectedCell.col !== 'M' || selectedCell.row !== rowNum)) commitCellEdit();
                      setSelectedCell({ col: 'M', row: rowNum });
                    }}
                    onDoubleClick={() => startEditing()}
                  >
                    {row.varianceNote}
                    {selectedCell.col === 'M' && isRowActive && !isEditing && <div className="excel-selection-handle" />}
                  </td>
                </tr>
              );
            })}

            {/* ROW 14: Corporate Accounting Totals Row (Double Underline Style) */}
            <tr className="excel-total-summary-row">
              <td
                className={`excel-row-header ${selectedCell.row === 14 ? 'row-active' : ''}`}
                onClick={() => setSelectedCell((p) => ({ ...p, row: 14 }))}
              >
                14
              </td>
              <td
                colSpan={4}
                className={`excel-cell font-bold uppercase tracking-wider ${selectedCell.row === 14 && ['A', 'B', 'C', 'D'].includes(selectedCell.col) ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'A', row: 14 })}
              >
                TOTAL FLEET YIELD (Q3 YTD BALANCED)
              </td>
              <td
                className={`excel-cell text-right font-mono font-bold ${selectedCell.col === 'E' && selectedCell.row === 14 ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'E', row: 14 })}
              >
                ₹{totalBase.toLocaleString('en-IN')}.00
                {selectedCell.col === 'E' && selectedCell.row === 14 && <div className="excel-selection-handle" />}
              </td>
              <td
                className={`excel-cell text-right font-mono font-bold ${selectedCell.col === 'F' && selectedCell.row === 14 ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'F', row: 14 })}
              >
                ₹{totalSurcharge.toLocaleString('en-IN')}.00
                {selectedCell.col === 'F' && selectedCell.row === 14 && <div className="excel-selection-handle" />}
              </td>
              <td
                className={`excel-cell text-right font-mono font-bold ${selectedCell.col === 'G' && selectedCell.row === 14 ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'G', row: 14 })}
              >
                ₹{totalToll.toLocaleString('en-IN')}.00
                {selectedCell.col === 'G' && selectedCell.row === 14 && <div className="excel-selection-handle" />}
              </td>
              <td
                className={`excel-cell text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 cell-highlight-margin ${selectedCell.col === 'H' && selectedCell.row === 14 ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'H', row: 14 })}
              >
                ₹{totalNet.toLocaleString('en-IN')}.00
                {selectedCell.col === 'H' && selectedCell.row === 14 && <div className="excel-selection-handle" />}
              </td>
              <td
                className={`excel-cell text-center font-mono text-[10px] font-bold text-emerald-600 ${selectedCell.col === 'I' && selectedCell.row === 14 ? 'cell-selected' : ''}`}
                onClick={() => setSelectedCell({ col: 'I', row: 14 })}
              >
                100% RECONCILED
                {selectedCell.col === 'I' && selectedCell.row === 14 && <div className="excel-selection-handle" />}
              </td>
              <td colSpan={4} className="excel-cell text-neutral-400 text-xs italic">
                All ledger lines cleared by Internal Audit Board
              </td>
            </tr>

            {/* ROWS 15 TO 35: Realistic Empty Grid Rows (Endless Corporate Sheet) */}
            {Array.from({ length: TOTAL_GRID_ROWS - 14 }).map((_, i) => {
              const rowNum = i + 15;
              const isRowActive = selectedCell.row === rowNum;

              return (
                <tr key={rowNum} className="excel-empty-row">
                  <td
                    className={`excel-row-header ${isRowActive ? 'row-active' : ''}`}
                    onClick={() => {
                      if (isEditing) commitCellEdit();
                      setSelectedCell((p) => ({ ...p, row: rowNum }));
                    }}
                  >
                    {rowNum}
                  </td>
                  {COLUMNS.map((col) => {
                    const isSelected = selectedCell.col === col && isRowActive;
                    return (
                      <td
                        key={col}
                        className={`excel-cell ${isSelected ? 'cell-selected' : ''}`}
                        onClick={() => {
                          if (isEditing) commitCellEdit();
                          setSelectedCell({ col, row: rowNum });
                        }}
                      >
                        {isSelected && <div className="excel-selection-handle" />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          6. WORKSHEET TABS BAR & EXCEL STATUS BAR (EXACT OFFICE REPLICA)
          ========================================================================= */}
      <div className="excel-bottom-dock">
        {/* Sheet Tabs Bar */}
        <div className="excel-sheet-tabs-bar">
          <div className="excel-sheet-nav-controls">
            <button type="button" className="excel-sheet-nav-btn" title="Scroll sheets left"><ChevronLeft size={12} /></button>
            <button type="button" className="excel-sheet-nav-btn" title="Scroll sheets right"><ChevronRight size={12} /></button>
          </div>

          <div className="excel-tabs-list">
            <button
              type="button"
              className={`excel-sheet-tab ${activeSheetTab === 'fleet' ? 'active' : ''}`}
              onClick={() => setActiveSheetTab('fleet')}
            >
              <span>Sheet1 - Fleet_Yield_Audit</span>
              {activeSheetTab === 'fleet' && <span className="excel-tab-caret">▾</span>}
            </button>
            <button
              type="button"
              className={`excel-sheet-tab ${activeSheetTab === 'margins' ? 'active' : ''}`}
              onClick={() => setActiveSheetTab('margins')}
            >
              <span>Route_Margins_P&amp;L</span>
            </button>
            <button
              type="button"
              className={`excel-sheet-tab ${activeSheetTab === 'vendors' ? 'active' : ''}`}
              onClick={() => setActiveSheetTab('vendors')}
            >
              <span>Vendor_SLA_Q3</span>
            </button>
            <button
              type="button"
              className={`excel-sheet-tab ${activeSheetTab === 'depr' ? 'active' : ''}`}
              onClick={() => setActiveSheetTab('depr')}
            >
              <span>Depreciation_Model</span>
            </button>
          </div>

          <button type="button" className="excel-add-sheet-btn" title="New Sheet">
            <Plus size={13} />
          </button>

          <div className="excel-sheet-scrollbar-space" />
        </div>

        {/* Real Excel Status Bar */}
        <div className="excel-status-bar">
          <div className="excel-status-left">
            {/* Macro recording glyph (Double click covertly triggers unprotect / exit) */}
            <button
              type="button"
              className="excel-macro-glyph"
              title="Ready (Double click to unprotect)"
              onDoubleClick={triggerExit}
            >
              ⊞
            </button>
            <span className="excel-cell-mode">{isEditing ? 'Edit' : 'Ready'}</span>
            <span className="excel-status-sep">|</span>
            <span className="excel-active-coord text-neutral-500">Cell {cellCoordLabel}</span>
          </div>

          <div className="excel-status-right">
            {/* Calculation chips */}
            <div className="excel-stats-chips">
              <span className="excel-stat-item">Average: <strong>₹31,450.00</strong></span>
              <span className="excel-stat-item">Count: <strong>12</strong></span>
              <span className="excel-stat-item">Numerical Count: <strong>12</strong></span>
              <span className="excel-stat-item">Min: <strong>₹13,680.00</strong></span>
              <span className="excel-stat-item">Max: <strong>₹43,700.00</strong></span>
              <span className="excel-stat-item">Sum: <strong className="text-emerald-700 dark:text-emerald-400">₹{totalNet.toLocaleString('en-IN')}.00</strong></span>
            </div>

            <span className="excel-status-sep">|</span>

            {/* View Layout Shortcuts */}
            <div className="excel-view-shortcuts">
              <button type="button" className="excel-view-btn active" title="Normal View">▦</button>
              <button type="button" className="excel-view-btn" title="Page Layout">📄</button>
              <button type="button" className="excel-view-btn" title="Page Break Preview">📑</button>
            </div>

            <span className="excel-status-sep">|</span>

            {/* Zoom Slider */}
            <div className="excel-zoom-controls">
              <button
                type="button"
                className="excel-zoom-btn"
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                title="Zoom Out"
              >
                -
              </button>
              <input
                type="range"
                min={70}
                max={140}
                step={5}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
                className="excel-zoom-slider"
                title={`Zoom: ${zoomLevel}%`}
              />
              <button
                type="button"
                className="excel-zoom-btn"
                onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
                title="Zoom In"
              >
                +
              </button>
              <span
                className="excel-zoom-label"
                onClick={() => setZoomLevel(100)}
                title="Reset zoom to 100%"
              >
                {zoomLevel}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          7. AUTHENTIC OFFICE BACKSTAGE SCREEN (FILE MENU VIEW)
          ========================================================================= */}
      {showBackstage && (
        <div className="excel-backstage-overlay">
          {/* Green Left Navigation Rail */}
          <div className="excel-backstage-nav">
            <button
              type="button"
              className="excel-backstage-back-btn"
              onClick={() => setShowBackstage(false)}
              title="Return to Workbook"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="excel-backstage-links">
              <span className="excel-bs-link">Home</span>
              <span className="excel-bs-link">New</span>
              <span className="excel-bs-link">Open</span>
              <span className="excel-bs-link active">Info</span>
              <span className="excel-bs-link">Save</span>
              <span className="excel-bs-link">Save As</span>
              <span className="excel-bs-link">Print</span>
              <span className="excel-bs-link">Share</span>
              <span className="excel-bs-link">Export</span>
              <button
                type="button"
                className="excel-bs-link text-left w-full hover:bg-emerald-800"
                onClick={() => { setShowBackstage(false); triggerExit(); }}
              >
                Close Workbook
              </button>
              <div className="mt-auto pt-6 border-t border-emerald-600/40">
                <span className="excel-bs-link">Account</span>
                <span className="excel-bs-link">Feedback</span>
                <span className="excel-bs-link">Options</span>
              </div>
            </div>
          </div>

          {/* Main Info Stage */}
          <div className="excel-backstage-content">
            <h2 className="excel-bs-title">Info</h2>
            <div className="excel-bs-meta">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                Q3_Logistics_Fleet_Yield_Audit_FY26.xlsx
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                https://corporate-sharepoint.internal/sites/fleet-ops/audits/Q3_Audit.xlsx
              </p>
            </div>

            <div className="excel-bs-grid mt-6">
              {/* Protect Workbook Card */}
              <div className="excel-bs-tile">
                <div className="excel-bs-tile-icon bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                  <Lock size={24} />
                </div>
                <div className="excel-bs-tile-text">
                  <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-100">Protect Workbook</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    This worksheet is currently protected with corporate encryption credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowBackstage(false); triggerExit(); }}
                    className="mt-3 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-semibold hover:bg-neutral-200"
                  >
                    Unprotect Sheet...
                  </button>
                </div>
              </div>

              {/* Version History & Audit Card */}
              <div className="excel-bs-tile">
                <div className="excel-bs-tile-icon bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="excel-bs-tile-text">
                  <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-100">Version History</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Previous version saved today at 01:14 PM by Anish Zafar. AutoSave is active.
                  </p>
                </div>
              </div>
            </div>

            {/* Covert Preferences Section disguised as Corporate Environment Settings */}
            <div className="mt-8 p-4 bg-neutral-100/70 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800 max-w-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-3">
                Corporate Workplace Client Configuration
              </h4>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-700 dark:text-neutral-300">Spreadsheet Client Persona:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded border text-xs font-medium ${persona === 'excel_365' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}
                      onClick={() => setPersona('excel_365')}
                    >
                      Excel 365
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded border text-xs font-medium ${persona === 'google_sheets' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}
                      onClick={() => setPersona('google_sheets')}
                    >
                      Google Sheets
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded border text-xs font-medium ${persona === 'aws_cloudwatch' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}
                      onClick={() => setPersona('aws_cloudwatch')}
                    >
                      AWS APM
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-700 dark:text-neutral-300">Office Color Palette Theme:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded border text-xs font-medium ${!isDarkMode ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}
                      onClick={() => setIsDarkMode(false)}
                    >
                      Colorful
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded border text-xs font-medium ${isDarkMode ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}
                      onClick={() => setIsDarkMode(true)}
                    >
                      Dark Gray
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. GENUINE MICROSOFT EXCEL "UNPROTECT SHEET" DIALOG (COVERT EXIT GATE)
          ========================================================================= */}
      {showUnprotectDialog && (
        <div className="excel-dialog-backdrop">
          {/* Main Unprotect Sheet Prompt */}
          <div className="excel-win-dialog" role="dialog" aria-labelledby="dialog-title">
            <div className="excel-dialog-titlebar">
              <div className="excel-dialog-title-left">
                <FileSpreadsheet size={14} className="text-emerald-700 dark:text-emerald-400" />
                <span id="dialog-title">Unprotect Sheet</span>
              </div>
              <button
                type="button"
                className="excel-dialog-close-btn"
                onClick={() => setShowUnprotectDialog(false)}
                title="Cancel"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUnprotectSubmit} className="excel-dialog-body">
              <label htmlFor="unprotect-input" className="excel-dialog-label">
                Password to unprotect sheet &apos;Fleet_Yield_Audit&apos;:
              </label>
              <input
                id="unprotect-input"
                ref={passwordInputRef}
                type="password"
                maxLength={8}
                value={unprotectPassword}
                onChange={(e) => setUnprotectPassword(e.target.value)}
                autoComplete="off"
                className="excel-dialog-input"
              />

              <div className="excel-dialog-footer">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="excel-dialog-btn btn-ok"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnprotectDialog(false)}
                  className="excel-dialog-btn btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Genuine Excel Error Alert Messagebox (If Wrong Password Entered) */}
          {showPasswordAlert && (
            <div className="excel-alert-dialog" role="alertdialog" aria-labelledby="alert-title">
              <div className="excel-dialog-titlebar">
                <div className="excel-dialog-title-left">
                  <FileSpreadsheet size={14} className="text-emerald-700 dark:text-emerald-400" />
                  <span id="alert-title">Microsoft Excel</span>
                </div>
                <button
                  type="button"
                  className="excel-dialog-close-btn"
                  onClick={() => {
                    setShowPasswordAlert(false);
                    setUnprotectPassword('');
                    passwordInputRef.current?.focus();
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="excel-alert-body">
                <div className="excel-alert-icon">
                  <AlertTriangle size={32} className="text-amber-500" />
                </div>
                <div className="excel-alert-message">
                  The password you supplied is not correct. Verify that the CAPS LOCK key is off and be sure to use the correct capitalization.
                </div>
              </div>
              <div className="excel-alert-footer">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setShowPasswordAlert(false);
                    setUnprotectPassword('');
                    passwordInputRef.current?.focus();
                  }}
                  className="excel-dialog-btn btn-ok"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
