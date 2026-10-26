"use client";

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import { tripsAPI, toursAPI, geocodeAPI, routeAPI } from '@/lib/api/client';
import { BookOpen, Lightbulb, Clock, User, MapPin, Navigation, Locate, X, Loader, ExternalLink, Globe } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import type {  Tour, TravelTip  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/trips-page.module.css";
export default function TripsPage() {
  const [trips, setTrips] = useState<TravelTip[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

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
      setTrips(tripsRes.data.results || tripsRes.data);
      setTours(toursRes.data.results || toursRes.data);
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
    <div className={`page trips-page ${styles.tripsPageRoot}`}>
      <PageHero
        title="Plan Your Route"
        subtitle="Estimate distances, plan the day and pick up the tips locals actually use."
        backgroundImageKey="zanzibar"
        patternImageKey="more1"
        chips={["Route estimator", "Travel tips", "Getting around"]}
        onChipClick={(chip) => {
          const target = chip === "Route estimator" ? "route-estimator" : "travel-tips";
          document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <div className={styles.content}>
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

        <div className="trips-tips-section" id="travel-tips">
          <div className="section-header">
            <h2>Travel Tips</h2>
            <p>Helpful information for your trip</p>
          </div>

          {loading ? (
            <div className={`loading ${styles.tripsLoading}`}>Loading tips...</div>
          ) : trips.length === 0 ? (
            <div className={`empty-state ${styles.tripsEmpty}`}>
              <BookOpen size={32} />
              <p>No tips available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="tips-grid">
              {trips.slice(0, 6).map(trip => (
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
          )}
        </div>
      </div>
    </div>
  );
}