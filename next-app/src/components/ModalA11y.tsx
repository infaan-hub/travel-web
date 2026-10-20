"use client";

import { useEffect } from "react";

const OVERLAY_SELECTORS = [
  ".admin-form-overlay",
  ".modal-overlay",
  ".admin-confirm-overlay",
].join(",");

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTORS)).filter(
    (element) => element.offsetParent !== null,
  );
}

/**
 * Adds keyboard and screen-reader support to every modal on the site:
 * focus is trapped inside the topmost overlay, Escape closes it and focus is
 * restored to the element that opened the overlay.
 */
export function ModalA11y() {
  useEffect(() => {
    const previouslyFocused = new WeakMap<HTMLElement, HTMLElement | null>();

    const trap = (event: KeyboardEvent) => {
      const overlays = visibleOverlays();
      const overlay = overlays[overlays.length - 1];
      if (!overlay) return;

      if (event.key === "Escape") {
        event.stopPropagation();
        overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => trap(event);

    const observer = new MutationObserver(() => {
      const overlays = visibleOverlays();
      for (const overlay of overlays) {
        if (!previouslyFocused.has(overlay)) {
          previouslyFocused.set(overlay, document.activeElement as HTMLElement | null);
          const focusable = overlay.querySelector<HTMLElement>(FOCUSABLE);
          focusable?.focus();
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
