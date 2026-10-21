"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    title: "Explore The World",
    subtitle:
      "Find trips that match your pace, from quiet island mornings to wide-open safari evenings.",
  },
  {
    src: "/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg",
    alt: "Sunset over the Serengeti",
    title: "Travel At Your Own Pace",
    subtitle:
      "Hand-picked stays, guides and experiences for every kind of traveller and every budget.",
  },
  {
    src: "/uploads/home/Zanzibar_trip.jpg",
    alt: "Zanzibar coastline",
    title: "Your Next Story Starts Here",
    subtitle:
      "Save favourites, plan with friends and confirm your booking in just a few taps.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [screen, setScreen] = useState<"splash" | "welcome" | "slides">("splash");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    window.localStorage.setItem("travel_onboarding_seen", "true");
    const timer = window.setTimeout(() => setScreen("welcome"), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    router.push("/register/");
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
        <p className="splash-caption">A little closer to somewhere wonderful</p>
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
          <p className="onboarding-welcome-kicker">ZANZIBAR · TANZANIA · BEYOND</p>
          <h1 className="onboarding-title">Somewhere new<br />is calling.</h1>
          <p className="onboarding-subtitle">Find your kind of escape, with local experts by your side.</p>
          <div className="onboarding-account-actions">
            <Link className="onboarding-cta onboarding-account-primary" href="/register">Create account <span aria-hidden="true">→</span></Link>
            <Link className="onboarding-cta onboarding-account-secondary" href="/login">Sign in</Link>
          </div>
          <button type="button" className="onboarding-cta" onClick={() => continueWith("email")}>
            <span className="onboarding-cta-label">
              <Mail size={18} aria-hidden="true" /> Take a quick look
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
        <h1 className="onboarding-title">{current.title}</h1>
        <p className="onboarding-subtitle">{current.subtitle}</p>
        <button
          type="button"
          className="onboarding-cta"
          onClick={() => (isLast ? finish() : setSlide((index) => index + 1))}
        >
          {isLast ? "Create your account →" : "Next →"}
        </button>
      </div>
    </section>
  );
}
