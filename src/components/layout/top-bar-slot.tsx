"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TopBarContextValue = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
};

const TopBarContext = createContext<TopBarContextValue | null>(null);

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  return (
    <TopBarContext.Provider value={{ slotEl, setSlotEl }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBarSlotElement() {
  const ctx = useContext(TopBarContext);
  if (!ctx) {
    throw new Error("TopBarSlot must be used within TopBarProvider");
  }
  return ctx;
}

/**
 * Renders children into the admin top bar (left side).
 * Pages use this for search / filters instead of putting them in the main area.
 */
export function TopBarSlot({ children }: { children: ReactNode }) {
  const { slotEl } = useTopBarSlotElement();
  if (!slotEl) return null;
  return createPortal(children, slotEl);
}
