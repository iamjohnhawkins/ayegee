import { useState, useEffect, useRef } from 'react';

// Two-step delete button: click once → shows "Confirm?" for 4s, click again → fires onDelete.
// Navigating away or component unmount clears the timer safely.
export function DeleteButton({ onDelete, disabled, label = 'Delete' }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = () => {
    if (confirming) {
      clearTimeout(timerRef.current);
      setConfirming(false);
      onDelete();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 4000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        confirming
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
      }`}
    >
      {confirming ? 'Confirm?' : label}
    </button>
  );
}
