import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  PieChart,
  Landmark,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface IntroLoaderProps {
  onFinish: () => void;
}

// Advertising PsFi Superpowers
const FEATURES = [
  {
    icon: <ShieldCheck size={18} className="text-nebula" />,
    badge: 'ZERO EXTERNAL CLOUD',
    title: '100% Private Client-Side Enclave',
    desc: 'Your salary, net worth, and debt never leave your machine. Stored locally in your browser storage with zero telemetry.',
    color: 'nebula',
  },
  {
    icon: <PieChart size={18} className="text-pulsar" />,
    badge: 'CAPITAL ALLOCATION',
    title: '50 / 30 / 20 Intelligent Budget Audit',
    desc: 'Instant diagnostic audit comparing your Essential Needs, Lifestyle Wants, and Compounding Savings against golden benchmarks.',
    color: 'pulsar',
  },
  {
    icon: <TrendingUp size={18} className="text-quasar" />,
    badge: 'WEALTH PROJECTION',
    title: 'Step-Up SIP & Inflation Multiplier',
    desc: 'Simulate forward wealth in Indian Rupees with real purchasing power adjusted for 6% inflation and annual 10% SIP step-ups.',
    color: 'quasar',
  },
  {
    icon: <Landmark size={18} className="text-corona" />,
    badge: 'TAX ENGINE',
    title: 'FY 2024-25 Old vs New Regime Engine',
    desc: 'Automated tax rebate calculator incorporating the ₹75,000 standard deduction, Sec 87A rebate, and 80C/80D optimizations.',
    color: 'corona',
  },
  {
    icon: <Zap size={18} className="text-solstice" />,
    badge: 'DEBT ELIMINATION',
    title: 'High-APR Credit Amortization Radar',
    desc: 'Mathematical payoff schedule to crush revolving credit card interest traps and redirect surplus capital into mutual funds.',
    color: 'solstice',
  },
];

// Fun Floating Finance Tokens in Background
const FLOATING_TOKENS = [
  { text: '₹', size: '28px', top: '15%', left: '8%', delay: '0s', dur: '7s' },
  { text: '12% CAGR', size: '13px', top: '22%', left: '82%', delay: '1s', dur: '8s' },
  { text: '+₹25,000 SIP', size: '12px', top: '70%', left: '10%', delay: '2s', dur: '6s' },
  { text: '50/30/20', size: '14px', top: '75%', left: '78%', delay: '0.5s', dur: '9s' },
  { text: '₹1,00,00,000', size: '13px', top: '40%', left: '90%', delay: '1.5s', dur: '7.5s' },
  { text: '₹75k STD DED', size: '11px', top: '85%', left: '45%', delay: '2.5s', dur: '8.5s' },
  { text: 'SEC 87A', size: '11px', top: '12%', left: '60%', delay: '3s', dur: '7s' },
  { text: '0% DEBT', size: '12px', top: '35%', left: '5%', delay: '0.8s', dur: '6.5s' },
  { text: 'FIRE ETA', size: '12px', top: '60%', left: '88%', delay: '1.8s', dur: '9s' },
  { text: '₹', size: '36px', top: '50%', left: '15%', delay: '2.2s', dur: '8s' },
  { text: '10% STEP-UP', size: '11px', top: '18%', left: '30%', delay: '1.2s', dur: '7.2s' },
];

export const IntroLoader: React.FC<IntroLoaderProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Auto-progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsReady(true);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, []);

  // Cycle through advertising feature cards every 2.2 seconds
  useEffect(() => {
    const featureInterval = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 2200);

    return () => clearInterval(featureInterval);
  }, []);

  const handleEnter = () => {
    setIsFading(true);
    setTimeout(onFinish, 300);
  };

  const currentFeature = FEATURES[activeFeatureIndex];

  return (
    <div
      className={`intro-loader-overlay ${isFading ? 'loader-fade-out' : ''}`}
      role="region"
      aria-label="PsFi feature introduction and loader"
    >
      {/* Floating Animated Money & Financial Tokens Background */}
      <div className="money-tokens-container" aria-hidden="true">
        {FLOATING_TOKENS.map((token, i) => (
          <div
            key={i}
            className="floating-money-token font-mono"
            style={{
              top: token.top,
              left: token.left,
              fontSize: token.size,
              animationDelay: token.delay,
              animationDuration: token.dur,
            }}
          >
            {token.text}
          </div>
        ))}
        {/* Subtle Ambient Glowing Mesh Orbs */}
        <div className="ambient-orb orb-quasar" />
        <div className="ambient-orb orb-nebula" />
        <div className="ambient-orb orb-solstice" />
      </div>

      <div className="loader-center-stage">
        {/* Playful Bouncing Wordmark */}
        <div className="loader-wordmark">
          <span className="wm-letter wm-p">p</span>
          <span className="wm-letter wm-s">s</span>
          <span className="wm-letter wm-f">f</span>
          <span className="wm-letter wm-i">i</span>
        </div>

        <div className="loader-hero-subtitle">
          tactile personal finance control for India<span className="text-corona">.</span>
        </div>

        {/* Dynamic PsFi Advertising Feature Card */}
        <div className="advertising-feature-card">
          <div className="ad-card-head">
            <div className="ad-badge font-mono">
              {currentFeature.icon}
              <span>{currentFeature.badge}</span>
            </div>
            <div className="ad-dots">
              {FEATURES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`ad-dot ${idx === activeFeatureIndex ? 'ad-dot-active' : ''}`}
                  onClick={() => setActiveFeatureIndex(idx)}
                  aria-label={`Show feature ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <h3 className="ad-card-title">{currentFeature.title}</h3>
          <p className="ad-card-desc">{currentFeature.desc}</p>
        </div>

        {/* Micro Progress Track */}
        <div className="loader-progress-area">
          <div className="loader-track">
            <div
              className="loader-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="loader-status-row font-mono">
            <span>
              {progress < 30
                ? 'CALIBRATING CLIENT ENCLAVE'
                : progress < 65
                ? 'LOADING FY 2024-25 TAX ENGINE'
                : progress < 99
                ? 'MOUNTING ZERO-CLOUD VAULT'
                : 'OFFLINE VAULT READY'}
            </span>
            <span className="text-nebula font-bold">{progress}%</span>
          </div>
        </div>

        {/* Enter CTA / Skip Button */}
        <div className="loader-actions">
          <button
            type="button"
            className="launch-vault-btn"
            onClick={handleEnter}
          >
            <span>{isReady ? 'Launch Financial Vault' : 'Enter PsFi Gateway'}</span>
            {isReady ? <Sparkles size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
