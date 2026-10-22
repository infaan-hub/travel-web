"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import LocationPicker from "@/components/LocationPicker";
import {
  ArrowLeft,
  Globe,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { companyAPI } from "@/lib/api/client";
import {
  COMPANY_EDITABLE_TOUR_STATUSES,
  TOUR_PUBLICATION_LABELS,
} from "@/lib/company-operations";
import styles from "@/features/pages/company-operations.module.css";

const CATEGORIES = [
  { value: "zanzibar", label: "Zanzibar" },
  { value: "tanzania", label: "Tanzania safari" },
  { value: "international", label: "International" },
] as const;

type ItineraryRow = { day: number; title: string; description: string };

type FormState = {
  title: string;
  short_description: string;
  description: string;
  price: string;
  duration: string;
  destination: string;
  category: "zanzibar" | "tanzania" | "international";
  max_travelers: string;
  publication_status: string;
  available: boolean;
  latitude: string;
  longitude: string;
  includes: string;
  excludes: string;
  itinerary: ItineraryRow[];
};

type ImageKey = "image" | "image2" | "image3";

const EMPTY_FORM: FormState = {
  title: "",
  short_description: "",
  description: "",
  price: "",
  duration: "",
  destination: "",
  category: "zanzibar",
  max_travelers: "10",
  publication_status: "DRAFT",
  available: true,
  latitude: "",
  longitude: "",
  includes: "",
  excludes: "",
  itinerary: [],
};

function lines(value: unknown): string {
  return Array.isArray(value) ? value.join("\n") : "";
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function messageFrom(error: unknown) {
  if (typeof error === "object" && error) {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return (
      candidate.response?.data?.message ||
      candidate.message ||
      "The tour could not be saved."
    );
  }
  return "The tour could not be saved.";
}

export default function CompanyTourFormPage({ tourId }: { tourId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialPublication, setInitialPublication] = useState("");
  const [loading, setLoading] = useState(Boolean(tourId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<ImageKey, File | null>>({
    image: null,
    image2: null,
    image3: null,
  });
  const [imagePreviews, setImagePreviews] = useState<
    Record<ImageKey, string | null>
  >({ image: null, image2: null, image3: null });

  useEffect(() => {
    if (!tourId) return;
    let cancelled = false;
    companyAPI
      .tour(tourId)
      .then((response) => {
        if (cancelled) return;
        const tour = response.data as Record<string, unknown>;
        const itinerary = Array.isArray(tour.itinerary)
          ? (tour.itinerary as ItineraryRow[])
          : [];
        setForm({
          title: String(tour.title ?? ""),
          short_description: String(tour.short_description ?? ""),
          description: String(tour.description ?? ""),
          price: String(tour.price ?? ""),
          duration: String(tour.duration ?? ""),
          destination: String(tour.destination ?? ""),
          category:
            tour.category === "tanzania" || tour.category === "international"
              ? tour.category
              : "zanzibar",
          max_travelers: String(tour.max_travelers ?? 10),
          publication_status: String(tour.publication_status ?? "DRAFT"),
          available: Boolean(tour.available),
          latitude:
            tour.destination_lat === null ||
            tour.destination_lat === undefined
              ? ""
              : String(tour.destination_lat),
          longitude:
            tour.destination_lng === null ||
            tour.destination_lng === undefined
              ? ""
              : String(tour.destination_lng),
          includes: lines(tour.included_items),
          excludes: lines(tour.excluded_items),
          itinerary: itinerary.map((item, index) => ({
            day: Number(item.day) || index + 1,
            title: String(item.title ?? ""),
            description: String(item.description ?? ""),
          })),
        });
        setInitialPublication(String(tour.publication_status ?? "DRAFT"));
        setImagePreviews({
          image: (tour.main_image_url as string | null) ?? null,
          image2: (tour.image2_url as string | null) ?? null,
          image3: (tour.image3_url as string | null) ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("This company tour could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const setField = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onImage = (key: ImageKey, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFiles((current) => ({ ...current, [key]: file }));
    setImagePreviews((current) => ({
      ...current,
      [key]: file
        ? URL.createObjectURL(file)
        : tourId
          ? current[key]
          : null,
    }));
  };

  const addItinerary = () => {
    setForm((current) => ({
      ...current,
      itinerary: [
        ...current.itinerary,
        {
          day: current.itinerary.length + 1,
          title: "",
          description: "",
        },
      ],
    }));
  };

  const updateItinerary = (
    index: number,
    key: keyof ItineraryRow,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: key === "day" ? Number(value) || 1 : value,
            }
          : item,
      ),
    }));
  };

  const removeItinerary = (index: number) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("short_description", form.short_description);
      data.append("description", form.description);
      data.append("price", form.price);
      data.append("duration", form.duration);
      data.append("destination", form.destination);
      data.append("category", form.category);
      data.append("max_travelers", form.max_travelers);
      data.append("available", String(form.available));
      data.append("destination_lat", form.latitude);
      data.append("destination_lng", form.longitude);
      data.append("includes", JSON.stringify(parseLines(form.includes)));
      data.append("excludes", JSON.stringify(parseLines(form.excludes)));
      data.append(
        "itinerary",
        JSON.stringify(
          form.itinerary
            .filter((item) => item.title.trim())
            .map((item) => ({
              day: item.day,
              title: item.title.trim(),
              description: item.description.trim(),
            })),
        ),
      );

      const canSendPublication =
        !tourId ||
        form.publication_status !== initialPublication ||
        (COMPANY_EDITABLE_TOUR_STATUSES as readonly string[]).includes(
          form.publication_status,
        );
      if (canSendPublication) {
        data.append("publication_status", form.publication_status);
      }

      (Object.keys(imageFiles) as ImageKey[]).forEach((key) => {
        const file = imageFiles[key];
        if (file) data.append(key, file);
      });

      if (tourId) {
        await companyAPI.updateTour(tourId, data);
        toast.success("Tour updated.");
        router.refresh();
      } else {
        const response = await companyAPI.createTour(data);
        const createdId = Number(response.data?.id);
        toast.success("Tour created.");
        if (Number.isInteger(createdId) && createdId > 0) {
          router.push(`/company/tours/${createdId}/`);
        } else {
          router.push("/company/tours/");
        }
        router.refresh();
      }
    } catch (submitError) {
      setError(messageFrom(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`page ${styles.pageStack}`}>
        <div className={styles.loading} role="status">
          Loading company tour...
        </div>
      </div>
    );
  }

  if (error && tourId && !form.title) {
    return (
      <div className={`page ${styles.pageStack}`}>
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <Globe size={20} />
          </span>
          <h1 className={styles.emptyTitle}>Tour unavailable</h1>
          <p className={styles.emptyCopy}>{error}</p>
          <Link className="btn btn-outline btn-sm" href="/company/tours/">
            Back to tours
          </Link>
        </div>
      </div>
    );
  }

  const statusOptions = Array.from(
    new Set([
      ...(form.publication_status &&
      !(COMPANY_EDITABLE_TOUR_STATUSES as readonly string[]).includes(
        form.publication_status,
      )
        ? [form.publication_status]
        : []),
      ...COMPANY_EDITABLE_TOUR_STATUSES,
    ]),
  );

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <Link className={styles.panelLink} href="/company/tours/">
            <ArrowLeft size={15} /> Back to tours
          </Link>
          <h1 className={styles.pageTitle}>
            {tourId ? "Edit tour" : "Create tour"}
          </h1>
          <p className={styles.pageLead}>
            This tour belongs only to your active company. Publishing makes it
            eligible for the public catalogue; availability controls booking
            independently.
          </p>
        </div>
      </div>

      {error && (form.title || !tourId) ? (
        <div className={`${styles.note} ${styles.warningNote}`} role="alert">
          {error}
        </div>
      ) : null}

      <form className={styles.formStack} onSubmit={handleSubmit} noValidate>
        <div className={styles.detailGrid}>
          <div className={styles.formStack}>
            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Tour basics</h2>
                <p className={styles.formSectionCopy}>
                  Customer-facing title, summary and full description.
                </p>
              </div>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label htmlFor="tour-title">Title</label>
                  <input
                    id="tour-title"
                    value={form.title}
                    onChange={(event) => setField("title", event.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label htmlFor="tour-summary">Short summary</label>
                  <input
                    id="tour-summary"
                    value={form.short_description}
                    onChange={(event) =>
                      setField("short_description", event.target.value)
                    }
                    maxLength={300}
                  />
                  <p className={styles.formHint}>
                    Up to 300 characters, used on tour cards.
                  </p>
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label htmlFor="tour-description">Description</label>
                  <textarea
                    id="tour-description"
                    value={form.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Pricing and capacity</h2>
                <p className={styles.formSectionCopy}>
                  Price is per traveler. Capacity is validated by the booking
                  flow.
                </p>
              </div>
              <div className={styles.formGridThree}>
                <div className={styles.formField}>
                  <label htmlFor="tour-price">Price (USD)</label>
                  <input
                    id="tour-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) => setField("price", event.target.value)}
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="tour-duration">Duration</label>
                  <input
                    id="tour-duration"
                    value={form.duration}
                    onChange={(event) => setField("duration", event.target.value)}
                    placeholder="e.g. 3 days"
                    required
                    maxLength={100}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="tour-travelers">Maximum travelers</label>
                  <input
                    id="tour-travelers"
                    type="number"
                    min="1"
                    max="1000"
                    value={form.max_travelers}
                    onChange={(event) =>
                      setField("max_travelers", event.target.value)
                    }
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="tour-destination">Destination</label>
                  <input
                    id="tour-destination"
                    value={form.destination}
                    onChange={(event) =>
                      setField("destination", event.target.value)
                    }
                    required
                    maxLength={200}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="tour-category">Category</label>
                  <select
                    id="tour-category"
                    value={form.category}
                    onChange={(event) =>
                      setField(
                        "category",
                        event.target
                          .value as FormState["category"],
                      )
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGrid} style={{ marginTop: 14 }}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label>Destination map</label>
                  <LocationPicker
                    latitude={form.latitude ? Number(form.latitude) : null}
                    longitude={form.longitude ? Number(form.longitude) : null}
                    onChange={(latitude, longitude) =>
                      setForm((current) => ({
                        ...current,
                        latitude: String(latitude),
                        longitude: String(longitude),
                      }))
                    }
                    label="Tour destination map"
                  />
                  <p className={styles.formHint}>
                    Optional. Select the destination on the map so the public
                    listing can show an accurate location.
                  </p>
                  {(form.latitude || form.longitude) && (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          latitude: "",
                          longitude: "",
                        }))
                      }
                    >
                      Clear map location
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <div className={styles.panelHead}>
                  <div>
                    <h2 className={styles.formSectionTitle}>Itinerary</h2>
                    <p className={styles.formSectionCopy}>
                      Day-by-day plan shown on the public tour page.
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={addItinerary}
                  >
                    <Plus size={14} /> Add day
                  </button>
                </div>
              </div>
              {form.itinerary.length === 0 ? (
                <p className={styles.emptyInline}>
                  No itinerary days yet. Add one if the tour has a day-by-day
                  plan.
                </p>
              ) : (
                <div className={styles.itineraryList}>
                  {form.itinerary.map((item, index) => (
                    <div className={styles.itineraryRow} key={index}>
                      <div className={styles.formField}>
                        <label htmlFor={`itinerary-day-${index}`}>Day</label>
                        <input
                          id={`itinerary-day-${index}`}
                          type="number"
                          min="1"
                          max="365"
                          value={item.day}
                          onChange={(event) =>
                            updateItinerary(index, "day", event.target.value)
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`itinerary-title-${index}`}>Title</label>
                        <input
                          id={`itinerary-title-${index}`}
                          value={item.title}
                          onChange={(event) =>
                            updateItinerary(index, "title", event.target.value)
                          }
                          maxLength={200}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`itinerary-description-${index}`}>
                          Description
                        </label>
                        <textarea
                          id={`itinerary-description-${index}`}
                          value={item.description}
                          onChange={(event) =>
                            updateItinerary(
                              index,
                              "description",
                              event.target.value,
                            )
                          }
                          maxLength={2000}
                        />
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => removeItinerary(index)}
                        aria-label={`Remove day ${item.day}`}
                        title="Remove day"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>
                  Inclusions and exclusions
                </h2>
                <p className={styles.formSectionCopy}>
                  Enter one item per line. These are displayed as separate
                  bullets on the public tour page.
                </p>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label htmlFor="tour-includes">What is included</label>
                  <textarea
                    id="tour-includes"
                    value={form.includes}
                    onChange={(event) =>
                      setField("includes", event.target.value)
                    }
                    placeholder={"Hotel pickup\nProfessional guide\nEntrance fees"}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="tour-excludes">What is not included</label>
                  <textarea
                    id="tour-excludes"
                    value={form.excludes}
                    onChange={(event) =>
                      setField("excludes", event.target.value)
                    }
                    placeholder={"Flights\nTravel insurance\nPersonal expenses"}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className={styles.detailStack}>
            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>
                  Publication and availability
                </h2>
                <p className={styles.formSectionCopy}>
                  Publishing does not change availability. Unavailable tours
                  stay published but cannot be booked.
                </p>
              </div>
              <div className={styles.formStack} style={{ gap: 12 }}>
                <div className={styles.formField}>
                  <label htmlFor="tour-publication">Publication state</label>
                  <select
                    id="tour-publication"
                    value={form.publication_status}
                    onChange={(event) =>
                      setField("publication_status", event.target.value)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option
                        key={status}
                        value={status}
                        disabled={
                          !(COMPANY_EDITABLE_TOUR_STATUSES as readonly string[]).includes(
                            status,
                          )
                        }
                      >
                        {TOUR_PUBLICATION_LABELS[
                          status as keyof typeof TOUR_PUBLICATION_LABELS
                        ] ?? status}
                      </option>
                    ))}
                  </select>
                  <p className={styles.formHint}>
                    Company members can choose draft, published or archived.
                    Moderation states remain with the platform.
                  </p>
                </div>
                <label className={styles.checkField} htmlFor="tour-available">
                  <input
                    id="tour-available"
                    type="checkbox"
                    checked={form.available}
                    onChange={(event) =>
                      setField("available", event.target.checked)
                    }
                  />
                  Available for new bookings
                </label>
              </div>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Images</h2>
                <p className={styles.formSectionCopy}>
                  JPEG, PNG or WebP. A new file replaces the current image.
                </p>
              </div>
              <div className={styles.formStack} style={{ gap: 16 }}>
                {(
                  [
                    ["image", "Main image"],
                    ["image2", "Second image"],
                    ["image3", "Third image"],
                  ] as const
                ).map(([key, label]) => (
                  <div className={styles.imageField} key={key}>
                    <label className={styles.formField} htmlFor={`tour-${key}`}>
                      <span>{label}</span>
                      <input
                        id={`tour-${key}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => onImage(key, event)}
                      />
                    </label>
                    {imagePreviews[key] ? (
                      <div className={styles.imagePreview}>
                        <Image
                          src={imagePreviews[key] as string}
                          alt=""
                          width={360}
                          height={270}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className={styles.imagePreviewEmpty}>
                        <ImageIcon size={22} />
                        <span>No image selected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className={styles.stickyActions}>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : tourId ? "Save changes" : "Create tour"}
              </button>
              <Link className="btn btn-outline" href="/company/tours/">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
