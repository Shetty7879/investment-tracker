import React from 'react';

/**
 * Full‑screen splash overlay displayed during app startup.
 * It is expected to be unmounted by the parent component once the animation is complete.
 */
const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 dark:bg-gray-900 text-white font-sans">
      {/* Logo */}
      <img src="/logo.svg" alt="FridayTrack logo" className="h-24 w-24 mb-4 animate-fade-in animate-scale-up" />
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
