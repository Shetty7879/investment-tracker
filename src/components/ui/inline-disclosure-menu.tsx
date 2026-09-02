"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Delete02Icon,
  FavouriteIcon,
  PencilEdit02Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
  type Variants,
} from "motion/react";

export interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

export interface InlineDisclosureMenuProps {
  menuItems?: MenuItemProps[];
  showDelete?: boolean;
  onDelete?: () => void;
  title?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right" | "center";
  ariaLabel?: string;
}

const spring: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.4,
};

const menuVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

const deleteVariants: Variants = {
  initial: (confirm: boolean) => ({
    y: confirm ? 60 : -60,
  }),
  animate: {
    y: 0,
    transition: spring,
  },
  exit: (confirm: boolean) => ({
    y: confirm ? -60 : 60,
    transition: spring,
  }),
};

const confirmVariants: Variants = {
  initial: (confirm: boolean) => ({
    y: confirm ? 60 : -60,
  }),
  animate: {
    y: 0,
    transition: spring,
  },
  exit: (confirm: boolean) => ({
    y: confirm ? -60 : 60,
    transition: spring,
  }),
};

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  className = "",
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-[#363538] transition-colors hover:bg-[#F6F5FA] dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${className}`}
  >
    <span className="text-gray-500 dark:text-zinc-400 shrink-0">{icon}</span>
    <span className="text-xs font-semibold tracking-tight sm:text-sm">
      {label}
    </span>
  </button>
);

export function InlineDisclosureMenu({
  menuItems = [
    {
      icon: <HugeiconsIcon icon={PencilEdit02Icon} size={20} />,
      label: "Edit",
    },
    { icon: <HugeiconsIcon icon={Copy01Icon} size={20} />, label: "Duplicate" },
    {
      icon: <HugeiconsIcon icon={FavouriteIcon} size={20} />,
      label: "Favourite",
    },
    { icon: <HugeiconsIcon icon={Share01Icon} size={20} />, label: "Share" },
  ],
  showDelete = true,
  onDelete,
  title = "More Options",
  triggerClassName,
  menuClassName,
  ariaLabel = "Investment actions",
}: InlineDisclosureMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top?: number; bottom?: number; right: number }>({ right: 12 });
  const ref = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const updateCoords = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const rightPos = Math.max(12, window.innerWidth - rect.right);

      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        setCoords({
          bottom: Math.max(12, window.innerHeight - rect.top + 6),
          right: rightPos,
        });
      } else {
        setCoords({
          top: Math.max(12, rect.bottom + 6),
          right: rightPos,
        });
      }
    }
  }, []);

  const handleToggle = () => {
    if (!open) {
      updateCoords();
    }
    setOpen((v) => !v);
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const menuEl = document.getElementById("inline-disclosure-menu-portal");
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        (!menuEl || !menuEl.contains(e.target as Node))
      ) {
        setOpen(false);
        setConfirm(false);
      }
    };
    const scrollHandler = () => {
      if (open) {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", scrollHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", scrollHandler, true);
    };
  }, [open]);

  const handleItemClick = (itemOnClick?: () => void) => {
    setOpen(false);
    setConfirm(false);
    itemOnClick?.();
  };

  return (
    <div className="relative inline-flex justify-center">
      <div ref={ref} className="relative">
        <motion.button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className={
            triggerClassName ||
            "flex h-8 w-8 items-center justify-center rounded-full border border-[#EEEEF2] bg-white text-gray-500 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-indigo-400 cursor-pointer shadow-sm"
          }
        >
          <MoreVertical className="h-4 w-4" />
        </motion.button>

        {open &&
          createPortal(
            <AnimatePresence>
              <motion.div
                id="inline-disclosure-menu-portal"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{
                  position: "fixed",
                  top: coords.top !== undefined ? `${coords.top}px` : undefined,
                  bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                  right: `${coords.right}px`,
                }}
                className={
                  menuClassName ||
                  "z-[9990] w-[210px] sm:w-[220px] overflow-hidden rounded-2xl border border-[#EEEEF2] bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                }
              >
                <div className="border-b border-[#EEEEF2] bg-[#FAFAFC] px-3.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <span className="text-xs font-bold text-[#828287] dark:text-zinc-500 uppercase tracking-wider">
                    {title}
                  </span>
                </div>

                <LayoutGroup>
                  <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                    {menuItems.map((item, i) => (
                      <MenuItem
                        key={i}
                        {...item}
                        onClick={() => handleItemClick(item.onClick)}
                      />
                    ))}
                  </div>

                  {showDelete && (
                    <div className="relative h-[44px] overflow-hidden border-t border-[#EEEEF2] dark:border-zinc-800">
                      <AnimatePresence
                        custom={confirm}
                        mode="popLayout"
                        initial={false}
                      >
                        {!confirm ? (
                          <motion.div
                            key="delete"
                            custom={confirm}
                            variants={deleteVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="absolute inset-0 flex items-center px-1.5"
                          >
                            <MenuItem
                              icon={
                                <HugeiconsIcon
                                  icon={Delete02Icon}
                                  size={18}
                                  color="#e94447"
                                />
                              }
                              label="Delete"
                              className="cursor-pointer text-[#e94447]"
                              onClick={() => setConfirm(true)}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="confirm"
                            custom={confirm}
                            variants={confirmVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="absolute inset-0 flex items-center gap-1.5 px-2"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                setConfirm(false);
                                onDelete?.();
                              }}
                              className="h-7 flex-1 cursor-pointer rounded-xl bg-[#F24140] text-xs font-bold text-white shadow-sm hover:bg-red-600 transition-colors"
                            >
                              Yes, Delete
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirm(false)}
                              className="h-7 flex-1 cursor-pointer rounded-xl border border-gray-200 text-xs font-bold text-gray-600 dark:border-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </LayoutGroup>
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
      </div>
    </div>
  );
}
