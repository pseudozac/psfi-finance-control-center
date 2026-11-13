import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Lock,
} from 'lucide-react';

interface ExcelCamouflageOverlayProps {
  isOpen: boolean;
  onExit: () => void;
  vaultPin?: string;
}

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

const SAMPLE_ROWS: SpreadsheetRow[] = [
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
  const [activeTab, setActiveTab] = useState<'fleet' | 'margins' | 'vendors' | 'depr'>('fleet');
  const [selectedCell, setSelectedCell] = useState<string>('G4');
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

  // Handle double-tap Escape or Alt+X to exit
  useEffect(() => {
    if (!isOpen) return;

    let lastEscapeTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapeTime < 450) {
          triggerExit();
        }
        lastEscapeTime = now;
      } else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        triggerExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, vaultPin]);

  if (!isOpen) return null;

  const filteredRows = SAMPLE_ROWS;

  const totalBase = filteredRows.reduce((acc, r) => acc + r.baseFare, 0);
  const totalSurcharge = filteredRows.reduce((acc, r) => acc + r.fuelSurcharge, 0);
  const totalToll = filteredRows.reduce((acc, r) => acc + r.tollExpense, 0);
  const totalNet = filteredRows.reduce((acc, r) => acc + r.netYield, 0);

  return (
    <div className="fixed inset-0 z-[999999] bg-[#ffffff] text-[#1f2937] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. EXCEL / SPREADSHEET TITLEBAR */}
      <div className="bg-[#107c41] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold shadow-sm">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-white" />
          <span>Q3_Logistics_Fleet_Yield_Audit_FY26.xlsx - Excel [Read-Only]</span>
        </div>

        {/* Discreet Exit Mechanism */}
        <div className="flex items-center gap-3 text-[11px] font-normal text-emerald-100">
          <span className="hidden sm:inline">AutoSave On</span>
          <span className="opacity-40">|</span>
          <button
            type="button"
            onClick={triggerExit}
            className="text-white hover:text-emerald-200 underline font-mono text-[10px] cursor-pointer"
            title="Restore PsFi (or double-press Esc)"
          >
            Audit Mode Active [Esc Esc]
          </button>
        </div>
      </div>

      {/* 2. SPREADSHEET RIBBON BAR */}
      <div className="bg-[#f3f2f1] border-b border-[#e1dfdd] px-3 py-1 flex items-center gap-4 text-xs text-[#323130]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#107c41] border-b-2 border-[#107c41] pb-0.5 cursor-default">Home</span>
          <span className="cursor-default hover:text-black">Insert</span>
          <span className="cursor-default hover:text-black">Page Layout</span>
          <span className="cursor-default hover:text-black">Formulas</span>
          <span className="cursor-default hover:text-black">Data</span>
          <span className="cursor-default hover:text-black">Review</span>
          <span className="cursor-default hover:text-black">View</span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sheet..."
              className="pl-6 pr-2 py-0.5 text-[11px] border border-gray-300 rounded bg-white text-gray-700 w-36"
              readOnly
            />
          </div>
          <button
            type="button"
            onClick={triggerExit}
            className="px-2 py-0.5 text-[11px] bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-gray-700"
          >
            <Lock size={11} />
            <span>Protect Sheet</span>
          </button>
        </div>
      </div>

      {/* 3. FORMULA BAR */}
      <div className="bg-[#fbfbfb] border-b border-[#e1dfdd] px-3 py-1 flex items-center gap-2 text-xs font-mono">
        <div className="w-14 px-1 py-0.5 border border-gray-300 rounded bg-white text-center text-gray-700 font-bold text-[11px]">
          {selectedCell}
        </div>
        <div className="text-gray-400 select-none">fx</div>
        <div className="flex-1 px-2 py-0.5 border border-gray-300 rounded bg-white text-gray-800 text-[11px]">
          =SUMIFS(G2:G150, C2:C150, &quot;North - NCR&quot;, H2:H150, &quot;&gt;0&quot;)
        </div>
      </div>

      {/* 4. SPREADSHEET TABLE GRID */}
      <div className="flex-1 overflow-auto bg-[#ffffff]">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="bg-[#f3f2f1] text-[#323130] text-[11px] border-b border-[#c8c6c4]">
              <th className="w-10 text-center border-r border-[#c8c6c4] py-1 bg-[#e1dfdd] text-gray-500 font-mono">#</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold">A - Dispatch Date</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold">B - Region Code</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold">C - Fleet Unit ID</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold">D - Vehicle Class</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold text-right">E - Base Freight (₹)</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold text-right">F - Fuel Surcharge (₹)</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold text-right">G - Tolls & Levies (₹)</th>
              <th className="border-r border-[#c8c6c4] px-2 py-1 font-semibold text-right bg-emerald-50 text-emerald-900">H - Net Freight Margin (₹)</th>
              <th className="px-2 py-1 font-semibold text-center">I - Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const cellId = `G${idx + 2}`;
              const isSelected = selectedCell === cellId;

              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedCell(cellId)}
                  className={`border-b border-[#e1dfdd] hover:bg-emerald-50/50 cursor-cell ${
                    isSelected ? 'bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#faf9f8]'
                  }`}
                >
                  <td className="text-center border-r border-[#e1dfdd] py-1 bg-[#f3f2f1] text-gray-500 font-mono text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-gray-600">
                    {row.date}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 text-gray-800 font-medium">
                    {row.region}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-blue-700">
                    {row.fleetId}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 text-gray-600">
                    {row.vehicleType}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-right text-gray-800">
                    {row.baseFare.toLocaleString('en-IN')}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-right text-gray-800">
                    {row.fuelSurcharge.toLocaleString('en-IN')}
                  </td>
                  <td className="border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-right text-gray-800">
                    {row.tollExpense.toLocaleString('en-IN')}
                  </td>
                  <td className={`border-r border-[#e1dfdd] px-2 py-1 font-mono text-[11px] text-right font-semibold text-emerald-800 ${isSelected ? 'ring-2 ring-emerald-600' : ''}`}>
                    {row.netYield.toLocaleString('en-IN')}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium ${
                      row.status === 'Audited' ? 'bg-green-100 text-green-800' :
                      row.status === 'Reconciled' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* TOTAL ROW */}
            <tr className="bg-[#f3f2f1] font-bold border-t-2 border-[#107c41]">
              <td className="text-center border-r border-[#c8c6c4] py-1 bg-[#e1dfdd] text-gray-600 font-mono text-[10px]">∑</td>
              <td colSpan={4} className="border-r border-[#c8c6c4] px-2 py-1 text-gray-800 uppercase tracking-wider text-[11px]">
                Portfolio Total (Q3 YTD)
              </td>
              <td className="border-r border-[#c8c6c4] px-2 py-1 font-mono text-[11px] text-right text-gray-900">
                ₹{totalBase.toLocaleString('en-IN')}
              </td>
              <td className="border-r border-[#c8c6c4] px-2 py-1 font-mono text-[11px] text-right text-gray-900">
                ₹{totalSurcharge.toLocaleString('en-IN')}
              </td>
              <td className="border-r border-[#c8c6c4] px-2 py-1 font-mono text-[11px] text-right text-gray-900">
                ₹{totalToll.toLocaleString('en-IN')}
              </td>
              <td className="border-r border-[#c8c6c4] px-2 py-1 font-mono text-[11px] text-right text-emerald-800 bg-emerald-100/60 font-bold">
                ₹{totalNet.toLocaleString('en-IN')}
              </td>
              <td className="px-2 py-1 text-center font-mono text-[10px] text-gray-500">
                100% BALANCED
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. WORKSHEET TABS & STATUS BAR */}
      <div className="bg-[#f3f2f1] border-t border-[#c8c6c4] flex items-center justify-between text-xs px-2 py-1 text-gray-600">
        <div className="flex items-center gap-1 font-medium text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-0.5 rounded-t border-t border-l border-r border-[#c8c6c4] ${
              activeTab === 'fleet' ? 'bg-white text-[#107c41] font-bold border-b-2 border-b-white' : 'bg-transparent text-gray-600'
            }`}
          >
            Fleet Yields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('margins')}
            className={`px-3 py-0.5 rounded-t ${activeTab === 'margins' ? 'bg-white text-[#107c41] font-bold' : 'bg-transparent text-gray-600'}`}
          >
            Route Margins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`px-3 py-0.5 rounded-t ${activeTab === 'vendors' ? 'bg-white text-[#107c41] font-bold' : 'bg-transparent text-gray-600'}`}
          >
            Vendor AP-AR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('depr')}
            className={`px-3 py-0.5 rounded-t ${activeTab === 'depr' ? 'bg-white text-[#107c41] font-bold' : 'bg-transparent text-gray-600'}`}
          >
            Depreciation
          </button>
        </div>

        {/* Status calculations */}
        <div className="flex items-center gap-4 text-[10.5px] font-mono text-gray-500">
          <span>Ready</span>
          <span>Average: 31,450.00</span>
          <span>Count: 12</span>
          <span>Sum: ₹{totalNet.toLocaleString('en-IN')}</span>
          <button
            type="button"
            onClick={triggerExit}
            className="text-gray-400 hover:text-gray-700 text-[10px]"
            title="Double-tap Esc to restore PsFi"
          >
            [Esc Esc]
          </button>
        </div>
      </div>

      {/* OPTIONAL PIN DIALOG ON RESTORE IF VAULT HAS PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e2330] border border-[#334155] rounded-xl p-5 max-w-xs w-full text-white shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <Lock size={16} className="text-amber-400" />
              <span>Verify Vault PIN</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Enter your 4-digit PIN to exit camouflage mode and resume your private financial console.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="4-digit PIN"
                className="w-full text-center text-lg tracking-widest font-mono py-2 rounded-lg bg-[#0f1422] border border-gray-700 text-white focus:outline-none focus:border-amber-400"
              />

              {pinError && (
                <p className="text-[11px] text-red-400 text-center font-mono">Incorrect PIN. Try again.</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                  }}
                  className="flex-1 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:bg-gray-800"
                >
                  Stay Hidden
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
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
