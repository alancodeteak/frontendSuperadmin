export const SUCCESS_TOAST_ANIMATION = "/animations/success-animation.gif";

/** Native GIF frame dimensions */
export const SUCCESS_TOAST_ANIMATION_FRAME = {
  width: 800,
  height: 600,
} as const;

/** Visible icon bounds inside the GIF (green circle + checkmark) */
export const SUCCESS_TOAST_ANIMATION_CONTENT = {
  x: 279,
  y: 167,
  width: 242,
  height: 243,
} as const;

/** Rendered icon size in the toast pill */
export const SUCCESS_TOAST_ICON_SIZE = 32;
