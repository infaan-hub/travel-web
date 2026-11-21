"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Car,
  Clock,
  Compass,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Shield,
} from "@/components/icons";
import styles from "@/features/pages/contact-page.module.css";

interface PathwayItem {
  id: string;
  href: string;
  variant: "ocean" | "indigo" | "emerald";
  badge: string;
  kicker: string;
  title: string;
  description: string;
  facts: readonly string[];
  cta: string;
}

const PATHWAYS: readonly PathwayItem[] = [
  {
    id: "support",
    href: "/contact/support/",
    variant: "ocean",
    badge: "Travelers · 24h",
    kicker: "General Support",
    title: "General Support & Inquiries",
    description:
      "Ask about Zanzibar airport transfers, private hire availability, custom island routes, or updates to an existing booking.",
    facts: ["Booking help", "Route advice", "Reply within 24h"],
    cta: "Open support form",
  },
  {
    id: "company",
    href: "/request/company/",
    variant: "indigo",
    badge: "Fleet owners",
    kicker: "Company Onboarding",
    title: "Register Transport Company",
    description:
      "List your Zanzibar private hire fleet, publish vehicles and curated trips, and manage bookings in a dedicated company workspace.",
    facts: ["Verified profile", "Fleet workspace", "Admin review"],
    cta: "Register company",
  },
  {
    id: "driver",
    href: "/request/driver/",
    variant: "emerald",
    badge: "Licensed drivers",
    kicker: "Driver Network",
    title: "Join as Public Hire Driver",
    description:
      "Licensed driver with ZanID, NIDA, or Passport? Submit your driving credentials and set up your driver login for admin approval.",
    facts: ["ZanID / NIDA", "Direct dispatch", "Admin approval"],
    cta: "Apply as driver",
  },
];

const QUICK_LINKS = [
  {
    href: "/transport/",
    label: "Private Hire Fleet",
    caption: "Compare Zanzibar vehicles & rates",
    icon: Car,
  },
  {
    href: "/companies/",
    label: "Zanzibar Companies",
    caption: "Browse verified local providers",
    icon: Building2,
  },
  {
    href: "/trips/",
    label: "Plan & Measure Trips",
    caption: "Routes, distances & highlights",
    icon: Compass,
  },
  {
    href: "/booking/create/",
    label: "Book Custom Transfer",
    caption: "Request pickup anywhere on the island",
    icon: Navigation,
  },
] as const;

function renderPathwayIcon(id: string) {
  if (id === "company") return <Building2 size={21} aria-hidden="true" />;
  if (id === "driver") return <UserCheck size={21} aria-hidden="true" />;
  return <Mail size={21} aria-hidden="true" />;
}

export default function ContactPage() {
  const router = useRouter();

  // Preserve legacy deep links such as /contact/?tab=company or /contact/#company
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab")?.toLowerCase();
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();

    if (tabParam === "company" || hash === "company" || hash === "company-registration") {
      router.replace("/request/company/");
    } else if (tabParam === "driver" || hash === "driver") {
      router.replace("/request/driver/");
    } else if (tabParam === "inquiry" || tabParam === "support" || hash === "support") {
      router.replace("/contact/support/");
    }
  }, [router]);

  return (
    <div id="contact-hub-root" className={`page ${styles.page}`}>
      <div className={styles.content}>
        {/* COMPACT EDITORIAL HUB HEADER */}
        <header className={styles.hubHeader}>
          <span className={styles.hubEyebrow}>
            <MessageSquare size={13} aria-hidden="true" />
            Support &amp; partner onboarding
          </span>
          <h1 className={styles.hubTitle}>How can we help you today?</h1>
          <p className={styles.hubLead}>
            Every request has its own dedicated page. Choose whether you want to message our
            Zanzibar support desk, register a transport company, or apply as a Public Hire Driver.
          </p>
          <div className={styles.trustPills}>
            <span className={styles.trustPill}>
              <Clock size={14} aria-hidden="true" />
              <strong>24h</strong> typical reply
            </span>
            <span className={styles.trustPill}>
              <Shield size={14} aria-hidden="true" />
              <strong>Verified</strong> fleet &amp; driver onboarding
            </span>
            <span className={styles.trustPill}>
              <MapPin size={14} aria-hidden="true" />
              <strong>Zanzibar</strong> island-wide coverage
            </span>
          </div>
        </header>

        {/* DEDICATED FORM PATHWAY CARDS */}
        <section className={styles.pathwaysSection} aria-labelledby="contact-pathways-heading">
          <div className={styles.sectionHead}>
            <span id="contact-pathways-heading" className={styles.sectionEyebrow}>
              Choose a dedicated form
            </span>
            <p className={styles.sectionHint}>Each option opens its own focused form page.</p>
          </div>

          <div className={styles.fpGrid}>
            {PATHWAYS.map((pathway) => {
              const variantClass =
                pathway.variant === "indigo"
                  ? styles.fpCardIndigo
                  : pathway.variant === "emerald"
                    ? styles.fpCardEmerald
                    : styles.fpCardOcean;

              return (
                <Link
                  key={pathway.id}
                  href={pathway.href}
                  className={`${styles.fpCard} ${variantClass}`}
                >
                  <div className={styles.fpTopScrim} aria-hidden="true" />
                  <div className={styles.fpTopBar}>
                    <span className={styles.fpIconPill}>{renderPathwayIcon(pathway.id)}</span>
                    <span className={styles.fpGlassBadge}>{pathway.badge}</span>
                  </div>

                  <div className={styles.fpSheet}>
                    <div className={styles.fpCopy}>
                      <span
                        className={`${styles.fpKicker} ${
                          pathway.variant === "emerald" ? styles.fpKickerEmerald : ""
                        }`}
                      >
                        {pathway.kicker}
                      </span>
                      <h2 className={styles.fpTitle}>{pathway.title}</h2>
                      <p className={styles.fpDesc}>{pathway.description}</p>
                    </div>

                    <div className={styles.fpFacts} aria-label={`${pathway.title} highlights`}>
                      {pathway.facts.map((fact) => (
                        <span key={fact} className={styles.fpFactChip}>
                          {fact}
                        </span>
                      ))}
                    </div>

                    <div className={styles.fpFooter}>
                      <span className={styles.fpPrimaryBtn}>
                        {pathway.cta}
                        <ArrowRight size={15} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* EXPECTATIONS & DIRECT BOOKING SHORTCUTS */}
        <section className={styles.infoGrid} aria-label="Support expectations and quick shortcuts">
          <article className={`${styles.infoCard} ${styles.infoCardTinted}`}>
            <span className={styles.sectionEyebrow}>What to expect</span>
            <h2 className={styles.infoTitle}>How requests are handled</h2>
            <ul className={styles.expectList}>
              <li className={styles.expectItem}>
                <span className={styles.expectIcon} aria-hidden="true">
                  <Clock size={16} />
                </span>
                <div className={styles.expectCopy}>
                  <strong>Fast traveler support</strong>
                  <span>
                    General inquiries go straight to our Zanzibar support desk and are typically
                    answered within 24 hours.
                  </span>
                </div>
              </li>
              <li className={styles.expectItem}>
                <span className={styles.expectIcon} aria-hidden="true">
                  <Building2 size={16} />
                </span>
                <div className={styles.expectCopy}>
                  <strong>Company account verification</strong>
                  <span>
                    Our admin team reviews your Zanzibar fleet and contact details before
                    activating your public directory profile.
                  </span>
                </div>
              </li>
              <li className={styles.expectItem}>
                <span className={styles.expectIcon} aria-hidden="true">
                  <UserCheck size={16} />
                </span>
                <div className={styles.expectCopy}>
                  <strong>Licensed driver onboarding</strong>
                  <span>
                    Drivers submit ZanID, NIDA, or Passport credentials on the driver application
                    page so admins can verify and activate their login.
                  </span>
                </div>
              </li>
            </ul>
          </article>

          <article className={styles.infoCard}>
            <span className={styles.sectionEyebrow}>Quick links</span>
            <h2 className={styles.infoTitle}>Looking to book right away?</h2>
            <p className={styles.infoLead}>
              Jump straight to live private hire vehicles, verified Zanzibar transport companies,
              or route planning tools.
            </p>
            <div className={styles.quickGrid}>
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={styles.shortcutLink}>
                    <span className={styles.shortcutLeft}>
                      <span className={styles.shortcutIcon} aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className={styles.shortcutCopy}>
                        <strong>{item.label}</strong>
                        <span>{item.caption}</span>
                      </span>
                    </span>
                    <ArrowRight size={15} className={styles.shortcutArrow} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
