import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>
  = ({ variant = 'primary', className = '', ...props }) => (
    <button
      className={`px-4 py-2 rounded-md transition transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
        variant === 'primary'
          ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
          : ''
      } ${
        variant === 'secondary'
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          : ''
      } ${variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-500' : ''} ${className}`}
      {...props}
    />
  );
