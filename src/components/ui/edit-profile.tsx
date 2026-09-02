import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, UserCheck } from 'lucide-react';

export interface ProfileData {
  fullName: string;
  email: string;
  currency: 'INR' | 'USD' | 'EUR';
  investorTier: string;
  avatarUrl: string;
  lastUpdated?: string;
}

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ProfileData;
  onSave: (data: ProfileData) => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave
}) => {
  const [formData, setFormData] = useState<ProfileData>(initialData);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  // Handle Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = () => {
    const newUrl = window.prompt('Enter new Avatar Image URL:', formData.avatarUrl);
    if (newUrl !== null && newUrl.trim() !== '') {
      setFormData((prev) => ({ ...prev, avatarUrl: newUrl.trim() }));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave({
      ...formData,
      lastUpdated: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-[2px] bg-slate-900/60 dark:bg-black/75"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-2xl z-[10000] my-auto pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320, mass: 0.8 }}
              className="pointer-events-auto w-full rounded-3xl shadow-2xl border overflow-hidden 
                         bg-[#F5F5F7] border-slate-200 
                         dark:bg-[#1C1C1E] dark:border-[#2C2C2E]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">Edit Investor Profile</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5 font-medium">
                    Update your personal profile details and display preferences.
                  </p>
                </div>
                <button
                  type="button"
                  title="Close Modal"
                  aria-label="Close Modal"
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col md:flex-row bg-white dark:bg-[#2C2C2E]">
                {/* Form Section */}
                <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-fullName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1A6]">
                      Full Name
                    </label>
                    <input
                      id="edit-fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Investor Profile"
                      className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm font-semibold
                               bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                               dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1A6]">
                      Email Address
                    </label>
                    <input
                      id="edit-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. investor@fridaytrack.app"
                      className="w-full px-4 py-2.5 rounded-xl border outline-none font-semibold transition-all text-sm
                               bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                               dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label htmlFor="edit-currency" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1A6]">
                        Preferred Currency
                      </label>
                      <select
                        id="edit-currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border appearance-none outline-none text-sm font-semibold
                                 bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                                 dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="INR">₹ Indian Rupee (INR)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                        <option value="EUR">€ Euro (EUR)</option>
                      </select>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label htmlFor="edit-investorTier" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1A6]">
                        Account Tier
                      </label>
                      <select
                        id="edit-investorTier"
                        name="investorTier"
                        value={formData.investorTier}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border appearance-none outline-none text-sm font-semibold
                                 bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                                 dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="Free Tier">Free Tier</option>
                        <option value="Pro Investor">Pro Investor</option>
                        <option value="HNI Investor">HNI Investor</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-avatarUrl" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1A6]">
                      Avatar Image URL
                    </label>
                    <input
                      id="edit-avatarUrl"
                      name="avatarUrl"
                      type="url"
                      value={formData.avatarUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-xs font-mono font-medium
                               bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                               dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:focus:border-indigo-400"
                    />
                  </div>
                </form>

                {/* Vertical Dashed Divider */}
                <div className="w-full h-[1px] md:h-auto md:w-[1px] border-t md:border-t-0 md:border-l border-dashed border-slate-200 dark:border-[#48484A]" />

                {/* Profile Preview Section */}
                <div className="flex-1 p-8 px-6 flex flex-col items-center justify-center bg-slate-50/60 dark:bg-[#252527]">
                  <span className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-400 dark:text-[#A1A1A6]">
                    Profile Preview
                  </span>

                  <div className="relative mb-4 group">
                    <img
                      src={formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'}
                      alt="Avatar Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
                      }}
                      className="w-28 h-28 rounded-full object-cover shadow-md ring-4 ring-indigo-500/10 dark:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAvatarChange}
                      title="Change Avatar Photo"
                      aria-label="Change Avatar Photo"
                      className="absolute bottom-0 right-0 p-2 rounded-full shadow-md border 
                               bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all
                               dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-gray-300 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white text-center m-0">
                    {formData.fullName || 'Investor Profile'}
                  </h3>
                  <p className="text-xs font-semibold mb-3 text-slate-500 dark:text-[#A1A1A6] text-center mt-1">
                    {formData.email || 'investor@fridaytrack.app'}
                  </p>

                  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm 
                               bg-indigo-50 text-indigo-700 border border-indigo-100
                               dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40">
                    <UserCheck size={13} className="text-indigo-500" />
                    <span>{formData.investorTier || 'Free Tier'}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 md:px-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  Last updated: <span className="text-slate-700 dark:text-slate-300">{formData.lastUpdated || 'Today'}</span>
                </span>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs border font-bold transition-all
                             bg-white border-slate-200 text-slate-700 hover:bg-slate-100
                             dark:bg-[#3A3A3C] dark:border-[#48484A] dark:text-white dark:hover:bg-[#48484A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md
                             bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95
                             dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};