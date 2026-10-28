"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import TripPlaceMapPicker from "@/components/TripPlaceMapPicker";
import OpeningHoursEditor from "@/components/OpeningHoursEditor";
import {
  Building2,
  Camera,
  Globe,
  Image as ImageIcon,
  Loader,
  Lock,
  MapPin,
  Save,
  Shield,
  Trash2,
  Upload,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { companyAPI } from "@/lib/api/client";
import {
  openingHoursForEditor,
  type CompanyOpeningHours,
} from "@/lib/company-opening-hours";
import styles from "@/features/pages/company-profile.module.css";

const LOAD_ERROR = "The company profile could not be loaded.";

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

const SOCIAL_FIELDS = [
  ["social_facebook", "Facebook", "https://facebook.com/..."],
  ["social_instagram", "Instagram", "https://instagram.com/..."],
  ["social_x", "X / Twitter", "https://x.com/..."],
  ["social_linkedin", "LinkedIn", "https://linkedin.com/company/..."],
  ["social_youtube", "YouTube", "https://youtube.com/@..."],
  ["social_tripadvisor", "Tripadvisor", "https://tripadvisor.com/..."],
] as const;

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

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

function contactChannelCount(form: FormState) {
  return [
    form.contact_email,
    form.contact_phone,
    form.alternative_phone,
    form.whatsapp_number,
    form.website,
  ].filter((value) => value.trim()).length;
}

function openDayCount(form: FormState) {
  return Object.values(form.opening_hours).filter((day) => day.is_open).length;
}

function socialCount(form: FormState) {
  return [
    form.social_facebook,
    form.social_instagram,
    form.social_x,
    form.social_linkedin,
    form.social_youtube,
    form.social_tripadvisor,
  ].filter((value) => value.trim()).length;
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

  const activeCompany =
    user?.companies?.find(
      (item) => item.id === user.active_company_id,
    ) ?? (user?.companies?.length === 1 ? user.companies[0] : null);
  const canUpdate =
    activeCompany?.permissions.includes("profile:update") ?? false;

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
        setError(LOAD_ERROR);
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
    setLogoPreview(
      file ? URL.createObjectURL(file) : company?.logo_image_url ?? null,
    );
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
      <div id="profile-workspace" className={styles.profileRoot}>
        <div className={styles.profileSkeleton} role="status">
          <span className={styles.profileSrOnly}>
            Loading company profile…
          </span>
          <div className={styles.profileSkeletonHead}>
            <div
              className={`${styles.profileSkeletonLine} ${styles.profileSkeletonBreadcrumb}`}
            />
            <div
              className={`${styles.profileSkeletonLine} ${styles.profileSkeletonTitle}`}
            />
            <div
              className={`${styles.profileSkeletonLine} ${styles.profileSkeletonLead}`}
            />
          </div>
          <div className={styles.profileSkeletonHero} />
          <div className={styles.profileSkeletonLayout}>
            <div className={styles.profileSkeletonCol}>
              <div className={styles.profileSkeletonSection} />
              <div className={styles.profileSkeletonSection} />
            </div>
            <div className={styles.profileSkeletonCol}>
              <div
                className={`${styles.profileSkeletonSection} ${styles.profileSkeletonSectionShort}`}
              />
              <div className={styles.profileSkeletonSection} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company || !form) {
    return (
      <div id="profile-workspace" className={styles.profileRoot}>
        <div className={styles.profileState} role="alert">
          <span className={styles.profileStateIcon} aria-hidden="true">
            <Building2 size={24} />
          </span>
          <h1 className={styles.profileStateTitle}>Profile unavailable</h1>
          <p className={styles.profileStateCopy}>
            {error || LOAD_ERROR}
          </p>
          <div className={styles.profileStateActions}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasLogo = Boolean(logoPreview) && !removeLogo;
  const hasCover = Boolean(coverPreview) && !removeCover;
  const openDays = openDayCount(form);
  const channels = contactChannelCount(form);
  const linkedSocials = socialCount(form);
  const businessType = humanize(company.business_type);
  const statusLabel = humanize(company.status);
  const aboveFormError = error && error !== LOAD_ERROR ? error : null;

  return (
    <div id="profile-workspace" className={styles.profileRoot}>
      <header className={styles.profileMasthead}>
        <div className={styles.profileMastheadText}>
          <nav className={styles.profileBreadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span className={styles.profileBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.profileBreadcrumbCurrent}>Profile</span>
          </nav>
          <p className={styles.profileEyebrow}>Company workspace</p>
          <h1 className={styles.profileTitle}>Company profile</h1>
          <p className={styles.profileLead}>
            Maintain the operational and public details customers see. Legal
            identity, registration, status and public visibility are managed by
            the platform.
          </p>
        </div>
        <div className={styles.profileActions}>
          <span
            className={`${styles.profilePill} ${
              canUpdate ? styles.profilePillEditable : styles.profilePillReadonly
            }`}
          >
            <Shield size={13} aria-hidden="true" />
            {canUpdate ? "Editable" : "Read only"}
          </span>
        </div>
      </header>

      {aboveFormError ? (
        <div
          className={`${styles.profileNote} ${styles.profileWarning}`}
          role="alert"
        >
          <span className={styles.profileNoteIcon} aria-hidden="true">
            <Shield size={16} />
          </span>
          {aboveFormError}
        </div>
      ) : null}

      <section
        className={styles.profileHero}
        aria-label="Company identity overview"
      >
        <div className={styles.profileHeroMain}>
          <div className={styles.profileCover}>
            {hasCover ? (
              <Image
                className={styles.profileCoverImage}
                src={coverPreview as string}
                alt=""
                width={1200}
                height={360}
                unoptimized
              />
            ) : (
              <div className={styles.profileCoverEmpty} aria-hidden="true" />
            )}
            <span
              className={`${styles.profileCoverLogo} ${
                hasLogo ? "" : styles.profileCoverLogoEmpty
              }`}
            >
              {hasLogo ? (
                <Image
                  className={styles.profileCoverLogoImage}
                  src={logoPreview as string}
                  alt={`${company.name} logo`}
                  width={160}
                  height={160}
                  unoptimized
                />
              ) : (
                <span aria-hidden="true">{initials(company.name)}</span>
              )}
            </span>
          </div>

          <div className={styles.profileHeroBody}>
            <div className={styles.profileIdentity}>
              <div className={styles.profileIdentityText}>
                <h2 className={styles.profileHeroTitle}>{company.name}</h2>
                <p className={styles.profileHeroMeta}>
                  <span>@{company.slug}</span>
                  <span className={styles.profileMetaDot} aria-hidden="true" />
                  <span>{businessType}</span>
                </p>
                <div className={styles.profileTagRow}>
                  <span className={styles.profileTag}>
                    <span
                      className={styles.profileTagDot}
                      aria-hidden="true"
                    />
                    {statusLabel}
                  </span>
                  <span
                    className={`${styles.profileTag} ${
                      company.is_public
                        ? styles.profileTagGood
                        : styles.profileTagMuted
                    }`}
                  >
                    {company.is_public ? (
                      <Globe size={13} aria-hidden="true" />
                    ) : (
                      <Lock size={13} aria-hidden="true" />
                    )}
                    {company.is_public ? "Publicly listed" : "Not listed"}
                  </span>
                </div>
              </div>
            </div>

            <ul className={styles.profileStatRow}>
              <li className={styles.profileStat}>
                <span className={styles.profileStatLabel}>Visibility</span>
                <span className={styles.profileStatValue}>
                  {company.is_public ? "Listed" : "Hidden"}
                </span>
                <span className={styles.profileStatHint}>
                  Public company directory
                </span>
              </li>
              <li className={styles.profileStat}>
                <span className={styles.profileStatLabel}>Open days</span>
                <span className={styles.profileStatValue}>{openDays} of 7</span>
                <span className={styles.profileStatHint}>
                  Weekly opening schedule
                </span>
              </li>
              <li className={styles.profileStat}>
                <span className={styles.profileStatLabel}>Contact channels</span>
                <span className={styles.profileStatValue}>{channels}</span>
                <span className={styles.profileStatHint}>
                  Ways customers can reach you
                </span>
              </li>
            </ul>
          </div>
        </div>

        <aside className={styles.profileAside}>
          <div className={styles.profileAsideMain}>
            <p className={styles.profileAsideLabel}>Profile access</p>
            <p className={styles.profileAsideValue}>
              {canUpdate ? "Editable" : "Read only"}
            </p>
            <p className={styles.profileAsideCopy}>
              {canUpdate
                ? "Update contact, location and scheduling details. Changes appear on the public listing once saved."
                : "Your role can review the company profile but cannot change these details."}
            </p>
          </div>
          {canUpdate ? (
            <button
              className={styles.profileAsideCta}
              type="submit"
              form="company-profile-form"
              disabled={saving}
            >
              {saving ? (
                <Loader size={15} className={styles.profileSpin} />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              {saving ? "Saving…" : "Save profile"}
            </button>
          ) : (
            <span className={styles.profileAsideLock}>
              <Lock size={14} aria-hidden="true" /> Managed by the platform
            </span>
          )}
        </aside>
      </section>

      <form
        id="company-profile-form"
        className={styles.profileForm}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.profileLayout}>
          <div className={styles.profileMain}>
            <section className={styles.profileSection} aria-labelledby="profile-about-title">
              <div className={styles.profileSectionHead}>
                <span className={styles.profileSectionIcon} aria-hidden="true">
                  <Building2 size={19} />
                </span>
                <div className={styles.profileSectionHeadText}>
                  <h2
                    className={styles.profileSectionTitle}
                    id="profile-about-title"
                  >
                    About the company
                  </h2>
                  <p className={styles.profileSectionCopy}>
                    Public description and key contact channels.
                  </p>
                </div>
              </div>

              <div className={styles.profileGrid}>
                <div
                  className={`${styles.profileField} ${styles.profileFieldFull}`}
                >
                  <label htmlFor="profile-description">Description</label>
                  <textarea
                    id="profile-description"
                    className={styles.profileTextarea}
                    value={form.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                  <p className={styles.profileHint}>
                    Appears on the public company page. Describe what you offer
                    and where you operate.
                  </p>
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-email">Contact email</label>
                  <div className={styles.profileReadonlyWrap}>
                    <input
                      id="profile-email"
                      className={`${styles.profileInput} ${styles.profileInputLocked}`}
                      type="email"
                      value={form.contact_email}
                      readOnly
                      aria-readonly="true"
                    />
                    <Lock
                      className={styles.profileReadonlyIcon}
                      size={14}
                      aria-hidden="true"
                    />
                  </div>
                  <p className={styles.profileHint}>
                    Managed by the platform.
                  </p>
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-phone">Contact phone</label>
                  <input
                    id="profile-phone"
                    className={styles.profileInput}
                    value={form.contact_phone}
                    onChange={(event) =>
                      setField("contact_phone", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-alt-phone">Alternative phone</label>
                  <input
                    id="profile-alt-phone"
                    className={styles.profileInput}
                    value={form.alternative_phone}
                    onChange={(event) =>
                      setField("alternative_phone", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-whatsapp">WhatsApp number</label>
                  <input
                    id="profile-whatsapp"
                    className={styles.profileInput}
                    value={form.whatsapp_number}
                    onChange={(event) =>
                      setField("whatsapp_number", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-website">Website</label>
                  <input
                    id="profile-website"
                    className={styles.profileInput}
                    type="url"
                    value={form.website}
                    onChange={(event) =>
                      setField("website", event.target.value)
                    }
                    placeholder="https://example.com"
                    disabled={!canUpdate}
                  />
                </div>

                <div
                  className={`${styles.profileField} ${styles.profileFieldFull}`}
                >
                  <div className={styles.profileHours}>
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
              </div>
            </section>

            <section className={styles.profileSection} aria-labelledby="profile-location-title">
              <div className={styles.profileSectionHead}>
                <span className={styles.profileSectionIcon} aria-hidden="true">
                  <MapPin size={19} />
                </span>
                <div className={styles.profileSectionHeadText}>
                  <h2
                    className={styles.profileSectionTitle}
                    id="profile-location-title"
                  >
                    Location
                  </h2>
                  <p className={styles.profileSectionCopy}>
                    Address details and an optional map marker.
                  </p>
                </div>
              </div>

              <div className={styles.profileGrid}>
                <div
                  className={`${styles.profileField} ${styles.profileFieldFull}`}
                >
                  <label htmlFor="profile-address">Address</label>
                  <input
                    id="profile-address"
                    className={styles.profileInput}
                    value={form.address}
                    onChange={(event) =>
                      setField("address", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-locality">Locality</label>
                  <input
                    id="profile-locality"
                    className={styles.profileInput}
                    value={form.locality}
                    onChange={(event) =>
                      setField("locality", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-district">District</label>
                  <input
                    id="profile-district"
                    className={styles.profileInput}
                    value={form.district}
                    onChange={(event) =>
                      setField("district", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-region">Region</label>
                  <input
                    id="profile-region"
                    className={styles.profileInput}
                    value={form.region}
                    onChange={(event) =>
                      setField("region", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div className={styles.profileField}>
                  <label htmlFor="profile-country">Country</label>
                  <input
                    id="profile-country"
                    className={styles.profileInput}
                    value={form.country}
                    onChange={(event) =>
                      setField("country", event.target.value)
                    }
                    disabled={!canUpdate}
                  />
                </div>

                <div
                  className={`${styles.profileField} ${styles.profileFieldFull} ${styles.profileMapField}`}
                >
                  <span className={styles.profileMapLabel}>Location map</span>
                  <TripPlaceMapPicker
                    latitude={form.latitude ? Number(form.latitude) : null}
                    longitude={form.longitude ? Number(form.longitude) : null}
                    disabled={!canUpdate}
                    onSelectPlace={(place) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              latitude: String(place.latitude),
                              longitude: String(place.longitude),
                            }
                          : current,
                      )
                    }
                    onPickPoint={(latitude, longitude) =>
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
                    onClearPoint={() => {}}
                  />
                  <p className={styles.profileHint}>
                    Select the company location on the map. Clear both fields
                    below to remove the marker.
                  </p>
                  {form.latitude || form.longitude ? (
                    canUpdate ? (
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
                        <MapPin size={14} aria-hidden="true" /> Clear map marker
                      </button>
                    ) : null
                  ) : null}
                </div>
              </div>
            </section>

            <section className={styles.profileSection} aria-labelledby="profile-social-title">
              <div className={styles.profileSectionHead}>
                <span className={styles.profileSectionIcon} aria-hidden="true">
                  <Globe size={19} />
                </span>
                <div className={styles.profileSectionHeadText}>
                  <h2
                    className={styles.profileSectionTitle}
                    id="profile-social-title"
                  >
                    Social links
                  </h2>
                  <p className={styles.profileSectionCopy}>
                    Optional full URLs for public profile links.
                  </p>
                </div>
                <span className={styles.profileSectionBadge}>
                  {linkedSocials} linked
                </span>
              </div>

              <div className={styles.profileGrid}>
                {SOCIAL_FIELDS.map(([key, label, placeholder]) => (
                  <div className={styles.profileField} key={key}>
                    <label htmlFor={`profile-${key}`}>{label}</label>
                    <input
                      id={`profile-${key}`}
                      className={styles.profileInput}
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

          <aside className={styles.profileRail}>
            <section className={styles.profileSection} aria-labelledby="profile-record-title">
              <div className={styles.profileSectionHead}>
                <span className={styles.profileSectionIcon} aria-hidden="true">
                  <Shield size={19} />
                </span>
                <div className={styles.profileSectionHeadText}>
                  <h2
                    className={styles.profileSectionTitle}
                    id="profile-record-title"
                  >
                    Platform record
                  </h2>
                  <p className={styles.profileSectionCopy}>
                    These fields are read-only in the company workspace.
                  </p>
                </div>
              </div>

              <dl className={styles.profileFactList}>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Legal name</dt>
                  <dd className={styles.profileFactValue}>{company.name}</dd>
                </div>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Slug</dt>
                  <dd className={styles.profileFactValue}>@{company.slug}</dd>
                </div>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Registration</dt>
                  <dd className={styles.profileFactValue}>
                    {company.registration_reference || "Not recorded"}
                  </dd>
                </div>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Business type</dt>
                  <dd className={styles.profileFactValue}>{businessType}</dd>
                </div>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Status</dt>
                  <dd className={styles.profileFactValue}>
                    <span className={styles.profileStatus}>{statusLabel}</span>
                  </dd>
                </div>
                <div className={styles.profileFact}>
                  <dt className={styles.profileFactLabel}>Public visibility</dt>
                  <dd className={styles.profileFactValue}>
                    {company.is_public ? "Listed" : "Not listed"}
                  </dd>
                </div>
              </dl>

              <p className={styles.profileFactNote}>
                Contact the platform administrator if a legal or platform field
                needs to change.
              </p>
            </section>

            <section className={styles.profileSection} aria-labelledby="profile-images-title">
              <div className={styles.profileSectionHead}>
                <span className={styles.profileSectionIcon} aria-hidden="true">
                  <Camera size={19} />
                </span>
                <div className={styles.profileSectionHeadText}>
                  <h2
                    className={styles.profileSectionTitle}
                    id="profile-images-title"
                  >
                    Brand images
                  </h2>
                  <p className={styles.profileSectionCopy}>
                    Logo and cover images. A new file replaces the current image.
                  </p>
                </div>
              </div>

              <div className={styles.profileUploads}>
                <div className={styles.profileUpload}>
                  <div className={styles.profileUploadHead}>
                    <div className={styles.profileUploadText}>
                      <span className={styles.profileUploadLabel}>Logo</span>
                      <p className={styles.profileUploadHint}>
                        Square PNG, JPG or WebP.
                      </p>
                    </div>
                    <input
                      id="profile-logo"
                      className={styles.profileFileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={
                        hasLogo ? "Replace company logo" : "Upload company logo"
                      }
                      onChange={onLogo}
                      disabled={!canUpdate}
                    />
                    <label
                      className={`${styles.profileUploadButton} ${
                        !canUpdate ? styles.profileUploadButtonDisabled : ""
                      }`}
                      htmlFor="profile-logo"
                      aria-disabled={!canUpdate || undefined}
                    >
                      <Upload size={14} aria-hidden="true" />
                      {hasLogo ? "Replace" : "Upload"}
                    </label>
                  </div>

                  <div
                    className={`${styles.profileLogoFrame} ${
                      hasLogo ? "" : styles.profileImageFrameEmpty
                    }`}
                  >
                    {hasLogo ? (
                      <Image
                        className={styles.profileImage}
                        src={logoPreview as string}
                        alt="Company logo preview"
                        width={152}
                        height={152}
                        unoptimized
                      />
                    ) : (
                      <Building2 size={26} aria-hidden="true" />
                    )}
                  </div>

                  {(logoPreview || company.logo_image_url) &&
                  !removeLogo &&
                  canUpdate ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogo(true);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Remove logo
                    </button>
                  ) : null}
                </div>

                <div className={styles.profileUpload}>
                  <div className={styles.profileUploadHead}>
                    <div className={styles.profileUploadText}>
                      <span className={styles.profileUploadLabel}>
                        Cover image
                      </span>
                      <p className={styles.profileUploadHint}>
                        Wide PNG, JPG or WebP.
                      </p>
                    </div>
                    <input
                      id="profile-cover"
                      className={styles.profileFileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={
                        hasCover
                          ? "Replace company cover"
                          : "Upload company cover"
                      }
                      onChange={onCover}
                      disabled={!canUpdate}
                    />
                    <label
                      className={`${styles.profileUploadButton} ${
                        !canUpdate ? styles.profileUploadButtonDisabled : ""
                      }`}
                      htmlFor="profile-cover"
                      aria-disabled={!canUpdate || undefined}
                    >
                      <Upload size={14} aria-hidden="true" />
                      {hasCover ? "Replace" : "Upload"}
                    </label>
                  </div>

                  <div
                    className={`${styles.profileCoverFrame} ${
                      hasCover ? "" : styles.profileImageFrameEmpty
                    }`}
                  >
                    {hasCover ? (
                      <Image
                        className={styles.profileImage}
                        src={coverPreview as string}
                        alt="Company cover preview"
                        width={640}
                        height={360}
                        unoptimized
                      />
                    ) : (
                      <>
                        <ImageIcon size={22} aria-hidden="true" />
                        <span>No cover image</span>
                      </>
                    )}
                  </div>

                  {(coverPreview || company.cover_image_url) &&
                  !removeCover &&
                  canUpdate ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setRemoveCover(true);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Remove cover
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            {canUpdate ? (
              <div className={styles.profileSticky}>
                <span className={styles.profileStickyIcon} aria-hidden="true">
                  <Save size={18} />
                </span>
                <div className={styles.profileStickyText}>
                  <strong>Save changes</strong>
                  <span>
                    {saving
                      ? "Writing updates to the platform…"
                      : "Applies to your public listing."}
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader size={16} className={styles.profileSpin} />
                  ) : (
                    <Save size={16} aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            ) : (
              <p className={styles.profileActionNote}>
                <Lock size={14} aria-hidden="true" />
                Your role has read-only access to the company profile.
              </p>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
