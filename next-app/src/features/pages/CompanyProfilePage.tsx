"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import LocationPicker from "@/components/LocationPicker";
import {
  Building2,
  Image as ImageIcon,
  MapPin,
  Save,
  Shield,
  Trash2,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { companyAPI } from "@/lib/api/client";
import OpeningHoursEditor from "@/components/OpeningHoursEditor";
import {
  openingHoursForEditor,
  type CompanyOpeningHours,
} from "@/lib/company-opening-hours";
import styles from "@/features/pages/company-operations.module.css";

type SocialLinks = {
  facebook?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
  youtube?: string;
  tripadvisor?: string;
};

type CompanyProfile = {
  id: number;
  name: string;
  slug: string;
  description: string;
  registration_reference: string | null;
  business_type: string;
  logo_image_url: string | null;
  cover_image_url: string | null;
  contact_email: string;
  contact_phone: string;
  alternative_phone: string | null;
  whatsapp_number: string | null;
  address: string;
  locality: string;
  district: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  social_links: SocialLinks | null;
  opening_hours: CompanyOpeningHours | string | null;
  status: string;
  is_public: boolean;
};

type FormState = {
  description: string;
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
  social_facebook: string;
  social_instagram: string;
  social_x: string;
  social_linkedin: string;
  social_youtube: string;
  social_tripadvisor: string;
};

function formFrom(company: CompanyProfile): FormState {
  const social = company.social_links ?? {};
  const openingHours = openingHoursForEditor(company.opening_hours);
  return {
    description: company.description ?? "",
    contact_email: company.contact_email ?? "",
    contact_phone: company.contact_phone ?? "",
    alternative_phone: company.alternative_phone ?? "",
    whatsapp_number: company.whatsapp_number ?? "",
    address: company.address ?? "",
    locality: company.locality ?? "",
    district: company.district ?? "",
    region: company.region ?? "",
    country: company.country ?? "",
    latitude:
      company.latitude === null || company.latitude === undefined
        ? ""
        : String(company.latitude),
    longitude:
      company.longitude === null || company.longitude === undefined
        ? ""
        : String(company.longitude),
    website: company.website ?? "",
    opening_hours: openingHours.schedule,
    legacy_opening_hours: openingHours.legacyText,
    social_facebook: social.facebook ?? "",
    social_instagram: social.instagram ?? "",
    social_x: social.x ?? "",
    social_linkedin: social.linkedin ?? "",
    social_youtube: social.youtube ?? "",
    social_tripadvisor: social.tripadvisor ?? "",
  };
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
      "The company profile could not be saved."
    );
  }
  return "The company profile could not be saved.";
}

export default function CompanyProfilePage() {
  const toast = useToast();
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const activeCompany = user?.companies?.find(
    (item) => item.id === user.active_company_id,
  ) ?? (user?.companies?.length === 1 ? user.companies[0] : null);
  const canUpdate = activeCompany?.permissions.includes("profile:update") ?? false;

  const load = useCallback(() => {
    companyAPI
      .profile()
      .then((response) => {
        const profile = response.data as CompanyProfile;
        setCompany(profile);
        setForm(formFrom(profile));
        setLogoPreview(profile.logo_image_url);
        setCoverPreview(profile.cover_image_url);
        setLogoFile(null);
        setCoverFile(null);
        setRemoveLogo(false);
        setRemoveCover(false);
        setError(null);
      })
      .catch(() => {
        setError("The company profile could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const setField = (
    key: Exclude<keyof FormState, "opening_hours" | "legacy_opening_hours">,
    value: string,
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const onLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(file ? URL.createObjectURL(file) : company?.logo_image_url ?? null);
  };

  const onCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCoverFile(file);
    setRemoveCover(false);
    setCoverPreview(
      file ? URL.createObjectURL(file) : company?.cover_image_url ?? null,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("description", form.description);
      data.append("contact_phone", form.contact_phone);
      data.append("alternative_phone", form.alternative_phone);
      data.append("whatsapp_number", form.whatsapp_number);
      data.append("address", form.address);
      data.append("locality", form.locality);
      data.append("district", form.district);
      data.append("region", form.region);
      data.append("country", form.country);
      data.append("website", form.website);
      if (form.legacy_opening_hours === null) {
        data.append("opening_hours", JSON.stringify(form.opening_hours));
      }
      data.append("latitude", form.latitude);
      data.append("longitude", form.longitude);

      const social: SocialLinks = {
        facebook: form.social_facebook.trim(),
        instagram: form.social_instagram.trim(),
        x: form.social_x.trim(),
        linkedin: form.social_linkedin.trim(),
        youtube: form.social_youtube.trim(),
        tripadvisor: form.social_tripadvisor.trim(),
      };
      data.append(
        "social_links",
        JSON.stringify(
          Object.fromEntries(
            Object.entries(social).filter(([, value]) => Boolean(value)),
          ),
        ),
      );

      if (logoFile) data.append("logo_image", logoFile);
      if (coverFile) data.append("cover_image", coverFile);
      if (removeLogo) data.append("remove_logo", "true");
      if (removeCover) data.append("remove_cover", "true");

      const response = await companyAPI.updateProfile(data);
      const profile = response.data as CompanyProfile;
      setCompany(profile);
      setForm(formFrom(profile));
      setLogoPreview(profile.logo_image_url);
      setCoverPreview(profile.cover_image_url);
      setLogoFile(null);
      setCoverFile(null);
      setRemoveLogo(false);
      setRemoveCover(false);
      toast.success("Company profile updated.");
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
          Loading company profile...
        </div>
      </div>
    );
  }

  if (!company || !form || error === "The company profile could not be loaded.") {
    return (
      <div className={`page ${styles.pageStack}`}>
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <Building2 size={20} />
          </span>
          <h1 className={styles.emptyTitle}>Profile unavailable</h1>
          <p className={styles.emptyCopy}>
            {error || "The company profile could not be loaded."}
          </p>
          <button className="btn btn-primary btn-sm" type="button" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Company profile</h1>
          <p className={styles.pageLead}>
            Maintain the operational and public details customers see. Legal
            identity, registration, status and public visibility are managed by
            the platform.
          </p>
        </div>
        <div className={styles.pageActions}>
          <span className={styles.pill}>
            <Shield size={13} /> {canUpdate ? "Editable" : "Read only"}
          </span>
        </div>
      </div>

      {error && error !== "The company profile could not be loaded." ? (
        <div className={`${styles.note} ${styles.warningNote}`} role="alert">
          {error}
        </div>
      ) : null}

      <form
        className={`${styles.formStack} ${styles.profileForm}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.profileGrid}>
          <div className={styles.formStack}>
            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>About the company</h2>
                <p className={styles.formSectionCopy}>
                  Public description and key contact channels.
                </p>
              </div>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label htmlFor="profile-description">Description</label>
                  <textarea
                    id="profile-description"
                    value={form.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-email">Contact email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={form.contact_email}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-phone">Contact phone</label>
                  <input
                    id="profile-phone"
                    value={form.contact_phone}
                    onChange={(event) =>
                      setField("contact_phone", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-alt-phone">Alternative phone</label>
                  <input
                    id="profile-alt-phone"
                    value={form.alternative_phone}
                    onChange={(event) =>
                      setField("alternative_phone", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-whatsapp">WhatsApp number</label>
                  <input
                    id="profile-whatsapp"
                    value={form.whatsapp_number}
                    onChange={(event) =>
                      setField("whatsapp_number", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-website">Website</label>
                  <input
                    id="profile-website"
                    type="url"
                    value={form.website}
                    onChange={(event) =>
                      setField("website", event.target.value)
                    }
                    placeholder="https://example.com"
                    disabled={!canUpdate}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <OpeningHoursEditor
                    value={form.opening_hours}
                    legacyText={form.legacy_opening_hours}
                    onChange={(opening_hours) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              opening_hours,
                              legacy_opening_hours: null,
                            }
                          : current,
                      )
                    }
                    disabled={!canUpdate}
                  />
                </div>
              </div>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Location</h2>
                <p className={styles.formSectionCopy}>
                  Address details and an optional map marker.
                </p>
              </div>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label htmlFor="profile-address">Address</label>
                  <input
                    id="profile-address"
                    value={form.address}
                    onChange={(event) =>
                      setField("address", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-locality">Locality</label>
                  <input
                    id="profile-locality"
                    value={form.locality}
                    onChange={(event) =>
                      setField("locality", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-district">District</label>
                  <input
                    id="profile-district"
                    value={form.district}
                    onChange={(event) =>
                      setField("district", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-region">Region</label>
                  <input
                    id="profile-region"
                    value={form.region}
                    onChange={(event) =>
                      setField("region", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-country">Country</label>
                  <input
                    id="profile-country"
                    value={form.country}
                    onChange={(event) =>
                      setField("country", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label>Location map</label>
                  <LocationPicker
                    latitude={
                      form.latitude ? Number(form.latitude) : null
                    }
                    longitude={
                      form.longitude ? Number(form.longitude) : null
                    }
                    onChange={(latitude, longitude) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              latitude: String(latitude),
                              longitude: String(longitude),
                            }
                          : current,
                      )
                    }
                    disabled={!canUpdate}
                    label="Company location map"
                  />
                  <p className={styles.formHint}>
                    Select the company location on the map. Clear both fields
                    below to remove the marker.
                  </p>
                  {(form.latitude || form.longitude) && canUpdate ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() =>
                        setForm((current) =>
                          current
                            ? { ...current, latitude: "", longitude: "" }
                            : current,
                        )
                      }
                    >
                      <MapPin size={14} /> Clear map marker
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Social links</h2>
                <p className={styles.formSectionCopy}>
                  Optional full URLs for public profile links.
                </p>
              </div>
              <div className={styles.formGrid}>
                {(
                  [
                    ["social_facebook", "Facebook", "https://facebook.com/..."],
                    ["social_instagram", "Instagram", "https://instagram.com/..."],
                    ["social_x", "X / Twitter", "https://x.com/..."],
                    ["social_linkedin", "LinkedIn", "https://linkedin.com/company/..."],
                    ["social_youtube", "YouTube", "https://youtube.com/@..."],
                    ["social_tripadvisor", "Tripadvisor", "https://tripadvisor.com/..."],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <div className={styles.formField} key={key}>
                    <label htmlFor={`profile-${key}`}>{label}</label>
                    <input
                      id={`profile-${key}`}
                      type="url"
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      placeholder={placeholder}
                      disabled={!canUpdate}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.detailStack}>
            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Platform record</h2>
                <p className={styles.formSectionCopy}>
                  These fields are read-only in the company workspace.
                </p>
              </div>
              <dl className={styles.factList}>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Legal name</dt>
                  <dd className={styles.factValue}>{company.name}</dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Slug</dt>
                  <dd className={styles.factValue}>@{company.slug}</dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Registration</dt>
                  <dd className={styles.factValue}>
                    {company.registration_reference || "Not recorded"}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Business type</dt>
                  <dd className={styles.factValue}>
                    {company.business_type.replace(/_/g, " ").toLowerCase()}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Status</dt>
                  <dd className={styles.factValue}>
                    <span className={styles.badge}>{company.status}</span>
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.factLabel}>Public visibility</dt>
                  <dd className={styles.factValue}>
                    {company.is_public ? "Listed" : "Not listed"}
                  </dd>
                </div>
              </dl>
              <p className={styles.actionNote}>
                Contact the platform administrator if a legal or platform field
                needs to change.
              </p>
            </section>

            <section className={`glass-card ${styles.formSection}`}>
              <div className={styles.formSectionHead}>
                <h2 className={styles.formSectionTitle}>Brand images</h2>
                <p className={styles.formSectionCopy}>
                  Logo and cover images. A new file replaces the current image.
                </p>
              </div>
              <div className={styles.formStack} style={{ gap: 16 }}>
                <div className={styles.imageField}>
                  <label className={styles.formField} htmlFor="profile-logo">
                    <span>Logo</span>
                    <input
                      id="profile-logo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onLogo}
                      disabled={!canUpdate}
                    />
                  </label>
                  {logoPreview && !removeLogo ? (
                    <div className={styles.logoPreview}>
                      <Image
                        src={logoPreview}
                        alt="Company logo preview"
                        width={152}
                        height={152}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className={styles.logoPreviewEmpty}>
                      <Building2 size={24} />
                    </div>
                  )}
                  {(logoPreview || company.logo_image_url) && canUpdate ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogo(true);
                      }}
                    >
                      <Trash2 size={14} /> Remove logo
                    </button>
                  ) : null}
                </div>

                <div className={styles.imageField}>
                  <label className={styles.formField} htmlFor="profile-cover">
                    <span>Cover image</span>
                    <input
                      id="profile-cover"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onCover}
                      disabled={!canUpdate}
                    />
                  </label>
                  {coverPreview && !removeCover ? (
                    <div className={styles.imagePreview}>
                      <Image
                        src={coverPreview}
                        alt="Company cover preview"
                        width={480}
                        height={270}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className={styles.imagePreviewEmpty}>
                      <ImageIcon size={22} />
                      <span>No cover image</span>
                    </div>
                  )}
                  {(coverPreview || company.cover_image_url) && canUpdate ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setRemoveCover(true);
                      }}
                    >
                      <Trash2 size={14} /> Remove cover
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            {canUpdate ? (
              <div className={styles.stickyActions}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            ) : (
              <p className={styles.actionNote}>
                Your role has read-only access to the company profile.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
