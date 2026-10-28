"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Bell, MapPin, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ONBOARDING_STEP_KEY,
  NOTIFICATION_PERMISSION_KEY,
  LOCATION_PERMISSION_KEY,
  readOnboardingValue,
  writeOnboardingValue,
  isOnboardingComplete,
  markOnboardingComplete,
  safeInternalPath,
  loginPath,
} from "@/lib/onboarding";

type Step = "slide1" | "slide2" | "notif";

type Slide = {
  id: string;
  image: string;
  imageAlt: string;
  heading: string[];
  description: string;
  buttonLabel: string;
  imagePosition?: string;
};

const slides: Slide[] = [
  {
    id: "discover",
    image: "/uploads/home/Zanzibar_trip.jpg",
    imageAlt: "A scenic Zanzibar island destination with turquoise water",
    heading: ["Explore", "Travel", "Inspire"],
    description: "Life is all about the journey. Find yours.",
    buttonLabel: "Get Started",
    imagePosition: "center",
  },
  {
    id: "nearby",
    image: "/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg",
    imageAlt: "A traveler exploring a scenic destination",
    heading: ["Your Journey", "Starts Here"],
    description: "Stay updated on booking requests and discover nearby experiences when you choose to share your location.",
    buttonLabel: "Let's Explore",
    imagePosition: "center",
  },
];

function homeForUser(user: { is_staff: boolean; account_type: string } | null, from: string): string {
  if (!user) return from || "/";
  if (user.is_staff) return "/admin/dashboard";
  if (user.account_type === "TOUR_COMPANY" && from === "/") return "/tour-company/dashboard";
  return from || "/";
}

type OnboardingCardProps = {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  onContinue: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  showBack?: boolean;
  showProgress?: boolean;
  showSkip?: boolean;
  mobileHideCopy?: boolean;
  children?: React.ReactNode;
};

function OnboardingCard({
  slide,
  currentIndex,
  totalSlides,
  onContinue,
  onSkip,
  onBack,
  showBack = false,
  showProgress = true,
  showSkip = true,
  mobileHideCopy = false,
  children,
}: OnboardingCardProps) {
  return (
    <section
      className="onboarding-screen"
      aria-label={`Introduction ${currentIndex + 1} of ${totalSlides}`}
    >
      <div className="onboarding-topbar">
        {showBack && onBack ? (
          <button type="button" className="onboarding-back-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {showSkip && onSkip ? (
          <button type="button" className="onboarding-skip" onClick={onSkip}>
            Skip
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <article className={`onboarding-card${mobileHideCopy ? " onboarding-no-copy-mobile" : ""}`} aria-label={slide.heading.join(" ")}> 
        <img
          className="onboarding-card-image"
          src={slide.image}
          alt={slide.imageAlt}
          style={{ objectPosition: slide.imagePosition ?? "center" }}
        />

        <div className="onboarding-image-overlay" aria-hidden="true" />

        <div className="onboarding-card-content">
          <div className="onboarding-copy">
            <h1>
              {slide.heading.map((line, index) => (
                <span key={`${slide.id}-${index}`}>{line}</span>
              ))}
            </h1>

            <p>{slide.description}</p>
            {children}
          </div>

          <button
            type="button"
            className="onboarding-primary-button"
            onClick={onContinue}
          >
            {slide.buttonLabel}
          </button>
        </div>
      </article>

      {showProgress ? (
        <nav className="onboarding-progress" aria-label="Onboarding progress">
          {Array.from({ length: totalSlides }, (_, index) => (
            <span
              key={index}
              className={
                index === currentIndex
                  ? "onboarding-progress-item is-active"
                  : "onboarding-progress-item"
              }
              aria-current={index === currentIndex ? "step" : undefined}
            />
          ))}
        </nav>
      ) : null}
    </section>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("slide1");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(ONBOARDING_STEP_KEY) as Step | null;
    if (stored && ["slide1", "slide2", "notif"].includes(stored)) setStep(stored as Step);
  }, []);

  const [notifState, setNotifState] = useState<string>("default");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotifState(readOnboardingValue("local", NOTIFICATION_PERMISSION_KEY) || "default");
  }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const fromPath = safeInternalPath(
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from"),
  );

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) router.replace(homeForUser(user, fromPath));
  }, [loading, isAuthenticated, user, fromPath, router]);

  useEffect(() => {
    if (loading || isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (isOnboardingComplete()) router.replace("/login/");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(ONBOARDING_STEP_KEY, step);
  }, [step]);

  useEffect(() => {
    if (step !== "notif" || typeof window === "undefined") return;
    if (!("Notification" in window)) {
      const t = setTimeout(() => setNotifState("unsupported"), 0);
      return () => clearTimeout(t);
    }
    if (Notification.permission === "granted") {
      const t = setTimeout(() => {
        setNotifState("granted");
        completeOnboarding();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [step]);


  const completeOnboarding = useCallback(() => {
    markOnboardingComplete();
    router.replace(loginPath(fromPath));
  }, [fromPath, router]);

  const skipIntro = useCallback(() => {
    setStep("notif");
  }, []);

  const goBack = useCallback(() => {
    setStep((prev) => {
      if (prev === "slide2") return "slide1";
            if (prev === "notif") return "slide2";
      return prev;
    });
  }, []);

  const allowNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifState("unsupported");
      completeOnboarding();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      setNotifState(permission);
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, permission);
    } catch {
      setNotifState("denied");
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "denied");
    } finally {
      setBusy(false);
      completeOnboarding();
    }
  }, []);

  const notNowNotifications = useCallback(() => {
    if (typeof window !== "undefined") writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "dismissed");
    setNotifState("dismissed");
    completeOnboarding();
  }, []);



  if (loading) {
    return (
      <main className="onboarding-screen">
        <p style={{ color: "#111" }}>Loading…</p>
      </main>
    );
  }
  if (isAuthenticated) return null;

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as any };

  const renderSlide = (s: Slide, idx: number, onContinue: () => void, mobileHideCopy = false) => (
    <motion.div
      key={s.id}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
      transition={transition}
      style={{ width: "100%", display: "flex", justifyContent: "center" }}
    >
      <OnboardingCard
        slide={s}
        currentIndex={idx}
        totalSlides={2}
        onContinue={onContinue}
        onSkip={skipIntro}
        onBack={goBack}
        showBack={idx > 0}
        mobileHideCopy={mobileHideCopy}
      />
    </motion.div>
  );

  const notifSlide: Slide = {
    id: "notif",
    image: slides[1].image,
    imageAlt: slides[1].imageAlt,
    heading: ["Enable", "Travel", "Updates"],
    description: "Allow notifications to receive relevant booking updates and other supported travel alerts.",
    buttonLabel: busy ? "Requesting…" : notifState !== "unsupported" ? "Allow Notifications" : "Continue",
    imagePosition: "center",
  };


  return (
    <AnimatePresence mode="wait">
      {step === "slide1" && renderSlide(slides[0], 0, () => setStep("slide2"))}
      {step === "slide2" && renderSlide(slides[1], 1, () => setStep("notif"), true)}

      {step === "notif" && (
        <motion.div
          key="notif"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
          transition={transition}
          style={{ width: "100%", display: "flex", justifyContent: "center" }}
        >
          <OnboardingCard
            slide={notifSlide}
            currentIndex={1}
            totalSlides={2}
            onContinue={notifState !== "unsupported" ? allowNotifications : completeOnboarding}
            onBack={goBack}
            showBack={true}
            showSkip={false}
            showProgress={false}
          >
            <div className="onboarding-icon-row"><Bell size={18} /> <span>Travel Updates</span></div>
            {notifState === "denied" ? (
              <p className="onboarding-description">Notifications were denied. You can enable them later in your browser or device settings.</p>
            ) : null}
            {notifState === "unsupported" ? (
              <p className="onboarding-description">This browser does not support notifications. You can continue.</p>
            ) : null}
            {message ? <p className="onboarding-description">{message}</p> : null}
            <button type="button" className="onboarding-back" onClick={completeOnboarding} style={{ position: "relative", marginTop: 8 }}>
                Continue
              </button>
          </OnboardingCard>
        </motion.div>
      )}

    </AnimatePresence>
  );
}























