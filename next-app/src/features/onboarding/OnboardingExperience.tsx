"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import type {
  OnboardingFlowRole,
  OnboardingSlide,
} from "@/features/onboarding/onboarding-slides";
import styles from "@/features/onboarding/onboarding-experience.module.css";

type OnboardingExperienceProps = {
  role: OnboardingFlowRole;
  roleLabel: string;
  slides: readonly OnboardingSlide[];
  finishLabel: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onComplete: () => void;
  onSkip: () => void;
};

export default function OnboardingExperience({
  role,
  roleLabel,
  slides,
  finishLabel,
  secondaryAction,
  onComplete,
  onSkip,
}: OnboardingExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [slideIndex, setSlideIndex] = useState(0);
  const [shotIndex, setShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const activeSlide = slides[slideIndex] ?? slides[0];
  const activeShots = activeSlide.shots;
  const activeShot = activeShots[shotIndex] ?? activeShots[0];
  const isLastSlide = slideIndex === slides.length - 1;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(nextIndex, slides.length - 1));
      setSlideIndex(clamped);
      setShotIndex(0);
    },
    [slides.length],
  );

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      onComplete();
      return;
    }
    goToSlide(slideIndex + 1);
  }, [goToSlide, isLastSlide, onComplete, slideIndex]);

  const handleBack = useCallback(() => {
    if (slideIndex > 0) {
      goToSlide(slideIndex - 1);
    }
  }, [goToSlide, slideIndex]);

  // Auto-advance shots inside the current slide like a looping product tutorial video.
  useEffect(() => {
    if (!isPlaying || activeShots.length <= 1) return;
    const duration = Math.max(1800, activeShot.durationMs);
    const timer = window.setTimeout(() => {
      setShotIndex((current) => (current + 1) % activeShots.length);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [activeShot.durationMs, activeShots.length, isPlaying, shotIndex, slideIndex]);

  // Preload the next real page shot so transitions never blink.
  useEffect(() => {
    if (typeof window === "undefined" || activeShots.length <= 1) return;
    const nextShot = activeShots[(shotIndex + 1) % activeShots.length];
    if (nextShot?.src) {
      const img = new window.Image();
      img.src = nextShot.src;
    }
  }, [activeShots, shotIndex]);

  // Keyboard navigation (Left / Right arrows for slides, Space to pause/resume video).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleBack();
      } else if (event.key === " " && event.target === document.body) {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBack, handleNext]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta < 0 && !isLastSlide) {
      goToSlide(slideIndex + 1);
    } else if (delta > 0 && slideIndex > 0) {
      goToSlide(slideIndex - 1);
    }
  };

  const motionClass =
    styles[`motion_${activeShot.motion}` as keyof typeof styles] ??
    styles["motion_zoom-in"];

  return (
    <main
      id="onboarding-experience-root"
      className={styles.root}
      aria-label={`${roleLabel} onboarding`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.shell}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.brandGroup}>
            <Image
              src="/travel.logo.jpeg"
              alt="Travel."
              width={88}
              height={76}
              className={styles.brandLogo}
              priority
              unoptimized
            />
            <div className={styles.brandMeta}>
              <span className={styles.brandTitle}>Travel.</span>
              <span className={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <span className={styles.slideCounter} aria-live="polite">
              {slideIndex + 1} / {slides.length}
            </span>
            <button
              type="button"
              className={styles.skipButton}
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        </header>

        {/* Responsive two-column cinema stage */}
        <section
          className={styles.stage}
          aria-roledescription="carousel"
          aria-label={`${role} tutorial slides`}
        >
          {/* Animated Real-Shot Video Device Player */}
          <div className={styles.videoColumn}>
            <div
              className={`${styles.deviceFrame} ${
                !isPlaying ? styles.paused : ""
              }`}
              aria-label={`Animated tutorial preview: ${activeShot.caption}`}
            >
              <div className={styles.screenViewport}>
                {/* Segmented video progress scrubber */}
                <div
                  className={styles.timelineTrack}
                  role="tablist"
                  aria-label="Tutorial video scenes"
                >
                  {activeShots.map((shot, idx) => {
                    const isDone = idx < shotIndex;
                    const isCurrent = idx === shotIndex;
                    return (
                      <button
                        key={`${activeSlide.id}-${shot.src}`}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`Scene ${idx + 1}: ${shot.caption}`}
                        className={styles.timelineSegment}
                        onClick={() => setShotIndex(idx)}
                      >
                        <span
                          key={`${activeSlide.id}-${shotIndex}-${idx}-${isPlaying ? "play" : "pause"}`}
                          className={`${styles.timelineSegmentFill} ${
                            isDone
                              ? styles.timelineSegmentDone
                              : isCurrent
                                ? styles.timelineSegmentActive
                                : ""
                          }`}
                          style={
                            isCurrent
                              ? { animationDuration: `${shot.durationMs}ms` }
                              : undefined
                          }
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Live video header pill + Play/Pause button */}
                <div className={styles.videoTopMeta}>
                  <span className={styles.liveBadge}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {isPlaying ? "Live demo" : "Paused"}
                  </span>
                  <button
                    type="button"
                    className={styles.playToggle}
                    aria-label={
                      isPlaying ? "Pause tutorial animation" : "Play tutorial animation"
                    }
                    onClick={() => setIsPlaying((prev) => !prev)}
                  >
                    {isPlaying ? (
                      <Pause size={13} aria-hidden="true" />
                    ) : (
                      <Play size={13} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Smooth crossfading real page screenshots */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeSlide.id}-${shotIndex}`}
                    className={styles.shotLayer}
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.05 }
                        : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    <Image
                      src={activeShot.src}
                      alt={activeShot.alt}
                      width={580}
                      height={1130}
                      className={`${styles.shotImage} ${motionClass}`}
                      priority
                      unoptimized
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Animated touch-tap pointer over real UI action */}
                {activeShot.tapPoint ? (
                  <div
                    key={`tap-${activeSlide.id}-${shotIndex}`}
                    className={styles.tapHotspot}
                    style={{
                      left: `${activeShot.tapPoint.x}%`,
                      top: `${activeShot.tapPoint.y}%`,
                    }}
                    aria-hidden="true"
                  >
                    <span className={styles.tapRing}>
                      <span className={styles.tapCore} />
                    </span>
                    <span className={styles.tapLabel}>
                      {activeShot.tapPoint.label}
                    </span>
                  </div>
                ) : null}

                {/* Video subtitle / step bar */}
                <div className={styles.videoBottomScrim}>
                  <div className={styles.captionPill} aria-live="polite">
                    <span>{activeShot.caption}</span>
                    <span className={styles.captionIndex}>
                      {shotIndex + 1}/{activeShots.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Editorial tutorial copy + scene selector + slide navigation */}
          <div className={styles.copyColumn}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={
                  reduceMotion
                    ? { duration: 0.05 }
                    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                }
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div className={styles.metaRow}>
                  <span className={styles.stepBadge}>
                    <Sparkles size={13} aria-hidden="true" />
                    {activeSlide.badge}
                  </span>
                  <span className={styles.routeChip}>{activeSlide.routeHint}</span>
                </div>

                <h1 className={styles.heading}>{activeSlide.title}</h1>
                <p className={styles.description}>{activeSlide.description}</p>

                <ul className={styles.highlightList}>
                  {activeSlide.highlights.map((item) => (
                    <li key={item} className={styles.highlightItem}>
                      <span className={styles.highlightIcon} aria-hidden="true">
                        <Check size={12} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Clickable shot selector pills (desktop/tablet) */}
                <div className={styles.sceneStrip} aria-label="Jump to demo step">
                  {activeShots.map((shot, idx) => (
                    <button
                      key={`pill-${activeSlide.id}-${idx}`}
                      type="button"
                      className={`${styles.sceneChip} ${
                        idx === shotIndex ? styles.sceneChipActive : ""
                      }`}
                      onClick={() => setShotIndex(idx)}
                    >
                      {shot.caption}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className={styles.footerControls}>
              {/* Slide indicator dots */}
              <nav className={styles.dotTrack} aria-label="Tutorial slide progress">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                    aria-current={idx === slideIndex ? "step" : undefined}
                    className={`${styles.dotButton} ${
                      idx === slideIndex ? styles.dotButtonActive : ""
                    }`}
                    onClick={() => goToSlide(idx)}
                  />
                ))}
              </nav>

              {/* Action buttons */}
              <div className={styles.ctaRow}>
                {slideIndex > 0 ? (
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={handleBack}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleNext}
                >
                  {isLastSlide ? finishLabel : "Next"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>

                {isLastSlide && secondaryAction ? (
                  <button
                    type="button"
                    className={styles.secondaryLink}
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.label}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
