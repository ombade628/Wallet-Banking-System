import React, { useEffect, useState } from 'react';
import { useBanking } from '../../context/BankingContext';

type ToastItem = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

const AUTO_DISMISS_MS = 3800;

const ICON: Record<ToastItem['type'], string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const STYLES: Record<ToastItem['type'], { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-white',
    border: 'border-[#62df7d]/40',
    text: 'text-[#151c27]',
    icon: 'text-[#16a34a]',
  },
  error: {
    bg: 'bg-[#ffdad6]',
    border: 'border-[#ba1a1a]/40',
    text: 'text-[#93000a]',
    icon: 'text-[#ba1a1a]',
  },
  info: {
    bg: 'bg-white',
    border: 'border-[#c2c7cf]',
    text: 'text-[#151c27]',
    icon: 'text-[#005cab]',
  },
};

const SingleToast: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);

  // Mount animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss with hover-pause
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      // Wait for the exit animation before removing from the DOM
      window.setTimeout(() => onDismiss(item.id), 200);
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [paused, item.id, onDismiss]);

  const style = STYLES[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-200 ${style.bg} ${style.border} ${style.text} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${style.icon}`}>
        {ICON[item.type]}
      </span>
      <span className="font-medium text-xs sm:text-sm leading-snug">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        type="button"
        aria-label="Dismiss notification"
        className="opacity-70 hover:opacity-100 p-1 ml-auto"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};

export const Toast: React.FC = () => {
  const { toastQueue, dismissToast, hideToast } = useBanking();

  // Keyboard: Escape dismisses all
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toastQueue.length > 0) hideToast();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toastQueue.length, hideToast]);

  if (toastQueue.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 sm:right-10 z-[100] flex flex-col items-end gap-2 pointer-events-none">
      {toastQueue.length > 1 && (
        <button
          type="button"
          onClick={hideToast}
          className="pointer-events-auto text-[10px] font-semibold uppercase tracking-wider text-[#72777f] hover:text-[#151c27] mb-0.5 px-2 py-1 rounded bg-white/80 backdrop-blur"
        >
          Dismiss all ({toastQueue.length})
        </button>
      )}
      {toastQueue.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <SingleToast item={item} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
};