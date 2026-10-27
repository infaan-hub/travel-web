"use client";

import { useState, useEffect, useRef } from 'react';
import DestinationCard from "@/components/DestinationCard";
import Link from "next/link";
import { tripsAPI, toursAPI, geocodeAPI, routeAPI } from '@/lib/api/client';
import { readClientCache, writeClientCache } from '@/lib/cache/client-cache';
import { BookOpen, Clock, User, MapPin, Navigation, Locate, X, Loader, ExternalLink, Globe } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import type {  Tour, CompanyTrip  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import styles from "@/features/pages/company-trips.module.css";
export default function TripsPage() {
  const [trips, setTrips] = useState<CompanyTrip[]>(() => readClientCache<CompanyTrip[]>("travel.trips.all") ?? []);
  const [tours, setTours] = useState<Tour[]>(() => readClientCache<Tour[]>("travel.tours.all") ?? []);
  const [loading, setLoading] = useState<boolean>(() => !(readClientCache<CompanyTrip[]>("travel.trips.all") || readClientCache<Tour[]>("travel.tours.all")));

  const [originInput, setOriginInput] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originGeocoding, setOriginGeocoding] = useState(false);

  const [destInput, setDestInput] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destGeocoding, setDestGeocoding] = useState(false);
  const [showTourDropdown, setShowTourDropdown] = useState(false);

  const [route, setRoute] = useState<{
    distance_km: number;
    estimated_time_mins: number;
    distance?: number;
    duration?: string;
  } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const destRef = useRef(null);

  useEffect(() => {
    Promise.all([
      tripsAPI.getAll(),
      toursAPI.getAll(),
    ]).then(([tripsRes, toursRes]) => {
      const nextTrips = tripsRes.data.results || tripsRes.data;
      const nextTours = toursRes.data.results || toursRes.data;
      setTrips(nextTrips);
      setTours(nextTours);
      writeClientCache("travel.trips.all", nextTrips);
      writeClientCache("travel.tours.all", nextTours);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleUseMyLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setOriginInput('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      (pos: any) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginCoords(coords);
        setOriginInput(`📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      },
      () => {
        setError('Could not detect your location. Enter it manually.');
        setOriginInput('');
      }
    );
  };

  const geocodeOrigin = async () => {
    if (!originInput.trim() || originInput.startsWith('📍')) return;
    setOriginGeocoding(true);
    setError('');
    try {
      const res = await geocodeAPI.search(originInput.trim());
      if (res.data.lat) {
        setOriginCoords({ lat: res.data.lat, lng: res.data.lng });
        setOriginInput(`📍 ${res.data.display_name || `${res.data.lat}, ${res.data.lng}`}`);
      } else {
        setError('Origin not found. Try a different name.');
      }
    } catch { setError('Failed to geocode origin'); }
    finally { setOriginGeocoding(false); }
  };

  const geocodeDestination = async () => {
    if (!destInput.trim()) { setError('Enter a destination'); return; }
    setDestGeocoding(true);
    setError('');
    try {
      const res = await geocodeAPI.search(destInput.trim());
      if (res.data.lat) {
        setDestCoords({ lat: res.data.lat, lng: res.data.lng });
        setDestInput(`📍 ${res.data.display_name || `${res.data.lat}, ${res.data.lng}`}`);
      } else {
        setError('Destination not found. Try a different name.');
      }
    } catch { setError('Failed to geocode destination'); }
    finally { setDestGeocoding(false); }
  };

  const selectTourDestination = (tour: Tour) => {
    const dest = tour.destination || tour.title;
    setDestInput(dest);
    if (tour.destination_lat && tour.destination_lng) {
      setDestCoords({ lat: tour.destination_lat, lng: tour.destination_lng });
      setDestInput(`📍 ${dest} (${tour.destination_lat}, ${tour.destination_lng})`);
    } else {
      geocodeDestination();
    }
    setShowTourDropdown(false);
  };

  const handleCalculate = async () => {
    if (!originCoords) { setError('Set your origin first'); return; }
    if (!destCoords) { setError('Set your destination first'); return; }
    setCalculating(true);
    setError('');
    try {
      const res = await routeAPI.calculate({
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
      });
      setRoute(res.data);
    } catch { setError('Failed to calculate route'); }
    finally { setCalculating(false); }
  };

  const openInGoogleMaps = () => {
    if (!originCoords || !destCoords) return;
    const origin = `${originCoords.lat},${originCoords.lng}`;
    const dest = `${destCoords.lat},${destCoords.lng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`, '_blank');
  };

  const originConfirmed = originCoords !== null;
  const destConfirmed = destCoords !== null;

  return (
    <div id="trips-workspace" className={styles.tripsRoot}>
      <header className={styles.tripsMasthead}>
        <div className={styles.tripsMastheadText}>
          <nav className={styles.tripsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className={styles.tripsBreadcrumbSep} aria-hidden="true">/</span>
            <span className={styles.tripsBreadcrumbCurrent}>Trips</span>
          </nav>
          <p className={styles.tripsEyebrow}>Discover</p>
          <h1 className={styles.tripsTitle}>Trips</h1>
          <p className={styles.tripsLead}>Discover trips posted by our travel companies and estimate routes between destinations.</p>
        </div>
      </header>

      <div className="route-estimator-card" id="route-estimator">
          <div className="route-estimator-grid">
            <div className="route-estimator-field">
              <label>Origin</label>
              <div className="route-input-row">
                <input
                  type="text" placeholder="e.g. Dar es Salaam, Arusha..."
                  value={originInput}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setOriginInput(e.target.value); setOriginCoords(null); setRoute(null); }}
                  onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter') geocodeOrigin(); }}
                />
                <button className="btn btn-sm btn-outline" onClick={handleUseMyLocation} title="Use my location">
                  <Locate size={16} />
                </button>
                <button className="btn btn-sm btn-primary" onClick={geocodeOrigin} disabled={originGeocoding || !originInput.trim()}>
                  {originGeocoding ? <Loader size={14} className="spin" /> : <MapPin size={14} />}
                </button>
              </div>
              {originConfirmed && <span className="coords-confirmed">Origin set ✓</span>}
            </div>

            <div className="route-estimator-field">
              <label>Destination</label>
              <div className="route-input-row" ref={destRef}>
                <input
                  type="text" placeholder="e.g. Zanzibar, Serengeti..."
                  value={destInput}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setDestInput(e.target.value); setDestCoords(null); setRoute(null); setShowTourDropdown(false); }}
                  onFocus={() => setShowTourDropdown(true)}
                  onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter') { geocodeDestination(); setShowTourDropdown(false); } }}
                />
                <button className="btn btn-sm btn-primary" onClick={() => { geocodeDestination(); setShowTourDropdown(false); }} disabled={destGeocoding || !destInput.trim()}>
                  {destGeocoding ? <Loader size={14} className="spin" /> : <MapPin size={14} />}
                </button>
              </div>
              {destConfirmed && <span className="coords-confirmed">Destination set ✓</span>}
              {showTourDropdown && tours.length > 0 && (
                <div className="tour-dest-dropdown">
                  <div className="dropdown-label">Select a tour destination:</div>
                  {tours.filter(t => t.destination).map(t => (
                    <button key={t.id} className="dropdown-item" onClick={() => selectTourDestination(t)}>
                      <Globe size={14} /> {t.destination} — {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-block btn-calculate" onClick={handleCalculate} disabled={calculating || !originConfirmed || !destConfirmed}>
            {calculating ? <><Loader size={18} className="spin" /> Calculating Route...</> : <><Navigation size={18} /> Calculate Route</>}
          </button>

          {route && (
            <div className="route-result-card">
              <div className="route-stats-row">
                <div className="route-stat-box">
                  <MapPin size={20} />
                  <span className="stat-val">{route.distance}</span>
                  <span className="stat-lbl">Distance</span>
                </div>
                <div className="route-stat-box">
                  <Clock size={20} />
                  <span className="stat-val">{route.duration}</span>
                  <span className="stat-lbl">Travel Time</span>
                </div>
              </div>
              <button className="btn btn-outline btn-block" onClick={openInGoogleMaps}>
                <ExternalLink size={16} /> Open in Google Maps
              </button>
            </div>
          )}
        </div>

        <div className="trips-posted-section" id="posted-trips">
          <div className="section-header">
            <h2>Posted Trips</h2>
            <p>Trips posted by travel companies</p>
          </div>

          {loading ? (
            <div className="trips-skeleton-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="trip-card trip-card--skeleton">
                  <div className="trip-skeleton-image" />
                  <div className="trip-card-body">
                    <div className="trip-skeleton-line trip-skeleton-line--title" />
                    <div className="trip-skeleton-line" />
                    <div className="trip-skeleton-line trip-skeleton-line--short" />
                  </div>
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className={styles.tripsState}>
              <span className={styles.tripsStateIcon}><BookOpen size={22} /></span>
              <h2 className={styles.tripsStateTitle}>No trips posted yet</h2>
              <p className={styles.tripsStateCopy}>Check back soon for new trips from travel companies.</p>
            </div>
          ) : (
            <div className="destinations-grid">
              {trips.map((trip) => (
                <DestinationCard
                  key={trip.id}
                  image={trip.image_url ? getImageUrl(trip.image_url) : undefined}
                  title={trip.title}
                  location={trip.place}
                  description={trip.description || (trip.company_name ? `Posted by ${trip.company_name}` : "Trip posted by a travel company.")}
                  badges={trip.company_name ? [trip.company_name] : undefined}
                  stats={[
                    { value: trip.price ? `$${trip.price}` : "On request", label: "Price" },
                    { value: trip.created_at ? new Date(trip.created_at).toLocaleDateString() : "Recently", label: "Posted" },
                  ]}
                  hideCta
                  hideLike
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}