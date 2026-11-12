import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Sparkles, BookOpen, X } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  explanation: string;
  formula?: string;
  benchmark?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  explanation,
  formula,
  benchmark,
  align = 'center',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`info-tooltip-wrapper ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="info-tooltip-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Tutorial guide for ${title}`}
        title={`Click for tutorial explanation on ${title}`}
      >
        <HelpCircle size={12} className="info-icon" />
      </button>

      {isOpen && (
        <div className={`info-popover-box align-${align}`} role="tooltip">
          <div className="info-popover-header">
            <div className="flex-align gap-1.5">
              <BookOpen size={13} className="text-quasar" />
              <span className="info-popover-title font-semibold text-xs">{title}</span>
            </div>
            <button
              type="button"
              className="info-popover-close"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="Close tooltip"
            >
              <X size={12} />
            </button>
          </div>

          <p className="info-popover-text text-xs">{explanation}</p>

          {formula && (
            <div className="info-popover-formula font-mono text-xs">
              <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Formula:</span>
              <code className="text-nebula block mt-0.5">{formula}</code>
            </div>
          )}

          {benchmark && (
            <div className="info-popover-benchmark text-xs">
              <Sparkles size={11} className="text-solstice shrink-0" />
              <span><strong>Benchmark:</strong> {benchmark}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
