import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Lock,
  Sun,
  Moon,
  Plus,
  Table,
} from 'lucide-react';

interface ExcelCamouflageOverlayProps {
  isOpen: boolean;
  onExit: () => void;
  vaultPin?: string;
}

type DisguisePersona = 'excel_365' | 'google_sheets' | 'aws_cloudwatch';

interface SpreadsheetRow {
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
}

const INITIAL_ROWS: SpreadsheetRow[] = [
  { id: '101', date: '2026-10-01', region: 'North - NCR', fleetId: 'FL-DL-8821', vehicleType: 'Heavy 16T', baseFare: 42500, fuelSurcharge: 6800, tollExpense: 2150, netYield: 33550, status: 'Audited' },
  { id: '102', date: '2026-10-02', region: 'West - MH', fleetId: 'FL-MH-1044', vehicleType: 'Medium 8T', baseFare: 28000, fuelSurcharge: 4200, tollExpense: 1400, netYield: 22400, status: 'Reconciled' },
  { id: '103', date: '2026-10-03', region: 'South - KA', fleetId: 'FL-KA-3920', vehicleType: 'Reefer 12T', baseFare: 56000, fuelSurcharge: 9100, tollExpense: 3200, netYield: 43700, status: 'Audited' },
  { id: '104', date: '2026-10-04', region: 'West - GJ', fleetId: 'FL-GJ-5512', vehicleType: 'LCV 4T', baseFare: 18500, fuelSurcharge: 2600, tollExpense: 850, netYield: 15050, status: 'Reconciled' },
  { id: '105', date: '2026-10-05', region: 'East - WB', fleetId: 'FL-WB-7419', vehicleType: 'Heavy 16T', baseFare: 44200, fuelSurcharge: 7200, tollExpense: 2400, netYield: 34600, status: 'Pending' },
  { id: '106', date: '2026-10-06', region: 'South - TN', fleetId: 'FL-TN-6102', vehicleType: 'Medium 8T', baseFare: 31000, fuelSurcharge: 4900, tollExpense: 1800, netYield: 24300, status: 'Audited' },
  { id: '107', date: '2026-10-07', region: 'Central - MP', fleetId: 'FL-MP-2088', vehicleType: 'Heavy 16T', baseFare: 39500, fuelSurcharge: 6100, tollExpense: 1950, netYield: 31450, status: 'Audited' },
  { id: '108', date: '2026-10-08', region: 'North - HR', fleetId: 'FL-HR-9931', vehicleType: 'LCV 4T', baseFare: 16800, fuelSurcharge: 2400, tollExpense: 720, netYield: 13680, status: 'Reconciled' },
  { id: '109', date: '2026-10-09', region: 'South - TS', fleetId: 'FL-TS-4411', vehicleType: 'Reefer 12T', baseFare: 52000, fuelSurcharge: 8400, tollExpense: 2900, netYield: 40700, status: 'Audited' },
  { id: '110', date: '2026-10-10', region: 'North - PB', fleetId: 'FL-PB-1802', vehicleType: 'Medium 8T', baseFare: 29500, fuelSurcharge: 4600, tollExpense: 1550, netYield: 23350, status: 'Pending' },
  { id: '111', date: '2026-10-11', region: 'West - MH', fleetId: 'FL-MH-8219', vehicleType: 'Heavy 16T', baseFare: 45000, fuelSurcharge: 7100, tollExpense: 2300, netYield: 35600, status: 'Audited' },
  { id: '112', date: '2026-10-12', region: 'South - KL', fleetId: 'FL-KL-3094', vehicleType: 'LCV 4T', baseFare: 19200, fuelSurcharge: 2800, tollExpense: 920, netYield: 15480, status: 'Reconciled' },
];

export const ExcelCamouflageOverlay: React.FC<ExcelCamouflageOverlayProps> = ({
  isOpen,
  onExit,
  vaultPin,
}) => {
  const [persona, setPersona] = useState<DisguisePersona>('excel_365');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'margins' | 'vendors' | 'depr'>('fleet');
  const [selectedCell, setSelectedCell] = useState<{ col: string; row: number }>({ col: 'G', row: 4 });
  const [rows] = useState<SpreadsheetRow[]>(INITIAL_ROWS);
  const [activeRibbonTab, setActiveRibbonTab] = useState<string>('Home');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  const triggerExit = () => {
    if (vaultPin && vaultPin.length === 4) {
      setShowPinModal(true);
    } else {
      onExit();
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === vaultPin) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      onExit();
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Keyboard navigation & exit handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerExit();
      } else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        triggerExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, vaultPin]);

  const totalBase = useMemo(() => rows.reduce((acc, r) => acc + r.baseFare, 0), [rows]);
  const totalSurcharge = useMemo(() => rows.reduce((acc, r) => acc + r.fuelSurcharge, 0), [rows]);
  const totalToll = useMemo(() => rows.reduce((acc, r) => acc + r.tollExpense, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((acc, r) => acc + r.netYield, 0), [rows]);

  const cellCoordLabel = `${selectedCell.col}${selectedCell.row}`;

  // Derive formula text for active cell
  const formulaValue = useMemo(() => {
    if (selectedCell.row === 14) {
      return `=SUM(${selectedCell.col}2:${selectedCell.col}13)`;
    }
    if (selectedCell.col === 'H') {
      return `=E${selectedCell.row}-(F${selectedCell.row}+G${selectedCell.row})`;
    }
    const targetRow = rows[selectedCell.row - 2];
    if (!targetRow) return '=SUMIFS(G2:G150, C2:C150, "North - NCR", H2:H150, ">0")';
    switch (selectedCell.col) {
      case 'A': return targetRow.date;
      case 'B': return targetRow.region;
      case 'C': return targetRow.fleetId;
      case 'D': return targetRow.vehicleType;
      case 'E': return String(targetRow.baseFare);
      case 'F': return String(targetRow.fuelSurcharge);
      case 'G': return String(targetRow.tollExpense);
      default: return '=SUMIFS(G2:G150, C2:C150, "North - NCR", H2:H150, ">0")';
    }
  }, [selectedCell, rows]);

  if (!isOpen) return null;

  return (
    <div
      className={`excel-disguise-viewport ${isDarkMode ? 'theme-dark' : 'theme-light'} persona-${persona}`}
      role="region"
      aria-label="Corporate Logistics Spreadsheets Disguise"
    >
      {/* =========================================================================
          1. TOP BRANDED TITLEBAR (Microsoft Excel / Google Sheets / AWS)
          ========================================================================= */}
      {persona === 'aws_cloudwatch' ? (
        <div className="aws-titlebar">
          <div className="aws-title-left">
            <span className="aws-logo-icon">☁</span>
            <span className="aws-brand-name">AWS Management Console</span>
            <span className="aws-slash">/</span>
            <span className="aws-service-name">CloudWatch &gt; Metrics &gt; Logistics Pipeline</span>
            <span className="aws-region-badge">ap-south-1 (Mumbai)</span>
          </div>
          <div className="aws-title-right">
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as DisguisePersona)}
              className="excel-persona-select"
              title="Switch Disguise Tool"
            >
              <option value="excel_365">Disguise: Microsoft Excel 365</option>
              <option value="google_sheets">Disguise: Google Sheets</option>
              <option value="aws_cloudwatch">Disguise: AWS CloudWatch APM</option>
            </select>
            <button type="button" className="excel-stealth-pill" onClick={triggerExit} title="Exit Panic Camouflage">
              <span>● Telemetry Live [Alt+X]</span>
            </button>
          </div>
        </div>
      ) : persona === 'google_sheets' ? (
        <div className="gsheets-titlebar">
          <div className="gsheets-title-left">
            <div className="gsheets-icon-box">
              <Table size={18} />
            </div>
            <div>
              <div className="gsheets-title-row">
                <span className="gsheets-doc-name">Q3_Logistics_Fleet_Yield_Audit_FY26</span>
                <span className="gsheets-folder-pill">All changes saved in Drive</span>
              </div>
              <div className="gsheets-menu-bar">
                <span>File</span>
                <span>Edit</span>
                <span>View</span>
                <span>Insert</span>
                <span>Format</span>
                <span>Data</span>
                <span>Tools</span>
                <span>Extensions</span>
                <span>Help</span>
              </div>
            </div>
          </div>
          <div className="excel-title-right">
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as DisguisePersona)}
              className="excel-persona-select"
              title="Switch Disguise Tool"
            >
              <option value="excel_365">Disguise: Microsoft Excel 365</option>
              <option value="google_sheets">Disguise: Google Sheets</option>
              <option value="aws_cloudwatch">Disguise: AWS CloudWatch APM</option>
            </select>
            <button
              type="button"
              className="excel-stealth-pill"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
            </button>
            <button
              type="button"
              className="excel-stealth-pill"
              onClick={triggerExit}
              title="Exit Camouflage (Alt+X or Esc)"
            >
              <Lock size={12} />
              <span>Restricted Sheet [Alt+X]</span>
            </button>
          </div>
        </div>
      ) : (
        /* Microsoft Excel 365 Titlebar */
        <div className="excel-titlebar">
          <div className="excel-title-left">
            <div className="excel-app-logo">
              <FileSpreadsheet size={16} />
              <span className="excel-file-name">Q3_Logistics_Fleet_Yield_Audit_FY26.xlsx - Excel</span>
            </div>
            <div className="excel-autosave-pill">
              <span className="autosave-dot">●</span>
              <span>AutoSave On</span>
            </div>
          </div>

          <div className="excel-title-center">
            <div className="excel-search-box">
              <Search size={12} />
              <input type="text" placeholder="Search workbook (Alt + Q)..." readOnly />
            </div>
          </div>

          <div className="excel-title-right">
            {/* Persona Switcher Menu */}
            <div className="excel-persona-select-wrapper">
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as DisguisePersona)}
                className="excel-persona-select"
                title="Switch Disguise Tool"
              >
                <option value="excel_365">Disguise: Microsoft Excel 365</option>
                <option value="google_sheets">Disguise: Google Sheets</option>
                <option value="aws_cloudwatch">Disguise: AWS CloudWatch APM</option>
              </select>
            </div>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              className="excel-stealth-pill"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Office Theme (Light / Dark)"
            >
              {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
              <span>{isDarkMode ? 'Light Office' : 'Dark Office'}</span>
            </button>

            {/* Discreet Exit Lock Button */}
            <button
              type="button"
              className="excel-stealth-pill"
              onClick={triggerExit}
              title="Restore PsFi Financial Console (Alt+X)"
            >
              <Lock size={12} />
              <span>Audit Mode [Alt+X]</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. EXCEL RIBBON TABS & TOOLS STRIP
          ========================================================================= */}
      {persona === 'excel_365' && (
        <>
          <div className="excel-ribbon-tabs">
            {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help'].map((tab) => (
              <span
                key={tab}
                onClick={() => setActiveRibbonTab(tab)}
                className={`excel-ribbon-tab ${activeRibbonTab === tab ? 'active' : ''}`}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="excel-ribbon-toolbar">
            <div className="excel-ribbon-group">
              <button type="button" className="excel-tool-btn" title="Paste">📋 Paste</button>
              <button type="button" className="excel-tool-btn" title="Cut">✂</button>
              <button type="button" className="excel-tool-btn" title="Copy">📄</button>
            </div>
            <div className="excel-ribbon-group">
              <span className="excel-font-select">Calibri</span>
              <span className="excel-size-select">11</span>
              <button type="button" className="excel-tool-btn font-bold">B</button>
              <button type="button" className="excel-tool-btn italic">I</button>
              <button type="button" className="excel-tool-btn underline">U</button>
              <button type="button" className="excel-tool-btn" title="Borders">⊞</button>
              <button type="button" className="excel-tool-btn" title="Fill Color">🎨</button>
            </div>
            <div className="excel-ribbon-group">
              <button type="button" className="excel-tool-btn" title="Align Left">≡</button>
              <button type="button" className="excel-tool-btn" title="Align Center">≣</button>
              <button type="button" className="excel-tool-btn" title="Align Right">≡</button>
              <button type="button" className="excel-tool-btn" title="Merge & Center">Merge ⇄</button>
            </div>
            <div className="excel-ribbon-group">
              <button type="button" className="excel-tool-btn" title="Currency Format">₹</button>
              <button type="button" className="excel-tool-btn" title="Percent Format">%</button>
              <button type="button" className="excel-tool-btn" title="Comma Separator">,</button>
              <button type="button" className="excel-tool-btn" title="AutoSum">∑ AutoSum</button>
            </div>
            <div className="excel-ribbon-group" style={{ borderRight: 'none' }}>
              <button type="button" className="excel-tool-btn" title="Sort & Filter">⚡ Sort &amp; Filter</button>
              <button type="button" className="excel-tool-btn" title="Audit Status Filter">🔍 Find &amp; Select</button>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          3. FORMULA BAR
          ========================================================================= */}
      <div className="excel-formula-bar">
        <div className="excel-name-box" title="Name Box">
          {cellCoordLabel}
        </div>
        <div className="excel-fx-icons">
          <span style={{ color: '#d83b01', cursor: 'pointer' }} title="Cancel">✕</span>
          <span style={{ color: '#107c41', cursor: 'pointer' }} title="Enter">✓</span>
          <span style={{ fontStyle: 'italic', fontWeight: 700, marginLeft: '4px' }}>fx</span>
        </div>
        <input
          type="text"
          className="excel-formula-input"
          value={formulaValue}
          readOnly
        />
      </div>

      {/* =========================================================================
          4. SPREADSHEET TABLE GRID (PIXEL-PERFECT EXCEL CELLS)
          ========================================================================= */}
      <div className="excel-grid-viewport">
        <table className="excel-sheet-table">
          <thead>
            <tr>
              <th className="excel-corner-cell">◢</th>
              {[
                { col: 'A', name: 'Dispatch Date', width: '110px', align: 'center' },
                { col: 'B', name: 'Region Code', width: '130px', align: 'left' },
                { col: 'C', name: 'Fleet Unit ID', width: '120px', align: 'center' },
                { col: 'D', name: 'Vehicle Class', width: '120px', align: 'left' },
                { col: 'E', name: 'Base Freight (₹)', width: '130px', align: 'right' },
                { col: 'F', name: 'Fuel Surcharge (₹)', width: '130px', align: 'right' },
                { col: 'G', name: 'Tolls & Levies (₹)', width: '130px', align: 'right' },
                { col: 'H', name: 'Net Freight Margin (₹)', width: '150px', align: 'right' },
                { col: 'I', name: 'Audit Status', width: '110px', align: 'center' },
              ].map((header) => (
                <th
                  key={header.col}
                  className={`excel-col-th ${selectedCell.col === header.col ? 'col-active' : ''}`}
                  style={{ width: header.width, textAlign: header.align as 'center' | 'left' | 'right' }}
                  onClick={() => setSelectedCell((prev) => ({ ...prev, col: header.col }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: header.align === 'right' ? 'flex-end' : header.align === 'center' ? 'center' : 'flex-start', gap: '4px' }}>
                    <span>{header.col}</span>
                    <span style={{ fontSize: '9.5px', color: 'inherit', opacity: 0.85, fontWeight: 'normal' }}>({header.name})</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rowNum = idx + 2;
              const isRowActive = selectedCell.row === rowNum;

              return (
                <tr key={row.id}>
                  {/* Row Index Header */}
                  <td
                    className={`excel-row-th ${isRowActive ? 'row-active' : ''}`}
                    onClick={() => setSelectedCell((prev) => ({ ...prev, row: rowNum }))}
                  >
                    {rowNum}
                  </td>

                  {/* Cell A: Date */}
                  <td
                    className={`excel-cell text-center font-mono ${selectedCell.col === 'A' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'A', row: rowNum })}
                  >
                    {row.date}
                    {selectedCell.col === 'A' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell B: Region */}
                  <td
                    className={`excel-cell font-medium ${selectedCell.col === 'B' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'B', row: rowNum })}
                  >
                    {row.region}
                    {selectedCell.col === 'B' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell C: Fleet ID */}
                  <td
                    className={`excel-cell text-center font-mono font-semibold ${selectedCell.col === 'C' && isRowActive ? 'cell-selected' : ''}`}
                    style={{ color: isDarkMode ? '#60a5fa' : '#1d4ed8' }}
                    onClick={() => setSelectedCell({ col: 'C', row: rowNum })}
                  >
                    {row.fleetId}
                    {selectedCell.col === 'C' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell D: Vehicle Class */}
                  <td
                    className={`excel-cell ${selectedCell.col === 'D' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'D', row: rowNum })}
                  >
                    {row.vehicleType}
                    {selectedCell.col === 'D' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell E: Base Freight */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'E' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'E', row: rowNum })}
                  >
                    ₹{row.baseFare.toLocaleString('en-IN')}
                    {selectedCell.col === 'E' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell F: Fuel Surcharge */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'F' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'F', row: rowNum })}
                  >
                    ₹{row.fuelSurcharge.toLocaleString('en-IN')}
                    {selectedCell.col === 'F' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell G: Tolls & Levies */}
                  <td
                    className={`excel-cell text-right font-mono ${selectedCell.col === 'G' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'G', row: rowNum })}
                  >
                    ₹{row.tollExpense.toLocaleString('en-IN')}
                    {selectedCell.col === 'G' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell H: Net Freight Margin */}
                  <td
                    className={`excel-cell text-right font-mono font-bold ${selectedCell.col === 'H' && isRowActive ? 'cell-selected' : ''}`}
                    style={{ color: isDarkMode ? '#4ade80' : '#15803d', background: isDarkMode ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)' }}
                    onClick={() => setSelectedCell({ col: 'H', row: rowNum })}
                  >
                    ₹{row.netYield.toLocaleString('en-IN')}
                    {selectedCell.col === 'H' && isRowActive && <span className="excel-cell-handle" />}
                  </td>

                  {/* Cell I: Audit Status */}
                  <td
                    className={`excel-cell text-center ${selectedCell.col === 'I' && isRowActive ? 'cell-selected' : ''}`}
                    onClick={() => setSelectedCell({ col: 'I', row: rowNum })}
                  >
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: row.status === 'Audited' ? 'rgba(16, 185, 129, 0.15)' : row.status === 'Reconciled' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: row.status === 'Audited' ? '#10b981' : row.status === 'Reconciled' ? '#3b82f6' : '#f59e0b',
                      border: `1px solid ${row.status === 'Audited' ? 'rgba(16, 185, 129, 0.3)' : row.status === 'Reconciled' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    }}>
                      {row.status}
                    </span>
                    {selectedCell.col === 'I' && isRowActive && <span className="excel-cell-handle" />}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL AUDIT ROW (Row 14) */}
            <tr style={{ background: isDarkMode ? '#232936' : '#eef2f6', fontWeight: 'bold', borderTop: '2px solid #107c41' }}>
              <td className={`excel-row-th ${selectedCell.row === 14 ? 'row-active' : ''}`} onClick={() => setSelectedCell((p) => ({ ...p, row: 14 }))}>
                ∑
              </td>
              <td colSpan={4} className="excel-cell uppercase font-semibold" style={{ letterSpacing: '0.04em' }}>
                Total Fleet Yield (Q3 YTD Balanced)
              </td>
              <td className="excel-cell text-right font-mono" onClick={() => setSelectedCell({ col: 'E', row: 14 })}>
                ₹{totalBase.toLocaleString('en-IN')}
              </td>
              <td className="excel-cell text-right font-mono" onClick={() => setSelectedCell({ col: 'F', row: 14 })}>
                ₹{totalSurcharge.toLocaleString('en-IN')}
              </td>
              <td className="excel-cell text-right font-mono" onClick={() => setSelectedCell({ col: 'G', row: 14 })}>
                ₹{totalToll.toLocaleString('en-IN')}
              </td>
              <td className="excel-cell text-right font-mono font-bold" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }} onClick={() => setSelectedCell({ col: 'H', row: 14 })}>
                ₹{totalNet.toLocaleString('en-IN')}
              </td>
              <td className="excel-cell text-center font-mono text-[10px]" style={{ color: '#10b981' }}>
                100% RECONCILED
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          5. WORKSHEET TABS & EXCEL STATUS BAR
          ========================================================================= */}
      <div className="excel-bottom-dock">
        {/* Sheet Tabs Row */}
        <div className="excel-sheet-tabs-row">
          {[
            { id: 'fleet', name: 'Fleet Yields' },
            { id: 'margins', name: 'Route Margins' },
            { id: 'vendors', name: 'Vendor AP-AR' },
            { id: 'depr', name: 'Depreciation Model' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'fleet' | 'margins' | 'vendors' | 'depr')}
              className={`excel-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.name}</span>
            </button>
          ))}
          <button type="button" className="excel-tab-btn" title="Add Sheet">
            <Plus size={12} />
          </button>
        </div>

        {/* Real Excel Status Bar */}
        <div className="excel-status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Ready</span>
            <span>·</span>
            <span>Cell {cellCoordLabel} selected</span>
          </div>

          <div className="excel-status-stats">
            <span>Average: ₹31,450.00</span>
            <span>Count: 12</span>
            <span>Min: ₹13,680</span>
            <span>Max: ₹43,700</span>
            <span>Sum: <strong style={{ color: isDarkMode ? '#4ade80' : '#15803d' }}>₹{totalNet.toLocaleString('en-IN')}</strong></span>
            <span>|</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setIsDarkMode(!isDarkMode)}>100% Zoom</span>
            <button
              type="button"
              onClick={triggerExit}
              className="excel-stealth-pill"
              style={{ padding: '2px 6px', fontSize: '10px' }}
              title="Return to PsFi"
            >
              [Alt + X to Exit]
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OPTIONAL PIN VERIFICATION MODAL ON RESTORE (IF SET)
          ========================================================================= */}
      {showPinModal && (
        <div className="excel-pin-overlay">
          <div className="excel-pin-dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
              <Lock size={16} style={{ color: 'var(--colour-solstice)' }} />
              <span>Verify Vault PIN</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Enter your 4-digit PIN to exit camouflage mode and resume your private financial control console.
            </p>

            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className="excel-pin-input"
              />

              {pinError && (
                <span style={{ fontSize: '11px', color: '#f87171', textAlign: 'center', fontFamily: 'monospace' }}>
                  Incorrect PIN. Try again.
                </span>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                  }}
                  className="action-pill"
                  style={{ flex: 1, padding: '8px', textAlign: 'center' }}
                >
                  Stay Hidden
                </button>
                <button
                  type="submit"
                  className="action-pill"
                  style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#107c41', color: '#ffffff', borderColor: '#107c41', fontWeight: 700 }}
                >
                  Unlock PsFi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
