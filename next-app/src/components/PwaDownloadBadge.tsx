"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Download, Monitor, Smartphone, Share, X } from "lucide-react";
import {
  OPEN_INSTALL_GUIDE_EVENT,
  usePwaInstall,
} from "@/hooks/usePwaInstall";
import { isOnboardingRoute } from "@/lib/onboarding";
import {
  INSTALL_TUTORIAL_STEPS,
  dismissDownloadBadge,
  isDownloadBadgeDismissed,
  type InstallPlatform,
} from "@/lib/pwa-install";
import styles from "@/components/pwa-download-badge.module.css";

function PlatformIcon({ id }: { id: InstallPlatform }) {
  if (id === "ios") return <Share size={14} aria-hidden="true" />;
  if (id === "android") return <Smartphone size={14} aria-hidden="true" />;
  return <Monitor size={14} aria-hidden="true" />;
}

export default function PwaDownloadBadge() {
  const pathname = usePathname();
  const {
    showWebInstallUI,
    canPromptNative,
    platform,
    installing,
    triggerInstall,
  } = usePwaInstall();

  const [dismissed, setDismissed] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setDismissed(isDownloadBadgeDismissed()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    const openGuide = () => setGuideOpen(true);
    window.addEventListener(OPEN_INSTALL_GUIDE_EVENT, openGuide);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE_EVENT, openGuide);
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guideOpen]);

  // Web-only: never render when running as an installed app.
  if (!showWebInstallUI) return null;

  const hideFloatingBadge = dismissed || isOnboardingRoute(pathname);

  const handleGotIt = () => {
    dismissDownloadBadge();
    setDismissed(true);
  };

  const handleDownloadClick = async () => {
    const result = await triggerInstall();
    if (result === "accepted") {
      setGuideOpen(false);
    }
  };

  return (
    <>
      {/* Floating middle-right Download App badge (one-time until user taps "Got it") */}
      {!hideFloatingBadge ? (
        <aside
          id="pwa-download-badge"
          className={styles.badgeContainer}
          aria-label="Download Travel. App"
        >
          <div className={styles.header}>
            <div className={styles.logoBox}>
              <Image
                src="/travel.logo.jpeg"
                alt="Travel."
                width={84}
                height={72}
                className={styles.logoImg}
                unoptimized
              />
            </div>
            <div className={styles.headerCopy}>
              <span className={styles.eyebrow}>Download app</span>
              <h2 className={styles.title}>Install Travel. on your device</h2>
            </div>
          </div>

          <p className={styles.intro}>
            Get faster bookings, live trip updates, and full app navigation:
          </p>

          <ul className={styles.stepsList}>
            {INSTALL_TUTORIAL_STEPS.map((step) => {
              const isCurrent = step.id === platform;
              return (
                <li
                  key={step.id}
                  className={`${styles.stepItem} ${
                    isCurrent ? styles.stepItemActive : ""
                  }`}
                >
                  <span className={styles.stepIcon}>
                    <PlatformIcon id={step.id} />
                  </span>
                  <div className={styles.stepCopy}>
                    <div className={styles.stepTitleRow}>
                      <span className={styles.stepLabel}>{step.label}</span>
                      {isCurrent ? (
                        <span className={styles.currentTag}>Your device</span>
                      ) : null}
                    </div>
                    <p className={styles.stepDesc}>{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.gotItBtn}
              onClick={handleGotIt}
            >
              Got it
            </button>
            <button
              type="button"
              className={styles.downloadBtn}
              disabled={installing}
              onClick={() => void handleDownloadClick()}
            >
              <Download size={14} aria-hidden="true" />
              {installing ? "Installing…" : "Download app"}
            </button>
          </div>
        </aside>
      ) : null}

      {/* Manual install tutorial modal (opened when browser requires manual steps, e.g. iOS Safari or Sidebar tap) */}
      {guideOpen ? (
        <div
          id="pwa-install-guide-modal"
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.header} style={{ marginBottom: 0 }}>
                <div className={styles.logoBox}>
                  <Image
                    src="/travel.logo.jpeg"
                    alt="Travel."
                    width={84}
                    height={72}
                    className={styles.logoImg}
                    unoptimized
                  />
                </div>
                <div className={styles.headerCopy}>
                  <span className={styles.eyebrow}>Install tutorial</span>
                  <h2 id="pwa-install-guide-title" className={styles.title}>
                    How to install Travel.
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close install guide"
                onClick={() => setGuideOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <p className={styles.modalNote}>
              {platform === "ios"
                ? "On iPhone & iPad, Apple requires installing from Safari using Share → Add to Home Screen (not Add to Dock)."
                : canPromptNative
                  ? "Tap Install now below to launch the app installation prompt."
                  : "Follow the steps for your device below to install Travel. directly from your browser."}
            </p>

            <ul className={styles.stepsList}>
              {INSTALL_TUTORIAL_STEPS.map((step) => {
                const isCurrent = step.id === platform;
                return (
                  <li
                    key={`modal-${step.id}`}
                    className={`${styles.stepItem} ${
                      isCurrent ? styles.stepItemActive : ""
                    }`}
                  >
                    <span className={styles.stepIcon}>
                      <PlatformIcon id={step.id} />
                    </span>
                    <div className={styles.stepCopy}>
                      <div className={styles.stepTitleRow}>
                        <span className={styles.stepLabel}>{step.label}</span>
                        {isCurrent ? (
                          <span className={styles.currentTag}>Your device</span>
                        ) : null}
                      </div>
                      <p className={styles.stepDesc}>{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div
              className={styles.actions}
              style={
                !canPromptNative
                  ? { gridTemplateColumns: "minmax(0, 1fr)" }
                  : undefined
              }
            >
              <button
                type="button"
                className={styles.gotItBtn}
                onClick={() => setGuideOpen(false)}
              >
                Close
              </button>
              {canPromptNative ? (
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={installing}
                  onClick={() => void handleDownloadClick()}
                >
                  <Download size={14} aria-hidden="true" />
                  {installing ? "Installing…" : "Install now"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
