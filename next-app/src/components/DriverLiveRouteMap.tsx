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
  formatDistanceLabel,
  formatDurationLabel,
  haversineMeters,
} from "@/lib/driver-workflow";
import styles from "@/components/driver-live-map.module.css";

type LatLngPoint = { lat: number; lng: number };

export type LiveDriverTelemetry = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speedKmh: number | null;
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
  initialDriverLat?: number | null;
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
const REROUTE_MIN_METERS = 25;
const REROUTE_MIN_INTERVAL_MS = 5_500;
const SYNC_MIN_METERS = 40;
const SYNC_MIN_INTERVAL_MS = 15_000;

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

export default function DriverLiveRouteMap({
  mode,
  bookingId,
  originLat,
  originLng,
  originLabel,
  destinationLat,
  destinationLng,
  destinationLabel,
  initialDriverLat,
  initialDriverLng,
  onPositionUpdate,
  onRouteMetrics,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);

  const driverMarkerRef = useRef<Leaflet.Marker | null>(null);
  const accuracyCircleRef = useRef<Leaflet.Circle | null>(null);
  const originMarkerRef = useRef<Leaflet.Marker | null>(null);
  const destMarkerRef = useRef<Leaflet.Marker | null>(null);
  const basePlannedLineRef = useRef<Leaflet.Polyline | null>(null);
  const activeCasingLineRef = useRef<Leaflet.Polyline | null>(null);
  const activeRoadLineRef = useRef<Leaflet.Polyline | null>(null);

  const lastRoutedPosRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const lastSyncedPosRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const hasAutoFittedRef = useRef(false);
  const autoFollowRef = useRef(true);
  const activeGeometryRef = useRef<[number, number][]>([]);

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
  const [driverPos, setDriverPos] = useState<LiveDriverTelemetry | null>(() =>
    isValidPair(initialDriverLat, initialDriverLng)
      ? { lat: initialDriverLat!, lng: initialDriverLng!, accuracy: null, speedKmh: null }
      : null,
  );
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

  // Live Geolocation watchPosition — tracks driver movement continuously
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null;
        const speedKmh =
          typeof position.coords.speed === "number" &&
          Number.isFinite(position.coords.speed) &&
          position.coords.speed >= 0
            ? Math.round(position.coords.speed * 3.6)
            : null;

        const telemetry: LiveDriverTelemetry = { lat, lng, accuracy, speedKmh };
        setDriverPos(telemetry);
        setGpsStatus("live");
        setGpsError("");
        onPositionUpdateRef.current?.(telemetry);

        // Throttled live location sync to backend so company & booking stay current
        const now = Date.now();
        const prevSync = lastSyncedPosRef.current;
        const movedEnough =
          !prevSync || haversineMeters(prevSync.lat, prevSync.lng, lat, lng) >= SYNC_MIN_METERS;
        const elapsedEnough = !prevSync || now - prevSync.at >= SYNC_MIN_INTERVAL_MS;

        if (movedEnough && elapsedEnough) {
          lastSyncedPosRef.current = { lat, lng, at: now };
          void driverAPI
            .transitionBooking(bookingId, { action: "location", lat, lng })
            .catch(() => {});
        }
      },
      (err) => {
        setGpsStatus("error");
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied — enable GPS permissions for live turn-by-turn tracking."
            : "Could not acquire live GPS signal. Tap Retry GPS when outdoors or moving.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3_000,
        timeout: 15_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
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

  // In "to_destination" mode, draw full planned Origin -> Destination road corridor underneath
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

        // If driver hasn't acquired live GPS yet, show the full planned route metrics & bounds
        if (!driverPos) {
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
          if (!hasAutoFittedRef.current && geometry.length >= 2) {
            hasAutoFittedRef.current = true;
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
  }, [driverPos, mapReady, mode, resolvedDest, resolvedOrigin]);

  // Update live Driver Vehicle Marker + GPS accuracy halo + Dynamic Road Polyline on every move
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || !driverPos) return;

    const currentLatLng: [number, number] = [driverPos.lat, driverPos.lng];

    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        html: `<div class="driver-live-marker"><span class="driver-live-marker__pulse"></span><span class="driver-live-marker__core">●</span></div>`,
      });
      driverMarkerRef.current = L.marker(currentLatLng, {
        icon: driverIcon,
        zIndexOffset: 900,
      })
        .bindPopup("<strong>Your live location</strong>")
        .addTo(map);
    } else {
      driverMarkerRef.current.setLatLng(currentLatLng);
    }

    if (driverPos.accuracy && driverPos.accuracy > 5) {
      const radius = Math.min(driverPos.accuracy, 220);
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(currentLatLng, {
          radius,
          color: "#08428c",
          weight: 1,
          fillColor: "#08428c",
          fillOpacity: 0.1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng(currentLatLng);
        accuracyCircleRef.current.setRadius(radius);
      }
    }

    // Immediately anchor the start of any existing road line to the driver's live position
    if (activeGeometryRef.current.length >= 2 && activeRoadLineRef.current && activeCasingLineRef.current) {
      const anchored: [number, number][] = [currentLatLng, ...activeGeometryRef.current.slice(1)];
      activeCasingLineRef.current.setLatLngs(anchored);
      activeRoadLineRef.current.setLatLngs(anchored);
    }

    if (autoFollowRef.current && hasAutoFittedRef.current) {
      map.panTo(currentLatLng, { animate: true, duration: 0.6 });
    }

    if (!targetPoint) return;

    // Recalculate live road polyline from driver's current GPS -> target whenever moved >= 25m
    const now = Date.now();
    const prev = lastRoutedPosRef.current;
    const shouldRecalculate =
      !prev ||
      (haversineMeters(prev.lat, prev.lng, driverPos.lat, driverPos.lng) >= REROUTE_MIN_METERS &&
        now - prev.at >= REROUTE_MIN_INTERVAL_MS);

    if (!shouldRecalculate) return;

    lastRoutedPosRef.current = { lat: driverPos.lat, lng: driverPos.lng, at: now };
    let active = true;
    setRouting(true);

    routeAPI
      .calculate({
        origin_lat: driverPos.lat,
        origin_lng: driverPos.lng,
        destination_lat: targetPoint.lat,
        destination_lng: targetPoint.lng,
      })
      .then((res) => {
        if (!active || !mapRef.current || !leafletRef.current) return;
        const geometry: [number, number][] = Array.isArray(res.data?.geometry)
          ? res.data.geometry
          : [currentLatLng, [targetPoint.lat, targetPoint.lng]];

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

        if (!hasAutoFittedRef.current && activeRoadLineRef.current) {
          hasAutoFittedRef.current = true;
          mapRef.current.fitBounds(activeRoadLineRef.current.getBounds(), {
            padding: [48, 48],
            maxZoom: 16,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRouting(false);
      });

    return () => {
      active = false;
    };
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
    if (next && driverPos && mapRef.current) {
      mapRef.current.setView([driverPos.lat, driverPos.lng], Math.max(mapRef.current.getZoom(), 15), {
        animate: true,
      });
    }
  }, [autoFollow, driverPos]);

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
                  ? "Locating GPS…"
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
              title="Follow my live location"
            >
              <Crosshair size={14} aria-hidden="true" />
              Follow
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
                {routeMetrics?.source === "osrm" ? "Live road" : "Live GPS"}
              </span>
            ) : (
              "Standby"
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}
