import { useState } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = (newValue) => {
    setValue(newValue);
    try { localStorage.setItem(key, JSON.stringify(newValue)); } catch { /* ignore */ }
  };

  return [value, set];
}
