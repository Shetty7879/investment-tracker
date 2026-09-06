'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HiMinus, HiPlus } from 'react-icons/hi';

export interface StepperProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  ariaLabelMinus?: string;
  ariaLabelPlus?: string;
  className?: string;
  onChange?: (val: number) => void;
}

const digitVariants = {
  initial: (dir: number) => ({
    y: dir > 0 ? 18 : -18,
    opacity: 0,
    scale: 0.7,
    filter: 'blur(2px)',
  }),
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -18 : 18,
    opacity: 0,
    scale: 0.7,
    filter: 'blur(2px)',
  }),
};

export function Stepper({
  value,
  defaultValue = 1,
  min = 1,
  max = 9999999,
  step = 1,
  size = 'md',
  disabled = false,
  ariaLabelMinus = 'Decrease quantity',
  ariaLabelPlus = 'Increase quantity',
  className = '',
  onChange,
}: StepperProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const [direction, setDirection] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputVal, setInputVal] = React.useState('');

  const rawCurrent = isControlled ? (value ?? min) : internal;
  const current = isNaN(rawCurrent) ? min : Math.max(min, Math.min(max, rawCurrent));
  const digits = current.toString().split('');

  const [prevDigits, setPrevDigits] = React.useState<string[]>([]);
  const [prevTicks, setPrevTicks] = React.useState<number[]>([]);

  const len = digits.length;
  const lenDiff = len - prevDigits.length;

  const nextTicks = digits.map((digit, i) => {
    const prevI = i - lenDiff;
    const prevDigit = prevI >= 0 ? prevDigits[prevI] : undefined;
    const prevTick = prevI >= 0 ? prevTicks[prevI] : 0;

    return digit !== prevDigit ? (prevTick ?? 0) + 1 : (prevTick ?? 0);
  });

  if (prevDigits.join('') !== digits.join('')) {
    setPrevTicks(nextTicks);
    setPrevDigits(digits);
  }

  const handleStep = (dir: number) => {
    if (disabled) return;
    const next = Math.min(max, Math.max(min, current + dir * step));
    if (next === current) return;
    setDirection(dir);
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleStep(1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handleStep(-1);
    }
  };

  const handleDigitClick = () => {
    if (disabled) return;
    setInputVal(current.toString());
    setIsEditing(true);
  };

  const handleInputSubmit = () => {
    setIsEditing(false);
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      if (clamped !== current) {
        setDirection(clamped > current ? 1 : -1);
        if (!isControlled) setInternal(clamped);
        onChange?.(clamped);
      }
    }
  };

  const buttonSizeClasses =
    size === 'sm'
      ? 'h-8 w-8 sm:h-9 sm:w-9'
      : size === 'lg'
      ? 'h-11 w-11 sm:h-12 sm:w-12'
      : 'h-9 w-9 sm:h-10 sm:w-10';

  const iconSizeClasses = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const fontSizeClasses =
    size === 'sm'
      ? 'text-base font-bold sm:h-7'
      : size === 'lg'
      ? 'text-2xl font-extrabold sm:h-10'
      : 'text-lg font-bold sm:h-8';

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-1 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Quantity Stepper"
    >
      <motion.button
        type="button"
        aria-label={ariaLabelMinus}
        whileHover={{ scale: disabled || current <= min ? 1 : 1.06 }}
        whileTap={{ scale: disabled || current <= min ? 1 : 0.92 }}
        transition={{ type: 'spring', stiffness: 350, damping: 24 }}
        onClick={() => handleStep(-1)}
        disabled={disabled || current <= min}
        className={`flex ${buttonSizeClasses} shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-700 dark:disabled:hover:text-slate-200 transition-colors`}
      >
        <HiMinus className={iconSizeClasses} />
      </motion.button>

      {isEditing ? (
        <input
          type="number"
          min={min}
          max={max}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleInputSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInputSubmit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          autoFocus
          className="w-16 text-center font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg py-0.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      ) : (
        <div
          onClick={handleDigitClick}
          title="Click to edit value directly"
          className={`relative flex shrink-0 items-center justify-center gap-0.5 px-2 text-slate-900 dark:text-white cursor-pointer select-none ${fontSizeClasses}`}
        >
          {digits.map((digit, index) => (
            <div key={`${index}-${len}`} className="relative w-3.5 text-center">
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.span
                  key={nextTicks[index]}
                  custom={direction}
                  variants={digitVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 18,
                    mass: 1,
                  }}
                  className="absolute inset-0 flex items-center justify-center tabular-nums"
                >
                  {digit}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <motion.button
        type="button"
        aria-label={ariaLabelPlus}
        whileHover={{ scale: disabled || current >= max ? 1 : 1.06 }}
        whileTap={{ scale: disabled || current >= max ? 1 : 0.92 }}
        transition={{ type: 'spring', stiffness: 350, damping: 24 }}
        onClick={() => handleStep(1)}
        disabled={disabled || current >= max}
        className={`flex ${buttonSizeClasses} shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-700 dark:disabled:hover:text-slate-200 transition-colors`}
      >
        <HiPlus className={iconSizeClasses} />
      </motion.button>
    </div>
  );
}

