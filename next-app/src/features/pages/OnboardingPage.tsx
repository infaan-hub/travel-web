"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Star } from "lucide-react";

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
  const [screen, setScreen] = useState<1 | 2>(1);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    window.localStorage.setItem("travel_onboarding_seen", "true");
  }, []);

  const finish = useCallback(() => {
    router.push("/register/");
  }, [router]);

  const continueWith = useCallback(
    (provider: "email" | "google" | "apple") => {
      if (provider === "email") {
        // The email action continues through the onboarding.
        setScreen(2);
        return;
      }
      router.push(`/login/?provider=${provider}`);
    },
    [router],
  );

  if (screen === 1) {
    return (
      <section className="onboarding-screen onboarding-welcome" aria-label="Welcome to Travel">
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

        <button type="button" className="onboarding-skip" onClick={() => router.push("/")}>
          Skip
        </button>

        <div className="onboarding-copy">
          <h1 className="onboarding-title">Start Exploring The World</h1>
          <button type="button" className="onboarding-cta" onClick={() => continueWith("email")}>
            <span className="onboarding-cta-label">
              <Mail size={18} aria-hidden="true" /> Continue with Email
            </span>
          </button>

          <div className="onboarding-divider">or continue with</div>

          <div className="onboarding-socials">
            <button type="button" className="onboarding-social" onClick={() => continueWith("google")}>
              Google
            </button>
            <button type="button" className="onboarding-social" onClick={() => continueWith("apple")}>
              Apple
            </button>
          </div>
        </div>
      </section>
    );
  }

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <section className="onboarding-screen onboarding-slides" aria-label="Explore the world">
      <div className="onboarding-hero">
        <img src={current.src} alt={current.alt} />
      </div>

      <div className="onboarding-dashes" role="tablist" aria-label="Slides">
        {SLIDES.map((item, index) => (
          <span
            key={item.title}
            className={`onboarding-dash${index === slide ? " active" : ""}`}
            role="tab"
            aria-selected={index === slide}
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
          {isLast ? "Get Started" : "Next"}
        </button>
      </div>
    </section>
  );
}
