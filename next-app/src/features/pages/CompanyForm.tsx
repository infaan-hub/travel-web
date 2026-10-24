"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { companiesAPI, geocodeAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { getImageUrl } from "@/lib/utils/image-url";
import LocationPicker from "@/components/LocationPicker";
import OpeningHoursEditor from "@/components/OpeningHoursEditor";
import {
  openingHoursForEditor,
  type CompanyOpeningHours,
} from "@/lib/company-opening-hours";
import { ArrowLeft, Loader, MapPin, Save, X } from "@/components/icons";
import { isFile } from "@/features/pages/types";
import type { Company, CompanyBusinessType } from "@/features/pages/types";
import styles from "@/features/pages/admin-companies.module.css";

type CompanyFormProps = {
  company?: Company | null;
  onSaved: (company: Company) => void;
  onCreate?: (data: FormData) => Promise<{ data: Company }>;
  onCancel?: () => void;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  registration_reference: string;
  business_type: CompanyBusinessType;
  contact_email: string;
  contact_phone: string;
  alternative_phone: string;
  whatsapp_number: string;
  address: string;
  locality: string;
  district: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
  website: string;
  opening_hours: CompanyOpeningHours;
  legacy_opening_hours: string | null;
  is_public: boolean;
  social_facebook: string;
  social_instagram: string;
  social_x: string;
  social_linkedin: string;
  social_youtube: string;
  social_tripadvisor: string;
};

type FieldErrors = Record<string, string[]>;

function initialForm(company?: Company | null): FormState {
  const social = (company?.social_links ?? {}) as Record<string, string>;
  const openingHours = openingHoursForEditor(company?.opening_hours);
  return {
    name: company?.name ?? "",
    slug: company?.slug ?? "",
    description: company?.description ?? "",
    registration_reference: company?.registration_reference ?? "",
    business_type: company?.business_type ?? "TOUR_OPERATOR",
    contact_email: company?.contact_email ?? "",
    contact_phone: company?.contact_phone ?? "",
    alternative_phone: company?.alternative_phone ?? "",
    whatsapp_number: company?.whatsapp_number ?? "",
    address: company?.address ?? "",
    locality: company?.locality ?? "",
    district: company?.district ?? "",
    region: company?.region ?? "",
    country: company?.country ?? "Tanzania",
    latitude: company?.latitude == null ? "" : String(company.latitude),
    longitude: company?.longitude == null ? "" : String(company.longitude),
    website: company?.website ?? "",
    opening_hours: openingHours.schedule,
    legacy_opening_hours: openingHours.legacyText,
    is_public: company?.is_public ?? false,
    social_facebook: social.facebook ?? "",
    social_instagram: social.instagram ?? "",
    social_x: social.x ?? "",
    social_linkedin: social.linkedin ?? "",
    social_youtube: social.youtube ?? "",
    social_tripadvisor: social.tripadvisor ?? "",
  };
}

function coordinateValue(value: string, min: number, max: number): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

function formatCoordinate(value: number): string {
  return String(Math.round(value * 1_000_000) / 1_000_000);
}

type ApiFailure = {
  fieldErrors?: FieldErrors;
  response?: { data?: { message?: string; errors?: FieldErrors } };
};

export default function CompanyForm({
  company,
  onSaved,
  onCreate,
  onCancel,
}: CompanyFormProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initialForm(company));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    company?.logo_image_url ? getImageUrl(company.logo_image_url) : null,
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(
    company?.cover_image_url ? getImageUrl(company.cover_image_url) : null,
  );
  const previewUrls = useRef<{ logo?: string; cover?: string }>({});
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [suggestedAddress, setSuggestedAddress] = useState<string | null>(null);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      if (urls.logo) URL.revokeObjectURL(urls.logo);
      if (urls.cover) URL.revokeObjectURL(urls.cover);
    };
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrls.current.logo) URL.revokeObjectURL(previewUrls.current.logo);
    const url = URL.createObjectURL(file);
    previewUrls.current.logo = url;
    setLogoFile(file);
    setLogoPreview(url);
  };

  const handleCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrls.current.cover) URL.revokeObjectURL(previewUrls.current.cover);
    const url = URL.createObjectURL(file);
    previewUrls.current.cover = url;
    setCoverFile(file);
    setCoverPreview(url);
  };

  const latitude = coordinateValue(form.latitude, -90, 90);
  const longitude = coordinateValue(form.longitude, -180, 180);
  const mapLatitude = typeof latitude === "number" ? latitude : null;
  const mapLongitude = typeof longitude === "number" ? longitude : null;

  const handleMapChange = (lat: number, lng: number) => {
    setForm((current) => ({
      ...current,
      latitude: formatCoordinate(lat),
      longitude: formatCoordinate(lng),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
    setSuggestedAddress(null);
    setReverseError(null);
  };

  const lookupAddress = async () => {
    if (mapLatitude === null || mapLongitude === null) {
      toast.error("Enter valid latitude and longitude first.");
      return;
    }
    setReverseLoading(true);
    setReverseError(null);
    setSuggestedAddress(null);
    try {
      const response = await geocodeAPI.reverse(mapLatitude, mapLongitude);
      const address = String(response.data?.display_name ?? "").trim();
      if (!address) throw new Error("No address returned");
      if (!form.address.trim()) {
        update("address", address);
        toast.success("Address filled from the map.");
      } else {
        setSuggestedAddress(address);
      }
    } catch {
      setReverseError(
        "Address lookup is unavailable right now. Enter the address manually.",
      );
    } finally {
      setReverseLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextErrors: FieldErrors = {};
    if (form.name.trim().length < 2) {
      nextErrors.name = ["Company name must be at least 2 characters."];
    }
    if (latitude === undefined) {
      nextErrors.latitude = ["Enter a valid latitude between -90 and 90."];
    }
    if (longitude === undefined) {
      nextErrors.longitude = ["Enter a valid longitude between -180 and 180."];
    }
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      (latitude === null) !== (longitude === null)
    ) {
      nextErrors.latitude = ["Enter both coordinates, or leave both empty."];
      nextErrors.longitude = ["Enter both coordinates, or leave both empty."];
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("slug", form.slug.trim());
    payload.append("description", form.description.trim());
    payload.append("registration_reference", form.registration_reference.trim());
    payload.append("business_type", form.business_type);
    payload.append("contact_email", form.contact_email.trim());
    payload.append("contact_phone", form.contact_phone.trim());
    payload.append("alternative_phone", form.alternative_phone.trim());
    payload.append("whatsapp_number", form.whatsapp_number.trim());
    payload.append("address", form.address.trim());
    payload.append("locality", form.locality.trim());
    payload.append("district", form.district.trim());
    payload.append("region", form.region.trim());
    payload.append("country", form.country.trim() || "Tanzania");
    payload.append("latitude", latitude === null ? "" : String(latitude));
    payload.append("longitude", longitude === null ? "" : String(longitude));
    payload.append("website", form.website.trim());
    if (!company || form.legacy_opening_hours === null) {
      payload.append("opening_hours", JSON.stringify(form.opening_hours));
    }

    const social = {
      facebook: form.social_facebook.trim(),
      instagram: form.social_instagram.trim(),
      x: form.social_x.trim(),
      linkedin: form.social_linkedin.trim(),
      youtube: form.social_youtube.trim(),
      tripadvisor: form.social_tripadvisor.trim(),
    };
    payload.append(
      "social_links",
      JSON.stringify(Object.fromEntries(Object.entries(social).filter(([, value]) => value))),
    );

    if (company) payload.append("is_public", form.is_public ? "true" : "false");
    if (isFile(logoFile)) payload.append("logo_image", logoFile);
    if (isFile(coverFile)) payload.append("cover_image", coverFile);

    setSaving(true);
    try {
      const response = company
        ? await companiesAPI.update(company.id, payload)
        : onCreate
          ? await onCreate(payload)
          : await companiesAPI.create(payload);
      toast.success(company ? "Company changes saved." : "Company saved as pending.");
      onSaved(response.data as Company);
    } catch (caught) {
      const failure = caught as ApiFailure;
      const errors = failure.fieldErrors ?? failure.response?.data?.errors ?? {};
      setFieldErrors(errors);
      setError(
        failure.response?.data?.message ||
          "The company could not be saved. Check the highlighted fields and try again.",
      );
      if (Object.keys(errors).length === 0) {
        toast.error("The company could not be saved.");
      }
    } finally {
      setSaving(false);
    }
  };

  const errorText = (key: keyof FormState | string) => fieldErrors[key]?.[0] ?? null;
  const errorProps = (key: keyof FormState | string) => ({
    "aria-invalid": Boolean(errorText(key)),
    "aria-describedby": errorText(key) ? `${key}-error` : undefined,
  });

  return (
    <form className={`admin-form ${styles.companyForm}`} onSubmit={handleSubmit} noValidate>
      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Identity</h2>
          <p>The public name and URL for this company.</p>
        </div>
        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="company-name">Company name *</label>
            <input
              id="company-name"
              type="text"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              maxLength={200}
              required
              {...errorProps("name")}
            />
            {errorText("name") && (
              <span className={styles.fieldError} id="name-error">
                {errorText("name")}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="company-slug">Profile URL</label>
            <input
              id="company-slug"
              type="text"
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
              maxLength={120}
              placeholder="auto-generated-from-name"
              {...errorProps("slug")}
            />
            <span className={styles.help}>
              Lowercase URL-safe slug. Leave blank to generate it from the name.
            </span>
            {errorText("slug") && (
              <span className={styles.fieldError} id="slug-error">
                {errorText("slug")}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="company-business-type">Business type</label>
            <select
              id="company-business-type"
              value={form.business_type}
              onChange={(event) =>
                update("business_type", event.target.value as CompanyBusinessType)
              }
            >
              <option value="TOUR_OPERATOR">Tour operator</option>
              <option value="SAFARI_OPERATOR">Safari operator</option>
              <option value="EXCURSION_PROVIDER">Excursion provider</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="company-registration">Registration reference</label>
            <input
              id="company-registration"
              type="text"
              value={form.registration_reference}
              onChange={(event) => update("registration_reference", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className={`form-group ${styles.fullWidth}`}>
            <label htmlFor="company-description">Description</label>
            <textarea
              id="company-description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="Tell visitors who you are and what you offer."
            />
            <span className={styles.help}>{form.description.length}/5000</span>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Contact</h2>
          <p>Public contact channels. These appear on the company profile.</p>
        </div>
        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="company-email">Contact email</label>
            <input
              id="company-email"
              type="email"
              value={form.contact_email}
              onChange={(event) => update("contact_email", event.target.value)}
              maxLength={254}
              {...errorProps("contact_email")}
            />
            {errorText("contact_email") && (
              <span className={styles.fieldError} id="contact_email-error">
                {errorText("contact_email")}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="company-phone">Contact phone</label>
            <input
              id="company-phone"
              type="tel"
              value={form.contact_phone}
              onChange={(event) => update("contact_phone", event.target.value)}
              maxLength={30}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-alt-phone">Alternative phone</label>
            <input
              id="company-alt-phone"
              type="tel"
              value={form.alternative_phone}
              onChange={(event) => update("alternative_phone", event.target.value)}
              maxLength={30}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-whatsapp">WhatsApp</label>
            <input
              id="company-whatsapp"
              type="tel"
              value={form.whatsapp_number}
              onChange={(event) => update("whatsapp_number", event.target.value)}
              maxLength={30}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-website">Website</label>
            <input
              id="company-website"
              type="url"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              maxLength={500}
              placeholder="https://"
              {...errorProps("website")}
            />
            {errorText("website") && (
              <span className={styles.fieldError} id="website-error">
                {errorText("website")}
              </span>
            )}
          </div>
          <div className={styles.fullWidth}>
            <OpeningHoursEditor
              value={form.opening_hours}
              legacyText={form.legacy_opening_hours}
              onChange={(opening_hours) =>
                setForm((current) => ({
                  ...current,
                  opening_hours,
                  legacy_opening_hours: null,
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Location</h2>
          <p>
            Search an address, or click the map to place the company. Coordinates
            are optional and are never invented.
          </p>
        </div>
        <div className={styles.formGrid}>
          <div className={`form-group ${styles.fullWidth}`}>
            <label htmlFor="company-address">Street address</label>
            <input
              id="company-address"
              type="text"
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-locality">Locality / town</label>
            <input
              id="company-locality"
              type="text"
              value={form.locality}
              onChange={(event) => update("locality", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-district">District</label>
            <input
              id="company-district"
              type="text"
              value={form.district}
              onChange={(event) => update("district", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-region">Region</label>
            <input
              id="company-region"
              type="text"
              value={form.region}
              onChange={(event) => update("region", event.target.value)}
              maxLength={120}
              placeholder="e.g. Zanzibar"
            />
          </div>
          <div className="form-group">
            <label htmlFor="company-country">Country</label>
            <input
              id="company-country"
              type="text"
              value={form.country}
              onChange={(event) => update("country", event.target.value)}
              maxLength={100}
            />
          </div>
          <div className={`form-group ${styles.fullWidth}`}>
            <div className={styles.fieldLabelRow}>
              <span className={styles.fieldLabel}>Map pin</span>
              <button
                type="button"
                className={`btn btn-sm btn-outline ${styles.lookupButton}`}
                onClick={lookupAddress}
                disabled={reverseLoading || mapLatitude === null || mapLongitude === null}
              >
                {reverseLoading ? <Loader size={14} /> : <MapPin size={14} />}
                {reverseLoading ? "Looking up…" : "Find address from coordinates"}
              </button>
            </div>
            <LocationPicker
              latitude={mapLatitude}
              longitude={mapLongitude}
              onChange={handleMapChange}
            />
            {reverseError && <p className={styles.inlineError}>{reverseError}</p>}
            {suggestedAddress && (
              <div className={styles.suggestedAddress}>
                <span>{suggestedAddress}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    update("address", suggestedAddress);
                    setSuggestedAddress(null);
                  }}
                >
                  Use this address
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="company-latitude">Latitude</label>
            <input
              id="company-latitude"
              type="number"
              inputMode="decimal"
              step="any"
              min={-90}
              max={90}
              value={form.latitude}
              onChange={(event) => update("latitude", event.target.value)}
              placeholder="-6.165917"
              {...errorProps("latitude")}
            />
            {errorText("latitude") && (
              <span className={styles.fieldError} id="latitude-error">
                {errorText("latitude")}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="company-longitude">Longitude</label>
            <input
              id="company-longitude"
              type="number"
              inputMode="decimal"
              step="any"
              min={-180}
              max={180}
              value={form.longitude}
              onChange={(event) => update("longitude", event.target.value)}
              placeholder="39.202641"
              {...errorProps("longitude")}
            />
            {errorText("longitude") && (
              <span className={styles.fieldError} id="longitude-error">
                {errorText("longitude")}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Branding</h2>
          <p>JPG, PNG or WEBP. Maximum 5MB per image.</p>
        </div>
        <div className={styles.imageGrid}>
          <div className={styles.imageCard}>
            <div className={styles.imageCardHeader}>
              <span className={styles.fieldLabel}>Logo</span>
              {logoPreview && <span className={styles.imageNote}>Preview</span>}
            </div>
            <div className={styles.logoPreview}>
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Company logo preview"
                  width={120}
                  height={120}
                  unoptimized
                />
              ) : (
                <span>No logo</span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogo}
              className="file-input"
              aria-label="Upload company logo"
            />
          </div>
          <div className={styles.imageCard}>
            <div className={styles.imageCardHeader}>
              <span className={styles.fieldLabel}>Cover image</span>
              {coverPreview && <span className={styles.imageNote}>Preview</span>}
            </div>
            <div className={styles.coverPreview}>
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Company cover preview"
                  width={640}
                  height={280}
                  unoptimized
                />
              ) : (
                <span>No cover image</span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCover}
              className="file-input"
              aria-label="Upload company cover image"
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Social links</h2>
          <p>Optional profile links. Use full https:// URLs.</p>
        </div>
        <div className={styles.formGrid}>
          {[
            ["social_facebook", "Facebook", "https://facebook.com/..."],
            ["social_instagram", "Instagram", "https://instagram.com/..."],
            ["social_x", "X / Twitter", "https://x.com/..."],
            ["social_linkedin", "LinkedIn", "https://linkedin.com/company/..."],
            ["social_youtube", "YouTube", "https://youtube.com/@..."],
            ["social_tripadvisor", "Tripadvisor", "https://tripadvisor.com/..."],
          ].map(([key, label, placeholder]) => (
            <div className="form-group" key={key}>
              <label htmlFor={`company-${key}`}>{label}</label>
              <input
                id={`company-${key}`}
                type="url"
                value={form[key as keyof FormState] as string}
                onChange={(event) =>
                  update(key as keyof FormState, event.target.value as never)
                }
                maxLength={500}
                placeholder={placeholder}
                {...errorProps(key)}
              />
              {errorText(key) && (
                <span className={styles.fieldError} id={`${key}-error`}>
                  {errorText(key)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <h2>Visibility</h2>
          <p>
            New companies start pending and private. Publishing is only available
            after the company is activated.
          </p>
        </div>
        {company ? (
          <label className={styles.checkboxRow} htmlFor="company-public">
            <input
              id="company-public"
              type="checkbox"
              checked={form.is_public}
              disabled={company.status !== "ACTIVE"}
              onChange={(event) => update("is_public", event.target.checked)}
            />
            <span>
              Make this company profile public
              {company.status !== "ACTIVE" && (
                <small>Only active companies can be public.</small>
              )}
            </span>
          </label>
        ) : (
          <p className={styles.help}>
            The company will be created with pending status and no public profile.
          </p>
        )}
      </section>

      <div className={styles.formActionsSticky}>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            <X size={16} /> Cancel
          </button>
        )}
        {!company && (
          <Link href="/admin/companies" className="btn btn-outline">
            <ArrowLeft size={16} /> Back to companies
          </Link>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Loader size={16} /> : <Save size={16} />}
          {saving
            ? "Saving…"
            : company
              ? "Save changes"
              : "Create company"}
        </button>
      </div>
    </form>
  );
}
