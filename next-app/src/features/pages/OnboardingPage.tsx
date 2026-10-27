"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePwa } from "@/hooks/usePwa";
import Link from "next/link";
import { Mail, Star } from "@/components/icons";

const COLLAGE = [
  { className: "collage-circle", src: "/uploads/tours/tour1.jpg", alt: "Travellers planning a route" },
  { className: "collage-pill", src: "/uploads/home/Zanzibar_trip.jpg", alt: "Zanzibar beach" },
  {
    className: "collage-pill-bottom",
    src: "/uploads/home/IMG-20250730-WA0031.jpg",
    alt: "Safari vehicle in the wild",
  },
  {
    className: "collage-blob",
    src: "/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg",
    alt: "Serengeti sunset",
  },
];

const STARS = [
  { top: "12%", left: "48%", size: 18 },
  { top: "38%", left: "6%", size: 13 },
  { top: "46%", right: "14%", size: 15 },
];

const SLIDES = [
  {
    src: "/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands.jpg",
    alt: "Traveller looking at the sea",
    title: "Welcome — first time here?",
    subtitle:
      "This is your first visit. Explore tours, safaris and local experiences from independent tourism companies, compare providers, and plan your trip with confidence.",
  },
  {
    src: "/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg",
    alt: "Sunset over the Serengeti",
    title: "How booking works",
    subtitle:
      "Browse experiences, compare what is included and who runs them, then send a booking request to the right company. The provider follows up with the details.",
  },
  {
    src: "/uploads/home/Zanzibar_trip.jpg",
    alt: "Zanzibar coastline",
    title: "Enable notifications & location",
    subtitle:
      "Allow notifications for booking updates and location for nearby recommendations. You will be asked to allow each permission next.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { isStandalone } = usePwa();
  const [screen, setScreen] = useState<"splash" | "welcome" | "slides">("splash");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isStandalone) router.replace("/");
    }, 200);
    return () => window.clearTimeout(timer);
  }, [isStandalone, router]);

  useEffect(() => {
    window.localStorage.setItem("travel_onboarding_seen", "true");
    const timer = window.setTimeout(() => setScreen("welcome"), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(async () => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      // Ignore permission errors and continue.
    }
    try {
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve());
        });
      }
    } catch {
      // Ignore permission errors and continue.
    }
    router.push("/login/");
  }, [router]);

  const continueWith = useCallback(
    (provider: "email" | "google" | "apple") => {
      if (provider === "email") {
        setScreen("slides");
        return;
      }
      router.push(`/login/?provider=${provider}`);
    },
    [router],
  );

  if (screen === "splash") {
    return (
      <section className="onboarding-splash" aria-label="Travel is getting ready" role="status">
        <div className="splash-orbit splash-orbit-one" />
        <div className="splash-orbit splash-orbit-two" />
        <div className="splash-glass-mark"><span aria-hidden="true">T.</span></div>
        <p className="splash-wordmark">Travel<span>.</span></p>
        <p className="splash-caption">Discover places. Meet local providers.</p>
        <div className="splash-progress" aria-hidden="true"><span /></div>
      </section>
    );
  }

  if (screen === "welcome") {
    return (
      <section className="onboarding-screen onboarding-welcome onboarding-welcome-redesign" aria-label="Welcome to Travel">
        <div className="onboarding-collage">
          {COLLAGE.map((item) => (
            <div key={item.className} className={`collage-item ${item.className}`}>
              <img src={item.src} alt={item.alt} />
            </div>
          ))}
          {STARS.map((star, index) => (
            <Star
              key={index}
              className="onboarding-star"
              style={{ top: star.top, left: star.left, right: star.right, width: star.size, height: star.size }}
              fill="currentColor"
              aria-hidden="true"
            />
          ))}
        </div>

        <Link className="onboarding-skip" href="/">Explore as guest</Link>

        <div className="onboarding-copy">
          <p className="onboarding-welcome-kicker">TOURS · SAFARIS · LOCAL EXPERIENCES</p>
          <h1 className="onboarding-title">A world of local experiences.</h1>
          <p className="onboarding-subtitle">Discover independent tourism companies, compare their experiences, and send your booking request in one place.</p>
          <div className="onboarding-account-actions">
            <Link className="onboarding-cta onboarding-account-primary" href="/register">Create an account <span aria-hidden="true">→</span></Link>
            <Link className="onboarding-cta onboarding-account-secondary" href="/login">Sign in</Link>
          </div>
          <button type="button" className="onboarding-cta" onClick={() => continueWith("email")}>
            <span className="onboarding-cta-label">
              <Mail size={18} aria-hidden="true" /> See how it works
            </span>
          </button>
        </div>
      </section>
    );
  }

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <section className="onboarding-screen onboarding-slides onboarding-slides-redesign" aria-label={`Explore the world, slide ${slide + 1} of ${SLIDES.length}`}>
      <Link className="onboarding-slide-skip" href="/">Browse as guest</Link>
      <div className="onboarding-hero">
        <img src={current.src} alt={current.alt} />
      </div>

      <div className="onboarding-dashes" role="group" aria-label={`Slide ${slide + 1} of ${SLIDES.length}`}>
        {SLIDES.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className={`onboarding-dash${index === slide ? " active" : ""}`}
            aria-label={`Go to slide ${index + 1}: ${item.title}`}
            aria-current={index === slide ? "step" : undefined}
            onClick={() => setSlide(index)}
          />
        ))}
      </div>

      <div className="onboarding-copy">
        <p className="onboarding-step-label">STEP {slide + 1} OF {SLIDES.length}</p>
        <h1 className="onboarding-title">{current.title}</h1>
        <p className="onboarding-subtitle">{current.subtitle}</p>
        <div className="onboarding-slide-actions">
          {slide > 0 ? (
            <button type="button" className="onboarding-back" onClick={() => setSlide((index) => index - 1)}>
              Back
            </button>
          ) : <span />}
          <button
            type="button"
            className="onboarding-cta"
            onClick={() => (isLast ? finish() : setSlide((index) => index + 1))}
          >
            {isLast ? "Continue to sign in →" : "Continue →"}
          </button>
        </div>
      </div>
    </section>
  );
}
