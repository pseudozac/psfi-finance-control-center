# Changelog

All notable changes to the **PsFi (Tactile Personal Finance Control Center)** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.11.0] - 2026-11-19

### Added
- **Photorealistic Microsoft Excel 365 Camouflage Disguise (`Alt+X`)**:
  - Total visual and interaction overhaul eliminating all dead giveaways.
  - **Authentic Windows Chrome**: Office green header (`#107c41`), AutoSave toggle switch (`AutoSave On`), Quick Access toolbar (`Save Ctrl+S`, `Undo Ctrl+Z`, `Redo Ctrl+Y`), centered document title (`Q3_Logistics_Fleet_Yield_Audit_FY26.xlsx - Saved to OneDrive`), search bar (`Search Alt+Q`), corporate user avatar (`[AZ]`), and native Windows window controls (`─`, `▢`, `✕`).
  - **Strict Column Coordinate Headers**: Column letters now display strictly `A`, `B`, `C`... across 13 columns (`A`–`M`). Removed fake text labels inside letter headers.
  - **Row 1 Corporate Table Header**: Authentic corporate table formatting with dark navy header (`#1f4e78`), white bold text, and Excel filter dropdown carets (`▾`).
  - **Office 365 Ribbon Groups**: 7 full ribbon tool groups including Clipboard (Split Paste, Cut, Copy, Painter), Font (`Aptos Body`, size 11, B, I, U, borders, fill bucket, font color), Alignment (grid and text wrap), Number (Accounting, ₹, %, ,, decimals), Styles (Conditional Formatting, Format as Table, Cell Styles), Cells (Insert, Delete, Format), and Editing (AutoSum, Fill, Clear, Sort & Filter, Find & Select).
  - **Interactive 35-Row Spreadsheet Grid**: 12 data rows with Indian Rupee formatting (`₹42,500.00`), zebra striping, margin highlighting, Row 14 corporate double-underline summary row (`border-top: 1px solid; border-bottom: 3px double`), and rows 15–35 empty grid rows extending to the viewport boundary.
  - **Cell Selection & In-Cell Editing**: Active cell has a 2px green outline (`#107c41`) and a 6×6px green autofill handle. Supports double-clicking, pressing `Enter`, or direct alphanumeric typing to edit values; `Tab` and arrow key navigation.
  - **Authentic Formula Bar**: Name Box with active cell coordinate and dropdown caret, Cancel (`✕`), Enter (`✓`), Function wizard (`fx`), and full formula input bar bound to active cell.
  - **Genuine Microsoft Excel "Unprotect Sheet" Dialog**: Replaced futuristic cyber popup with a native Windows/Office modal prompt: *"Password to unprotect sheet 'Fleet_Yield_Audit':"* with standard buttons. Includes genuine Excel warning alert dialog upon incorrect PIN entry.
  - **File Backstage Screen**: Clicking the green `File` tab opens the full Office Backstage view with Info, Protect Workbook, and corporate settings.
  - **Worksheet Tabs & Real Status Bar**: Bottom sheet tabs (`Fleet_Yield_Audit`, `Route_Margins_P&L`, `Vendor_SLA_Q3`, `Depreciation_Model`), `Ready` status, live calculation chips (`Average`, `Count`, `Min`, `Max`, `Sum`), and zoom slider (`100%`).
- **3-Way Perspectives Switcher**:
  - Replaced static hero pills with **Simple View**, **Advance View**, and **Custom View**.
  - **Simple View**: Streamlined cockpit focusing on Monthly Cashflow, Step-Up SIPs, 50/30/20 Balance, and Tax Regimes.
  - **Advance View**: Comprehensive power cockpit exposing all 9 modules including Emergency Runway, FIRE Countdown, Debt & Liabilities, Wealth Curve Projections, and Stock Portfolio.
  - **Custom View (Modular Architect Toolbar)**: Interactive drawer with 9 module toggle pills, 4 quick presets (Cashflow & Fire, Safety & Reserves, Wealth & Equities, Full Spectrum), empty slate fallback, and full `localStorage` persistence.
- **Vault Unlock Required Gate (`VaultRecoveryGate.tsx`)**:
  - Replaced raw passphrase block with high-tech cyber crest shield.
  - 12-Word Seed Phrase Auto-Detector Pill with live word counting and validity indicators.
  - One-click clipboard paste integration.
  - Interactive recovery guide accordion explaining zero-knowledge key derivation.
  - Demo vault escape hatch for instant evaluation without passphrase lockup.
- **Auto-Arm Vault Inactivity & Tab Visibility Lock**:
  - Automatically locks active vaults when switching away or restoring browser tabs via `document.visibilitychange`.
  - Configurable inactivity timeout (default 0 or user-chosen minutes).
  - Fixed `Alt + L` React closure dependency bug in `App.tsx` for immediate manual vault locking.
- **Self-Healing Empty Vault Storage**:
  - Automatic initialization of clean default vaults when local storage meta state is corrupted or missing device unlock keys.

---

## [5.9.0] - 2026-11-16

### Added
- **Executive Wealth Dossier & Printable Statement**:
  - Print-optimized executive wealth audit report with `@media print` styling, corporate letterhead, and high-resolution PDF export.
- **Capital Gains Harvesting & Tax Period Reconciliation**:
  - Corrected tax law copy regarding capital gains harvesting cost basis reset.
  - Explicit period labeling distinguishing Income-tax Act 1961 (AY 2026–27 / FY 2025–26) from Income-tax Act 2025 (TY 2026–27).
- **Expanded Unit Test Suite**:
  - Expanded Vitest automated test suite to 106 tests across 12 test suites with 100% pass rate.

---

## [5.8.0] - 2026-11-13

### Fixed
- **Responsive Tools Dropdown Overflow**: Resolved out-of-bounds menu clipping on tablet and mobile viewports (`x < 0`) by anchoring positioning to `.navbar-dock` and introducing fluid 3-column (Desktop), 2-column (Tablet), and 1-column (Mobile sheet) layout modes.
- **Tools Menu Badge Spacing**: Fixed concatenated text bug where `Excel Camouflage` and `Alt+X` collided by applying flex layout and dedicated styling.
- **Mobile Touch Backdrop**: Added dedicated `.tools-dropdown-backdrop` with `Escape` key and `touchstart` support for one-tap dismissal on mobile devices.
- **Service Worker Cache**: Bumped service worker cache version to `psfi-v5.8`.

---

## [5.7.0] - 2026-11-13

### Added
- **Multi-Mode Corporate Camouflage Disguise**: Initial version of the panic disguise system (`Alt+X`) with 4 modes (Excel Light, Excel Dark, Google Sheets, AWS CloudWatch).
- **Symmetrical Cockpit Rebalance**: Rebalanced Column 1 and Column 2 in the main dashboard grid; moved Emergency Stress-Test and FIRE Countdown into Column 1, and positioned the 30-Year Projection Section as a full-width container below the grid.

---

## [5.6.0] - 2026-11-13

### Added
- **Sovereign Wealth RPG Constellation Overhaul**:
  - Dual-pane layout: Collapsible left **Thaumaturgy Dossier** (330px) paired with an unobstructed **Celestial Star-Chart Canvas** (1440 × 820 SVG).
  - 15 actuarial nodes across 3 strategic wings: Defensive Citadel, Compounding Velocity, and Sovereign Autonomy.
  - Luxury dark obsidian Actuarial Matrix cards (`#101423`) with live progress percentages and Indian financial principles.
  - Full-screen Theater Mode toggle for unobstructed astrolabe navigation.

---

## [5.5.0] - 2026-11-13

### Added
- **Local Impulse Shield & Daily Burn Pocket (Micro Spending Armor)**:
  - Contextual safe-to-spend daily allowance calculator.
  - Real-time lost compounding opportunity cost simulator for discretionary purchases.
  - Weekend spending shock absorbers and emergency envelope protection.

---

## [5.0.0] - 2026-11-13

### Added
- **Private In-Memory Statement Ingestion Engine**:
  - Zero-cloud document parser using `pdfjs-dist` for CAMS/KFintech Mutual Fund CAS, Bank Statements (HDFC, ICICI, SBI, Axis), Credit Cards, and Payslips.
- **Terminal Command Omnibar (`⌘K` / `Ctrl+K` / `/`)**:
  - Global keyboard palette for vault operations, calculations, and simulation shortcuts.
- **Cross-Device QR Beam**:
  - P2P near-field visual data synchronization via animated QR code frames.
- **Steganographic PNG Vault Encryption**:
  - AES-256 encrypted payload hiding inside image wallpaper canvas (LSB steganography).
- **Reverse Monte Carlo Black Swan Simulator**:
  - 1,000 to 10,000 run stochastic market drawdowns and Sequence of Returns Risk (SRR) audits.
- **Interactive Holographic Guided Tour**:
  - 8-step guided walkthrough with precision spotlight cutouts, contextual HUD audio, and virtual mouse instructor.

---

## [4.0.0] - 2026-11-12

### Added
- **Wealth Terminal & Stock Market Valuation Engine**:
  - Workspace switcher between Tactile Control Center and Wealth Terminal.
  - Live P&L monitoring, asset allocation donut charts, and equity-to-debt rebalancing triggers.
- **Interactive Demo Vault**:
  - One-click pre-configured Indian tech lead profile (₹1.25L monthly salary, ₹25k SIP, ₹15L net worth).
- **Indian Tax Engine (FY 2024–25 Union Budget)**:
  - Side-by-side Old vs. New Regime comparison with Section 87A rebate and Section 80CCD(1B) NPS lever.
- **3-Tier Emergency Survival Runway**:
  - Barebones, Lean, and Full Lifestyle survival duration tracking.

---

## [1.0.0] - 2026-11-12

### Added
- Initial release of PsFi (Pseudo Finance Control Center).
- Core monthly cashflow modeling, step-up SIP compounding calculations, and 50/30/20 budget audits.
- LocalStorage client-side persistence and zero-telemetry architecture.
