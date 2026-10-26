"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle,
  KeyRound,
  LayoutDashboard,
  Loader,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
  X,
} from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { authAPI, profileAPI } from "@/lib/api/client";
import type { Customer } from "@/features/pages/types";
import styles from "@/features/pages/account-settings.module.css";

type ProfileForm = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
};

const PROFILE_FIELDS: (keyof ProfileForm)[] = [
  "full_name",
  "email",
  "phone",
  "address",
];

function formatMonthYear(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { isAuthenticated, user, loading: authLoading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [credentialsUsernameOverride, setCredentialsUsernameOverride] = useState<
    string | null
  >(null);
  const credentialsUsername = credentialsUsernameOverride ?? user?.username ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [allowNotifications, setAllowNotifications] = useState<boolean>(() => {
    try { return localStorage.getItem("profile:notifications") === "true"; } catch { return false; }
  });
  const [allowLocation, setAllowLocation] = useState<boolean>(() => {
    try { return localStorage.getItem("profile:location") === "true"; } catch { return false; }
  });
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem("profile:currentLocation");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [locating, setLocating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const showMessage = useCallback((text: string, type: "success" | "error" = "success") => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    setMessageType(type);
    messageTimer.current = setTimeout(() => {
      setMessage("");
      messageTimer.current = null;
    }, 4000);
  }, []);

  const applyProfile = useCallback((data: Customer) => {
    setProfile(data);
    setForm({
      full_name: data.full_name || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
    });
    setImagePreview(data.profile_image || null);
    setImageFile(null);
    setDirty(false);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileAPI.get();
      applyProfile(res.data);
    } catch {
      showMessage("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, [applyProfile, showMessage]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    let active = true;
    profileAPI
      .get()
      .then((res) => {
        if (active) applyProfile(res.data);
      })
      .catch(() => {
        if (active) showMessage("Failed to load profile", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyProfile, authLoading, isAuthenticated, router, showMessage]);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  // Preferences are hydrated by lazy state initializers above.

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setDirty(true);
  };

  const openImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showMessage("Invalid format. Use JPG, PNG, or WEBP.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage("Image too large. Max 5MB.", "error");
      event.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setDirty(true);
    event.target.value = "";
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setDirty(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", form.full_name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("address", form.address);
      if (imageFile) fd.append("image", imageFile);
      const res = await profileAPI.update(fd);
      setProfile(res.data);
      setImageFile(null);
      setDirty(false);
      await refreshUser();
      window.dispatchEvent(new Event("profile-updated"));
      showMessage("Profile updated successfully");
    } catch (error: unknown) {
      const response = error as {
        response?: { data?: { error?: string; message?: string } };
      };
      showMessage(
        response.response?.data?.error ||
          response.response?.data?.message ||
          "Failed to save profile",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCredentialsSave = async () => {
    if (newPassword && newPassword.length < 8) {
      showMessage("New password must be at least 8 characters", "error");
      return;
    }
    setSavingCredentials(true);
    try {
      await authAPI.updateUser({
        username: credentialsUsername,
        ...(newPassword ? { password: newPassword } : {}),
      });
      await refreshUser();
      setCredentialsUsernameOverride(null);
      setNewPassword("");
      showMessage("Account details updated successfully");
    } catch (error: unknown) {
      const response = error as {
        response?: { data?: { error?: string; message?: string } };
      };
      showMessage(
        response.response?.data?.error ||
          response.response?.data?.message ||
          "Failed to update account details",
        "error",
      );
    } finally {
      setSavingCredentials(false);
    }
  };

const persistPreference = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures in restricted environments.
    }
  };

  const handleToggleNotifications = (checked: boolean) => {
    setAllowNotifications(checked);
    persistPreference("profile:notifications", String(checked));
  };

  const handleToggleLocation = (checked: boolean) => {
    setAllowLocation(checked);
    persistPreference("profile:location", String(checked));
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Geolocation is not supported by your browser", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        persistPreference("profile:currentLocation", JSON.stringify(location));
        setLocating(false);
        showMessage("Current location updated");
      },
      () => {
        setLocating(false);
        showMessage("Unable to get your current location", "error");
      },
      { timeout: 10000 },
    );
  };

  const handleSignout = async () => {
    await logout();
    router.push("/login");
  };

  const handleCancel = () => {
    void loadProfile();
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div id="settings-workspace" className={styles.settingsRoot}>
        <div className={styles.settingsSkeleton} role="status" aria-live="polite">
          <span className={styles.settingsSrOnly}>Loading account settings…</span>
          <div className={styles.settingsSkeletonHead}>
            <div
              className={`${styles.settingsSkeletonLine} ${styles.settingsSkeletonBreadcrumb}`}
            />
            <div
              className={`${styles.settingsSkeletonLine} ${styles.settingsSkeletonTitle}`}
            />
            <div
              className={`${styles.settingsSkeletonLine} ${styles.settingsSkeletonLead}`}
            />
          </div>
          <div className={styles.settingsSkeletonHero} />
          <div className={styles.settingsSkeletonLayout}>
            <div className={styles.settingsSkeletonSection} />
            <div
              className={`${styles.settingsSkeletonSection} ${styles.settingsSkeletonSectionShort}`}
            />
          </div>
        </div>
      </div>
    );
  }

  const isCompanyAccount = user?.account_type === "TOUR_COMPANY";
  const accountLabel = user?.is_staff
    ? "Administrator"
    : isCompanyAccount
      ? "Travel company"
      : "Traveler";
  const dashboardHref = user?.is_staff
    ? "/admin/dashboard/"
    : isCompanyAccount
      ? "/company/dashboard/"
      : "/dashboard/";
  const username = user?.username || profile?.username || "account";
  const displayName = form.full_name.trim() || user?.username || "Your account";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const completedFields = PROFILE_FIELDS.filter((field) =>
    form[field].trim(),
  ).length;
  const completionPercent = Math.round(
    (completedFields / PROFILE_FIELDS.length) * 100,
  );
  const contactChannels = [form.email, form.phone].filter((value) =>
    value.trim(),
  ).length;
  const memberSince = formatMonthYear(
    profile?.date_joined ?? user?.date_joined,
  );
  const missingField = !form.full_name.trim()
    ? "Add your full name"
    : !form.email.trim()
      ? "Add an email address"
      : !form.phone.trim()
        ? "Add a phone number"
        : !form.address.trim()
          ? "Add your address"
          : null;
  const completionCopy =
    completedFields === PROFILE_FIELDS.length
      ? "Every contact detail is in place. Your profile is ready for booking conversations."
      : `${missingField} to complete your contact details.`;

  return (
    <div id="settings-workspace" className={styles.settingsRoot}>
      <header className={styles.settingsMasthead}>
        <div className={styles.settingsMastheadText}>
          <nav className={styles.settingsBreadcrumb} aria-label="Breadcrumb">
            <Link href={dashboardHref}>Dashboard</Link>
            <span className={styles.settingsBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.settingsBreadcrumbCurrent}>Settings</span>
          </nav>
          <p className={styles.settingsEyebrow}>Your Travel account</p>
          <h1 className={styles.settingsTitle}>Account settings</h1>
          <p className={styles.settingsLead}>
            Keep your personal details and profile photo current, and manage the
            credentials used to sign in. Your contact information stays private
            and is shared only as part of the bookings you make.
          </p>
        </div>
        <div className={styles.settingsActions}>
          <span className={styles.settingsPill}>
            <span className={styles.settingsPillDot} aria-hidden="true" />
            {accountLabel}
          </span>
          <Link className={styles.settingsMastButton} href={dashboardHref}>
            <LayoutDashboard size={15} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      {message ? (
        <div
          className={`${styles.settingsNotice} ${
            messageType === "success"
              ? styles.settingsNoticeSuccess
              : styles.settingsNoticeError
          }`}
          role={messageType === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <span className={styles.settingsNoticeIcon} aria-hidden="true">
            {messageType === "success" ? (
              <CheckCircle size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
          </span>
          <p className={styles.settingsNoticeText}>{message}</p>
          <button
            className={styles.settingsNoticeClose}
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section
        className={styles.settingsHero}
        aria-labelledby="settings-identity-title"
      >
        <div className={styles.settingsHeroMain}>
          <div className={styles.settingsIdentity}>
            <div className={styles.settingsAvatarWrap}>
              {imagePreview ? (
                <Image
                  className={styles.settingsAvatarImage}
                  src={imagePreview}
                  alt={`${displayName} profile photo`}
                  width={256}
                  height={256}
                  unoptimized
                />
              ) : (
                <span className={styles.settingsAvatarPlaceholder} aria-hidden="true">
                  {avatarInitial}
                </span>
              )}
              <button
                className={styles.settingsAvatarCamera}
                type="button"
                onClick={openImagePicker}
                aria-label={imagePreview ? "Change profile photo" : "Add profile photo"}
              >
                <Camera size={16} aria-hidden="true" />
              </button>
              {imagePreview ? (
                <button
                  className={styles.settingsAvatarRemove}
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove profile photo"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              ) : null}
              <input
                ref={imageInputRef}
                className={styles.settingsFileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <div className={styles.settingsIdentityText}>
              <div className={styles.settingsTagRow}>
                <span
                  className={`${styles.settingsTag} ${styles.settingsTagAccent}`}
                >
                  {accountLabel}
                </span>
                <span className={styles.settingsTag}>
                  <Lock size={12} aria-hidden="true" /> Private profile
                </span>
              </div>
              <h2
                className={styles.settingsHeroTitle}
                id="settings-identity-title"
              >
                {displayName}
              </h2>
              <p className={styles.settingsHeroMeta}>
                <span>@{username}</span>
                <span className={styles.settingsMetaDot} aria-hidden="true" />
                <span>{form.email || "Email not added"}</span>
              </p>

              <div className={styles.settingsPhotoRow}>
                <button
                  className={styles.settingsPhotoAction}
                  type="button"
                  onClick={openImagePicker}
                >
                  <Camera size={14} aria-hidden="true" />
                  {imagePreview ? "Change photo" : "Add photo"}
                </button>
                {imagePreview ? (
                  <button
                    className={styles.settingsPhotoRemove}
                    type="button"
                    onClick={removeImage}
                  >
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                ) : null}
                <span className={styles.settingsPhotoHint}>
                  JPG, PNG or WEBP · Max 5MB
                </span>
              </div>
            </div>
          </div>

          <ul className={styles.settingsStatRow}>
            <li className={styles.settingsStat}>
              <span className={styles.settingsStatLabel}>Contact channels</span>
              <span className={styles.settingsStatValue}>
                {contactChannels}
                <span className={styles.settingsStatUnit}> / 2</span>
              </span>
              <span className={styles.settingsStatHint}>
                Email and phone on file
              </span>
            </li>
            <li className={styles.settingsStat}>
              <span className={styles.settingsStatLabel}>Member since</span>
              <span
                className={`${styles.settingsStatValue} ${styles.settingsStatValueSmall}`}
              >
                {memberSince}
              </span>
              <span className={styles.settingsStatHint}>
                Account creation date
              </span>
            </li>
            <li className={styles.settingsStat}>
              <span className={styles.settingsStatLabel}>Profile details</span>
              <span className={styles.settingsStatValue}>
                {completedFields}
                <span className={styles.settingsStatUnit}> / 4</span>
              </span>
              <span className={styles.settingsStatHint}>
                Name, email, phone and address
              </span>
            </li>
          </ul>
        </div>

        <aside className={styles.settingsAside}>
          <div className={styles.settingsAsideMain}>
            <p className={styles.settingsAsideLabel}>Profile status</p>
            <p className={styles.settingsAsideValue}>{completionPercent}%</p>
            <div
              className={styles.settingsProgress}
              role="progressbar"
              aria-label="Profile completeness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <span
                className={styles.settingsProgressFill}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className={styles.settingsAsideCopy}>{completionCopy}</p>
          </div>
          <a className={styles.settingsAsideCta} href="#profile-details">
            <User size={15} aria-hidden="true" />
            Review profile
          </a>
        </aside>
      </section>

      <div className={styles.settingsLayout}>
        <div className={styles.settingsMain}>
          <form
            id="settings-profile-form"
            className={styles.settingsForm}
            onSubmit={handleSave}
          >
            <section
              className={styles.settingsSection}
              id="profile-details"
              aria-labelledby="settings-profile-title"
            >
              <div className={styles.settingsSectionHead}>
                <span className={styles.settingsSectionIcon} aria-hidden="true">
                  <User size={19} />
                </span>
                <div className={styles.settingsSectionHeadText}>
                  <h2
                    className={styles.settingsSectionTitle}
                    id="settings-profile-title"
                  >
                    Personal details
                  </h2>
                  <p className={styles.settingsSectionCopy}>
                    The name and contact information attached to your account.
                  </p>
                </div>
                <span
                  className={`${styles.settingsSectionBadge} ${
                    dirty ? styles.settingsSectionBadgeDirty : ""
                  }`}
                >
                  {dirty ? "Unsaved changes" : "Up to date"}
                </span>
              </div>

              <div className={styles.settingsFieldGrid}>
                <div
                  className={`${styles.settingsField} ${styles.settingsFieldFull}`}
                >
                  <label className={styles.settingsFieldLabel} htmlFor="settings-full-name">
                    <User size={13} aria-hidden="true" /> Full name
                  </label>
                  <input
                    className={styles.settingsInput}
                    id="settings-full-name"
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </div>

                <div className={styles.settingsField}>
                  <label className={styles.settingsFieldLabel} htmlFor="settings-email">
                    <Mail size={13} aria-hidden="true" /> Email address
                  </label>
                  <input
                    className={styles.settingsInput}
                    id="settings-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                  <p className={styles.settingsHint}>
                    Used for booking updates and account notices.
                  </p>
                </div>

                <div className={styles.settingsField}>
                  <label className={styles.settingsFieldLabel} htmlFor="settings-phone">
                    <Phone size={13} aria-hidden="true" /> Phone number
                  </label>
                  <input
                    className={styles.settingsInput}
                    id="settings-phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+255..."
                    autoComplete="tel"
                  />
                  <p className={styles.settingsHint}>
                    Helps companies reach you about a booking.
                  </p>
                </div>

                <div
                  className={`${styles.settingsField} ${styles.settingsFieldFull}`}
                >
                  <label className={styles.settingsFieldLabel} htmlFor="settings-address">
                    <MapPin size={13} aria-hidden="true" /> Address
                  </label>
                  <textarea
                    className={styles.settingsTextarea}
                    id="settings-address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                    rows={3}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              <div className={styles.settingsFormFooter}>
                <p className={styles.settingsFormNote}>
                  <Shield size={14} aria-hidden="true" />
                  {dirty
                    ? "You have unsaved profile changes."
                    : "Your profile details are saved."}
                </p>
                <div className={styles.settingsFormActions}>
                  {dirty ? (
                    <button
                      className={`${styles.settingsButton} ${styles.settingsButtonSecondary}`}
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className={`${styles.settingsButton} ${styles.settingsButtonPrimary}`}
                    type="submit"
                    disabled={saving || !dirty}
                  >
                    {saving ? (
                      <Loader size={16} className={styles.settingsSpin} />
                    ) : (
                      <Save size={16} aria-hidden="true" />
                    )}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </section>
          </form>
        </div>

        <aside className={styles.settingsRail} aria-label="Account summary">
          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <Shield size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2 className={styles.settingsSectionTitle}>Account record</h2>
                <p className={styles.settingsSectionCopy}>
                  The identity details tied to this account.
                </p>
              </div>
            </div>

            <dl className={styles.settingsFactList}>
              <div className={styles.settingsFact}>
                <dt className={styles.settingsFactLabel}>Username</dt>
                <dd className={styles.settingsFactValue}>@{username}</dd>
              </div>
              <div className={styles.settingsFact}>
                <dt className={styles.settingsFactLabel}>Account type</dt>
                <dd className={styles.settingsFactValue}>{accountLabel}</dd>
              </div>
              <div className={styles.settingsFact}>
                <dt className={styles.settingsFactLabel}>Email</dt>
                <dd className={styles.settingsFactValue}>
                  {form.email || "Not added"}
                </dd>
              </div>
              <div className={styles.settingsFact}>
                <dt className={styles.settingsFactLabel}>Member since</dt>
                <dd className={styles.settingsFactValue}>{memberSince}</dd>
              </div>
            </dl>

            <p className={styles.settingsFactNote}>
              <Lock size={13} aria-hidden="true" />
              Your account record is private and never shown on public listings.
            </p>
          </section>

          <section
            className={styles.settingsSection}
            aria-labelledby="settings-security-title"
          >
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <KeyRound size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2
                  className={styles.settingsSectionTitle}
                  id="settings-security-title"
                >
                  Signin &amp; security
                </h2>
                <p className={styles.settingsSectionCopy}>
                  {isCompanyAccount
                    ? "Update the credentials you use to sign in."
                    : "Your sign-in details are protected by your Travel account."}
                </p>
              </div>
            </div>

            {isCompanyAccount ? (
              <div className={styles.settingsSecurityForm}>
                <div className={styles.settingsField}>
                  <label className={styles.settingsFieldLabel} htmlFor="settings-username">
                    <User size={13} aria-hidden="true" /> Username
                  </label>
                  <input
                    className={styles.settingsInput}
                    id="settings-username"
                    type="text"
                    value={credentialsUsername}
                    onChange={(event) =>
                      setCredentialsUsernameOverride(event.target.value)
                    }
                    autoComplete="username"
                    minLength={3}
                    maxLength={150}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label className={styles.settingsFieldLabel} htmlFor="settings-password">
                    <Lock size={13} aria-hidden="true" /> New password
                  </label>
                  <input
                    className={styles.settingsInput}
                    id="settings-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Leave blank to keep your current password"
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <p className={styles.settingsHint}>
                    Use at least 8 characters if you set a new password.
                  </p>
                </div>
                <div className={styles.settingsSecurityFooter}>
                  <button
                    className={`${styles.settingsButton} ${styles.settingsButtonPrimary} ${styles.settingsButtonFull}`}
                    type="button"
                    disabled={
                      savingCredentials ||
                      (!newPassword &&
                        credentialsUsername === (user?.username ?? "")) ||
                      credentialsUsername.length < 3 ||
                      Boolean(newPassword && newPassword.length < 8)
                    }
                    onClick={handleCredentialsSave}
                  >
                    {savingCredentials ? (
                      <Loader size={16} className={styles.settingsSpin} />
                    ) : (
                      <Save size={16} aria-hidden="true" />
                    )}
                    {savingCredentials ? "Saving…" : "Update account"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.settingsSecurityNote}>
                <span className={styles.settingsSecurityIcon} aria-hidden="true">
                  <Lock size={16} />
                </span>
                <div>
                  <p className={styles.settingsSecurityTitle}>Password protected</p>
                  <p className={styles.settingsSecurityCopy}>
                    Need help with your username or password?{" "}
                    <Link href="/contact/">Contact support</Link>.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <Mail size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2 className={styles.settingsSectionTitle}>Notifications</h2>
                <p className={styles.settingsSectionCopy}>
                  Choose whether Travel can send updates about your bookings and
                  account.
                </p>
              </div>
            </div>
            <label className={styles.settingsField}>
              <span className={styles.settingsFieldLabel}>
                <Mail size={13} aria-hidden="true" /> Allow notifications
              </span>
              <input
                className={styles.settingsInput}
                type="checkbox"
                checked={allowNotifications}
                onChange={(event) => handleToggleNotifications(event.target.checked)}
              />
            </label>
          </section>

          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <MapPin size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2 className={styles.settingsSectionTitle}>Location</h2>
                <p className={styles.settingsSectionCopy}>
                  Allow Travel to use your location and refresh it whenever you
                  need.
                </p>
              </div>
            </div>
            <label className={styles.settingsField}>
              <span className={styles.settingsFieldLabel}>
                <MapPin size={13} aria-hidden="true" /> Allow location
              </span>
              <input
                className={styles.settingsInput}
                type="checkbox"
                checked={allowLocation}
                onChange={(event) => handleToggleLocation(event.target.checked)}
              />
            </label>
            <button
              className={`${styles.settingsButton} ${styles.settingsButtonPrimary}`}
              type="button"
              onClick={handleCurrentLocation}
              disabled={locating}
            >
              {locating ? "Locating…" : "Current location"}
            </button>
            {currentLocation ? (
              <p className={styles.settingsHint}>
                Current location: {currentLocation.lat.toFixed(5)},{" "}
                {currentLocation.lng.toFixed(5)}
              </p>
            ) : null}
          </section>

          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <Lock size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2 className={styles.settingsSectionTitle}>Account</h2>
                <p className={styles.settingsSectionCopy}>
                  Sign out of your Travel account on this device.
                </p>
              </div>
            </div>
            <button
              className={`${styles.settingsButton} ${styles.settingsButtonPrimary}`}
              type="button"
              onClick={handleSignout}
            >
              Signout
            </button>
          </section>

          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHead}>
              <span className={styles.settingsSectionIcon} aria-hidden="true">
                <CalendarDays size={19} />
              </span>
              <div className={styles.settingsSectionHeadText}>
                <h2 className={styles.settingsSectionTitle}>Your workspace</h2>
                <p className={styles.settingsSectionCopy}>
                  {isCompanyAccount
                    ? "Manage your company presence from the dashboard."
                    : "Keep track of bookings and explore new experiences."}
                </p>
              </div>
            </div>
            <Link className={styles.settingsSupportLink} href={dashboardHref}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Open dashboard
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
