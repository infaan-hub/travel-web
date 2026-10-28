"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { MapPin, MessageSquare } from "@/components/icons";
import {
  LOCATION_PERMISSION_KEY,
  NOTIFICATION_PERMISSION_KEY,
  NOTIFICATION_PROMPT_DISMISSED_KEY,
  ONBOARDING_STEP_KEY,
  isOnboardingComplete,
  loginPath,
  markOnboardingComplete,
  postLoginPath,
  readOnboardingValue,
  removeOnboardingValue,
  safeInternalPath,
  writeOnboardingValue,
} from "@/lib/onboarding";

type Step = "slide1" | "slide2" | "slide3" | "notif" | "location";
type NotificationState =
  | NotificationPermission
  | "unsupported"
  | "unavailable"
  | "dismissed";
type LocationState =
  | "default"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "dismissed";

const STEPS: Step[] = ["slide1", "slide2", "slide3", "notif", "location"];

const SLIDE_META = {
  slide1: {
    title: "Discover Your Next Adventure",
    description:
      "Explore tours, safaris, destinations, and unforgettable experiences offered by different tourism companies.",
  },
  slide2: {
    title: "Your Journey Starts Here",
    description:
      "Find an experience that suits you, explore its details, and send a booking request directly through Travel.",
  },
  slide3: {
    title: "Stay Updated and Discover Nearby",
    description:
      "Receive relevant updates about your booking requests and, when you choose to share your location, discover tourism experiences and services near you.",
  },
} as const;

function storedStep(): Step {
  const value = readOnboardingValue("session", ONBOARDING_STEP_KEY);
  return value && STEPS.includes(value as Step) ? (value as Step) : "slide1";
}

function storedNotificationState(): NotificationState {
  const value = readOnboardingValue("local", NOTIFICATION_PERMISSION_KEY);
  if (
    value === "granted" ||
    value === "denied" ||
    value === "default" ||
    value === "unsupported" ||
    value === "unavailable" ||
    value === "dismissed"
  ) {
    return value;
  }
  return "default";
}

function storedLocationState(): LocationState {
  const value = readOnboardingValue("local", LOCATION_PERMISSION_KEY);
  if (
    value === "granted" ||
    value === "denied" ||
    value === "unavailable" ||
    value === "timeout" ||
    value === "unsupported" ||
    value === "dismissed"
  ) {
    return value;
  }
  return "default";
}

function currentFromPath(): string {
  if (typeof window === "undefined") return "/";
  return safeInternalPath(new URLSearchParams(window.location.search).get("from"));
}

function notificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [step, setStep] = useState<Step>(storedStep);
  const [notificationState, setNotificationState] =
    useState<NotificationState>(storedNotificationState);
  const [locationState, setLocationState] =
    useState<LocationState>(storedLocationState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fromPath = currentFromPath();

  const completeOnboarding = useCallback(() => {
    markOnboardingComplete();
    router.replace(loginPath(fromPath));
  }, [fromPath, router]);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      router.replace(postLoginPath(user, fromPath));
      return;
    }
    if (isOnboardingComplete()) router.replace(loginPath(fromPath));
  }, [fromPath, isAuthenticated, loading, router, user]);

  useEffect(() => {
    writeOnboardingValue("session", ONBOARDING_STEP_KEY, step);
  }, [step]);

  useEffect(() => {
    if (step !== "notif" || typeof window === "undefined") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!notificationSupported()) {
        setNotificationState("unsupported");
        writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "unsupported");
        return;
      }

      const permission = Notification.permission;
      setNotificationState(permission);
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, permission);
      if (permission === "granted") setStep("location");
    });
    return () => {
      active = false;
    };
  }, [step]);

  useEffect(() => {
    if (step !== "location" || typeof window === "undefined") return;
    let active = true;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => {
        if (!active) return;
        setLocationState("unsupported");
        writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "unsupported");
      });
      return () => {
        active = false;
      };
    }

    const stored = readOnboardingValue("local", LOCATION_PERMISSION_KEY);
    if (!("permissions" in navigator)) {
      if (stored === "granted") {
        completeOnboarding();
      }
      return () => {
        active = false;
      };
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (!active) return;
        if (permission.state === "granted") {
          setLocationState("granted");
          writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "granted");
          completeOnboarding();
        } else if (permission.state === "denied") {
          setLocationState("denied");
          writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "denied");
        } else {
          setLocationState("default");
        }
      })
      .catch((error: unknown) => {
        console.warn("Travel. could not check location permission status.", error);
        if (active && stored === "granted") {
          setLocationState("granted");
          completeOnboarding();
        }
      });

    return () => {
      active = false;
    };
  }, [completeOnboarding, step]);

  const skipIntroduction = useCallback(() => {
    setStep("notif");
  }, []);

  const allowNotifications = useCallback(async () => {
    if (!notificationSupported()) {
      setNotificationState("unsupported");
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setNotificationState("denied");
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "denied");
      return;
    }
    if (Notification.permission === "granted") {
      setNotificationState("granted");
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "granted");
      setStep("location");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      setNotificationState(permission);
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, permission);
      if (permission === "granted") {
        setStep("location");
      } else if (permission === "denied") {
        setMessage("You can enable notifications later in your browser or device settings.");
      } else {
        setStep("location");
      }
    } catch (error) {
      console.error("Travel. could not request notification permission.", error);
      setNotificationState("unavailable");
      setMessage("We could not request notification permission. You can try again or continue.");
    } finally {
      setBusy(false);
    }
  }, []);

  const notNowNotifications = useCallback(() => {
    setNotificationState("dismissed");
    writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "dismissed");
    writeOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
    setStep("location");
  }, []);

  const allowLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationState("unsupported");
      writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "unsupported");
      return;
    }

    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationState("granted");
        writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "granted");
        setBusy(false);
      },
      (error) => {
        const state: LocationState =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable";
        setLocationState(state);
        writeOnboardingValue("local", LOCATION_PERMISSION_KEY, state);
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const notNowLocation = useCallback(() => {
    setLocationState("dismissed");
    writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "dismissed");
    completeOnboarding();
  }, [completeOnboarding]);

  if (loading || isAuthenticated || isOnboardingComplete()) {
    return (
      <section className="onboarding-screen" aria-busy="true" role="status">
        <p>Loading…</p>
      </section>
    );
  }

  if (step === "slide1" || step === "slide2" || step === "slide3") {
    const meta = SLIDE_META[step];
    const slideNumber = Number(step.slice(-1));
    const image =
      step === "slide1"
        ? "/uploads/home/Zanzibar_trip.jpg"
        : step === "slide2"
          ? "/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg"
          : "/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg";
    const imageAlt =
      step === "slide1"
        ? "Travel destinations"
        : step === "slide2"
          ? "Safari experience"
          : "Travel discovery";

    return (
      <section
        className="onboarding-screen onboarding-slides onboarding-slides-redesign"
        aria-label={meta.title}
        aria-live="polite"
      >
        <div className="onboarding-hero">
          <Image
            src={image}
            alt={imageAlt}
            width={1200}
            height={800}
            sizes="(max-width: 700px) 100vw, 1000px"
            priority
          />
        </div>
        <div
          className="onboarding-dashes"
          role="group"
          aria-label={`Slide ${slideNumber} of 3`}
        >
          {([1, 2, 3] as const).map((number) => (
            <button
              key={number}
              type="button"
              className={`onboarding-dash${number <= slideNumber ? " active" : ""}`}
              aria-current={number === slideNumber ? "step" : undefined}
              aria-label={`Slide ${number}`}
              onClick={() => setStep(`slide${number}` as Step)}
            />
          ))}
        </div>
        <div className="onboarding-copy">
          <p className="onboarding-step-label">STEP {slideNumber} OF 3</p>
          <h1 className="onboarding-title">{meta.title}</h1>
          <p className="onboarding-subtitle">{meta.description}</p>
          {step === "slide2" ? (
            <ul className="onboarding-steps-list">
              <li>
                <strong>Explore</strong> — Browse tours and safaris from different tourism companies.
              </li>
              <li>
                <strong>Choose</strong> — Review the destination, itinerary, duration, price, and provider information available.
              </li>
              <li>
                <strong>Request a Booking</strong> — Submit your travel details and track the request through the existing booking workflow.
              </li>
            </ul>
          ) : null}
          {step === "slide3" ? (
            <div className="onboarding-info-sections">
              <div className="onboarding-info-card">
                <h2>Notifications</h2>
                <p>Receive relevant booking updates and other supported travel-related notifications.</p>
              </div>
              <div className="onboarding-info-card">
                <h2>Location</h2>
                <p>Help find nearby attractions, tours, services, and destinations where location-based discovery is supported.</p>
              </div>
            </div>
          ) : null}
          <div className="onboarding-slide-actions">
            {step === "slide1" ? (
              <>
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={skipIntroduction}
                >
                  Skip Introduction
                </button>
                <button
                  type="button"
                  className="onboarding-cta"
                  onClick={() => setStep("slide2")}
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={() => setStep(step === "slide2" ? "slide1" : "slide2")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="onboarding-cta"
                  onClick={() => setStep(step === "slide2" ? "slide3" : "notif")}
                >
                  Continue
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (step === "notif") {
    const canRequest = notificationState === "default" || notificationState === "unavailable";
    return (
      <section
        className="onboarding-screen onboarding-slides onboarding-slides-redesign"
        aria-label="Enable Travel Updates"
        aria-live="polite"
      >
        <div className="onboarding-copy onboarding-permission-copy">
          <div className="pwa-permission-icon" aria-hidden="true">
            <MessageSquare size={40} />
          </div>
          <p className="onboarding-step-label">NOTIFICATION PERMISSION</p>
          <h1 className="onboarding-title">Enable Travel Updates</h1>
          <p className="onboarding-subtitle">
            Allow notifications to receive relevant booking updates and other supported alerts.
          </p>
          {notificationState === "denied" ? (
            <p className="onboarding-permission-message" role="status">
              Notifications are blocked. You can enable them later in your browser or device settings.
            </p>
          ) : null}
          {notificationState === "unsupported" ? (
            <p className="onboarding-permission-message" role="status">
              This browser does not support push notifications. You can continue without them.
            </p>
          ) : null}
          {message ? (
            <p className="onboarding-permission-message" role="status">{message}</p>
          ) : null}
          <div className="onboarding-slide-actions">
            <button
              type="button"
              className="onboarding-back"
              onClick={() => setStep("slide3")}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="onboarding-cta"
              onClick={
                canRequest
                  ? allowNotifications
                  : () => setStep("location")
              }
              disabled={busy}
            >
              {busy
                ? "Requesting…"
                : canRequest
                  ? "Allow Notifications"
                  : "Continue"}
            </button>
          </div>
          {canRequest ? (
            <button
              type="button"
              className="onboarding-back onboarding-permission-secondary"
              onClick={notNowNotifications}
              disabled={busy}
            >
              Not Now
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const locationMessage = {
    granted: "Location access is ready. Travel. does not continuously track your location.",
    denied: "Location is blocked. You can enable it later in your browser or device settings.",
    unavailable: "Your location is currently unavailable. You can continue without it.",
    timeout: "The location request timed out. You can try again or continue without it.",
    unsupported: "This browser does not support location access. You can continue without it.",
    dismissed: "",
    default: "",
  }[locationState];
  const canRequestLocation =
    locationState === "default" || locationState === "unavailable" || locationState === "timeout";

  return (
    <section
      className="onboarding-screen onboarding-slides onboarding-slides-redesign"
      aria-label="Discover Experiences Near You"
      aria-live="polite"
    >
      <div className="onboarding-copy onboarding-permission-copy">
        <div className="pwa-permission-icon" aria-hidden="true">
          <MapPin size={40} />
        </div>
        <p className="onboarding-step-label">LOCATION PERMISSION</p>
        <h1 className="onboarding-title">Discover Experiences Near You</h1>
        <p className="onboarding-subtitle">
          Share your location to help find nearby attractions, tours, and travel services when you use location-based discovery.
        </p>
        {locationMessage ? (
          <p className="onboarding-permission-message" role="status">{locationMessage}</p>
        ) : null}
        {message ? (
          <p className="onboarding-permission-message" role="alert">{message}</p>
        ) : null}
        <div className="onboarding-slide-actions">
          <button
            type="button"
            className="onboarding-back"
            onClick={() => setStep("notif")}
            disabled={busy}
          >
            Back
          </button>
          <button
            type="button"
            className="onboarding-cta"
            onClick={canRequestLocation ? allowLocation : completeOnboarding}
            disabled={busy}
          >
            {busy
              ? "Requesting…"
              : canRequestLocation
                ? "Allow Location"
                : "Continue to sign in"}
          </button>
        </div>
        {canRequestLocation ? (
          <button
            type="button"
            className="onboarding-back onboarding-permission-secondary"
            onClick={notNowLocation}
            disabled={busy}
          >
            Not Now
          </button>
        ) : null}
      </div>
    </section>
  );
}
