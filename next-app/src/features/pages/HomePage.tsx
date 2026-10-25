"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from "next/image";
import { toursAPI, homeSettingsAPI, reviewsAPI, attractionsAPI, publicCompaniesAPI, tripsAPI } from '@/lib/api/client';
import TourCard from '@/components/TourCard';
import { ArrowRight, Star, MapPin, Send, X, Lightbulb, Clock } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';
import { useAuth } from '@/context/AuthContext';

import { useToast } from "@/components/ToastProvider";
import BentoHero from "@/components/BentoHero";
import styles from "@/features/pages/home-page.module.css";
import MoreExperiencesEmptyState from "@/components/MoreExperiencesEmptyState";
import DestinationCard from "@/components/DestinationCard";

import type {  Attraction, HomeSettings, Review, Tour, TravelTip  } from "@/features/pages/types";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";

type FeaturedCompany = {
  id: number;
  name: string;
  description: string | null;
  logo_image_url: string | null;
  locality: string | null;
  region: string | null;
  public_path: string;
  tours_count: number;
};

export default function HomePage() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [allTrips, setAllTrips] = useState<TravelTip[]>([]);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [companies, setCompanies] = useState<FeaturedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourLoadError, setTourLoadError] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    void Promise.allSettled([
      toursAPI.getAll({}),
      tripsAPI.getAll(),
      homeSettingsAPI.get(),
      reviewsAPI.getAll({ status: 'approved' }),
      attractionsAPI.getAll({}),
      publicCompaniesAPI.getAll({ page: 1, page_size: 4 }),
    ]).then(([toursRes, tripsRes, homeRes, reviewsRes, attractionsRes, companiesRes]) => {
      const readList = (value: unknown) => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object" && "results" in value && Array.isArray(value.results)) return value.results;
        return [];
      };
      if (toursRes.status === "fulfilled") setAllTours(readList(toursRes.value.data) as Tour[]);
      else { setTourLoadError(true); console.error(toursRes.reason); }
      if (tripsRes.status === "fulfilled") setAllTrips(readList(tripsRes.value.data) as TravelTip[]);
      else console.error(tripsRes.reason);
      if (homeRes.status === "fulfilled") setHomeSettings(homeRes.value.data);
      else console.error(homeRes.reason);
      if (reviewsRes.status === "fulfilled") setReviews(readList(reviewsRes.value.data) as Review[]);
      else console.error(reviewsRes.reason);
      if (attractionsRes.status === "fulfilled") setAttractions(readList(attractionsRes.value.data) as Attraction[]);
      else console.error(attractionsRes.reason);
      if (companiesRes.status === "fulfilled") setCompanies(readList(companiesRes.value.data).slice(0, 4) as FeaturedCompany[]);
      else console.error(companiesRes.reason);
    }).finally(() => setLoading(false));
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

  return (
    <div className={`page home-page ${styles.homePageRoot}`}>
      <BentoHero
        mainImage={homeSettings?.hero_image_url}
        secondImage={homeSettings?.hero_secondary_image_url || homeSettings?.zanzibar_image_url}
        featuredImage={homeSettings?.hero_feature_image_url}
        thumbImage={homeSettings?.hero_thumb_image_url}
        featuredTour={allTours.find((tour) => tour.featured) || allTours[0] || null}
      />

      <section className="destinations-section">
        <div className="section-header" style={{ textAlign: "center", alignItems: "center" }}>
          <h2>Start with a place</h2>
        </div>
        <div className="destinations-grid">
          <Link className="destination-card zanzibar" href="/tours/zanzibar/">
            <div className="destination-image">
              <img
                src={getImageUrl(homeSettings?.zanzibar_image_url || allTours.find(t => t.category === 'zanzibar')?.image_url || '/uploads/home/Zanzibar_trip.jpg') || '/uploads/home/Zanzibar_trip.jpg'}
                alt="Zanzibar"
              />
            </div>
            <div className="destination-info">
              <h3>Zanzibar</h3>
              <p>Pristine beaches, spice farms, and rich Swahili culture. Paradise on Earth.</p>
            </div>
          </Link>
          <Link className="destination-card tanzania" href="/tours/tanzania/">
            <div className="destination-image">
              <img
                src={getImageUrl(homeSettings?.tanzania_image_url || allTours.find(t => t.category === 'tanzania')?.image_url || '/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg') || '/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg'}
                alt="Tanzania Safari"
              />
            </div>
            <div className="destination-info">
              <h3>Tanzania Safaris</h3>
              <p>Serengeti, Kilimanjaro, Ngorongoro - Africa&apos;s greatest wildlife experiences with expert-guided tours and premium service.</p>
            </div>
          </Link>
        </div>
      </section>


      {!loading && allTours.length > 0 && (
        <section className="all-tours-section">
          <div className="section-header">
            <h2>Explore experiences</h2>
          </div>
          <div className="tours-grid">
            {allTours.map((tour: Tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </section>
      )}

      {!loading && attractions.length > 0 && (
        <section className="attractions-section">
          <div className="section-header">
            <h2>Places worth exploring</h2>
            <p>Discover notable places across the destinations represented on Travel.</p>
          </div>
          <div className="home-attractions-grid">
            {attractions.slice(0, 6).map(att => (
              <div key={att.id} className="home-attraction-card">
                <div className="home-attraction-image">
                  <Image src={getImageUrl(att.image_url)} alt={att.name} width={320} height={220} />
                </div>
                <div className="home-attraction-info">
                  <h3>{att.name}</h3>
                  <span className="home-attraction-location"><MapPin size={14} /> {att.location}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <button className="btn btn-outline" onClick={() => router.push('/attractions')}>
              View All Attractions
            </button>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="testimonials-section">
          <div className="section-header">
            <h2>Notes from other travelers</h2>
            <p>Read feedback shared after real experiences.</p>
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
                Login to Write a Review
              </button>
            )}
          </div>
        </section>
      )}

      {!loading && allTours.length === 0 && !tourLoadError && (
        <MoreExperiencesEmptyState
          imageUrls={homeSettings?.more_experiences_image_urls?.slice(0, 5).map((image) => image ? getImageUrl(image) : null)}
        />
      )}
      {!loading && tourLoadError && (
        <section className="home-discovery-empty glass-card" role="status">
          <span className="section-kicker">Catalogue temporarily unavailable</span>
          <h2>We could not load experiences right now.</h2>
          <p>Browse company profiles in the meantime, or refresh this page to try again.</p>
          <Link href="/companies/" className="btn btn-primary">Explore companies</Link>
        </section>
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
            {companies.map((company) => (
              <DestinationCard
                key={company.id}
                image={company.logo_image_url ? getImageUrl(company.logo_image_url) : undefined}
                title={company.name}
                location={[company.locality, company.region].filter(Boolean).join(", ") || "Tourism company"}
                description={company.description || `${company.tours_count} published experiences`}
                stats={[
                  { value: String(company.tours_count), label: "Experiences" },
                  { value: "Local", label: "Provider" },
                  { value: "Verified", label: "Company" },
                ]}
                hideCta
                boldText
              />
            ))}
          </div>
        </section>
      )}
      {!loading && allTrips.length > 0 && (
        <section className="all-tours-section">
          <div className="section-header">
            <h2>Your next trip begins with a good match.</h2>
          </div>
          <div className="tips-grid">
            {allTrips.slice(0, 6).map((trip) => (
              <div key={trip.id} className="tip-card">
                <div className="tip-card-header">
                  <Lightbulb size={20} className="tip-icon" />
                  <h3>{trip.title}</h3>
                </div>
                {trip.image_url && <Image src={getImageUrl(trip.image_url)} alt={trip.title} width={640} height={360} className="trip-image" />}
                <p className="tip-content">{trip.content}</p>
                <div className="tip-meta">
                  {trip.category && <span className="tip-category">{trip.category}</span>}
                  {trip.created_at && (
                    <span className="tip-date"><Clock size={12} /> {new Date(trip.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <button className="btn btn-primary btn-large" onClick={() => router.push('/trips/')}>
              Explore trips
            </button>
          </div>
        </section>
      )}
      {(!loading && allTrips.length === 0) && (
        <section className="cta-section">
          <div className="cta-content">
            <h2>Your next trip begins with a good match.</h2>
            <button className="btn btn-primary btn-large" onClick={() => router.push('/companies/')}>
              Meet the companies
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
