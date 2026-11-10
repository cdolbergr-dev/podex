/** Chrome/Edge/Samsung Internet event that lets a page trigger the install dialog. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "podex.installPromptDismissedAt";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

export function isInstalledApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Coarse platform label for analytics. */
export function appPlatform(): "ios" | "android" | "desktop" {
  if (isIOS()) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

/** Web views inside social apps (Instagram, Facebook, …): can't install, may drop storage. */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|GSA\/|TikTok/i.test(navigator.userAgent);
}

/** iPhone/iPad in a browser that offers "Add to Home Screen" (not in-app web views). */
export function canAddToHomeScreenOnIOS(): boolean {
  return isIOS() && !isInAppBrowser();
}

/**
 * Browsers that apply WebKit's 7-day limit on site storage: Safari on the Mac, and every
 * browser on iPhone/iPad (all use WebKit there). Installed home-screen apps are exempt.
 */
export function hasSevenDayStorageLimit(): boolean {
  if (isInstalledApp()) return false;
  if (isIOS()) return true;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(ua);
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function wasInstallPromptDismissedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

export function rememberInstallPromptDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Private mode — the prompt may show again next visit.
  }
}
