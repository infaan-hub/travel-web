"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  Crosshair,
  ExternalLink,
  Layers,
  Maximize2,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { driverAPI, geocodeAPI, routeAPI } from "@/lib/api/client";
import {
  estimateLiveSpeedKmh,
  formatDistanceLabel,
  formatDurationLabel,
  haversineMeters,
  resolveLiveHeadingDegrees,
  shouldAcceptGpsTimestamp,
  shouldRecalculateLiveRoute,
  shouldSyncDriverLocation,
  type TimedGeoPoint,
} from "@/lib/driver-workflow";
import styles from "@/components/driver-live-map.module.css";

type LatLngPoint = { lat: number; lng: number };

export type LiveDriverTelemetry = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speedKmh: number | null;
  headingDeg?: number | null;
  updatedAt?: number;
};

export type LiveRouteSummary = {
  distanceKm: number;
  durationMins: number;
  source: string;
};

type Props = {
  mode: "to_origin" | "to_destination";
  bookingId: number;
  originLat: number | null;
  originLng: number | null;
  originLabel: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationLabel?: string;
  /** @deprecated Ignored so the driver location is never pinned to a stale DB coordinate. */
  initialDriverLat?: number | null;
  /** @deprecated Ignored so the driver location is never pinned to a stale DB coordinate. */
  initialDriverLng?: number | null;
  onPositionUpdate?: (telemetry: LiveDriverTelemetry) => void;
  onRouteMetrics?: (metrics: LiveRouteSummary) => void;
};

type BasemapId = "topo" | "satellite";

const BASEMAPS: Record<BasemapId, { label: string; url: string; attribution: string }> = {
  topo: {
    label: "Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — World Topographic Map",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — World Imagery",
  },
};

const ZANZIBAR_DEFAULT_CENTER: [number, number] = [-6.1659, 39.2026];
const GPS_WATCHDOG_INTERVAL_MS = 5_000;
const GPS_STALE_REFRESH_MS = 6_000;
const GPS_HIGH_ACCURACY_UPGRADE_MS = 25_000;
const GPS_ERROR_RETRY_MS = 8_000;
const MARKER_GLIDE_DURATION_MS = 600;

function isValidPair(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function driverMarkerHtml(headingDeg: number | null | undefined): string {
  const inner =
    typeof headingDeg === "number" && Number.isFinite(headingDeg)
      ? `<span class="driver-live-marker__arrow" style="transform:rotate(${Math.round(headingDeg)}deg)"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2L19 20L12 16.2L5 20L12 2Z"/></svg></span>`
      : `<span class="driver-live-marker__dot"></span>`;
  return `<div class="driver-live-marker"><span class="driver-live-marker__pulse"></span><span class="driver-live-marker__core">${inner}</span></div>`;
}

export default function DriverLiveRouteMap({
  mode,
  bookingId,
  originLat,
  originLng,
  originLabel,
  destinationLat,
  destinationLng,
  destinationLabel,
  onPositionUpdate,
  onRouteMetrics,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const isMountedRef = useRef(true);

  const driverMarkerRef = useRef<Leaflet.Marker | null>(null);
  const accuracyCircleRef = useRef<Leaflet.Circle | null>(null);
  const originMarkerRef = useRef<Leaflet.Marker | null>(null);
  const destMarkerRef = useRef<Leaflet.Marker | null>(null);
  const basePlannedLineRef = useRef<Leaflet.Polyline | null>(null);
  const activeCasingLineRef = useRef<Leaflet.Polyline | null>(null);
  const activeRoadLineRef = useRef<Leaflet.Polyline | null>(null);

  const driverPosRef = useRef<LiveDriverTelemetry | null>(null);
  const renderedPosRef = useRef<LatLngPoint | null>(null);
  const lastTimedFixRef = useRef<TimedGeoPoint | null>(null);
  const lastHeadingRef = useRef<number | null>(null);
  const lastRoutedPosRef = useRef<TimedGeoPoint | null>(null);
  const lastSyncedPosRef = useRef<TimedGeoPoint | null>(null);
  const routeSeqRef = useRef(0);
  const hasFramedLiveDriverRef = useRef(false);
  const hasFittedPlannedRef = useRef(false);
  const autoFollowRef = useRef(true);
  const activeGeometryRef = useRef<[number, number][]>([]);
  const animFrameRef = useRef<number | null>(null);

  const [basemap, setBasemap] = useState<BasemapId>("topo");
  const [autoFollow, setAutoFollow] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const [geocodedOrigin, setGeocodedOrigin] = useState<LatLngPoint | null>(null);
  const [geocodedDest, setGeocodedDest] = useState<LatLngPoint | null>(null);
  const resolvedOrigin = useMemo<LatLngPoint | null>(
    () => (isValidPair(originLat, originLng) ? { lat: originLat!, lng: originLng! } : geocodedOrigin),
    [geocodedOrigin, originLat, originLng],
  );
  const resolvedDest = useMemo<LatLngPoint | null>(
    () =>
      isValidPair(destinationLat, destinationLng)
        ? { lat: destinationLat!, lng: destinationLng! }
        : geocodedDest,
    [destinationLat, destinationLng, geocodedDest],
  );

  // Never pin a stale DB coordinate as the driver's live position — wait for real device GPS.
  const [driverPos, setDriverPos] = useState<LiveDriverTelemetry | null>(null);
  const hasGeolocationApi =
    typeof window !== "undefined" && typeof navigator !== "undefined" && "geolocation" in navigator;
  const [gpsStatus, setGpsStatus] = useState<"searching" | "live" | "error">(() =>
    hasGeolocationApi ? "searching" : "error",
  );
  const [gpsError, setGpsError] = useState(() =>
    hasGeolocationApi ? "" : "Live GPS is not supported on this device/browser.",
  );
  const [gpsRetryTick, setGpsRetryTick] = useState(0);
  const [routeMetrics, setRouteMetrics] = useState<LiveRouteSummary | null>(null);
  const [routing, setRouting] = useState(false);

  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onRouteMetricsRef = useRef(onRouteMetrics);
  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
    onRouteMetricsRef.current = onRouteMetrics;
  }, [onPositionUpdate, onRouteMetrics]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    autoFollowRef.current = autoFollow;
  }, [autoFollow]);

  // Forward-geocode text labels when stored coordinates are missing
  useEffect(() => {
    if (resolvedOrigin || !originLabel.trim()) return;
    let active = true;
    geocodeAPI
      .search(originLabel.trim())
      .then((res) => {
        if (!active) return;
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        if (isValidPair(lat, lng)) setGeocodedOrigin({ lat, lng });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [originLabel, resolvedOrigin]);

  useEffect(() => {
    if (mode !== "to_destination" || resolvedDest || !destinationLabel?.trim()) return;
    let active = true;
    geocodeAPI
      .search(destinationLabel.trim())
      .then((res) => {
        if (!active) return;
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        if (isValidPair(lat, lng)) setGeocodedDest({ lat, lng });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [destinationLabel, mode, resolvedDest]);

  const targetPoint = useMemo<LatLngPoint | null>(
    () => (mode === "to_origin" ? resolvedOrigin : resolvedDest),
    [mode, resolvedDest, resolvedOrigin],
  );

  // Reset route calculation tracking whenever trip or target changes
  useEffect(() => {
    lastRoutedPosRef.current = null;
    lastSyncedPosRef.current = null;
    activeGeometryRef.current = [];
    routeSeqRef.current += 1;
    hasFramedLiveDriverRef.current = false;
    hasFittedPlannedRef.current = false;
  }, [bookingId, mode, targetPoint?.lat, targetPoint?.lng]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    void import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const initialCenter: [number, number] = resolvedOrigin
        ? [resolvedOrigin.lat, resolvedOrigin.lng]
        : ZANZIBAR_DEFAULT_CENTER;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      tileLayerRef.current = L.tileLayer(BASEMAPS.topo.url, {
        attribution: BASEMAPS.topo.attribution,
        maxZoom: 19,
      }).addTo(map);

      map.on("dragstart", () => {
        autoFollowRef.current = false;
        setAutoFollow(false);
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      mounted = false;
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      driverMarkerRef.current = null;
      accuracyCircleRef.current = null;
      originMarkerRef.current = null;
      destMarkerRef.current = null;
      basePlannedLineRef.current = null;
      activeCasingLineRef.current = null;
      activeRoadLineRef.current = null;
      renderedPosRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap tiles cleanly
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = BASEMAPS[basemap];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [basemap, mapReady]);

  // Resilient continuous live Geolocation engine — moves strictly with live GPS, auto-recovers
  // from timeout/unavailable errors, and stays fresh when returning from background apps.
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    let disposed = false;
    let watchId: number | null = null;
    let highAccuracy = true;
    let permissionDenied = false;
    let lastCoordsTimestamp = 0;
    let lastFixWallTime = 0;
    let upgradeTimer: number | null = null;
    let retryTimer: number | null = null;

    const clearCurrentWatch = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const handlePosition = (position: GeolocationPosition) => {
      if (disposed) return;

      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      if (!isValidPair(lat, lng)) return;

      const incomingTs =
        typeof position.timestamp === "number" && Number.isFinite(position.timestamp)
          ? position.timestamp
          : Date.now();
      if (!shouldAcceptGpsTimestamp(lastCoordsTimestamp, incomingTs)) {
        return;
      }
      lastCoordsTimestamp = incomingTs;

      const now = Date.now();
      lastFixWallTime = now;

      const accuracy = Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : null;
      const prevTimed = lastTimedFixRef.current;
      const speedKmh = estimateLiveSpeedKmh({
        coordsSpeedMps: position.coords.speed,
        prev: prevTimed,
        next: { lat, lng, at: now },
      });
      const headingDeg = resolveLiveHeadingDegrees({
        coordsHeading: position.coords.heading,
        speedKmh,
        prev: prevTimed,
        next: { lat, lng },
        fallbackHeading: lastHeadingRef.current,
      });

      lastTimedFixRef.current = { lat, lng, at: now };
      lastHeadingRef.current = headingDeg;

      const telemetry: LiveDriverTelemetry = {
        lat,
        lng,
        accuracy,
        speedKmh,
        headingDeg,
        updatedAt: now,
      };
      driverPosRef.current = telemetry;
      setDriverPos(telemetry);
      setGpsStatus("live");
      setGpsError("");
      onPositionUpdateRef.current?.(telemetry);

      // Sync live driver position to backend immediately on first fix and briskly as driver moves
      if (shouldSyncDriverLocation(lastSyncedPosRef.current, { lat, lng }, now)) {
        lastSyncedPosRef.current = { lat, lng, at: now };
        void driverAPI
          .transitionBooking(bookingId, { action: "location", lat, lng })
          .catch(() => {});
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      if (disposed) return;

      if (err.code === err.PERMISSION_DENIED) {
        permissionDenied = true;
        clearCurrentWatch();
        setGpsStatus("error");
        setGpsError(
          "Location access denied — enable GPS permissions in your browser to track live movement.",
        );
        return;
      }

      // Auto-fallback from high-accuracy GPS to standard accuracy instead of freezing
      if (highAccuracy) {
        startWatch(false);
        if (upgradeTimer != null) window.clearTimeout(upgradeTimer);
        upgradeTimer = window.setTimeout(() => {
          upgradeTimer = null;
          if (!disposed && !permissionDenied) {
            startWatch(true);
          }
        }, GPS_HIGH_ACCURACY_UPGRADE_MS);
        return;
      }

      // Only show error banner if we have no live fix yet, and keep auto-retrying
      if (!driverPosRef.current) {
        setGpsStatus("error");
        setGpsError(
          "Searching for a live GPS signal — retrying automatically when outdoors or moving.",
        );
      }

      if (retryTimer != null) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!disposed && !permissionDenied) {
          startWatch(true);
        }
      }, GPS_ERROR_RETRY_MS);
    };

    const startWatch = (useHighAccuracy: boolean) => {
      if (disposed || permissionDenied) return;
      clearCurrentWatch();
      highAccuracy = useHighAccuracy;

      // Kick off an immediate fresh non-cached fix alongside the continuous watcher
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {
          // Let watchPosition handle fallback/error transitions
        },
        {
          enableHighAccuracy: useHighAccuracy,
          maximumAge: 0,
          timeout: useHighAccuracy ? 10_000 : 12_000,
        },
      );

      watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: useHighAccuracy,
        maximumAge: 0,
        timeout: useHighAccuracy ? 12_000 : 18_000,
      });
    };

    startWatch(true);

    // Watchdog: mobile browsers sometimes throttle watchPosition callbacks — nudge cleanly
    const watchdogId = window.setInterval(() => {
      if (disposed || permissionDenied) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (Date.now() - lastFixWallTime < GPS_STALE_REFRESH_MS) return;

      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {},
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: 0,
          timeout: 8_000,
        },
      );
    }, GPS_WATCHDOG_INTERVAL_MS);

    // Resume live GPS immediately when returning from WhatsApp, phone call, or Google Maps
    const handleResume = () => {
      if (disposed || permissionDenied) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      startWatch(true);
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);

    return () => {
      disposed = true;
      clearCurrentWatch();
      window.clearInterval(watchdogId);
      if (upgradeTimer != null) window.clearTimeout(upgradeTimer);
      if (retryTimer != null) window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
    };
  }, [bookingId, gpsRetryTick]);

  // Render Origin & Destination markers
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    if (originMarkerRef.current) {
      map.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (resolvedOrigin) {
      const originIcon = L.divIcon({
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
        html: `<div class="driver-stop-pin driver-stop-pin--origin"><span>A</span></div>`,
      });
      originMarkerRef.current = L.marker([resolvedOrigin.lat, resolvedOrigin.lng], {
        icon: originIcon,
      })
        .bindPopup(`<strong>Pickup Origin</strong><br/>${originLabel}`)
        .addTo(map);
    }

    if (mode === "to_destination" && resolvedDest) {
      const destIcon = L.divIcon({
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
        html: `<div class="driver-stop-pin driver-stop-pin--dest"><span>B</span></div>`,
      });
      destMarkerRef.current = L.marker([resolvedDest.lat, resolvedDest.lng], {
        icon: destIcon,
      })
        .bindPopup(`<strong>Destination</strong><br/>${destinationLabel || "Drop-off"}`)
        .addTo(map);
    }
  }, [destinationLabel, mapReady, mode, originLabel, resolvedDest, resolvedOrigin]);

  // In "to_destination" mode, draw full planned Origin -> Destination corridor ONCE (never on every GPS tick)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || mode !== "to_destination" || !resolvedOrigin || !resolvedDest) {
      return;
    }

    let active = true;
    routeAPI
      .calculate({
        origin_lat: resolvedOrigin.lat,
        origin_lng: resolvedOrigin.lng,
        destination_lat: resolvedDest.lat,
        destination_lng: resolvedDest.lng,
      })
      .then((res) => {
        if (!active || !mapRef.current || !leafletRef.current) return;
        const geometry: [number, number][] = Array.isArray(res.data?.geometry)
          ? res.data.geometry
          : [
              [resolvedOrigin.lat, resolvedOrigin.lng],
              [resolvedDest.lat, resolvedDest.lng],
            ];
        if (basePlannedLineRef.current) {
          mapRef.current.removeLayer(basePlannedLineRef.current);
        }
        basePlannedLineRef.current = leafletRef.current
          .polyline(geometry, {
            color: "#64748b",
            weight: 4,
            opacity: 0.55,
            dashArray: "7 8",
            lineCap: "round",
          })
          .addTo(mapRef.current);

        // Only preview planned route bounds/metrics while waiting for the first live GPS fix
        if (!driverPosRef.current) {
          const distanceKm = Number(res.data?.distance_km);
          const durationMins = Number(res.data?.duration_mins ?? res.data?.estimated_time_mins);
          if (Number.isFinite(distanceKm) && Number.isFinite(durationMins)) {
            const summary = {
              distanceKm,
              durationMins,
              source: String(res.data?.source ?? "osrm"),
            };
            setRouteMetrics(summary);
            onRouteMetricsRef.current?.(summary);
          }
          if (!hasFittedPlannedRef.current && !hasFramedLiveDriverRef.current && geometry.length >= 2) {
            hasFittedPlannedRef.current = true;
            mapRef.current.fitBounds(basePlannedLineRef.current.getBounds(), {
              padding: [42, 42],
              maxZoom: 15,
            });
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [mapReady, mode, resolvedDest, resolvedOrigin]);

  // Smoothly move & rotate the live driver vehicle marker, accuracy halo, road head & camera
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || !driverPos) return;

    const targetLatLng: [number, number] = [driverPos.lat, driverPos.lng];

    const applyVisualPosition = (lat: number, lng: number) => {
      const pt: [number, number] = [lat, lng];
      driverMarkerRef.current?.setLatLng(pt);
      accuracyCircleRef.current?.setLatLng(pt);
      if (
        activeGeometryRef.current.length >= 2 &&
        activeRoadLineRef.current &&
        activeCasingLineRef.current
      ) {
        const anchored: [number, number][] = [pt, ...activeGeometryRef.current.slice(1)];
        activeCasingLineRef.current.setLatLngs(anchored);
        activeRoadLineRef.current.setLatLngs(anchored);
      }
      renderedPosRef.current = { lat, lng };
    };

    const nextIcon = L.divIcon({
      className: "",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      html: driverMarkerHtml(driverPos.headingDeg),
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(targetLatLng, {
        icon: nextIcon,
        zIndexOffset: 900,
      })
        .bindPopup("<strong>Your live moving location</strong>")
        .addTo(map);
      renderedPosRef.current = { lat: driverPos.lat, lng: driverPos.lng };
    } else {
      driverMarkerRef.current.setIcon(nextIcon);
    }

    if (driverPos.accuracy && driverPos.accuracy > 5) {
      const radius = Math.min(driverPos.accuracy, 220);
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(targetLatLng, {
          radius,
          color: "#08428c",
          weight: 1,
          fillColor: "#08428c",
          fillOpacity: 0.1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setRadius(radius);
      }
    }

    // Smoothly glide the live marker from previous rendered coordinate to new live GPS fix
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const from = renderedPosRef.current;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const movedMeters = from ? haversineMeters(from.lat, from.lng, driverPos.lat, driverPos.lng) : 0;

    if (!from || prefersReducedMotion || movedMeters < 0.5 || movedMeters > 2_000) {
      applyVisualPosition(driverPos.lat, driverPos.lng);
    } else {
      const startLat = from.lat;
      const startLng = from.lng;
      const startTime = performance.now();

      const step = (now: number) => {
        if (!isMountedRef.current || !driverMarkerRef.current) {
          animFrameRef.current = null;
          return;
        }
        const progress = Math.min(1, (now - startTime) / MARKER_GLIDE_DURATION_MS);
        // Ease-out cubic for natural vehicle motion
        const eased = 1 - (1 - progress) ** 3;
        const curLat = startLat + (driverPos.lat - startLat) * eased;
        const curLng = startLng + (driverPos.lng - startLng) * eased;
        applyVisualPosition(curLat, curLng);
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    }

    // Follow live driver movement smoothly — never stay stuck on an old view
    if (autoFollowRef.current) {
      if (!hasFramedLiveDriverRef.current) {
        hasFramedLiveDriverRef.current = true;
        map.setView(targetLatLng, Math.max(map.getZoom(), 15), {
          animate: true,
          duration: 0.7,
        });
      } else {
        map.panTo(targetLatLng, {
          animate: true,
          duration: 0.65,
          easeLinearity: 0.4,
        });
      }
    }
  }, [driverPos, mapReady]);

  // Recalculate live road polyline from driver's moving GPS -> target without cancelling in-flight requests on GPS ticks
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || !driverPos || !targetPoint) return;

    const now = Date.now();
    if (!shouldRecalculateLiveRoute(lastRoutedPosRef.current, driverPos, now)) {
      return;
    }

    lastRoutedPosRef.current = { lat: driverPos.lat, lng: driverPos.lng, at: now };
    const reqId = ++routeSeqRef.current;
    setRouting(true);

    routeAPI
      .calculate({
        origin_lat: driverPos.lat,
        origin_lng: driverPos.lng,
        destination_lat: targetPoint.lat,
        destination_lng: targetPoint.lng,
      })
      .then((res) => {
        if (!isMountedRef.current || reqId !== routeSeqRef.current || !mapRef.current || !leafletRef.current) {
          return;
        }
        const liveNow = renderedPosRef.current ?? driverPosRef.current ?? driverPos;
        const currentLatLng: [number, number] = [liveNow.lat, liveNow.lng];
        const rawGeometry: [number, number][] = Array.isArray(res.data?.geometry)
          ? res.data.geometry
          : [currentLatLng, [targetPoint.lat, targetPoint.lng]];
        const geometry: [number, number][] =
          rawGeometry.length >= 2 ? [currentLatLng, ...rawGeometry.slice(1)] : rawGeometry;

        activeGeometryRef.current = geometry;
        const lineColor = mode === "to_origin" ? "#08428c" : "#0f766e";

        if (!activeCasingLineRef.current) {
          activeCasingLineRef.current = leafletRef.current
            .polyline(geometry, {
              color: "#ffffff",
              weight: 8.5,
              opacity: 0.92,
              lineCap: "round",
              lineJoin: "round",
            })
            .addTo(mapRef.current);
        } else {
          activeCasingLineRef.current.setLatLngs(geometry);
        }

        if (!activeRoadLineRef.current) {
          activeRoadLineRef.current = leafletRef.current
            .polyline(geometry, {
              color: lineColor,
              weight: 4.8,
              opacity: 0.98,
              lineCap: "round",
              lineJoin: "round",
            })
            .addTo(mapRef.current);
        } else {
          activeRoadLineRef.current.setLatLngs(geometry);
          activeRoadLineRef.current.setStyle({ color: lineColor });
        }

        const distanceKm = Number(res.data?.distance_km);
        const durationMins = Number(res.data?.duration_mins ?? res.data?.estimated_time_mins);
        if (Number.isFinite(distanceKm) && Number.isFinite(durationMins)) {
          const summary: LiveRouteSummary = {
            distanceKm,
            durationMins,
            source: String(res.data?.source ?? "osrm"),
          };
          setRouteMetrics(summary);
          onRouteMetricsRef.current?.(summary);
        }
      })
      .catch(() => {
        if (reqId === routeSeqRef.current) {
          lastRoutedPosRef.current = null;
        }
      })
      .finally(() => {
        if (isMountedRef.current && reqId === routeSeqRef.current) {
          setRouting(false);
        }
      });
  }, [driverPos, mapReady, mode, targetPoint]);

  const handleFitRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setAutoFollow(false);
    autoFollowRef.current = false;
    if (activeRoadLineRef.current) {
      map.fitBounds(activeRoadLineRef.current.getBounds(), { padding: [46, 46], maxZoom: 16 });
      return;
    }
    if (basePlannedLineRef.current) {
      map.fitBounds(basePlannedLineRef.current.getBounds(), { padding: [46, 46], maxZoom: 16 });
      return;
    }
    if (targetPoint) {
      map.setView([targetPoint.lat, targetPoint.lng], 14, { animate: true });
    }
  }, [targetPoint]);

  const handleFollowToggle = useCallback(() => {
    const next = !autoFollow;
    setAutoFollow(next);
    autoFollowRef.current = next;
    if (next && driverPosRef.current && mapRef.current) {
      hasFramedLiveDriverRef.current = true;
      mapRef.current.setView(
        [driverPosRef.current.lat, driverPosRef.current.lng],
        Math.max(mapRef.current.getZoom(), 15),
        { animate: true },
      );
    }
  }, [autoFollow]);

  const externalNavUrl = useMemo(() => {
    if (!targetPoint) return null;
    const params = new URLSearchParams({
      api: "1",
      destination: `${targetPoint.lat},${targetPoint.lng}`,
      travelmode: "driving",
    });
    if (driverPos) {
      params.set("origin", `${driverPos.lat},${driverPos.lng}`);
    } else if (mode === "to_destination" && resolvedOrigin) {
      params.set("origin", `${resolvedOrigin.lat},${resolvedOrigin.lng}`);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [driverPos, mode, resolvedOrigin, targetPoint]);

  return (
    <div className={styles.mapShell}>
      <div className={styles.mapCanvasWrap}>
        <div ref={containerRef} className={styles.mapCanvas} aria-label="Live driver road route map" />

        <div className={styles.topOverlay}>
          <div className={styles.gpsPill} role="status" aria-live="polite">
            <span
              className={`${styles.gpsDot} ${
                gpsStatus === "searching"
                  ? styles.gpsDotSearching
                  : gpsStatus === "error"
                    ? styles.gpsDotError
                    : ""
              }`}
              aria-hidden="true"
            />
            <span>
              {gpsStatus === "live"
                ? "Live GPS"
                : gpsStatus === "searching"
                  ? "Locating live GPS…"
                  : "GPS paused"}
            </span>
            {gpsStatus === "live" && driverPos?.accuracy ? (
              <span className={styles.gpsMeta}>±{driverPos.accuracy}m</span>
            ) : null}
            {gpsStatus === "live" && driverPos?.speedKmh != null && driverPos.speedKmh > 0 ? (
              <span className={styles.gpsMeta}>· {driverPos.speedKmh} km/h</span>
            ) : null}
          </div>

          <div className={styles.mapControls}>
            <button
              type="button"
              className={`${styles.mapCtrlBtn} ${autoFollow ? styles.mapCtrlBtnActive : ""}`}
              onClick={handleFollowToggle}
              aria-pressed={autoFollow}
              title="Follow my live moving location"
            >
              <Crosshair size={14} aria-hidden="true" />
              {autoFollow ? "Following" : "Follow live"}
            </button>
            <button
              type="button"
              className={styles.mapCtrlBtn}
              onClick={handleFitRoute}
              title="Fit full route"
            >
              <Maximize2 size={14} aria-hidden="true" />
              Route
            </button>
            <button
              type="button"
              className={styles.mapCtrlBtn}
              onClick={() => setBasemap((prev) => (prev === "topo" ? "satellite" : "topo"))}
              title="Switch map layer"
            >
              <Layers size={14} aria-hidden="true" />
              {basemap === "topo" ? "Satellite" : "Map"}
            </button>
            {externalNavUrl ? (
              <a
                href={externalNavUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.mapCtrlBtn}
                title="Open in Google Maps"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Nav
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {gpsError ? (
        <div className={styles.gpsWarningBar} role="alert">
          <span className={styles.gpsWarningText}>
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{gpsError}</span>
          </span>
          <button
            type="button"
            className={styles.retryGpsBtn}
            onClick={() => {
              setGpsStatus("searching");
              setGpsError("");
              setGpsRetryTick((n) => n + 1);
            }}
          >
            <RefreshCw size={13} aria-hidden="true" />
            Retry GPS
          </button>
        </div>
      ) : null}

      <div className={styles.telemetryBar}>
        <div className={styles.telemetryCell}>
          <span className={styles.telemetryLabel}>
            {mode === "to_origin" ? "To pickup" : "Remaining"}
          </span>
          <strong className={`${styles.telemetryValue} ${styles.telemetryValueLive}`}>
            {routeMetrics ? formatDistanceLabel(routeMetrics.distanceKm) : routing ? "Updating…" : "—"}
          </strong>
        </div>

        <div className={styles.telemetryCell}>
          <span className={styles.telemetryLabel}>Live ETA</span>
          <strong className={styles.telemetryValue}>
            {routeMetrics ? formatDurationLabel(routeMetrics.durationMins) : "—"}
          </strong>
        </div>

        <div className={styles.telemetryCell}>
          <span className={styles.telemetryLabel}>Road tracking</span>
          <strong className={styles.telemetryValue}>
            {gpsStatus === "live" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Navigation size={13} aria-hidden="true" />
                {driverPos?.speedKmh != null && driverPos.speedKmh >= 3
                  ? "Live moving"
                  : routeMetrics?.source === "osrm"
                    ? "Live road"
                    : "Live GPS"}
              </span>
            ) : (
              "Locating…"
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}
