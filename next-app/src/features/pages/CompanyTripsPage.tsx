"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Building2, Image as ImageIcon, Pencil, Plus, Save, Trash2, X } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { companyAPI } from "@/lib/api/client";
import styles from "@/features/pages/company-operations.module.css";

type CompanyTrip = {
  id: number;
  title: string;
  place: string;
  description: string;
  price: string | null;
  image_url: string | null;
};

type TripForm = {
  title: string;
  place: string;
  description: string;
  price: string;
};

const EMPTY_FORM: TripForm = { title: "", place: "", description: "", price: "" };

function errorMessage(error: unknown) {
  if (typeof error === "object" && error) {
    const candidate = error as {
      response?: { data?: { message?: string; error?: string } };
    };
    return (
      candidate.response?.data?.message ||
      candidate.response?.data?.error ||
      "The trip could not be saved."
    );
  }
  return "The trip could not be saved.";
}

export default function CompanyTripsPage() {
  const toast = useToast();
  const [trips, setTrips] = useState<CompanyTrip[]>([]);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    const response = await companyAPI.trips();
    const payload = response.data;
    return (Array.isArray(payload) ? payload : payload.results ?? []) as CompanyTrip[];
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      const nextTrips = await fetchTrips();
      setError(null);
      setTrips(nextTrips);
    } catch {
      setError("Company trips could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchTrips]);

  useEffect(() => {
    let active = true;
    fetchTrips()
      .then((nextTrips) => {
        if (!active) return;
        setError(null);
        setTrips(nextTrips);
      })
      .catch(() => {
        if (active) setError("Company trips could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchTrips]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImage(null);
    setPreview(null);
  };

  const editTrip = (trip: CompanyTrip) => {
    setEditingId(trip.id);
    setForm({
      title: trip.title,
      place: trip.place,
      description: trip.description,
      price: trip.price ?? "",
    });
    setImage(null);
    setPreview(trip.image_url);
  };

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
    setPreview(
      file
        ? URL.createObjectURL(file)
        : editingId
          ? trips.find((trip) => trip.id === editingId)?.image_url ?? null
          : null,
    );
  };

  const saveTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("place", form.place);
      data.append("description", form.description);
      data.append("price", form.price);
      if (image) data.append("image", image);
      if (editingId) {
        await companyAPI.updateTrip(editingId, data);
        toast.success("Trip updated.");
      } else {
        await companyAPI.createTrip(data);
        toast.success("Trip created.");
      }
      resetForm();
      await loadTrips();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (trip: CompanyTrip) => {
    if (!window.confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    setDeletingId(trip.id);
    try {
      await companyAPI.deleteTrip(trip.id);
      toast.success("Trip deleted.");
      if (editingId === trip.id) resetForm();
      await loadTrips();
    } catch {
      toast.error("The trip could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Trips</h1>
          <p className={styles.pageLead}>
            Add separate place-based trip listings with a photo and price.
            These appear on your public company profile.
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            <Plus size={16} /> Add trip
          </button>
        </div>
      </div>

      {error ? <div className={`${styles.note} ${styles.warningNote}`} role="alert">{error}</div> : null}

      <form className={`glass-card ${styles.formSection}`} onSubmit={saveTrip}>
        <div className={styles.formSectionHead}>
          <h2 className={styles.formSectionTitle}>
            {editingId ? "Edit trip" : "New trip"}
          </h2>
          <p className={styles.formSectionCopy}>
            {editingId ? "Update the details shown to visitors." : "A trip image is required when creating a listing."}
          </p>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="company-trip-title">Trip name</label>
            <input
              id="company-trip-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              maxLength={200}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="company-trip-place">Place</label>
            <input
              id="company-trip-place"
              value={form.place}
              onChange={(event) => setForm({ ...form, place: event.target.value })}
              required
              maxLength={200}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="company-trip-price">Price (USD)</label>
            <input
              id="company-trip-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </div>
          <div className={`${styles.formField} ${styles.formFieldFull}`}>
            <label htmlFor="company-trip-description">Description</label>
            <textarea
              id="company-trip-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={5000}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="company-trip-image">Trip image</label>
            <input
              id="company-trip-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImage}
              required={!editingId}
            />
            <span className={styles.formHint}>JPG, PNG or WebP; maximum 5 MB.</span>
          </div>
          <div className={styles.imageField}>
            {preview ? (
              <div className={styles.imagePreview}>
                <Image src={preview} alt="Trip preview" width={360} height={240} unoptimized />
              </div>
            ) : (
              <div className={styles.imagePreviewEmpty}>
                <ImageIcon size={22} />
                <span>No image selected</span>
              </div>
            )}
          </div>
        </div>
        <div className={styles.pageActions}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : editingId ? "Save trip" : "Create trip"}
          </button>
          {editingId ? (
            <button className="btn btn-outline" type="button" onClick={resetForm}>
              <X size={16} /> Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <div className={styles.loading} role="status">Loading company trips...</div>
      ) : trips.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Building2 size={20} /></span>
          <h2 className={styles.emptyTitle}>No trips yet</h2>
          <p className={styles.emptyCopy}>Create your first place-based trip listing above.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th scope="col">Trip</th><th scope="col">Price</th><th scope="col">Actions</th></tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td>
                    <span className={styles.cellTitle}>{trip.title}</span>
                    <span className={styles.cellSub}>{trip.place}</span>
                  </td>
                  <td>${Number(trip.price ?? 0).toLocaleString("en-US")}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => editTrip(trip)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" disabled={deletingId === trip.id} onClick={() => void deleteTrip(trip)}>
                        <Trash2 size={14} /> {deletingId === trip.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
