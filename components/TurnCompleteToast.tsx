import React, { useEffect, useState } from 'react';

interface TurnCompleteToastProps {
  isOpen: boolean;
  turnNumber: number;
  onViewDecision: () => void;
  onDismiss: () => void;
}

const TurnCompleteToast: React.FC<TurnCompleteToastProps> = ({
  isOpen,
  turnNumber,
  onViewDecision,
  onDismiss,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setIsClosing(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onDismiss();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isClosing, onDismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto w-[min(90vw,520px)] rounded-2xl border border-gold bg-black/70 px-5 py-4 shadow-[0_0_25px_rgba(212,175,55,0.35)] backdrop-blur transition-all duration-300 ${
          isClosing ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0 animate-fade-in-up'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="text-gold text-xl">
            <i className="fa-solid fa-scroll"></i>
          </div>
          <div className="flex-1">
            <p className="font-display text-gold text-lg">第 {turnNumber} 幕已完成 — 查看决策之路？</p>
            <p className="text-xs font-serif text-paper/60 mt-1">命运会记住你走过的每一步。</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setIsClosing(true);
              onViewDecision();
            }}
            className="px-4 py-2 text-sm font-display border border-gold text-gold rounded-full hover:bg-gold/10 transition-colors"
          >
            查看决策流程
          </button>
          <button
            onClick={() => setIsClosing(true)}
            className="px-4 py-2 text-sm font-display border border-brown-600 text-paper/70 rounded-full hover:text-paper hover:border-gold/60 transition-colors"
          >
            继续冒险
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurnCompleteToast;
