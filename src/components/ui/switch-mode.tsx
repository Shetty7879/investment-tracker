import { type FC } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useApp } from "../../contexts/AppContext";

/* --- Props --- */
export interface SwitchModeProps {
  width?: number;
  height?: number;
  darkColor?: string;
  lightColor?: string;
  knobDarkColor?: string;
  knobLightColor?: string;
  borderDarkColor?: string;
  borderLightColor?: string;
  isDark?: boolean;
  onToggle?: () => void;
}

export const SwitchMode: FC<SwitchModeProps> = ({
  width = 64,
  height = 32,
  darkColor = "#090A0F",
  lightColor = "#FFFFFF",
  knobDarkColor = "#1E2235",
  knobLightColor = "#F1F5F9",
  borderDarkColor = "#334155",
  borderLightColor = "#CBD5E1",
  isDark: isDarkProp,
  onToggle: onToggleProp,
}) => {
  const { theme, toggleTheme } = useApp();

  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";
  const handleToggle = onToggleProp !== undefined ? onToggleProp : toggleTheme;

  const iconSize = Math.max(12, Math.round(height * 0.45));

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      className="relative flex items-center justify-between rounded-full border-2 transition-colors cursor-pointer shrink-0 select-none outline-none focus:ring-2 focus:ring-indigo-500/40 p-0 overflow-hidden"
      style={{
        width,
        height,
        borderColor: isDark ? borderDarkColor : borderLightColor,
      }}
      whileTap={{ scale: 0.95 }}
    >
      {/* TRACK */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ backgroundColor: isDark ? darkColor : lightColor }}
        transition={{ duration: 0.3 }}
      />

      {/* SLIDING KNOB */}
      <motion.div
        layout
        layoutId="switch-knob-indicator"
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="absolute rounded-full border-2 z-20"
        style={{
          width: height - 4,
          height: height - 4,
          right: isDark ? 2 : undefined,
          left: isDark ? undefined : 2,
          backgroundColor: isDark ? knobDarkColor : knobLightColor,
          borderColor: isDark ? borderDarkColor : borderLightColor,
        }}
      />

      {/* SUN ICON (left side) */}
      <motion.div
        className="relative z-30 flex items-center justify-center pointer-events-none"
        style={{ width: height, height }}
        animate={{ rotate: isDark ? 45 : 0, opacity: isDark ? 0.4 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Sun
          className={`transition-colors duration-200 ${
            isDark ? "text-slate-400" : "text-amber-500"
          }`}
          style={{ width: iconSize, height: iconSize }}
        />
      </motion.div>

      {/* MOON ICON (right side) */}
      <motion.div
        className="relative z-30 flex items-center justify-center pointer-events-none"
        style={{ width: height, height }}
        animate={{ rotate: isDark ? 0 : 15, opacity: isDark ? 1 : 0.4 }}
        transition={{ duration: 0.3 }}
      >
        <Moon
          className={`transition-colors duration-200 ${
            isDark ? "text-indigo-400" : "text-slate-400"
          }`}
          style={{ width: iconSize, height: iconSize }}
        />
      </motion.div>
    </motion.button>
  );
};
