"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

const toasterStyle: CSSProperties = {
  position: "fixed",
  left: "50%",
  right: "auto",
  bottom: "max(1rem, env(safe-area-inset-bottom))",
  transform: "translateX(-50%)",
  width: "min(100vw - 2rem, 430px)",
  zIndex: 100,
};

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      expand={false}
      gap={10}
      offset="1rem"
      mobileOffset={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      visibleToasts={3}
      closeButton={false}
      className="!left-1/2 !right-auto !-translate-x-1/2"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "!flex !w-full !max-w-[22rem] !justify-center !bg-transparent !border-0 !p-0 !shadow-none",
        },
      }}
      style={toasterStyle}
    />
  );
}
