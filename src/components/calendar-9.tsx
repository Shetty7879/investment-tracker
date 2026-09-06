'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar } from './ui/calendar'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'

export const parseYMDDate = (dateStr?: string | Date): Date | undefined => {
  if (!dateStr) return undefined;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? undefined : dateStr;
  if (typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

export const formatYMDDate = (date?: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatDisplayDate = (dateStr?: string | Date): string => {
  const d = parseYMDDate(dateStr);
  if (!d) return 'Select Date';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export interface Calendar9Props {
  selectedDate?: Date;
  onSelectDate?: (date: Date | undefined) => void;
  className?: string;
}

export const Calendar9: React.FC<Calendar9Props> = ({
  selectedDate,
  onSelectDate,
  className = ''
}) => {
  const [internalDate, setInternalDate] = useState<Date | undefined>(selectedDate || new Date());

  const activeDate = selectedDate !== undefined ? selectedDate : internalDate;

  const handleSelect = (d: Date | undefined) => {
    if (selectedDate === undefined) setInternalDate(d);
    onSelectDate?.(d);
  };

  return (
    <div className={`p-2 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 shadow-xl ${className}`}>
      <Calendar
        mode='single'
        defaultMonth={activeDate}
        selected={activeDate}
        onSelect={handleSelect}
        captionLayout='dropdown'
        startMonth={new Date(2000, 0)}
        endMonth={new Date(2040, 11)}
        className='[&_option]:bg-white dark:[&_option]:bg-[#0d0f17] [&_option]:text-slate-900 dark:[&_option]:text-white'
      />
      <p className='mt-2 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider' role='region'>
        Month and year selector
      </p>
    </div>
  );
};

export interface DatePickerFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select Date',
  error,
  disabled = false,
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = parseYMDDate(value);
  const displayText = parsedDate ? formatDisplayDate(parsedDate) : placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      const ymd = formatYMDDate(d);
      onChange(ymd);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border ${
          error
            ? 'border-red-500 ring-red-500/10'
            : isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/10'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } bg-white dark:bg-[#0d0f17] py-2.5 px-3.5 text-xs font-bold text-slate-900 dark:text-white transition-all cursor-pointer disabled:opacity-50`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className={parsedDate ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
            {displayText}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {error && <p className="text-red-500 text-xs mt-1 font-semibold">{error}</p>}

      {isOpen && (
        <div className="absolute z-[99999] mt-2 left-0 sm:left-0 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <Calendar9
            selectedDate={parsedDate}
            onSelectDate={handleDateSelect}
          />
        </div>
      )}
    </div>
  );
};

export default Calendar9;
