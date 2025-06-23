import React, { useEffect, useState } from 'react';

const DarkModeToggle: React.FC = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className={`ml-4 w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${dark ? 'bg-gray-700' : 'bg-gray-300'}`}
      aria-label="Toggle dark mode"
      type="button"
    >
      <span className="sr-only">Toggle dark mode</span>
      <span className={`w-6 h-6 flex items-center justify-center rounded-full shadow-md transform transition-transform duration-300 ${dark ? 'translate-x-6 bg-gray-900 text-yellow-300' : 'translate-x-0 bg-white text-yellow-500'}`}
        >
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  );
};

export default DarkModeToggle; 