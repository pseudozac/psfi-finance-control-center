import React, { useEffect, useState } from 'react';

interface IntroLoaderProps {
  onFinish: () => void;
}

const STEPS = [
  'INITIALIZING ENCLAVE...',
  'MOUNTING LOCAL STORAGE VAULT...',
  'VERIFYING 50/30/20 & TAX ENGINE...',
  'OFFLINE-READY CLIENT ENCLAVE...',
];

export const IntroLoader: React.FC<IntroLoaderProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsFading(true);
          setTimeout(onFinish, 300);
          return 100;
        }
        const next = prev + 5;
        const currentStep = Math.min(STEPS.length - 1, Math.floor((next / 100) * STEPS.length));
        setStepIndex(currentStep);
        return next;
      });
    }, 45);

    return () => clearInterval(timer);
  }, [onFinish]);

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(onFinish, 150);
  };

  return (
    <div
      className={`intro-loader-overlay ${isFading ? 'loader-fade-out' : ''}`}
      onClick={handleSkip}
      role="status"
      aria-label="Loading PsFi control center"
    >
      <div className="loader-content">
        {/* Bouncing Hipuku Wordmark */}
        <div className="loader-wordmark">
          <span className="wm-letter wm-p">p</span>
          <span className="wm-letter wm-s">s</span>
          <span className="wm-letter wm-f">f</span>
          <span className="wm-letter wm-i">i</span>
        </div>

        {/* Brand Tagline */}
        <div className="loader-brand-title font-sans">
          personal finance control center
        </div>

        {/* Micro Progress Bar */}
        <div className="loader-track">
          <div
            className="loader-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Telemetry Status Line */}
        <div className="loader-status font-mono">
          <span className="status-cursor">❯</span> {STEPS[stepIndex]}
          <span className="status-pct">{progress}%</span>
        </div>

        <div className="loader-skip-hint font-mono">
          click anywhere to skip
        </div>
      </div>
    </div>
  );
};
