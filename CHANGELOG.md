# Changelog

All notable changes to the **PsFi (Tactile Personal Finance Control Center)** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Multi-Mode Corporate Camouflage Disguise**: Complete overhaul of the panic disguise system (`Alt+X`) with 4 authentic modes:
  - Microsoft Excel 365 Light mode with authentic ribbon tabs and formula bar (`=SUMIFS(...)`).
  - Microsoft Excel 365 Dark Office mode.
  - Google Sheets Web UI mode.
  - AWS CloudWatch APM Dashboard with synthetic latency histograms and CPU utilization charts.
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
