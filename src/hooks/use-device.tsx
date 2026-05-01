import * as React from "react";

/**
 * Strict device detection: a device is "mobile" only if it has a coarse
 * primary pointer (touchscreen) AND no fine pointer (mouse). This prevents
 * desktops with narrow windows from being treated as mobile, and prevents
 * tablets-with-mouse from getting touch-only UI.
 */
export function useIsMobileDevice() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return detect();
  });

  React.useEffect(() => {
    const update = () => setIsMobile(detect());
    update();
    const mqlCoarse = window.matchMedia("(pointer: coarse)");
    const mqlFine = window.matchMedia("(any-pointer: fine)");
    mqlCoarse.addEventListener("change", update);
    mqlFine.addEventListener("change", update);
    return () => {
      mqlCoarse.removeEventListener("change", update);
      mqlFine.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}

function detect(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const hasFine = window.matchMedia("(any-pointer: fine)").matches;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(
    navigator.userAgent
  );
  // Mobile = touch device without a fine pointer (mouse), or UA says mobile.
  return (coarse && hasTouch && !hasFine) || uaMobile;
}

/** Returns true when the viewport is in portrait orientation. */
export function useIsPortrait() {
  const [portrait, setPortrait] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: portrait)").matches;
  });
  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const onChange = () => setPortrait(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return portrait;
}
