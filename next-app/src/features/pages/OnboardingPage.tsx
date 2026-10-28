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

type Step = "slide1" | "slide2" | "slide3" | "notif" | "location";

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
    id: "book",
    image: "/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg",
    imageAlt: "Travelers enjoying a guided safari experience",
    heading: ["Discover", "Amazing", "Experiences"],
    description: "Explore tours from different companies and request your next adventure.",
    buttonLabel: "Continue",
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

      <article className="onboarding-card" aria-label={slide.heading.join(" ")}>
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

  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "slide1";
    const stored = window.sessionStorage.getItem(ONBOARDING_STEP_KEY) as Step | null;
    return stored && ["slide1", "slide2", "slide3", "notif", "location"].includes(stored)
      ? stored
      : "slide1";
  });

  const [notifState, setNotifState] = useState<string>(() =>
    typeof window === "undefined" ? "default" : readOnboardingValue("local", NOTIFICATION_PERMISSION_KEY) || "default",
  );
  const [locState, setLocState] = useState<string>(() =>
    typeof window === "undefined" ? "default" : readOnboardingValue("local", LOCATION_PERMISSION_KEY) || "default",
  );
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
        setStep("location");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (step !== "location" || typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      const t = setTimeout(() => setLocState("unsupported"), 0);
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
      if (prev === "slide3") return "slide2";
      if (prev === "notif") return "slide3";
      if (prev === "location") return "notif";
      return prev;
    });
  }, []);

  const allowNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifState("unsupported");
      setStep("location");
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
      setStep("location");
    }
  }, []);

  const notNowNotifications = useCallback(() => {
    if (typeof window !== "undefined") writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "dismissed");
    setNotifState("dismissed");
    setStep("location");
  }, []);

  const allowLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocState("unsupported");
      if (typeof window !== "undefined") writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "unsupported");
      completeOnboarding();
      return;
    }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocState("granted");
        if (typeof window !== "undefined") writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "granted");
        setBusy(false);
        completeOnboarding();
      },
      (error) => {
        const value = error.code === 1 ? "denied" : "error";
        setLocState(value);
        if (typeof window !== "undefined") writeOnboardingValue("local", LOCATION_PERMISSION_KEY, value);
        setBusy(false);
        completeOnboarding();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [completeOnboarding]);

  const notNowLocation = useCallback(() => {
    if (typeof window !== "undefined") writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "dismissed");
    setLocState("dismissed");
    completeOnboarding();
  }, [completeOnboarding]);

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

  const renderSlide = (s: Slide, idx: number, onContinue: () => void) => (
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
        totalSlides={3}
        onContinue={onContinue}
        onSkip={skipIntro}
        onBack={goBack}
        showBack={idx > 0}
      />
    </motion.div>
  );

  const notifSlide: Slide = {
    id: "notif",
    image: slides[2].image,
    imageAlt: slides[2].imageAlt,
    heading: ["Enable", "Travel", "Updates"],
    description: "Allow notifications to receive relevant booking updates and other supported travel alerts.",
    buttonLabel: busy ? "Requesting…" : notifState !== "unsupported" ? "Allow Notifications" : "Continue",
    imagePosition: "center",
  };

  const locationSlide: Slide = {
    id: "location",
    image: slides[0].image,
    imageAlt: slides[0].imageAlt,
    heading: ["Discover", "Experiences", "Near You"],
    description: "Allow location access to help find nearby attractions, tours, and travel services.",
    buttonLabel: busy ? "Requesting…" : locState !== "unsupported" ? "Allow Location" : "Continue to sign in",
    imagePosition: "center",
  };

  return (
    <AnimatePresence mode="wait">
      {step === "slide1" && renderSlide(slides[0], 0, () => setStep("slide2"))}
      {step === "slide2" && renderSlide(slides[1], 1, () => setStep("slide3"))}
      {step === "slide3" && renderSlide(slides[2], 2, () => setStep("notif"))}

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
            currentIndex={2}
            totalSlides={3}
            onContinue={notifState !== "unsupported" ? allowNotifications : () => setStep("location")}
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
            <button type="button" className="onboarding-back" onClick={() => setStep("location")} style={{ position: "relative", marginTop: 8 }}>
                Continue
              </button>
          </OnboardingCard>
        </motion.div>
      )}

      {step === "location" && (
        <motion.div
          key="location"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
          transition={transition}
          style={{ width: "100%", display: "flex", justifyContent: "center" }}
        >
          <OnboardingCard
            slide={locationSlide}
            currentIndex={2}
            totalSlides={3}
            onContinue={locState !== "unsupported" ? allowLocation : completeOnboarding}
            onBack={goBack}
            showBack={true}
            showSkip={false}
            showProgress={false}
          >
            <div className="onboarding-icon-row"><MapPin size={18} /> <span>Nearby Discovery</span></div>
            {locState === "denied" ? (
              <p className="onboarding-description">Location was denied. You can enable it later in your browser settings.</p>
            ) : null}
            {locState === "unsupported" ? (
              <p className="onboarding-description">This browser does not support location. You can continue.</p>
            ) : null}
            {message ? <p className="onboarding-description">{message}</p> : null}
            <button type="button" className="onboarding-back" onClick={completeOnboarding} style={{ position: "relative", marginTop: 8 }}>
                Continue to sign in
              </button>
          </OnboardingCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}









