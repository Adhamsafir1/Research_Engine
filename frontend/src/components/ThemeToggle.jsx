import React, { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './Icons';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('asklumen-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('asklumen-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('asklumen-theme')) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button className={`theme-toggle ${className}`} title="Toggle theme" onClick={toggleTheme}>
      <MoonIcon />
      <SunIcon />
    </button>
  );
}
