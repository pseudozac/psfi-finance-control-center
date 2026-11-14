# PsFi — Tactile Personal Finance Control Center for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Vitest-59%2F59%20Passed-5ec491.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Offline PWA](https://img.shields.io/badge/PWA-v5.9%20Offline%20Ready-f78d2c.svg)](https://pseudo-fi.vercel.app/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20Enclave-bf9ff1.svg)](#-security--privacy-architecture)

**Live Production Deployment:** [https://pseudo-fi.vercel.app/](https://pseudo-fi.vercel.app/)

**PsFi** is an offline-first, client-side personal finance control center engineered specifically for the Indian financial ecosystem (INR ₹). Built with a bespoke tactile editorial aesthetic, PsFi empowers individuals to model monthly cashflows, stress-test emergency runways, track FIRE milestones, project step-up SIP wealth curves, audit Indian tax regimes, and advance through gamified financial independence progression—with **100% client-side privacy** and zero cloud data leakage.

---

## ⚡ Navigation

- [Live Application](https://pseudo-fi.vercel.app/)
- [Key Features & Engines](#-key-features--engines)
  - [1. Sovereign Wealth RPG Constellation (Macro Progression)](#1-sovereign-wealth-rpg-constellation-macro-progression)
  - [2. Local Impulse Shield & Dynamic Daily Burn Pocket (Micro Armor)](#2-local-impulse-shield--dynamic-daily-burn-pocket-micro-armor)
  - [3. Multi-Mode Corporate Camouflage (Alt+X Panic Disguise)](#3-multi-mode-corporate-camouflage-altx-panic-disguise)
  - [4. Private Statement Ingestion Engine (CAS, Bank, Cards, Payslips)](#4-private-statement-ingestion-engine)
  - [5. Tactile Cockpit & Multi-Vault Workspace](#5-tactile-cockpit--multi-vault-workspace)
  - [6. Wealth Terminal & Market Valuation Engine](#6-wealth-terminal--market-valuation-engine)
  - [7. Emergency Runway 3-Tier Survival Stress Test](#7-emergency-runway-3-tier-survival-stress-test)
  - [8. FIRE & Wealth Milestone Countdown Engine](#8-fire--wealth-milestone-countdown-engine)
  - [9. Indian Income Tax Engine (FY 2024–25 Union Budget)](#9-indian-income-tax-engine-fy-202425-union-budget)
  - [10. Cross-Device QR Beam & Steganographic PNG Encryption](#10-cross-device-qr-beam--steganographic-png-encryption)
  - [11. Terminal Command Omnibar (⌘K / Ctrl+K / /)](#11-terminal-command-omnibar-k--ctrlk--)
  - [12. Reverse Monte Carlo Black Swan Simulator & What-If Sandbox](#12-reverse-monte-carlo-black-swan-simulator--what-if-sandbox)
  - [13. Interactive Holographic Guided Tour](#13-interactive-holographic-guided-tour)
- [Security & Privacy Architecture](#-security--privacy-architecture)
- [Tactile Editorial Design System](#-tactile-editorial-design-system)
- [Responsive Multi-Device Engineering](#-responsive-multi-device-engineering)
- [Local Development & Testing](#-local-development--testing)
- [Architecture & Changelog](#-documentation-links)
- [License](#-license)

---

## 🚀 Key Features & Engines

### 1. Sovereign Wealth RPG Constellation (Macro Progression)
A gamified, actuarially-backed tech-tree progression modeled after high-fantasy star charts and skill trees:
- **Three Strategic Wings:**
  - **Defensive Citadel:** Debt elimination, 3-month liquidity core, term insurance shield, comprehensive health armor, and 6-month iron fortress.
  - **Compounding Velocity:** 50/30/20 budget equilibrium, 20% compounding engine, 10% step-up escalation, tax regime arbitrage, and direct mutual fund optimization.
  - **Sovereign Autonomy:** Coast FIRE liberation, lean independence, full standard FIRE, Fat FIRE prosperity, and generational dynasty.
- **Dual-Pane Astrolabe Layout:**
  - **Left Docked Thaumaturgy Dossier (330px):** Inspects selected node requirements, mathematical formulas, Indian actuarial laws, and 1-click sandbox simulation.
  - **Celestial Star-Chart Canvas (1440 × 820):** 100% unobstructed SVG starfield featuring dynamic branch glow, constellation lines, mastery orbs, and theater mode toggle.
- **Actuarial Matrix & Character Perks:** Switch between visual star charts and luxury dark obsidian matrix cards (`#101423`) with live progress percentages.

### 2. Local Impulse Shield & Dynamic Daily Burn Pocket (Micro Armor)
Contextual spending protection designed to prevent discretionary purchases from disrupting disciplined monthly SIPs:
- **Dynamic Safe Daily Allowance:** Automatically recalibrates remaining daily burn allowance based on committed monthly overhead and remaining days.
- **Emergency Impulse Armor:** Live simulation of discretionary spending penalties showing immediate lost compounding opportunity cost over 10–25 years.
- **Weekend Shock Absorber:** Dedicated smoothing buffers to cushion weekend dining and entertainment spikes without depleting savings.

### 3. Multi-Mode Corporate Camouflage (Alt+X Panic Disguise)
Instant full-screen operational disguise system for using personal finance tools in corporate or public environments:
- **Dedicated Shortcut:** Instant toggle via `Alt+X` or the top Tools menu.
- **4 Authentic Professional Themes:**
  1. **Microsoft Excel 365 Light:** Classic Office green header, authentic ribbon tabs, formula bar (`=SUMIFS(...)`), active cell outlines, sheet tabs, and ready status bar.
  2. **Microsoft Excel 365 Dark Office:** Luxury dark gray/black corporate UI matching Office 365 Dark Mode.
  3. **Google Sheets Web UI:** Authentic material design tabs, toolbar controls, formula input, and green share button.
  4. **AWS CloudWatch APM Dashboard:** Dark DevOps infrastructure monitor displaying synthetic latency histograms, CPU utilization curves, and fleet yield metrics.
- **Escape Triggers:** Press `Alt+X`, `Escape`, or click the top-right exit pill to immediately return to the cockpit.

### 4. Private Statement Ingestion Engine
100% client-side, zero-cloud financial document parser powered by in-memory `pdfjs-dist`:
- **Supported Statements:**
  - **CAMS & KFintech Mutual Fund CAS:** Extracts ISINs, folio numbers, units, NAV, scheme types, and current valuation.
  - **Bank Account Statements (HDFC, ICICI, SBI, Axis):** Parses transaction debits, credits, recurring EMI deductions, and closing balances.
  - **Credit Card Statements:** Analyzes minimum amount due, finance charges, total spends, and billing cycles.
  - **Salary Payslips:** Deconstructs Basic Salary, HRA, Special Allowance, Provident Fund (EPF), and Professional Tax.
- **Privacy Enclave:** Files are processed purely in ephemeral browser RAM. No bytes are sent over the network or stored in external databases.

### 5. Tactile Cockpit & Multi-Vault Workspace
- **Symmetrically Balanced Cockpit Grid:** Left column anchors cashflow inputs, emergency stress-testing, and FIRE countdowns; right column hosts budget health audits, spending armor, and tax/debt panels.
- **Full-Width Projection Section:** Dedicated 30-year compounding wealth curves, annual surplus breakdowns, and inflation-adjusted milestone visualizers spanning 100% container width.
- **Multi-Vault Architecture:** Isolate ledgers for Personal Finances, Freelance Invoicing, Family Pools, or Venture Planning with color-coded vault tokens.
- **True Clean Slate (₹0):** Start fresh with zero dummy figures or load the pre-calibrated Tech Lead demo profile with one click.

### 6. Wealth Terminal & Market Valuation Engine
- Seamlessly toggle between the **Tactile Control Center** and the **Wealth Terminal** via the floating dock switcher.
- Real-time P&L monitors, asset allocation donut charts, equity-to-debt ratios, and tactical rebalancing suggestions.

### 7. Emergency Runway 3-Tier Survival Stress Test & Catastrophic Shock Dial
- **Tier 1 (Barebones Survival):** Essential housing and utilities only. Calculates maximum survival runway if catastrophic income loss occurs.
- **Tier 2 (Standard Lean Living):** Housing, groceries, utilities, and transport.
- **Tier 3 (Full Lifestyle Runway):** Uncompromised current lifestyle including discretionary wants and subscriptions.
- **1-Tap Catastrophic Income Shock Dial:** Instantly stress-test your household antifragility under real-world economic shocks:
  - `Baseline (100% Inflow)`
  - `-30% Pay Cut / Sabbatical / Transition`
  - `-60% Layoff Severance Buffer`
  - `🚨 0% Catastrophic Income Stop`
  - `-₹3 Lakhs Medical / Emergency Drain`
- **Visual Runway Gauge:** Live dynamically color-coded buffer telemetry (`Danger <3mo`, `Caution 3-6mo`, `Healthy 6-12mo`, `Fortress >12mo`).

### 8. FIRE & Wealth Milestone Countdown Engine
- Live progress and compounding timeline projections for major Indian Rupee milestones:
  - ₹10 Lakh (First Serious Milestone)
  - ₹25 Lakh (Quarter-Crore Growth Anchor)
  - ₹50 Lakh (Half-Crore Stability Anchor)
  - ₹1.0 Crore (The Landmark Crorepati Marker)
  - ₹2.5 Crore (Quarter-Decacrore Independence)
- **25× Annual Expense Target:** Computes your personalized Financial Independence number, tracking current coverage percentage and capital shortfall.

### 9. Indian Income Tax Engine (FY 2025–26 & FY 2024–25 Union Budget)
- **Side-by-Side Old vs. New Regime Comparison (AY 2025–26 & AY 2026–27):**
  - Standard deduction applied (₹75,000 under New Regime, ₹50,000 under Old Regime).
  - Section 87A rebate engine (Zero tax up to ₹7.75 Lakhs under New Regime).
  - Revised Union Budget slabs (0–3L Nil, 3–7L 5%, 7–10L 10%, 10–12L 15%, 12–15L 20%, >15L 30%).
  - Section 80CCD(1B) NPS dedicated deduction up to ₹50,000 under Old Regime.
  - Section 80C (₹1.5L) and Section 80D (Health Insurance) tax levers.
  - **HRA Exemption Calculator:** Computes statutory minimums across Metro (50%) and Non-Metro (40%) cities.

### 10. Local Impulse Shield, Daily Discretionary Pocket & SIP Accelerometer
- **Tactile Daily Burn Pocket:** Calculates mathematical safe daily burn after ring-fencing committed mutual fund SIPs and fixed expenses.
- **30-Day Liquidity Track:** Live non-wrapping visual calendar pacing track with payday indicators and real-time days-to-salary countdown.
- **1-Tap Category Micro-Envelopes:** Quick logging for `Chai & Quick Snack` (+₹50, +₹150, +₹300), `Dining Out & Social` (+₹500, +₹1,200, +₹2,500), and `Retail & Shopping` (+₹1k, +₹2.5k, +₹5k) with haptic audio synthesis.
- **Salary Replenishment & SIP Accelerometer:** Tracks multi-day discipline streaks, banks unspent weekend surpluses, and allows 1-click permanent boosting of monthly compounding SIPs with projected 15-year wealth generation.

### 11. Cross-Device QR Beam & Steganographic PNG Encryption
- **Cross-Device QR Beam:** Near-field peer-to-peer visual data synchronization. Generates high-density animated QR codes to transfer encrypted vaults directly between laptops and mobile phones without server mediation.
- **Steganographic PNG Disguise:** Hides your AES-256 encrypted vault backup inside the pixel canvas of a standard desktop wallpaper image using LSB (Least Significant Bit) steganography.

### 12. Terminal Command Omnibar (`⌘K` / `Ctrl+K` / `/`)
- Global keyboard-driven command palette for lightning-fast navigation.
- Jump between vaults, toggle privacy masks, trigger simulations, parse math expressions (`25000 * 12 * 1.12`), and switch archetypes without touching the mouse.

### 13. Reverse Monte Carlo Black Swan Simulator & What-If Sandbox
- **Reverse Monte Carlo:** Runs 1,000 to 10,000 stochastic market drawdowns, inflation spikes, and Sequence of Returns Risk (SRR) audits to calculate the mathematical probability of portfolio survival.
- **What-If Sandbox:** Non-destructive testing environment to preview salary increments (+10% to +50%), relocation rent spikes, and new loan EMIs with live delta variance snapshots.

### 14. Interactive Holographic Guided Tour
- 8-step interactive tour featuring precision spotlight cutouts, holographic corner brackets, contextual audio cues, step jumping (keys `1`–`8`), sound mute toggle (`M`), and a virtual instructor cursor.

---

## 🔒 Security & Privacy Architecture

PsFi operates on a strict **Zero-Server, Client-Side Enclave** privacy paradigm:

| Threat Vector | Cloud Banking Apps / Mint / YNAB | PsFi Architecture |
| :--- | :--- | :--- |
| **Server-Side Data Breaches** | High risk (stored in remote SQL/NoSQL databases) | **Zero Risk:** No server database exists. |
| **Telemetry & Spyware** | Mixpanel, Google Analytics, Datadog tracking | **Zero Telemetry:** Zero tracking scripts or analytics beacons. |
| **Credential Phishing** | Net banking login & password scraping | **Zero Credentials:** Never asks for credentials, OTPs, or API keys. |
| **Network Interception** | REST/GraphQL payloads in transit | **Zero Network Data:** Zero financial data leaves the local device. |
| **Offline Reliability** | Fails when offline or network drops | **100% Offline Capable:** Runs anywhere via PWA Service Worker. |
| **Cross-Site Scripting (XSS)** | Varies by framework | **Auto-Sanitized:** React JSX prevents string injection; zero `dangerouslySetInnerHTML`. |
| **Schema Tampering** | Raw unvalidated payloads | **Runtime Validation:** Strict Zod / TypeScript schema parsing before any plan is loaded. |
| **At-Rest Storage Extraction** | Plaintext cookie or DB storage | **AES-256-GCM PIN Vault:** Hardware-accelerated Web Crypto API with PBKDF2 (600,000 iterations). |

> **Privacy Guarantee:** All financial records, vault data, and imported statements are stored exclusively inside your browser's local sandbox (`window.localStorage`). Data is never uploaded, transmitted, or synchronized to external clouds. Optional AES-256 PIN locking encrypts the entire vault at rest.

---

## 🎨 Tactile Editorial Design System

PsFi implements a bespoke **Tactile Editorial Design System**:
- **Dark Void Canvas:** `#080b15` deep obsidian canvas with hairline grid blueprint styling.
- **Cosmic Chroma Hierarchy:**
  - `Quasar` (`#bf9ff1` lilac): Compounding investments, step-up SIPs, and omnibar accents.
  - `Nebula` (`#5ec491` mint green): Positive cash inflows, surplus metrics, and active states.
  - `Solstice` (`#f78d2c` golden amber): Essential needs, milestones, and warning thresholds.
  - `Corona` (`#e56b6f` coral red): Discretionary spending, debt balances, and emergency alerts.
  - `Pulsar` (`#7193ed` periwinkle): Tax optimizations and system telemetry.
- **Typography:** Premium dual-typeface pairing of `Parkinsans` and `Plus Jakarta Sans` for editorial clarity, backed by `JetBrains Mono` for financial figures and tabular data.

---

## 📱 Responsive Multi-Device Engineering

PsFi is engineered for seamless cross-platform performance across all screen geometries:
- **Desktop (1440px+)**: Dual-column cockpit with 3-column tools mega-menu and high-density telemetry.
- **Tablet (768px–1024px)**: Fluid 2-column layout with smart-anchored menus and touch-optimized controls.
- **Mobile (320px–768px)**: Centered 1-column responsive sheets with 8px edge margins, dimmed background backdrops, full touch targets (≥44px), and zero horizontal overflow.
- **Density Toggle:** Tap the **Monitor / Smartphone** icon in the dock to switch between Desktop Power View and Mobile Touch View on any device.

---

## 🛠️ Local Development & Testing

PsFi requires **Node.js 18+** and **npm**:

```bash
# 1. Clone the repository
git clone https://github.com/pseudozac/psfi-finance-control-center.git
cd psfi-finance-control-center

# 2. Install dependencies
npm install

# 3. Run full Vitest test suite (53/53 tests across 8 suites)
npm test

# 4. Start local development server with HMR
npm run dev

# 5. Type-check and build production bundle
npm run build

# 6. Preview production build locally
npm run preview
```

---

## 📚 Documentation Links

- **System Architecture & Cryptography:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Release History & Versioning:** [CHANGELOG.md](CHANGELOG.md)

---

## 📄 License

This repository is licensed under the **[MIT License](LICENSE)**.

```
Copyright (c) 2026 pseudozac (PsFi Project)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
...
```

Feel free to fork, customize, and self-host for your personal financial independence journey.
