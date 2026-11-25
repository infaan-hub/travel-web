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
  const [expanded, setExpanded] = useState(false);
  const [manualHint, setManualHint] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setDismissed(isDownloadBadgeDismissed()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    const openGuide = () => {
      setExpanded(false);
      setGuideOpen(true);
    };
    window.addEventListener(OPEN_INSTALL_GUIDE_EVENT, openGuide);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE_EVENT, openGuide);
  }, []);

  useEffect(() => {
    if (!guideOpen && !expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuideOpen(false);
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, guideOpen]);

  // Web-only: never render when running as an installed app.
  if (!showWebInstallUI) return null;

  const hideFloatingBadge = dismissed || isOnboardingRoute(pathname);

  const handleGotIt = () => {
    dismissDownloadBadge();
    setExpanded(false);
    setManualHint(false);
    setDismissed(true);
  };

  const handleBadgeDownloadClick = async () => {
    if (!canPromptNative) {
      setManualHint(true);
      return;
    }
    const result = await triggerInstall();
    if (result === "accepted") {
      setExpanded(false);
      setGuideOpen(false);
    } else if (result === "manual") {
      setManualHint(true);
    }
  };

  const handleModalDownloadClick = async () => {
    const result = await triggerInstall();
    if (result === "accepted") {
      setGuideOpen(false);
    }
  };

  return (
    <>
      {/* Middle-right outside "Download app" pill -> taps open to full install card */}
      {!hideFloatingBadge && !expanded ? (
        <button
          id="pwa-download-badge-trigger"
          type="button"
          className={styles.edgeTrigger}
          aria-expanded="false"
          aria-controls="pwa-download-badge"
          onClick={() => {
            setManualHint(false);
            setExpanded(true);
          }}
        >
          <span className={styles.edgeTriggerIcon} aria-hidden="true">
            <Download size={13} />
          </span>
          <span>Download app</span>
        </button>
      ) : null}

      {/* Expanded middle-right Download App tutorial card */}
      {!hideFloatingBadge && expanded ? (
        <aside
          id="pwa-download-badge"
          className={styles.badgeContainer}
          aria-label="Download Travel. App"
        >
          <div className={styles.badgeHeaderRow}>
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
                <span className={styles.eyebrow}>Download app</span>
                <h2 className={styles.title}>Install Travel. on your device</h2>
              </div>
            </div>

            <button
              type="button"
              className={styles.collapseBtn}
              aria-label="Minimize download badge"
              onClick={() => {
                setExpanded(false);
                setManualHint(false);
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
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

          {manualHint ? (
            <p className={styles.inlineHint} role="status">
              {platform === "ios"
                ? "Tap Safari's Share (↑) button at the bottom of your screen, then choose Add to Home Screen (not Add to Dock)."
                : platform === "android"
                  ? "Open Chrome's menu (⋮) in the top right corner and tap Install app."
                  : "Click the Install icon in your browser's address bar (Chrome or Edge) to install Travel."}
            </p>
          ) : null}

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
              onClick={() => void handleBadgeDownloadClick()}
            >
              <Download size={14} aria-hidden="true" />
              {installing ? "Installing…" : "Download app"}
            </button>
          </div>
        </aside>
      ) : null}

      {/* Manual install tutorial modal (opened from Sidebar "Download app" when browser needs manual steps) */}
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
                  <span className={styles.eyebrow}>Download app</span>
                  <h2 id="pwa-install-guide-title" className={styles.title}>
                    Install Travel. on your device
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
                ? "On iPhone & iPad, Apple requires installing from Safari using Share (↑) → Add to Home Screen (not Add to Dock)."
                : canPromptNative
                  ? "Tap Download app below to launch the installation prompt."
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
                  onClick={() => void handleModalDownloadClick()}
                >
                  <Download size={14} aria-hidden="true" />
                  {installing ? "Installing…" : "Download app"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
