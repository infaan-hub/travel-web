"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from "next/image";
import { toursAPI, homeSettingsAPI, reviewsAPI, publicCompaniesAPI, publicPrivateHireAPI } from '@/lib/api/client';
import { ArrowRight, Star, Send, X, Car, Users, Briefcase, Shield, Compass, Navigation, Building2, CheckCircle, MapPin } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';
import { readClientCache, writeClientCache } from '@/lib/cache/client-cache';
import { useAuth } from '@/context/AuthContext';

import { useToast } from "@/components/ToastProvider";
import BentoHero from "@/components/BentoHero";
import MoreExperiencesEmptyState from "@/components/MoreExperiencesEmptyState";
import styles from "@/features/pages/home-page.module.css";

import type { HomeSettings, Review, Tour } from "@/features/pages/types";
import { PRICING_LABELS, SAMPLE_PRIVATE_HIRE_SERVICES } from "@/features/transport/private-hire-data";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";

type FeaturedCompany = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url?: string | null;
  locality: string | null;
  district?: string | null;
  region: string | null;
  country?: string | null;
  public_path: string;
  services_count: number;
  trips_count: number;
  services?: Array<{ id: number }>;
};

function uniqueSampleServicesByCompany(limit = 4) {
  const seen = new Set<number>();
  const picked: typeof SAMPLE_PRIVATE_HIRE_SERVICES = [];
  for (const svc of SAMPLE_PRIVATE_HIRE_SERVICES) {
    const cid = svc.company?.id;
    if (cid != null) {
      if (seen.has(cid)) continue;
      seen.add(cid);
    }
    picked.push(svc);
    if (picked.length >= limit) break;
  }
  return picked;
}

function getCompanyInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "TP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatCompanyLocation(company: FeaturedCompany): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of [company.locality, company.district, company.region, company.country]) {
    const cleaned = value?.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(cleaned);
    if (parts.length >= 2) break;
  }
  return parts.join(", ") || "Zanzibar, Tanzania";
}

export default function HomePage() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [allTours, setAllTours] = useState<Tour[]>(() => readClientCache<Tour[]>("travel.homeTours") ?? []);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(() => readClientCache<HomeSettings>("travel.homeSettings"));
  const [reviews, setReviews] = useState<Review[]>(() => readClientCache<Review[]>("travel.homeReviews") ?? []);
  const [companies, setCompanies] = useState<FeaturedCompany[]>(() => readClientCache<FeaturedCompany[]>("travel.homeCompanies") ?? []);
  const [privateServices, setPrivateServices] = useState<any[]>(() => readClientCache<any[]>("travel.homeFeaturedPrivateServices.v1") ?? []);
  const [livePrivateServices, setLivePrivateServices] = useState<any[]>(() => readClientCache<any[]>("travel.homeLivePrivateServices.v1") ?? []);
  const [loading, setLoading] = useState<boolean>(() => !(
    readClientCache<Tour[]>("travel.homeTours") ||
    readClientCache<HomeSettings>("travel.homeSettings") ||
    readClientCache<Review[]>("travel.homeReviews") ||
    readClientCache<FeaturedCompany[]>("travel.homeCompanies")
  ));
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const router = useRouter();

  const companyServiceOptions = livePrivateServices.filter((svc) => svc && typeof svc.id === "number");

  // Cache hydration is handled by lazy state initializers above.

  useEffect(() => {
    publicPrivateHireAPI.getAll({ featured_home: "1", limit: 4 })
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) {
          setLivePrivateServices(list);
          writeClientCache("travel.homeLivePrivateServices.v1", list);
        }
        const services = list.length ? list.slice(0, 4) : uniqueSampleServicesByCompany(4);
        setPrivateServices(services);
        writeClientCache("travel.homeFeaturedPrivateServices.v1", services);
      })
      .catch(() => {
        setPrivateServices(uniqueSampleServicesByCompany(4));
      });
  }, []);

  useEffect(() => {
    void Promise.allSettled([
      toursAPI.getAll({}),
      homeSettingsAPI.get(),
      reviewsAPI.getAll({ status: 'approved' }),
      publicCompaniesAPI.getAll({ page: 1, page_size: 50 }),
    ]).then(([toursRes, homeRes, reviewsRes, companiesRes]) => {
      const readList = (value: unknown) => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object" && "results" in value && Array.isArray(value.results)) return value.results;
        return [];
      };
      if (toursRes.status === "fulfilled") {
        const tours = readList(toursRes.value.data) as Tour[];
        setAllTours(tours);
        writeClientCache("travel.homeTours", tours);
      }
      else console.error(toursRes.reason);
      if (homeRes.status === "fulfilled") {
        const settings = homeRes.value.data as HomeSettings;
        setHomeSettings(settings);
        writeClientCache("travel.homeSettings", settings);
        try {
          window.localStorage.setItem("travel.homeSettings", JSON.stringify(settings));
        } catch {
          // Ignore storage failures and keep the in-memory settings.
        }
      }
      else console.error(homeRes.reason);
      if (reviewsRes.status === "fulfilled") {
        const reviews = readList(reviewsRes.value.data) as Review[];
        setReviews(reviews);
        writeClientCache("travel.homeReviews", reviews);
      }
      else console.error(reviewsRes.reason);
      if (companiesRes.status === "fulfilled") {
        const publicCompanyList = readList(companiesRes.value.data) as FeaturedCompany[];
        setCompanies(publicCompanyList.slice(0, 6));
        writeClientCache("travel.homeCompanies", publicCompanyList.slice(0, 6));
      } else {
        console.error(companiesRes.reason);
      }
      setLoading(false);
    });
  }, []);

  const handleReviewSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) { toast.error('Review message is required'); return; }
    setReviewSaving(true);
    try {
      await reviewsAPI.create({
        rating: reviewForm.rating,
        content: reviewForm.content.trim(),
      });
      setReviewSuccess('Thank you! Your review has been submitted and will appear after approval.');
      setReviewForm({ rating: 5, content: '' });
      setTimeout(() => setReviewSuccess(''), 5000);
      setShowReviewForm(false);
    } catch { toast.error('Failed to submit review. Please try again.'); }
    finally { setReviewSaving(false); }
  };

  if (loading) {
    return (
      <div className="page-skeleton" aria-busy="true" aria-live="polite">
        <div className="page-skeleton__hero" />
        <div className="page-skeleton__grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="page-skeleton__card">
              <div className="page-skeleton__image" />
              <div className="page-skeleton__line page-skeleton__line--title" />
              <div className="page-skeleton__line" />
              <div className="page-skeleton__line page-skeleton__line--short" />
            </div>
          ))}
        </div>
        <style>{`
          .page-skeleton { padding: 24px; max-width: 1200px; margin: 0 auto; }
          .page-skeleton__hero { height: 260px; border-radius: 20px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 24px; }
          .page-skeleton__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
          .page-skeleton__card { padding: 12px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
          .page-skeleton__image { height: 150px; border-radius: 12px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 12px; }
          .page-skeleton__line { height: 12px; border-radius: 999px; background: #e2e8f0; margin-bottom: 8px; }
          .page-skeleton__line--title { height: 16px; width: 70%; }
          .page-skeleton__line--short { width: 45%; }
          @keyframes page-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`page home-page ${styles.homePageRoot}`}>
      <BentoHero
        mainImage={homeSettings?.hero_image_url}
        secondImage={homeSettings?.hero_secondary_image_url || homeSettings?.zanzibar_image_url}
        featuredImage={homeSettings?.hero_feature_image_url}
        thumbImage={homeSettings?.hero_thumb_image_url}
        featuredTour={allTours.find((tour) => tour.featured) || allTours[0] || null}
      />

      <section className={styles.tripsSection} aria-labelledby="home-trips-heading">
        <div className={styles.tripsHeader}>
          <div className={styles.tripsHeading}>
            <span className={styles.tripsEyebrow}>
              <Compass size={14} aria-hidden="true" /> Trips
            </span>
            <h2 id="home-trips-heading" className={styles.tripsTitle}>
              Request your private hire trip
            </h2>
          </div>
        </div>

        <div className={styles.tripsGrid}>
          {/* Card 1: Open Public Private Hire Request -> /booking/create/ */}
          <article className={`${styles.tripOptionCard} ${styles.tripOptionCardPublic}`}>
            <div className={styles.tripOptionTop}>
              <span className={styles.tripOptionIconLight} aria-hidden="true">
                <Navigation size={18} />
              </span>
              <span className={styles.tripOptionBadgeLight}>Open private hire request</span>
            </div>

            <div className={styles.tripOptionCopy}>
              <h3 className={styles.tripOptionTitleLight}>Request Private hire Transport</h3>
              <p className={styles.tripOptionDescLight}>
                Set your pickup, destination, and schedule once — approved drivers confirm your
                private hire trip directly.
              </p>
            </div>

            <ul className={styles.tripOptionListLight}>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                Pick any pickup &amp; drop-off with live route distance
              </li>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                Notifies nearby drivers automatically when you are in Unguja
              </li>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                No upfront payment required
              </li>
            </ul>

            <div className={styles.tripOptionFooter}>
              <Link href="/booking/create/" className={styles.tripActionLight}>
                <span className={styles.tripActionLabelFull}>Request Private hire Transport</span>
                <span className={styles.tripActionLabelShort}>Request now</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>

          {/* Card 2: Specific Company Private Hire Request -> /companies/ */}
          <article className={`${styles.tripOptionCard} ${styles.tripOptionCardCompany}`}>
            <div className={styles.tripOptionTop}>
              <span className={styles.tripOptionIconDark} aria-hidden="true">
                <Building2 size={18} />
              </span>
              <span className={styles.tripOptionBadgeDark}>Specific company</span>
            </div>

            <div className={styles.tripOptionCopy}>
              <h3 className={styles.tripOptionTitleDark}>
                Request Private hire Transport by specific company
              </h3>
              <p className={styles.tripOptionDescDark}>
                Browse verified local companies, view all their private hire services, and select a
                vehicle to book directly.
              </p>
            </div>

            <ul className={styles.tripOptionListDark}>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                View all private hire services offered by each company
              </li>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                Compare dedicated vehicles and upfront starting prices
              </li>
              <li>
                <CheckCircle size={15} aria-hidden="true" />
                Select a service to go straight to direct booking
              </li>
            </ul>

            <div className={styles.tripOptionFooter}>
              <Link href="/companies/" className={styles.tripActionDark}>
                <span className={styles.tripActionLabelFull}>Request by specific company</span>
                <span className={styles.tripActionLabelShort}>By company</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>


      <section className={styles.hireSection} aria-labelledby="home-private-hire-heading">
        <div className={styles.hireHeader}>
          <div className={styles.hireHeading}>
            <span className={styles.hireEyebrow}>
              <Car size={14} aria-hidden="true" /> Private hire
            </span>
            <h2 id="home-private-hire-heading" className={styles.hireTitle}>
              Private hire for your journey
            </h2>
          </div>
          <Link href="/transport/" className={styles.hireBrowse}>
            Browse vehicles <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {privateServices.length > 0 ? (
          <ul
            className={`${styles.hireGrid} ${
              privateServices.length === 1
                ? styles.hireGridSingle
                : privateServices.length === 2
                  ? styles.hireGridDouble
                  : privateServices.length === 3
                    ? styles.hireGridTriple
                    : ""
            }`}
          >
            {privateServices.slice(0, 4).map((svc) => {
              const vehicle = svc.vehicle ?? {};
              const vehicleName: string = vehicle.name ?? "Private vehicle";
              const plateNumber: string = vehicle.plate_number ?? vehicle.plateNumber ?? "";
              const category: string = vehicle.category ?? "";
              const companyName: string = svc.company?.name ?? "";
              const companyLogo: string | null = svc.company?.logo_image_url ?? null;
              const capacityPax = Number(vehicle.capacity ?? 0);
              const luggageBags = Number(vehicle.luggage_capacity ?? vehicle.luggageCapacity ?? 0);
              const imageUrl: string | null = vehicle.front_image_url || vehicle.frontImage || null;
              const pricingKey: string = svc.pricing_type ?? svc.pricingType ?? "per_trip";
              const pricingLabel = PRICING_LABELS[pricingKey] || pricingKey.replace(/_/g, " ");
              const priceAmount = Number(svc.price);
              const priceLabel = Number.isFinite(priceAmount)
                ? `$${Number.isInteger(priceAmount) ? priceAmount : priceAmount.toFixed(2)}`
                : `$${svc.price}`;
              const detailsHref = `/transport/service/${svc.id}/`;
              const avgRating =
                typeof svc.company_stats?.average_rating === "number" &&
                svc.company_stats.average_rating > 0
                  ? svc.company_stats.average_rating
                  : null;
              const bookingsCount =
                typeof svc.company_stats?.bookings_count === "number" &&
                svc.company_stats.bookings_count > 0
                  ? svc.company_stats.bookings_count
                  : 0;

              return (
                <li key={svc.id} className={styles.hireCard}>
                  <Link href={detailsHref} className={styles.hireMedia} aria-label={`View ${vehicleName} details`}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 84vw, (max-width: 1100px) 50vw, 25vw"
                        className={styles.hireImage}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.hireImageFallback} aria-hidden="true">
                        <Car size={40} />
                      </span>
                    )}
                    <span className={styles.hireShade} aria-hidden="true" />
                    {category ? <span className={styles.hireCategory}>{category}</span> : null}
                    {plateNumber ? <span className={styles.hirePlate}>{plateNumber}</span> : null}
                  </Link>

                  <div className={styles.hireBody}>
                    <div className={styles.hireTopRow}>
                      <div className={styles.hireNameGroup}>
                        <h3 className={styles.hireVehicle}>{vehicleName}</h3>
                        {svc.title ? <p className={styles.hireService}>{svc.title}</p> : null}
                      </div>
                      <div className={styles.hirePrice}>
                        <strong>{priceLabel}</strong>
                        <span>{pricingLabel}</span>
                      </div>
                    </div>

                    <ul className={styles.hireSpecs} aria-label="Vehicle capacity">
                      <li>
                        <Users size={14} aria-hidden="true" />
                        {capacityPax} {capacityPax === 1 ? "seat" : "seats"}
                      </li>
                      <li>
                        <Briefcase size={14} aria-hidden="true" />
                        {luggageBags} {luggageBags === 1 ? "bag" : "bags"}
                      </li>
                      {svc.driver ? (
                        <li>
                          <Shield size={14} aria-hidden="true" />
                          Driver
                        </li>
                      ) : null}
                    </ul>

                    {companyName ? (
                      <div className={styles.hireCompany}>
                        <span className={styles.hireCompanyLogo} aria-hidden="true">
                          {companyLogo ? (
                            <Image src={getImageUrl(companyLogo)} alt="" fill sizes="28px" unoptimized />
                          ) : (
                            companyName.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className={styles.hireCompanyName}>{companyName}</span>
                        {avgRating != null ? (
                          <span className={styles.hireCompanyRating} aria-label={`Rated ${avgRating.toFixed(1)} out of 5`}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                            {avgRating.toFixed(1)}
                          </span>
                        ) : bookingsCount > 0 ? (
                          <span className={styles.hireCompanyBookings}>
                            {bookingsCount} {bookingsCount === 1 ? "trip" : "trips"}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className={styles.hireActions}>
                      <Link href={detailsHref} className={styles.hireBtnGhost}>
                        Details
                      </Link>
                      <Link href={`/booking/${svc.id}/`} className={styles.hireBtnPrimary}>
                        Book now <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.hireEmpty}>
            <Car size={26} aria-hidden="true" />
            <p>No private hire vehicles are listed right now.</p>
            <Link href="/transport/" className={styles.hireBtnPrimary}>
              Browse transport <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>


      {!loading && companies.length > 0 && (
        <section className={styles.providersSection} aria-labelledby="home-providers-heading">
          <div className={styles.providersHeader}>
            <div className={styles.providersHeading}>
              <span className={styles.providersEyebrow}>
                <Building2 size={14} aria-hidden="true" /> Meet the providers
              </span>
              <h2 id="home-providers-heading" className={styles.providersTitle}>
                Travel with people who know the place
              </h2>
            </div>
            <Link href="/companies/" className={styles.providersBrowse}>
              All companies <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul
            className={`${styles.providersGrid} ${
              companies.length === 1
                ? styles.providersGridSingle
                : companies.length === 2
                  ? styles.providersGridDouble
                  : ""
            }`}
          >
            {companies.slice(0, 6).map((company) => {
              const coverUrl = company.cover_image_url
                ? getImageUrl(company.cover_image_url)
                : null;
              const logoUrl = company.logo_image_url
                ? getImageUrl(company.logo_image_url)
                : null;
              const locationLabel = formatCompanyLocation(company);
              const description =
                company.description?.trim() ||
                "Licensed local transport partner offering verified private hire vehicles and experienced island drivers.";
              const directService =
                company.services?.[0] ??
                companyServiceOptions.find((svc) => svc.company?.id === company.id);
              const servicesCount = Number(company.services_count ?? 0);
              const tripsCount = Number(company.trips_count ?? 0);

              return (
                <li
                  key={company.id}
                  className={`${styles.providerCard} ${
                    companies.length === 1 ? styles.providerCardSpotlight : ""
                  }`}
                >
                  <Link
                    href={company.public_path}
                    className={styles.providerMedia}
                    aria-label={`View ${company.name}`}
                  >
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 84vw, (max-width: 1024px) 50vw, 33vw"
                        className={styles.providerCoverImage}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.providerCoverFallback} aria-hidden="true">
                        <span className={styles.providerCoverPattern} />
                        <span className={styles.providerCoverWatermark}>
                          {getCompanyInitials(company.name)}
                        </span>
                      </span>
                    )}
                    <span className={styles.providerMediaShade} aria-hidden="true" />
                    <span className={styles.providerVerifiedBadge}>
                      <Shield size={12} aria-hidden="true" />
                      Verified company
                    </span>
                  </Link>

                  <div className={styles.providerBody}>
                    <div className={styles.providerIdentity}>
                      <Link
                        href={company.public_path}
                        className={styles.providerEmblem}
                        aria-label={`${company.name} profile`}
                      >
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt={`${company.name} logo`}
                            fill
                            sizes="56px"
                            className={styles.providerLogoImage}
                            unoptimized
                          />
                        ) : (
                          <span className={styles.providerMonogram}>
                            {getCompanyInitials(company.name)}
                          </span>
                        )}
                      </Link>
                      <div className={styles.providerTitleGroup}>
                        <h3 className={styles.providerName}>
                          <Link href={company.public_path} className={styles.providerNameLink}>
                            {company.name}
                          </Link>
                        </h3>
                        <p className={styles.providerLocation}>
                          <MapPin size={13} aria-hidden="true" />
                          <span>{locationLabel}</span>
                        </p>
                      </div>
                    </div>

                    <p className={styles.providerDesc}>{description}</p>

                    <ul className={styles.providerStats} aria-label="Company highlights">
                      <li>
                        <Car size={14} aria-hidden="true" />
                        {servicesCount > 0
                          ? `${servicesCount} ${servicesCount === 1 ? "vehicle" : "vehicles"}`
                          : "Private hire fleet"}
                      </li>
                      {tripsCount > 0 ? (
                        <li>
                          <Compass size={14} aria-hidden="true" />
                          {tripsCount} {tripsCount === 1 ? "trip" : "trips"}
                        </li>
                      ) : null}
                      <li>
                        <CheckCircle size={14} aria-hidden="true" />
                        Local provider
                      </li>
                    </ul>

                    <div
                      className={`${styles.providerActions} ${
                        directService ? styles.providerActionsSplit : ""
                      }`}
                    >
                      {directService ? (
                        <>
                          <Link href={company.public_path} className={styles.providerLinkGhost}>
                            View company
                          </Link>
                          <Link
                            href={`/booking/${directService.id}/`}
                            className={styles.providerLinkPrimary}
                          >
                            Book now <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </>
                      ) : (
                        <Link href={company.public_path} className={styles.providerLinkPrimary}>
                          Explore company <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}



      {reviews.length > 0 && (
        <section className="testimonials-section">
          <div className="section-header">
            <h2>Notes from our customers</h2>
            <p>Read feedback shared after private-hire journeys.</p>
          </div>
          <div className="testimonials-grid">
            {reviews.slice(0, 6).map(review => (
              <div key={review.id} className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: 5 }, (_: any, i: number) => (
                    <Star key={i} size={16} fill={i < review.rating ? '#f59e0b' : 'none'} color={i < review.rating ? '#f59e0b' : '#d1d5db'} />
                  ))}
                </div>
                <p>&quot;{review.content}&quot;</p>
                <div className="testimonial-author-row">
                  <div className="testimonial-avatar">
                    {review.user_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="testimonial-author">{review.user_name}</span>
                    <span className="testimonial-date">{new Date(review.created_at ?? 0).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            {isAuthenticated ? (
              <button className="btn btn-primary" onClick={() => setShowReviewForm(true)}>
                Write a Review
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => router.push('/login')}>
                Signin to Write a Review
              </button>
            )}
          </div>
        </section>
      )}

      {!loading && (allTours.length === 0 || homeSettings?.more_experiences_image_urls?.some((image) => Boolean(image))) && (
        <MoreExperiencesEmptyState
          imageUrls={homeSettings?.more_experiences_image_urls?.slice(0, 5).map((image) => image ? getImageUrl(image) : null)}
        />
      )}



      {showReviewForm && (
        <div className="modal-overlay" onClick={(e: MouseEvent<HTMLElement>) => { if (e.target === e.currentTarget) setShowReviewForm(false); }}>
          <div className="modal-content review-form-modal">
            <div className="modal-header">
              <h3>Share Your Experience</h3>
              <button className="modal-close" onClick={() => setShowReviewForm(false)}><X size={18} /></button>
            </div>
            {reviewSuccess && <div className="alert alert-success">{reviewSuccess}</div>}
            <form onSubmit={handleReviewSubmit} className="review-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" className={`star-btn ${s <= reviewForm.rating ? 'active' : ''}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                      <Star size={24} fill={s <= reviewForm.rating ? '#f59e0b' : 'none'}
                        color={s <= reviewForm.rating ? '#f59e0b' : '#d1d5db'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Your Review</label>
                <textarea placeholder="Share your experience..." rows={4} value={reviewForm.content}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setReviewForm({ ...reviewForm, content: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={reviewSaving}>
                <Send size={16} /> {reviewSaving ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
