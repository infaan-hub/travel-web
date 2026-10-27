"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, MapPin } from "@/components/icons";

const ONBOARDING_KEY = "travel_onboarding_seen";
const STEP_KEY = "travel_onboarding_step";
const NOTIF_KEY = "travel_notification_permission";
const LOC_KEY = "travel_location_permission";

type Step = "slide1" | "slide2" | "slide3" | "notif" | "location";

const SLIDE_META = {
  slide1: { title: "Discover Your Next Adventure", description: "Explore tours, safaris, destinations, and unforgettable experiences offered by different tourism companies.", progress: 1 },
  slide2: { title: "Your Journey Starts Here", description: "Find an experience that suits you, explore its details, and send a booking request directly through Travel.", progress: 2 },
  slide3: { title: "Stay Updated and Discover Nearby", description: "Receive relevant updates about your booking requests and, when you choose to share your location, discover tourism experiences and services near you.", progress: 3 },
} as const;

function safeInternalPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function homeForUser(user: { is_staff: boolean; account_type: string } | null, from: string): string {
  if (!user) return from || "/";
  if (user.is_staff) return "/admin/dashboard";
  if (user.account_type === "TOUR_COMPANY" && from === "/") return "/tour-company/dashboard";
  return from || "/";
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "slide1";
    const stored = window.sessionStorage.getItem(STEP_KEY) as Step | null;
    return stored && ["slide1", "slide2", "slide3", "notif", "location"].includes(stored) ? stored : "slide1";
  });
  const [notifState, setNotifState] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    return window.localStorage.getItem(NOTIF_KEY) || "default";
  });
  const [locState, setLocState] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    return window.localStorage.getItem(LOC_KEY) || "default";
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const fromPath = safeInternalPath(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from"));

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) router.replace(homeForUser(user, fromPath));
  }, [loading, isAuthenticated, user, fromPath, router]);

  useEffect(() => {
    if (loading || isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(ONBOARDING_KEY) === "true") router.replace("/login/");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STEP_KEY, step);
  }, [step]);

  useEffect(() => {
    if (step !== "notif" || typeof window === "undefined") return;
    if (!("Notification" in window)) {
      const t = setTimeout(() => setNotifState("unsupported"), 0);
      return () => clearTimeout(t);
    }
    if (Notification.permission === "granted") {
      const t = setTimeout(() => { setNotifState("granted"); setStep("location"); }, 0);
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
      window.sessionStorage.removeItem(STEP_KEY);
    }
    router.replace("/login/");
  }, [router]);

  const skipIntro = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
      window.sessionStorage.removeItem(STEP_KEY);
    }
    router.replace("/");
  }, [router]);

  const allowNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifState("unsupported"); setStep("location"); return; }
    setBusy(true); setMessage("");
    try { const permission = await Notification.requestPermission(); setNotifState(permission); window.localStorage.setItem(NOTIF_KEY, permission); }
    catch { setNotifState("denied"); window.localStorage.setItem(NOTIF_KEY, "denied"); }
    finally { setBusy(false); setStep("location"); }
  }, []);

  const notNowNotifications = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(NOTIF_KEY, "dismissed");
    setNotifState("dismissed"); setStep("location");
  }, []);

  const allowLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocState("unsupported"); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "unsupported");
      completeOnboarding(); return;
    }
    setBusy(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      () => { setLocState("granted"); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "granted"); setBusy(false); completeOnboarding(); },
      (error) => { const value = error.code === 1 ? "denied" : "error"; setLocState(value); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, value); setBusy(false); completeOnboarding(); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [completeOnboarding]);

  const notNowLocation = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "dismissed");
    setLocState("dismissed"); completeOnboarding();
  }, [completeOnboarding]);

  if (loading) return <section className="onboarding-screen" aria-busy="true"><p>Loading…</p></section>;
  if (isAuthenticated) return null;

  if (step === "slide1") {
    return (
      <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label="Discover Your Next Adventure">
        <div className="onboarding-hero"><img src="/uploads/home/Zanzibar_trip.jpg" alt="Travel destinations" /></div>
        <div className="onboarding-dashes" role="group" aria-label="Slide 1 of 3">
          <button type="button" className="onboarding-dash active" aria-current="step" aria-label="Slide 1" />
          <button type="button" className="onboarding-dash" aria-label="Slide 2" onClick={() => setStep("slide2")} />
          <button type="button" className="onboarding-dash" aria-label="Slide 3" onClick={() => setStep("slide3")} />
        </div>
        <div className="onboarding-copy">
          <p className="onboarding-step-label">STEP 1 OF 3</p>
          <h1 className="onboarding-title">{SLIDE_META.slide1.title}</h1>
          <p className="onboarding-subtitle">{SLIDE_META.slide1.description}</p>
          <div className="onboarding-slide-actions">
            <button type="button" className="onboarding-back" onClick={skipIntro}>Skip Introduction</button>
            <button type="button" className="onboarding-cta" onClick={() => setStep("slide2")}>Get Started →</button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "slide2") {
    return (
      <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label="Your Journey Starts Here">
        <div className="onboarding-hero"><img src="/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg" alt="Safari experience" /></div>
        <div className="onboarding-dashes" role="group" aria-label="Slide 2 of 3">
          <button type="button" className="onboarding-dash active" aria-label="Slide 1" onClick={() => setStep("slide1")} />
          <button type="button" className="onboarding-dash active" aria-current="step" aria-label="Slide 2" />
          <button type="button" className="onboarding-dash" aria-label="Slide 3" onClick={() => setStep("slide3")} />
        </div>
        <div className="onboarding-copy">
          <p className="onboarding-step-label">STEP 2 OF 3</p>
          <h1 className="onboarding-title">{SLIDE_META.slide2.title}</h1>
          <p className="onboarding-subtitle">{SLIDE_META.slide2.description}</p>
          <ul className="onboarding-steps-list">
            <li><strong>Explore</strong> — Browse tours and safaris from different tourism companies.</li>
            <li><strong>Choose</strong> — Review the destination, itinerary, duration, price, and provider information available.</li>
            <li><strong>Request a Booking</strong> — Submit your travel details and track the request through the existing booking workflow.</li>
          </ul>
          <div className="onboarding-slide-actions">
            <button type="button" className="onboarding-back" onClick={() => setStep("slide1")}>Back</button>
            <button type="button" className="onboarding-cta" onClick={() => setStep("slide3")}>Continue →</button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "slide3") {
    return (
      <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label="Stay Updated and Discover Nearby">
        <div className="onboarding-hero"><img src="/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg" alt="Travel discovery" /></div>
        <div className="onboarding-dashes" role="group" aria-label="Slide 3 of 3">
          <button type="button" className="onboarding-dash active" aria-label="Slide 1" onClick={() => setStep("slide1")} />
          <button type="button" className="onboarding-dash active" aria-label="Slide 2" onClick={() => setStep("slide2")} />
          <button type="button" className="onboarding-dash active" aria-current="step" aria-label="Slide 3" />
        </div>
        <div className="onboarding-copy">
          <p className="onboarding-step-label">STEP 3 OF 3</p>
          <h1 className="onboarding-title">{SLIDE_META.slide3.title}</h1>
          <p className="onboarding-subtitle">{SLIDE_META.slide3.description}</p>
          <div className="onboarding-info-sections">
            <div className="onboarding-info-card"><h3>Notifications</h3><p>Receive relevant booking updates and other supported travel-related notifications.</p></div>
            <div className="onboarding-info-card"><h3>Location</h3><p>Help find nearby attractions, tours, services, and destinations where location-based discovery is supported.</p></div>
          </div>
          <div className="onboarding-slide-actions">
            <button type="button" className="onboarding-back" onClick={() => setStep("slide2")}>Back</button>
            <button type="button" className="onboarding-cta" onClick={() => setStep("notif")}>Continue →</button>
          </div>
        </div>
      </section>
    );
  }
  if (step === "notif") {
    return (
      <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label="Enable Travel Updates">
        <div className="onboarding-copy" style={{ width: "100%" }}>
          <div className="pwa-permission-icon" aria-hidden="true"><MessageSquare size={40} /></div>
          <p className="onboarding-step-label">NOTIFICATION PERMISSION</p>
          <h1 className="onboarding-title">Enable Travel Updates</h1>
          <p className="onboarding-subtitle">Allow notifications to receive relevant booking updates and other supported alerts.</p>
          {notifState === "denied" ? <p className="onboarding-subtitle">Notifications were denied. You can enable them later in your browser or device settings.</p> : null}
          {notifState === "unsupported" ? <p className="onboarding-subtitle">This browser does not support notifications. You can continue.</p> : null}
          {message ? <p className="onboarding-subtitle">{message}</p> : null}
          <div className="onboarding-slide-actions">
            <button type="button" className="onboarding-back" onClick={() => setStep("slide3")} disabled={busy}>Back</button>
            {notifState !== "unsupported" ? (
              <button type="button" className="onboarding-cta" onClick={allowNotifications} disabled={busy}>{busy ? "Requesting…" : "Allow Notifications"}</button>
            ) : (
              <button type="button" className="onboarding-cta" onClick={() => setStep("location")}>Continue →</button>
            )}
          </div>
          {notifState === "default" || notifState === "dismissed" || notifState === "denied" ? (
            <button type="button" className="onboarding-back" onClick={notNowNotifications} disabled={busy} style={{ marginTop: 8 }}>Not Now</button>
          ) : (
            <button type="button" className="onboarding-cta" onClick={() => setStep("location")} style={{ marginTop: 8 }}>Continue →</button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label="Discover Experiences Near You">
      <div className="onboarding-copy" style={{ width: "100%" }}>
        <div className="pwa-permission-icon" aria-hidden="true"><MapPin size={40} /></div>
        <p className="onboarding-step-label">LOCATION PERMISSION</p>
        <h1 className="onboarding-title">Discover Experiences Near You</h1>
        <p className="onboarding-subtitle">Share your location to help find nearby attractions, tours, and travel services when you use location-based discovery.</p>
        {locState === "denied" ? <p className="onboarding-subtitle">Location was denied. You can enable it later in your browser settings.</p> : null}
        {locState === "unsupported" ? <p className="onboarding-subtitle">This browser does not support location. You can continue.</p> : null}
        {message ? <p className="onboarding-subtitle">{message}</p> : null}
        <div className="onboarding-slide-actions">
          <button type="button" className="onboarding-back" onClick={() => setStep("notif")} disabled={busy}>Back</button>
          {locState !== "unsupported" ? (
            <button type="button" className="onboarding-cta" onClick={allowLocation} disabled={busy}>{busy ? "Requesting…" : "Allow Location"}</button>
          ) : (
            <button type="button" className="onboarding-cta" onClick={completeOnboarding}>Continue to sign in →</button>
          )}
        </div>
        {locState === "default" || locState === "dismissed" || locState === "denied" || locState === "error" ? (
          <button type="button" className="onboarding-back" onClick={notNowLocation} disabled={busy} style={{ marginTop: 8 }}>Not Now</button>
        ) : (
          <button type="button" className="onboarding-cta" onClick={completeOnboarding} style={{ marginTop: 8 }}>Continue to sign in →</button>
        )}
      </div>
    </section>
  );
}
