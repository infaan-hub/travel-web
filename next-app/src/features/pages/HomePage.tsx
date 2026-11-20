"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import { toursAPI, homeSettingsAPI, reviewsAPI, publicCompaniesAPI, publicPrivateHireAPI } from '@/lib/api/client';
import { ArrowRight, Star, Send, X, Car, Users, Briefcase, Shield } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';
import { readClientCache, writeClientCache } from '@/lib/cache/client-cache';
import { useAuth } from '@/context/AuthContext';

import { useToast } from "@/components/ToastProvider";
import BentoHero from "@/components/BentoHero";
import MoreExperiencesEmptyState from "@/components/MoreExperiencesEmptyState";
import styles from "@/features/pages/home-page.module.css";

import DestinationCard from "@/components/DestinationCard";

import type { HomeSettings, Review, Tour } from "@/features/pages/types";
import { PRICING_LABELS, SAMPLE_PRIVATE_HIRE_SERVICES } from "@/features/transport/private-hire-data";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";

type FeaturedCompany = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_image_url: string | null;
  locality: string | null;
  region: string | null;
  public_path: string;
  services_count: number;
  trips_count: number;
};

type CompanyPostedTrip = {
  id: number;
  company_id: number;
  company_name: string;
  company_public_path: string;
  title: string;
  place: string;
  description: string;
  image_url: string | null;
  price?: number | null;
};

export default function HomePage() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [allTours, setAllTours] = useState<Tour[]>(() => readClientCache<Tour[]>("travel.homeTours") ?? []);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(() => readClientCache<HomeSettings>("travel.homeSettings"));
  const [reviews, setReviews] = useState<Review[]>(() => readClientCache<Review[]>("travel.homeReviews") ?? []);
  const [companies, setCompanies] = useState<FeaturedCompany[]>(() => readClientCache<FeaturedCompany[]>("travel.homeCompanies") ?? []);
  const [privateServices, setPrivateServices] = useState<any[]>(() => readClientCache<any[]>("travel.homePrivateServices") ?? []);
  const [postedTrips, setPostedTrips] = useState<CompanyPostedTrip[]>(() => readClientCache<CompanyPostedTrip[]>("travel.homePostedTrips") ?? []);
  const [postedTripsLoading, setPostedTripsLoading] = useState<boolean>(() => readClientCache<CompanyPostedTrip[]>("travel.homePostedTrips") === null);
  const [loading, setLoading] = useState<boolean>(() => !(
    readClientCache<Tour[]>("travel.homeTours") ||
    readClientCache<HomeSettings>("travel.homeSettings") ||
    readClientCache<Review[]>("travel.homeReviews") ||
    readClientCache<FeaturedCompany[]>("travel.homeCompanies") ||
    readClientCache<CompanyPostedTrip[]>("travel.homePostedTrips")
  ));
  const [tourLoadError, setTourLoadError] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [matchDestination, setMatchDestination] = useState<string>('all');
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchPaused, setMatchPaused] = useState(false);
  const [matchEngaged, setMatchEngaged] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobileHome, setIsMobileHome] = useState(false);
  const [matchCardWidth, setMatchCardWidth] = useState(240);
  const [matchInView, setMatchInView] = useState(false);
  const matchStageRef = useRef<HTMLDivElement | null>(null);
  const matchDragStart = useRef<number | null>(null);
  const matchSwiped = useRef(false);
  const router = useRouter();
  const matchDestinations = [
    { value: 'all', label: 'All destinations' },
    ...Array.from(new Set(postedTrips.map((trip) => trip.place.trim()).filter(Boolean)))
      .slice(0, 8)
      .map((place) => ({ value: place, label: place })),
  ];
  const matchTrips = postedTrips
    .filter((trip) => matchDestination === 'all' || trip.place.trim() === matchDestination)
    .slice(0, 5);

  const homeCardLimit = isMobileHome ? 3 : 5;

  // Cache hydration is handled by lazy state initializers above.


  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    updateMotionPreference();
    motionPreference.addEventListener('change', updateMotionPreference);
    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const mobileLayout = window.matchMedia('(max-width: 560px)');
    const updateCardWidth = () => setMatchCardWidth(mobileLayout.matches ? 190 : 240);
    updateCardWidth();
    mobileLayout.addEventListener('change', updateCardWidth);
    return () => mobileLayout.removeEventListener('change', updateCardWidth);
  }, []);

  useEffect(() => {
    const mobileLayout = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobileHome(mobileLayout.matches);
    update();
    mobileLayout.addEventListener('change', update);
    return () => mobileLayout.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    publicPrivateHireAPI.getAll({ page_size: 6 })
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results || [];
        const services = list.length ? list : SAMPLE_PRIVATE_HIRE_SERVICES.slice(0, 6);
        setPrivateServices(services);
        writeClientCache("travel.homePrivateServices", services);
      })
      .catch(() => {
        setPrivateServices(SAMPLE_PRIVATE_HIRE_SERVICES.slice(0, 6));
      });
  }, []);

  useEffect(() => {
    if (matchPaused || matchEngaged || reducedMotion || !matchInView || matchTrips.length < 2) return;
    const timer = window.setInterval(() => {
      setMatchIndex((current) => (current + 1) % matchTrips.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [matchEngaged, matchPaused, matchTrips.length, reducedMotion, matchInView]);

  useEffect(() => {
    const node = matchStageRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setMatchInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setMatchInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [postedTripsLoading]);

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
      else { setTourLoadError(true); console.error(toursRes.reason); }
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
        setCompanies(publicCompanyList.slice(0, 4));
        writeClientCache("travel.homeCompanies", publicCompanyList.slice(0, 4));
        const companiesWithTrips = publicCompanyList.filter((company) => company.trips_count > 0);
        void Promise.allSettled(
          companiesWithTrips.map((company) => publicCompaniesAPI.getBySlug(company.slug)),
        ).then((companyResults) => {
          const tripsByCompany = companyResults.flatMap((result, index) => {
            if (result.status === "rejected") {
              console.error(result.reason);
              return [];
            }
            const company = companiesWithTrips[index];
            const companyTrips = result.value.data?.trips;
            if (!Array.isArray(companyTrips)) {
              console.error(`Public trip list missing for company ${company.name}.`);
              return [];
            }
            return [companyTrips.map((trip: Omit<CompanyPostedTrip, "company_name" | "company_public_path">) => ({
                ...trip,
                company_name: company.name,
                company_public_path: company.public_path,
                image_url: trip.image_url ?? null,
              }))];
          });
          const trips: CompanyPostedTrip[] = [];
          const maxTripsPerCompany = Math.max(0, ...tripsByCompany.map((companyTrips) => companyTrips.length));
          for (let tripIndex = 0; tripIndex < maxTripsPerCompany; tripIndex += 1) {
            for (const companyTrips of tripsByCompany) {
              if (companyTrips[tripIndex]) trips.push(companyTrips[tripIndex]);
            }
          }
          setPostedTrips(trips);
          setPostedTripsLoading(false);
          setLoading(false);
          writeClientCache("travel.homePostedTrips", trips);
        });
      } else {
        console.error(companiesRes.reason);
        setPostedTripsLoading(false);
        setLoading(false);
      }
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
              privateServices.length === 1 ? styles.hireGridSingle : ""
            }`}
          >
            {privateServices.slice(0, 6).map((svc) => {
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

              return (
                <li key={svc.id} className={styles.hireCard}>
                  <Link href={detailsHref} className={styles.hireMedia} aria-label={`View ${vehicleName} details`}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 84vw, (max-width: 1024px) 50vw, 33vw"
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
                          Driver included
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
                      </div>
                    ) : null}

                    <div className={styles.hireActions}>
                      <Link href={detailsHref} className={styles.hireBtnGhost}>
                        View details
                      </Link>
                      <Link href={`/booking/${svc.id}/`} className={styles.hireBtnPrimary}>
                        Book now <ArrowRight size={15} aria-hidden="true" />
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


      {!loading && !postedTripsLoading && (
        <section
          className={`cta-section ${styles.matchSection}`}
          onFocusCapture={() => setMatchEngaged(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setMatchEngaged(false);
            }
          }}
        >
          <div className={styles.matchHeader}>
            <div>
              <span className={styles.matchEyebrow}>Trips posted by local companies</span>
              <h2>Your next trip begins with a good match.</h2>
            </div>
          </div>
          {matchTrips.length > 0 ? (
            <>
              <nav className={styles.matchFilters} aria-label="Filter company trips by destination">
                {matchDestinations.map((destination) => {
                  return (
                    <button
                      key={destination.value}
                      type="button"
                      className={`${styles.matchFilter} ${matchDestination === destination.value ? styles.matchFilterActive : ''}`}
                      aria-pressed={matchDestination === destination.value}
                      onClick={() => {
                        setMatchDestination(destination.value);
                        setMatchIndex(0);
                      }}
                    >
                      {destination.label}
                    </button>
                  );
                })}
                <Link href="/companies/" className={`${styles.matchFilter} ${styles.matchMore}`}>
                  View more <ArrowRight size={14} />
                </Link>
              </nav>
              <div
                ref={matchStageRef}
                className={styles.matchStage}
                role="region"
                aria-roledescription="carousel"
                aria-label="Company-posted trips"
                tabIndex={0}
                onMouseEnter={() => setMatchEngaged(true)}
                onMouseLeave={() => setMatchEngaged(false)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') setMatchIndex((current) => (current + 1) % matchTrips.length);
                  if (event.key === 'ArrowLeft') setMatchIndex((current) => (current - 1 + matchTrips.length) % matchTrips.length);
                }}
                onPointerDown={(event) => {
                  matchDragStart.current = event.clientX;
                  matchSwiped.current = false;
                  setMatchEngaged(true);
                }}
                onPointerUp={(event) => {
                  if (matchDragStart.current === null) return;
                  const distance = event.clientX - matchDragStart.current;
                  matchDragStart.current = null;
                  if (Math.abs(distance) > 40 && matchTrips.length > 1) {
                    matchSwiped.current = true;
                    setMatchIndex((current) => (current + (distance < 0 ? 1 : -1) + matchTrips.length) % matchTrips.length);
                  }
                  setMatchEngaged(false);
                }}
                onPointerCancel={() => {
                  matchDragStart.current = null;
                  matchSwiped.current = false;
                  setMatchEngaged(false);
                }}
              >
                {matchTrips.map((trip, index) => {
                  let offset = index - matchIndex;
                  if (offset > matchTrips.length / 2) offset -= matchTrips.length;
                  if (offset < -matchTrips.length / 2) offset += matchTrips.length;
                  const distance = Math.abs(offset);
                  const horizontalOffset = distance === 0 ? 0 : distance === 1 ? 0.72 : 1.28;
                  return (
                    <Link
                      key={`${trip.company_id}-${trip.id}`}
                      href={`/trips/${trip.id}/`}
                      className={styles.matchCard}
                      data-distance={distance}
                      style={{
                        transform: `translate(-50%, -50%) translateX(${Math.sign(offset) * matchCardWidth * horizontalOffset}px)`,
                        zIndex: 10 - distance,
                        opacity: distance > 2 ? 0 : distance === 2 ? 0.85 : 1,
                        pointerEvents: distance > 2 ? 'none' : 'auto',
                      }}
                      tabIndex={distance === 0 ? 0 : -1}
                      aria-hidden={distance > 2}
                      aria-label={`${trip.title} in ${trip.place}, posted by ${trip.company_name}`}
                      title={`${trip.title} — ${trip.company_name}`}
                      onClick={(event) => {
                        if (matchSwiped.current) {
                          event.preventDefault();
                          matchSwiped.current = false;
                        }
                      }}
                    >
                      {trip.image_url ? (
                        <Image
                          src={getImageUrl(trip.image_url)}
                          alt={trip.title}
                          fill
                          sizes="(max-width: 560px) 190px, 240px"
                          priority={distance === 0}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className={styles.matchCardFallback} aria-hidden="true" />
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className={styles.matchControls}>
                <div className={styles.matchDots} aria-label="Choose an experience">
                  {matchTrips.map((trip, index) => (
                    <button
                      key={`${trip.company_id}-${trip.id}`}
                      type="button"
                      className={`${styles.matchDot} ${matchIndex === index ? styles.matchDotActive : ''}`}
                      aria-label={`Show ${trip.title}`}
                      aria-current={matchIndex === index ? 'true' : undefined}
                      onClick={() => setMatchIndex(index)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className={styles.matchEmpty}>No company-posted trips are available right now. Meet the companies to discover their experiences.</p>
          )}
        </section>
      )}


      {!loading && companies.length > 0 && (
        <section className="home-companies-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Meet the providers</span>
              <h2>Travel with people who know the place</h2>
            </div>
            <Link href="/companies/" className="section-text-link">All companies <ArrowRight size={16} /></Link>
          </div>
          <div className="home-companies-grid">
            {companies.slice(0, homeCardLimit).map((company) => (
              <DestinationCard
                key={company.id}
                image={company.logo_image_url ? getImageUrl(company.logo_image_url) : undefined}
                title={company.name}
                location={[company.locality, company.region].filter(Boolean).join(", ") || "Private hire provider"}
                description={company.description || `${company.services_count} private-hire services`}
                stats={[
                  { value: String(company.services_count), label: "Services" },
                  { value: "Local", label: "Provider" },
                  { value: "Verified", label: "Company" },
                ]}
                hideCta
                boldText
                href={company.public_path}
              />
            ))}
          </div>
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
