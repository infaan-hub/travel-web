"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader,
  Locate,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import TripPlaceMapPicker from "@/components/TripPlaceMapPicker";
import { companyAPI } from "@/lib/api/client";
import { findTripPlace, type TripPlace } from "@/lib/trips";
import { isInZanzibar } from "@/lib/zanzibar";
import styles from "@/features/pages/company-trips.module.css";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "recent", label: "Recently updated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

type CompanyTrip = {
  id: number;
  title: string;
  place: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  price: string | null;
  image_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TripForm = {
  title: string;
  place: string;
  description: string;
  price: string;
  latitude: string;
  longitude: string;
};

const EMPTY_FORM: TripForm = {
  title: "",
  place: "",
  description: "",
  price: "",
  latitude: "",
  longitude: "",
};

function priceValue(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function coordinateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: string | null) {
  const amount = priceValue(value);
  if (amount === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function formatCurrency(amount: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
}

function formatDate(value: string | null | undefined, prefix: string) {
  if (!value) return `${prefix} recently`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${prefix} recently`;
  return `${prefix} ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

function tripTimestamp(trip: CompanyTrip) {
  const raw = trip.updated_at ?? trip.created_at;
  const time = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function sortTrips(rows: CompanyTrip[], sort: SortValue) {
  const sorted = [...rows];
  if (sort === "title") {
    return sorted.sort((a, b) =>
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
    );
  }
  if (sort === "price-asc" || sort === "price-desc") {
    const direction = sort === "price-asc" ? 1 : -1;
    return sorted.sort((a, b) => {
      const priceA = priceValue(a.price);
      const priceB = priceValue(b.price);
      if (priceA === null && priceB === null) {
        return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
      }
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return (priceA - priceB) * direction;
    });
  }
  return sorted.sort((a, b) => tripTimestamp(b) - tripTimestamp(a));
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error) {
    const candidate = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
          errors?: Record<string, string[] | string>;
        };
      };
    };
    const data = candidate.response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    const firstError = data?.errors ? Object.values(data.errors)[0] : null;
    if (Array.isArray(firstError) && firstError[0]) return firstError[0];
    if (typeof firstError === "string" && firstError) return firstError;
  }
  return "The trip could not be saved. Please try again.";
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function CompanyTripsPage() {
  const toast = useToast();
  const [trips, setTrips] = useState<CompanyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortValue>("recent");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<CompanyTrip | null>(null);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const composerRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrl = useRef<string | null>(null);

  const fetchTrips = useCallback(async () => {
    const response = await companyAPI.trips();
    const payload = response.data;
    return (Array.isArray(payload) ? payload : payload?.results ?? []) as CompanyTrip[];
  }, []);

  useEffect(() => {
    let active = true;

    fetchTrips()
      .then((rows) => {
        if (!active) return;
        setTrips(rows);
        setError(null);
      })
      .catch(() => {
        if (active) {
          setError("Company trips could not be loaded. Please try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchTrips, reloadKey]);

  const refreshTrips = useCallback(async () => {
    const rows = await fetchTrips();
    setTrips(rows);
    setError(null);
  }, [fetchTrips]);

  const releasePreviewUrl = useCallback(() => {
    if (!previewObjectUrl.current) return;
    URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
  }, []);

  useEffect(() => releasePreviewUrl, [releasePreviewUrl]);

  const search = searchInput.trim().toLowerCase();

  const filteredTrips = useMemo(() => {
    const rows = search
      ? trips.filter((trip) =>
          [trip.title, trip.place, trip.description ?? ""].some((value) =>
            value.toLowerCase().includes(search),
          ),
        )
      : trips;
    return sortTrips(rows, sort);
  }, [trips, search, sort]);

  const total = filteredTrips.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageTrips = filteredTrips.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, rangeStart + pageTrips.length - 1);

  const pricedTrips = filteredTrips
    .map((trip) => priceValue(trip.price))
    .filter((amount): amount is number => amount !== null);
  const averagePrice = pricedTrips.length
    ? pricedTrips.reduce((sum, amount) => sum + amount, 0) / pricedTrips.length
    : null;
  const placeCount = new Set(
    filteredTrips
      .map((trip) => trip.place.trim().toLowerCase())
      .filter(Boolean),
  ).size;

  const isFiltered = Boolean(search);
  const isAdjusted = isFiltered || sort !== "recent";

  const clearForm = useCallback(() => {
    releasePreviewUrl();
    setEditing(null);
    setForm(EMPTY_FORM);
    setImage(null);
    setPreview(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [releasePreviewUrl]);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      titleInputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const startCreate = useCallback(() => {
    clearForm();
    focusComposer();
  }, [clearForm, focusComposer]);

  const editTrip = (trip: CompanyTrip) => {
    releasePreviewUrl();
    const datasetPlace =
      findTripPlace(trip.place) ??
      findTripPlace(trip.place.split(",")[0] ?? "");
    const latitude = trip.latitude ?? datasetPlace?.latitude ?? null;
    const longitude = trip.longitude ?? datasetPlace?.longitude ?? null;
    setEditing(trip);
    setForm({
      title: trip.title,
      place: trip.place,
      description: trip.description ?? "",
      price: trip.price ?? "",
      latitude: latitude === null ? "" : latitude.toFixed(6),
      longitude: longitude === null ? "" : longitude.toFixed(6),
    });
    setImage(null);
    setPreview(trip.image_url);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    focusComposer();
  };

  const selectTripPlace = useCallback((place: TripPlace) => {
    const label = place.name.toLowerCase().includes(place.area.toLowerCase())
      ? place.name
      : `${place.name}, ${place.area}`;
    setForm((current) => ({
      ...current,
      place: label,
      latitude: place.latitude.toFixed(6),
      longitude: place.longitude.toFixed(6),
    }));
    setFormError(null);
  }, []);

  const pickTripPoint = useCallback((latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    setFormError(null);
  }, []);

  const clearTripPoint = useCallback(() => {
    setForm((current) => ({
      ...current,
      latitude: "",
      longitude: "",
    }));
  }, []);

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    releasePreviewUrl();
    setFormError(null);

    if (!file) {
      setImage(null);
      setPreview(editing?.image_url ?? null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setImage(null);
      setPreview(editing?.image_url ?? null);
      setFormError("Choose an image no larger than 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrl.current = objectUrl;
    setImage(file);
    setPreview(objectUrl);
  };

  const saveTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const place = form.place.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (!title) {
      setFormError("Enter a name for this trip.");
      titleInputRef.current?.focus();
      return;
    }
    if (!place) {
      setFormError("Enter the place this trip visits.");
      return;
    }
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price of 0 or more.");
      return;
    }

    const latitude = coordinateValue(form.latitude);
    const longitude = coordinateValue(form.longitude);
    if ((latitude === null) !== (longitude === null)) {
      setFormError("Pick the trip location again on the map.");
      return;
    }
    if (
      latitude !== null &&
      longitude !== null &&
      !isInZanzibar(latitude, longitude)
    ) {
      setFormError("The map pin must be inside Zanzibar.");
      return;
    }

    if (!editing && !image) {
      setFormError("Choose a JPG, PNG or WebP image for this trip.");
      fileInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const data = new FormData();
      data.append("title", title);
      data.append("place", place);
      data.append("description", description);
      data.append("price", String(price));
      if (latitude !== null && longitude !== null) {
        data.append("latitude", String(latitude));
        data.append("longitude", String(longitude));
      } else if (editing) {
        // Explicit empty values clear a previously saved pin.
        data.append("latitude", "");
        data.append("longitude", "");
      }
      if (image) data.append("image", image);

      if (editing) {
        await companyAPI.updateTrip(editing.id, data);
        toast.success("Trip updated.");
      } else {
        await companyAPI.createTrip(data);
        toast.success("Trip created.");
        setPage(1);
      }

      clearForm();
      try {
        await refreshTrips();
      } catch {
        toast.error("The trip was saved, but the list could not be refreshed.");
      }
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (trip: CompanyTrip) => {
    if (!window.confirm(`Delete "${trip.title}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(trip.id);
    try {
      await companyAPI.deleteTrip(trip.id);
      setTrips((rows) => rows.filter((row) => row.id !== trip.id));
      toast.success("Trip deleted.");
      if (editing?.id === trip.id) clearForm();
      void refreshTrips().catch(() => {
        toast.error("The list could not be refreshed. Reload the page to try again.");
      });
    } catch {
      toast.error("The trip could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetView = () => {
    setSearchInput("");
    setSort("recent");
    setPage(1);
  };

  const emptyTitle = isFiltered ? "No matching trips" : "No trips yet";
  const emptyCopy = isFiltered
    ? `No trips match “${searchInput.trim()}”. Try a different title, place or description.`
    : "Add the first place-based listing above. It will appear on this company's public profile.";

  return (
    <div id="trips-workspace" className={styles.tripsRoot}>
      <header className={styles.tripsMasthead}>
        <div className={styles.tripsMastheadText}>
          <nav className={styles.tripsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span className={styles.tripsBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.tripsBreadcrumbCurrent}>Trips</span>
          </nav>
          <p className={styles.tripsEyebrow}>Company workspace</p>
          <h1 className={styles.tripsTitle}>Trips</h1>
          <p className={styles.tripsLead}>
            Standalone place-based listings shown on your public company profile.
            Add a photo and price, then keep every destination up to date from
            this page.
          </p>
        </div>
        <div className={styles.tripsActions}>
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            <Plus size={16} /> Add trip
          </button>
        </div>
      </header>

      <section className={styles.tripsHero} aria-label="Catalogue overview">
        <div className={styles.tripsHeroMain}>
          <div className={styles.tripsHeroHead}>
            <span className={styles.tripsHeroIcon} aria-hidden="true">
              <MapPin size={23} />
            </span>
            <div>
              <h2 className={styles.tripsHeroTitle}>Trip catalogue</h2>
              <p className={styles.tripsHeroCopy}>
                Every trip below belongs to your active company and appears on
                its public profile. Search, sort and manage the listings without
                leaving this page.
              </p>
            </div>
          </div>
          <ul className={styles.tripsStatRow}>
            <li className={styles.tripsStat}>
              <span className={styles.tripsStatLabel}>Results</span>
              <span className={styles.tripsStatValue}>{total}</span>
              <span className={styles.tripsStatHint}>
                {isFiltered ? "After search" : "Whole catalogue"}
              </span>
            </li>
            <li className={styles.tripsStat}>
              <span className={styles.tripsStatLabel}>Average price</span>
              <span className={styles.tripsStatValue}>
                {averagePrice === null ? "—" : formatCurrency(averagePrice)}
              </span>
              <span className={styles.tripsStatHint}>
                {pricedTrips.length
                  ? `Across ${pricedTrips.length} priced trip${
                      pricedTrips.length === 1 ? "" : "s"
                    }`
                  : "No prices set"}
              </span>
            </li>
            <li className={styles.tripsStat}>
              <span className={styles.tripsStatLabel}>Places</span>
              <span className={styles.tripsStatValue}>{placeCount}</span>
              <span className={styles.tripsStatHint}>Unique destinations</span>
            </li>
          </ul>
        </div>
        <aside className={styles.tripsAside}>
          <div className={styles.tripsAsideMain}>
            <p className={styles.tripsAsideLabel}>Catalogue size</p>
            <p className={styles.tripsAsideValue}>
              {total} <span>trip{total === 1 ? "" : "s"}</span>
            </p>
            <p className={styles.tripsAsideCopy}>
              {isFiltered
                ? "match the current search. Clear it to see the whole catalogue."
                : "in this company's catalogue. Trips are published alongside your tours and company profile."}
            </p>
          </div>
          <button
            className={styles.tripsAsideCta}
            type="button"
            onClick={startCreate}
          >
            <Plus size={15} /> Add a trip
          </button>
        </aside>
      </section>

      <section
        id="trip-composer"
        ref={composerRef}
        className={`${styles.tripsComposer} ${
          editing ? styles.tripsComposerEditing : ""
        }`}
        aria-labelledby="trip-composer-title"
      >
        <div className={styles.tripsComposerHead}>
          <div className={styles.tripsComposerTitleWrap}>
            <span className={styles.tripsComposerIcon} aria-hidden="true">
              {editing ? <Pencil size={20} /> : <Plus size={20} />}
            </span>
            <div>
              <p className={styles.tripsComposerEyebrow}>
                {editing ? "Editing listing" : "New listing"}
              </p>
              <h2 className={styles.tripsComposerTitle} id="trip-composer-title">
                {editing ? editing.title : "Add a trip to your catalogue"}
              </h2>
              <p className={styles.tripsComposerCopy}>
                {editing
                  ? "Update the details visitors see on the public company profile. Choose a new image only if you want to replace the current one."
                  : "Create a standalone place-based listing. Every new trip needs a name, place, price and photo."}
              </p>
            </div>
          </div>
          <span className={styles.tripsComposerMode}>
            {editing ? `Trip #${editing.id}` : "Draft"}
          </span>
        </div>

        <form className={styles.tripsForm} onSubmit={saveTrip}>
          <div className={styles.tripsFormGrid}>
            <div className={`${styles.tripsField} ${styles.tripsFieldTitle}`}>
              <label className={styles.tripsFieldLabel} htmlFor="trip-title">
                Trip name{" "}
                <span className={styles.tripsRequired} aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="trip-title"
                ref={titleInputRef}
                className={styles.tripsInput}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Sunrise hike to Mount Batur"
                autoComplete="off"
                maxLength={200}
                required
              />
            </div>

            <div className={styles.tripsField}>
              <label className={styles.tripsFieldLabel} htmlFor="trip-place">
                Place{" "}
                <span className={styles.tripsRequired} aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="trip-place"
                className={styles.tripsInput}
                value={form.place}
                onChange={(event) =>
                  setForm({ ...form, place: event.target.value })
                }
                placeholder="e.g. Bali, Indonesia"
                autoComplete="off"
                maxLength={200}
                required
              />
            </div>

            <div className={styles.tripsField}>
              <label className={styles.tripsFieldLabel} htmlFor="trip-price">
                Price (USD){" "}
                <span className={styles.tripsRequired} aria-hidden="true">
                  *
                </span>
              </label>
              <div className={styles.tripsMoney}>
                <span className={styles.tripsMoneySymbol} aria-hidden="true">
                  $
                </span>
                <input
                  id="trip-price"
                  className={styles.tripsInput}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className={`${styles.tripsField} ${styles.tripsFieldWide}`}>
              <div className={styles.tripsFieldHead}>
                <label
                  className={styles.tripsFieldLabel}
                  htmlFor="trip-description"
                >
                  Description
                </label>
                <span className={styles.tripsCounter}>
                  {form.description.length.toLocaleString("en-US")} / 5,000
                </span>
              </div>
              <textarea
                id="trip-description"
                className={styles.tripsTextarea}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="What makes this place worth visiting?"
                rows={3}
                maxLength={5000}
              />
            </div>

            <div className={`${styles.tripsField} ${styles.tripsMapField}`}>
              <div className={styles.tripsFieldHead}>
                <span className={styles.tripsFieldLabel}>
                  <MapPin size={14} aria-hidden="true" /> Zanzibar location map
                </span>
                <span className={styles.tripsFieldHint}>
                  Pick a place to fill the place name and coordinates
                </span>
              </div>
              <TripPlaceMapPicker
                latitude={coordinateValue(form.latitude)}
                longitude={coordinateValue(form.longitude)}
                disabled={saving}
                onSelectPlace={selectTripPlace}
                onPickPoint={pickTripPoint}
                onClearPoint={clearTripPoint}
              />
            </div>

            <div className={`${styles.tripsField} ${styles.tripsMediaField}`}>
              <span className={styles.tripsFieldLabel}>
                Listing image{" "}
                {editing ? (
                  <span className={styles.tripsFieldHint}>(optional)</span>
                ) : (
                  <span className={styles.tripsRequired} aria-hidden="true">
                    *
                  </span>
                )}
              </span>
              <div className={styles.tripsMediaRow}>
                <div className={styles.tripsUpload}>
                  <input
                    id="trip-image"
                    ref={fileInputRef}
                    className={styles.tripsFileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onImage}
                    aria-label="Listing image"
                    aria-describedby="trip-image-hint"
                  />
                  <label className={styles.tripsFileButton} htmlFor="trip-image">
                    <Upload size={15} />
                    {image
                      ? "Change image"
                      : editing
                        ? "Replace image"
                        : "Choose image"}
                  </label>
                  <div className={styles.tripsUploadMeta}>
                    <span className={styles.tripsFileName}>
                      {image
                        ? image.name
                        : editing
                          ? "Keeping the current image"
                          : "No file selected"}
                    </span>
                    <span className={styles.tripsFieldHint} id="trip-image-hint">
                      JPG, PNG or WebP; maximum 5 MB.
                    </span>
                  </div>
                </div>
                <div className={styles.tripsPreview}>
                  {preview ? (
                    <Image
                      className={styles.tripsPreviewImg}
                      src={preview}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 300px"
                      unoptimized
                    />
                  ) : (
                    <span className={styles.tripsPreviewEmpty}>
                      <ImageIcon size={22} aria-hidden="true" />
                      <span>Image preview</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {formError ? (
            <p className={styles.tripsFormError} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{formError}</span>
            </p>
          ) : null}

          <div className={styles.tripsFormActions}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? (
                <span className={styles.tripsSpin}>
                  <Loader size={16} />
                </span>
              ) : (
                <Save size={16} />
              )}
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create trip"}
            </button>
            {editing ? (
              <button
                className="btn btn-outline"
                type="button"
                onClick={clearForm}
                disabled={saving}
              >
                <X size={16} /> Cancel edit
              </button>
            ) : (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={clearForm}
                disabled={saving}
              >
                <X size={16} /> Clear
              </button>
            )}
            <span className={styles.tripsFormNote}>
              Saved trips appear immediately on your public company profile.
            </span>
          </div>
        </form>
      </section>

      <section className={styles.tripsControls} aria-label="Search and sort trips">
        <div className={styles.tripsControlsTop}>
          <div className={styles.tripsSearch}>
            <span className={styles.tripsSearchIcon} aria-hidden="true">
              <Search size={16} />
            </span>
            <label className={styles.tripsSrOnly} htmlFor="trip-search">
              Search trips
            </label>
            <input
              id="trip-search"
              className={styles.tripsSearchInput}
              type="search"
              placeholder="Search by title, place or description…"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              autoComplete="off"
              maxLength={200}
            />
            {searchInput ? (
              <button
                className={styles.tripsSearchClear}
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                }}
                aria-label="Clear trip search"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
          <div className={styles.tripsControlsMeta}>
            <p className={styles.tripsCount} role="status" aria-live="polite">
              <strong>{total}</strong> trip{total === 1 ? "" : "s"}
              {isFiltered ? " match" : " listed"}
            </p>
          </div>
        </div>
        <div className={styles.tripsFilters}>
          <span className={styles.tripsSortLabel}>Sort</span>
          <div
            className={styles.tripsFilterScroll}
            role="group"
            aria-label="Sort trips"
          >
            {SORT_OPTIONS.map((option) => {
              const active = sort === option.value;
              return (
                <button
                  key={option.value}
                  className={`${styles.tripsFilter} ${
                    active ? styles.tripsFilterActive : ""
                  }`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSort(option.value);
                    setPage(1);
                  }}
                >
                  {active ? (
                    <span className={styles.tripsFilterDot} aria-hidden="true" />
                  ) : null}
                  {option.label}
                </button>
              );
            })}
          </div>
          {isAdjusted ? (
            <button className={styles.tripsReset} type="button" onClick={resetView}>
              Reset view
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div
          className={`${styles.tripsState} ${styles.tripsStateDanger}`}
          role="alert"
        >
          <span className={styles.tripsStateIcon} aria-hidden="true">
            <AlertCircle size={22} />
          </span>
          <h2 className={styles.tripsStateTitle}>Trips unavailable</h2>
          <p className={styles.tripsStateCopy}>{error}</p>
          <div className={styles.tripsStateActions}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                setReloadKey((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className={styles.tripsGridWrap} role="status">
          <span className={styles.tripsSrOnly}>Loading company trips…</span>
          <ul className={styles.tripsGrid} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li className={styles.tripsSkeleton} key={index}>
                <div className={styles.tripsSkeletonMedia} />
                <div className={styles.tripsSkeletonBody}>
                  <div
                    className={`${styles.tripsSkeletonLine} ${styles.tripsSkeletonTitle}`}
                  />
                  <div
                    className={`${styles.tripsSkeletonLine} ${styles.tripsSkeletonLineMedium}`}
                  />
                  <div
                    className={`${styles.tripsSkeletonLine} ${styles.tripsSkeletonLineShort}`}
                  />
                  <div className={styles.tripsSkeletonFooter}>
                    <div className={styles.tripsSkeletonPrice} />
                    <div className={styles.tripsSkeletonMeta} />
                  </div>
                </div>
                <div className={styles.tripsSkeletonActions}>
                  <div className={styles.tripsSkeletonButton} />
                  <div
                    className={`${styles.tripsSkeletonButton} ${styles.tripsSkeletonButtonIcon}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : pageTrips.length === 0 ? (
        <div className={styles.tripsState}>
          <span className={styles.tripsStateIcon} aria-hidden="true">
            {isFiltered ? <Search size={22} /> : <Building2 size={22} />}
          </span>
          <h2 className={styles.tripsStateTitle}>{emptyTitle}</h2>
          <p className={styles.tripsStateCopy}>{emptyCopy}</p>
          <div className={styles.tripsStateActions}>
            {isFiltered ? (
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                }}
              >
                Clear search
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={startCreate}
              >
                <Plus size={15} /> Add trip
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.tripsGridWrap}>
            <ul className={styles.tripsGrid}>
              {pageTrips.map((trip) => {
                const price = formatPrice(trip.price);
                const busy = deletingId === trip.id;
                const isEditing = editing?.id === trip.id;

                return (
                  <li
                    className={`${styles.tripsCard} ${
                      isEditing ? styles.tripsCardEditing : ""
                    }`}
                    key={trip.id}
                  >
                    <div className={styles.tripsMedia}>
                      {trip.image_url ? (
                        <Image
                          className={styles.tripsMediaImg}
                          src={trip.image_url}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
                        />
                      ) : (
                        <span
                          className={styles.tripsMediaFallback}
                          aria-hidden="true"
                        >
                          <MapPin size={34} />
                        </span>
                      )}
                      <span
                        className={styles.tripsMediaShade}
                        aria-hidden="true"
                      />
                      <span className={styles.tripsPlaceBadge}>
                        {trip.place || "No place"}
                      </span>
                      <span className={styles.tripsPriceBadge}>
                        {price ?? "No price"}
                      </span>
                      {isEditing ? (
                        <span className={styles.tripsEditingTag}>Editing</span>
                      ) : null}
                    </div>

                    <div className={styles.tripsBody}>
                      <h3 className={styles.tripsCardTitle}>{trip.title}</h3>
                      <p className={styles.tripsMeta}>
                        <span className={styles.tripsMetaItem}>
                          <MapPin size={13} aria-hidden="true" />
                          <span>{trip.place || "No place"}</span>
                        </span>
                        {trip.latitude != null && trip.longitude != null ? (
                          <a
                            className={`${styles.tripsMetaItem} ${styles.tripsMetaLink}`}
                            href={`https://www.google.com/maps/search/?api=1&query=${trip.latitude},${trip.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open saved coordinates in Google Maps"
                          >
                            <Locate size={13} aria-hidden="true" />
                            <span>
                              {trip.latitude.toFixed(5)},{" "}
                              {trip.longitude.toFixed(5)}
                            </span>
                          </a>
                        ) : null}
                        <span className={styles.tripsMetaItem}>
                          <CalendarDays size={13} aria-hidden="true" />
                          <span>{formatDate(trip.created_at, "Added")}</span>
                        </span>
                      </p>
                      <p
                        className={`${styles.tripsCopy} ${
                          trip.description?.trim() ? "" : styles.tripsCopyEmpty
                        }`}
                      >
                        {trip.description?.trim() || "No description yet."}
                      </p>
                      <div className={styles.tripsFoot}>
                        <div className={styles.tripsPrice}>
                          <span className={styles.tripsPriceValue}>
                            {price ?? "Price on request"}
                          </span>
                          <span className={styles.tripsPriceHint}>
                            {price ? "Listed price" : "No price set"}
                          </span>
                        </div>
                        <div className={styles.tripsFootMeta}>
                          <span className={styles.tripsUpdated}>
                            {formatDate(trip.updated_at, "Updated")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.tripsCardActions}>
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={() => editTrip(trip)}
                      >
                        <Pencil size={14} /> Edit trip
                      </button>
                      <button
                        className={styles.tripsDelete}
                        type="button"
                        onClick={() => void deleteTrip(trip)}
                        disabled={busy}
                        aria-label={`Delete ${trip.title}`}
                        title="Delete trip"
                      >
                        {busy ? (
                          <span className={styles.tripsSpin}>
                            <Loader size={15} />
                          </span>
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav className={styles.tripsPagination} aria-label="Trip pages">
            <p className={styles.tripsRange}>
              Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of{" "}
              <strong>{total}</strong> trip{total === 1 ? "" : "s"}
            </p>
            <div className={styles.tripsPageControls}>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className={styles.tripsPageStatus}>
                Page {currentPage} of {pages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setPage(Math.min(pages, currentPage + 1))}
                disabled={currentPage >= pages}
                aria-label="Next page"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
