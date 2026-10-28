"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, MapPin } from "@/components/icons";

const ONBOARDING_KEY = "travel_onboarding_seen";
const STEP_KEY = "travel_onboarding_step";
const NOTIF_KEY = "travel_notification_permission";
const LOC_KEY = "travel_location_permission";

type Step = "slide1" | "slide2" | "slide3" | "notif" | "location";

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
function Title({ text }: { text: string }) {
  return <>{text.split("\n").map((line, index) => (<span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>))}</>;
}
function Card({ image, title, description, children, buttonLabel, onContinue }: { image: string; title: string; description: string; children?: React.ReactNode; buttonLabel: string; onContinue: () => void; }) {
  return (
    <main className="onboarding-screen">
      <section className="onboarding-card" aria-label={title.replace(/\n/g, " ")}>
        <img className="onboarding-image" src={image} alt="" />
        <div className="onboarding-image-overlay" aria-hidden="true" />
        <div className="onboarding-progress-dots" aria-hidden="true"><span className="active" /><span /><span /></div>
        <div className="onboarding-content">
          <h1 className="onboarding-title"><Title text={title} /></h1>
          <p className="onboarding-description">{description}</p>
          {children}
        </div>
        <button type="button" className="onboarding-primary-button" onClick={onContinue}>{buttonLabel}</button>
      </section>
    </main>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "slide1";
    const stored = window.sessionStorage.getItem(STEP_KEY) as Step | null;
    return stored && ["slide1", "slide2", "slide3", "notif", "location"].includes(stored) ? stored : "slide1";
  });
  const [notifState, setNotifState] = useState<string>(() => typeof window === "undefined" ? "default" : (window.localStorage.getItem(NOTIF_KEY) || "default"));
  const [locState, setLocState] = useState<string>(() => typeof window === "undefined" ? "default" : (window.localStorage.getItem(LOC_KEY) || "default"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fromPath = safeInternalPath(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from"));

  useEffect(() => { if (loading) return; if (isAuthenticated) router.replace(homeForUser(user, fromPath)); }, [loading, isAuthenticated, user, fromPath, router]);
  useEffect(() => { if (loading || isAuthenticated) return; if (typeof window === "undefined") return; if (window.localStorage.getItem(ONBOARDING_KEY) === "true") router.replace("/login/"); }, [loading, isAuthenticated, router]);
  useEffect(() => { if (typeof window === "undefined") return; window.sessionStorage.setItem(STEP_KEY, step); }, [step]);
  useEffect(() => {
    if (step !== "notif" || typeof window === "undefined") return;
    if (!("Notification" in window)) { const t = setTimeout(() => setNotifState("unsupported"), 0); return () => clearTimeout(t); }
    if (Notification.permission === "granted") { const t = setTimeout(() => { setNotifState("granted"); setStep("location"); }, 0); return () => clearTimeout(t); }
  }, [step]);
  useEffect(() => {
    if (step !== "location" || typeof window === "undefined") return;
    if (!("geolocation" in navigator)) { const t = setTimeout(() => setLocState("unsupported"), 0); return () => clearTimeout(t); }
  }, [step]);

  const completeOnboarding = useCallback(() => { if (typeof window !== "undefined") { window.localStorage.setItem(ONBOARDING_KEY, "true"); window.sessionStorage.removeItem(STEP_KEY); } router.replace("/login/"); }, [router]);
  const skipIntro = useCallback(() => { if (typeof window !== "undefined") { window.localStorage.setItem(ONBOARDING_KEY, "true"); window.sessionStorage.removeItem(STEP_KEY); } router.replace("/"); }, [router]);

  const allowNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifState("unsupported"); setStep("location"); return; }
    setBusy(true); setMessage("");
    try { const permission = await Notification.requestPermission(); setNotifState(permission); window.localStorage.setItem(NOTIF_KEY, permission); }
    catch { setNotifState("denied"); window.localStorage.setItem(NOTIF_KEY, "denied"); }
    finally { setBusy(false); setStep("location"); }
  }, []);
  const notNowNotifications = useCallback(() => { if (typeof window !== "undefined") window.localStorage.setItem(NOTIF_KEY, "dismissed"); setNotifState("dismissed"); setStep("location"); }, []);
  const allowLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) { setLocState("unsupported"); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "unsupported"); completeOnboarding(); return; }
    setBusy(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      () => { setLocState("granted"); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "granted"); setBusy(false); completeOnboarding(); },
      (error) => { const value = error.code === 1 ? "denied" : "error"; setLocState(value); if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, value); setBusy(false); completeOnboarding(); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [completeOnboarding]);
  const notNowLocation = useCallback(() => { if (typeof window !== "undefined") window.localStorage.setItem(LOC_KEY, "dismissed"); setLocState("dismissed"); completeOnboarding(); }, [completeOnboarding]);

  if (loading) return <main className="onboarding-screen"><p style={{ color: "#fff" }}>Loading…</p></main>;
  if (isAuthenticated) return null;

  if (step === "slide1") {
    return (
      <Card image="/uploads/home/Zanzibar_trip.jpg" title="Explore\nTravel\nInspire" description="Life is all about journeys. Find yours." buttonLabel="Get Started" onContinue={() => setStep("slide2")}>
        <div className="onboarding-progress-dots" aria-hidden="true"><span className="active" /><span /><span /></div>
      </Card>
    );
  }
  if (step === "slide2") {
    return (
      <Card image="/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg" title="Find\nYour Perfect\nAdventure" description="Explore tours and safaris, choose your experience, and send a booking request with ease." buttonLabel="Continue" onContinue={() => setStep("slide3")}>
        <ul className="onboarding-steps-list">
          <li><strong>01 — Explore</strong> Discover tours, safaris, and excursions offered by different tourism companies.</li>
          <li><strong>02 — Choose</strong> Review the destination, itinerary, duration, available pricing, and provider details.</li>
          <li><strong>03 — Request</strong> Submit your booking request and track its progress through the existing booking workflow.</li>
        </ul>
      </Card>
    );
  }
  if (step === "slide3") {
    return (
      <Card image="/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg" title="Stay\nConnected\nExplore More" description="Get useful booking updates and discover nearby travel experiences when you choose to share your location." buttonLabel="Continue" onContinue={() => setStep("notif")}>
        <div className="onboarding-info-sections">
          <div className="onboarding-info-card"><h3>Travel Updates</h3><p>Receive relevant booking notifications and supported travel alerts.</p></div>
          <div className="onboarding-info-card"><h3>Nearby Discovery</h3><p>Use your location to discover nearby attractions and tourism services where available.</p></div>
        </div>
      </Card>
    );
  }
  if (step === "notif") {
    return (
      <Card image="/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg" title="Never Miss\nan Update" description="Allow notifications to receive relevant booking updates and other supported travel alerts." buttonLabel={busy ? "Requesting…" : (notifState !== "unsupported" ? "Allow Notifications" : "Continue")} onContinue={notifState !== "unsupported" ? allowNotifications : () => setStep("location")}>
        <div className="onboarding-icon-row"><MessageSquare size={18} /> <span>Travel Updates</span></div>
        {notifState === "denied" ? <p className="onboarding-description">Notifications were denied. You can enable them later in your browser or device settings.</p> : null}
        {notifState === "unsupported" ? <p className="onboarding-description">This browser does not support notifications. You can continue.</p> : null}
        {message ? <p className="onboarding-description">{message}</p> : null}
        {notifState === "default" || notifState === "dismissed" || notifState === "denied" ? (
          <button type="button" className="onboarding-back" onClick={notNowNotifications} disabled={busy} style={{ position: "relative", marginTop: 8 }}>Not Now</button>
        ) : (
          <button type="button" className="onboarding-back" onClick={() => setStep("location")} style={{ position: "relative", marginTop: 8 }}>Continue →</button>
        )}
      </Card>
    );
  }
  return (
    <Card image="/uploads/home/Zanzibar_trip.jpg" title="Discover\nWhat's Nearby" description="Allow location access to help find nearby attractions, tours, and travel services." buttonLabel={busy ? "Requesting…" : (locState !== "unsupported" ? "Allow Location" : "Continue to sign in")} onContinue={locState !== "unsupported" ? allowLocation : completeOnboarding}>
      <div className="onboarding-icon-row"><MapPin size={18} /> <span>Nearby Discovery</span></div>
      {locState === "denied" ? <p className="onboarding-description">Location was denied. You can enable it later in your browser settings.</p> : null}
      {locState === "unsupported" ? <p className="onboarding-description">This browser does not support location. You can continue.</p> : null}
      {message ? <p className="onboarding-description">{message}</p> : null}
      {locState === "default" || locState === "dismissed" || locState === "denied" || locState === "error" ? (
        <button type="button" className="onboarding-back" onClick={notNowLocation} disabled={busy} style={{ position: "relative", marginTop: 8 }}>Not Now</button>
      ) : (
        <button type="button" className="onboarding-back" onClick={completeOnboarding} style={{ position: "relative", marginTop: 8 }}>Continue to sign in →</button>
      )}
    </Card>
  );
}
