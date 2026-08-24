import React, { useEffect, useState } from 'react';

/**
 * Full‑screen splash overlay shown only on the first page load.
 * It respects the user's "prefers‑reduced‑motion" setting.
 */
const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeout = prefersReduced ? 200 : 1300; // ms
    const timer = setTimeout(() => setVisible(false), timeout);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 dark:bg-gray-900 text-white font-sans">
      {/* Logo */}
      <img
        src="/logo.svg"
        alt="FridayTrack logo"
        className="h-24 w-24 mb-4 animate-fade-in animate-scale-up"
      />
      {/* Brand name */}
      <h1 className="font-brand text-3xl mb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        FridayTrack
      </h1>
      {/* Tagline */}
      <p className="text-base animate-fade-in" style={{ animationDelay: '0.4s' }}>
        Track. Plan. Grow.
      </p>
      {/* Simple loading bar */}
      <div className="w-24 h-1 bg-indigo-500 rounded mt-6 animate-pulse" style={{ animationDelay: '0.6s' }} />
    </div>
  );
};

export default SplashScreen;
