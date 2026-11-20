"use client";

import Image from "next/image";
import Link from "next/link";
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
  BarChart3,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  ClipboardList,
  Compass,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import { VEHICLE_CATEGORIES } from "@/lib/driver-vehicle";
import type {
  AssignedDriverVehicleRecord,
  DriverVehiclePortalData,
  SerializedDriverVehicle,
} from "@/lib/services/driver-vehicle";
import { useToast } from "@/components/ToastProvider";
import ws from "@/features/pages/driver-workspace.module.css";
import styles from "@/features/pages/driver-vehicle.module.css";

type Props = {
  initialData: DriverVehiclePortalData;
};

type PhotoAngle = "front" | "side" | "back";

const DEFAULT_INCLUDES = "A/C\nFuel\nMineral Water\nLuggage Assistance";
const DEFAULT_EXCLUDES = "Driver Tips\nPark Entry Fees";

function formatPricingType(type: string): string {
  const clean = type.replace(/_/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Per trip";
}

function formatDateLabel(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Recently";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function VehicleShowcaseCard({
  vehicle,
  readOnly,
  companyName,
  services,
  assignmentSource,
  onEdit,
  onRequestDelete,
}: {
  vehicle: SerializedDriverVehicle;
  readOnly: boolean;
  companyName?: string | null;
  services?: AssignedDriverVehicleRecord["services"];
  assignmentSource?: AssignedDriverVehicleRecord["assignment_source"];
  onEdit?: () => void;
  onRequestDelete?: () => void;
}) {
  const [angle, setAngle] = useState<PhotoAngle>("front");

  const photos: Array<{ key: PhotoAngle; label: string; url: string }> = [
    ...(vehicle.front_image_url
      ? [{ key: "front" as const, label: "Front view", url: vehicle.front_image_url }]
      : []),
    ...(vehicle.side_image_url
      ? [{ key: "side" as const, label: "Side view", url: vehicle.side_image_url }]
      : []),
    ...(vehicle.back_image_url
      ? [{ key: "back" as const, label: "Back view", url: vehicle.back_image_url }]
      : []),
  ];

  const activePhoto = photos.find((p) => p.key === angle) ?? photos[0] ?? null;

  return (
    <article className={styles.vehicleCard}>
      <div className={styles.galleryWrap}>
        {activePhoto ? (
          <Image
            src={activePhoto.url}
            alt={`${vehicle.name} — ${activePhoto.label}`}
            fill
            sizes="(max-width: 960px) 100vw, 720px"
            className={styles.galleryMainImg}
            unoptimized
          />
        ) : (
          <div className={styles.galleryFallback}>
            <Car size={46} aria-hidden="true" />
          </div>
        )}

        <div className={styles.galleryTopBadges}>
          <div className={styles.galleryBadgeCluster}>
            <span className={styles.categoryPill}>{vehicle.category}</span>
            <span className={styles.platePill}>{vehicle.plate_number}</span>
          </div>
          <span
            className={`${styles.availPill} ${
              vehicle.is_available ? styles.availOn : styles.availOff
            }`}
          >
            {vehicle.is_available ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : (
              <XCircle size={13} aria-hidden="true" />
            )}
            {vehicle.is_available ? "Available" : "Unavailable"}
          </span>
        </div>
      </div>

      {photos.length > 1 ? (
        <div className={styles.thumbStrip} role="tablist" aria-label="Vehicle photo angles">
          {photos.map((photo) => (
            <button
              key={photo.key}
              type="button"
              role="tab"
              aria-selected={activePhoto?.key === photo.key}
              className={`${styles.thumbBtn} ${
                activePhoto?.key === photo.key ? styles.thumbBtnActive : ""
              }`}
              onClick={() => setAngle(photo.key)}
            >
              <Image
                src={photo.url}
                alt={photo.label}
                width={44}
                height={32}
                className={styles.thumbImg}
                unoptimized
              />
              <span>{photo.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.vehicleBody}>
        <div className={styles.vehicleHeadingRow}>
          <div>
            <h2 className={styles.vehicleTitle}>{vehicle.name}</h2>
            <p className={styles.vehicleSub}>
              {readOnly
                ? `Assigned by ${companyName || "your company"} · Updated ${formatDateLabel(vehicle.updated_at)}`
                : `Registered directly by you · Updated ${formatDateLabel(vehicle.updated_at)}`}
            </p>
          </div>
          {readOnly ? (
            <span className={styles.lockBadge}>
              <Lock size={12} aria-hidden="true" />
              Company managed
            </span>
          ) : (
            <span className={`${styles.slotBadge} ${styles.slotBadgeFull}`}>
              <ShieldCheck size={12} aria-hidden="true" />
              1 / 1 registered
            </span>
          )}
        </div>

        <div className={styles.specsGrid}>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>
              <Car size={12} aria-hidden="true" />
              Plate
            </span>
            <strong className={styles.specValue}>{vehicle.plate_number}</strong>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>
              <Users size={12} aria-hidden="true" />
              Passengers
            </span>
            <strong className={styles.specValue}>{vehicle.capacity} Seats</strong>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>
              <Briefcase size={12} aria-hidden="true" />
              Luggage
            </span>
            <strong className={styles.specValue}>{vehicle.luggage_capacity} Bags</strong>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>
              <ShieldCheck size={12} aria-hidden="true" />
              Category
            </span>
            <strong className={styles.specValue}>{vehicle.category}</strong>
          </div>
        </div>

        {vehicle.description ? <p className={styles.descriptionBox}>{vehicle.description}</p> : null}

        <div className={styles.amenitiesGrid}>
          <div className={styles.amenityCard}>
            <h3 className={`${styles.amenityHeading} ${styles.amenityHeadingInc}`}>
              <CheckCircle2 size={14} aria-hidden="true" />
              Included amenities
            </h3>
            {vehicle.includes.length > 0 ? (
              <div className={styles.pillList}>
                {vehicle.includes.map((item, idx) => (
                  <span key={`${item}-${idx}`} className={styles.pillInc}>
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.emptyHint}>No inclusions listed.</span>
            )}
          </div>

          <div className={styles.amenityCard}>
            <h3 className={`${styles.amenityHeading} ${styles.amenityHeadingExc}`}>
              <XCircle size={14} aria-hidden="true" />
              Excluded items
            </h3>
            {vehicle.excludes.length > 0 ? (
              <div className={styles.pillList}>
                {vehicle.excludes.map((item, idx) => (
                  <span key={`${item}-${idx}`} className={styles.pillExc}>
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.emptyHint}>No exclusions listed.</span>
            )}
          </div>
        </div>

        {readOnly && services && services.length > 0 ? (
          <div className={styles.servicesSection}>
            <div className={styles.servicesHeader}>
              <h4>Assigned company services ({services.length})</h4>
            </div>
            <div className={styles.serviceList}>
              {services.map((svc) => (
                <div key={svc.id} className={styles.serviceItem}>
                  <div className={styles.serviceItemTop}>
                    <span className={styles.serviceItemTitle}>{svc.title}</span>
                    <span className={svc.is_active ? styles.serviceTagActive : styles.serviceTagPaused}>
                      {svc.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <span className={styles.serviceItemMeta}>
                    ${svc.price} · {formatPricingType(svc.pricing_type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : readOnly && assignmentSource === "booking" ? (
          <div className={styles.servicesSection}>
            <span className={styles.emptyHint}>
              Assigned to your driver account via an active company transport booking.
            </span>
          </div>
        ) : null}
      </div>

      {!readOnly && onEdit && onRequestDelete ? (
        <footer className={styles.vehicleFooter}>
          <span className={styles.vehicleFooterNote}>
            <Info size={14} aria-hidden="true" />
            1 vehicle limit active — edit details or delete to register another vehicle.
          </span>
          <div className={styles.vehicleFooterActions}>
            <button type="button" className={ws.btnPrimary} onClick={onEdit}>
              <Pencil size={15} aria-hidden="true" />
              Edit Vehicle
            </button>
            <button type="button" className={styles.btnDanger} onClick={onRequestDelete}>
              <Trash2 size={15} aria-hidden="true" />
              Delete Vehicle
            </button>
          </div>
        </footer>
      ) : (
        <footer className={styles.vehicleFooter}>
          <span className={styles.vehicleFooterNote}>
            <Lock size={14} aria-hidden="true" />
            View only — edits and removal are managed by {companyName || "your company"}.
          </span>
        </footer>
      )}
    </article>
  );
}

export default function DriverVehiclePage({ initialData }: Props) {
  const toast = useToast();
  const [data, setData] = useState<DriverVehiclePortalData>(initialData);
  const [refreshing, setRefreshing] = useState(false);

  // Public hire driver CRUD UI state
  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">("closed");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form fields (matching company vehicle registration fields)
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [category, setCategory] = useState<string>(VEHICLE_CATEGORIES[0]);
  const [capacity, setCapacity] = useState(4);
  const [luggageCapacity, setLuggageCapacity] = useState(2);
  const [description, setDescription] = useState("");
  const [includesText, setIncludesText] = useState(DEFAULT_INCLUDES);
  const [excludesText, setExcludesText] = useState(DEFAULT_EXCLUDES);
  const [isAvailable, setIsAvailable] = useState(true);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [removeSideImage, setRemoveSideImage] = useState(false);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [removeBackImage, setRemoveBackImage] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const revokeObjectUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => revokeObjectUrls();
  }, [revokeObjectUrls]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await driverAPI.getVehicle();
      if (res.data) {
        setData(res.data as DriverVehiclePortalData);
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not refresh vehicle details.");
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  const openCreateForm = () => {
    if (!data.can_manage) return;
    if (data.own_vehicle) {
      toast.error("You already have 1 registered vehicle. Edit or delete it first.");
      return;
    }
    revokeObjectUrls();
    setConfirmDelete(false);
    setName("");
    setPlateNumber("");
    setCategory(VEHICLE_CATEGORIES[0]);
    setCapacity(4);
    setLuggageCapacity(2);
    setDescription("");
    setIncludesText(DEFAULT_INCLUDES);
    setExcludesText(DEFAULT_EXCLUDES);
    setIsAvailable(true);
    setFrontFile(null);
    setFrontPreview(null);
    setSideFile(null);
    setSidePreview(null);
    setRemoveSideImage(false);
    setBackFile(null);
    setBackPreview(null);
    setRemoveBackImage(false);
    setFormMode("create");
  };

  const openEditForm = () => {
    const v = data.own_vehicle;
    if (!data.can_manage || !v) return;
    revokeObjectUrls();
    setConfirmDelete(false);
    setName(v.name);
    setPlateNumber(v.plate_number);
    setCategory(v.category || VEHICLE_CATEGORIES[0]);
    setCapacity(v.capacity);
    setLuggageCapacity(v.luggage_capacity);
    setDescription(v.description || "");
    setIncludesText(v.includes.join("\n"));
    setExcludesText(v.excludes.join("\n"));
    setIsAvailable(v.is_available);
    setFrontFile(null);
    setFrontPreview(v.front_image_url || null);
    setSideFile(null);
    setSidePreview(v.side_image_url || null);
    setRemoveSideImage(false);
    setBackFile(null);
    setBackPreview(v.back_image_url || null);
    setRemoveBackImage(false);
    setFormMode("edit");
  };

  const closeForm = () => {
    revokeObjectUrls();
    setFormMode("closed");
  };

  const pickFile = (
    e: ChangeEvent<HTMLInputElement>,
    slot: PhotoAngle,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    if (slot === "front") {
      setFrontFile(file);
      setFrontPreview(url);
    } else if (slot === "side") {
      setSideFile(file);
      setSidePreview(url);
      setRemoveSideImage(false);
    } else {
      setBackFile(file);
      setBackPreview(url);
      setRemoveBackImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data.can_manage) return;

    if (!name.trim()) {
      toast.error("Please enter your vehicle name / model.");
      return;
    }
    if (!plateNumber.trim()) {
      toast.error("Please enter your vehicle plate / registration number.");
      return;
    }
    if (formMode === "create" && !frontFile) {
      toast.error("Front vehicle image is required.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("plate_number", plateNumber.trim().toUpperCase());
      formData.append("category", category);
      formData.append("capacity", String(capacity));
      formData.append("luggage_capacity", String(luggageCapacity));
      formData.append("description", description.trim());
      formData.append("is_available", String(isAvailable));

      const includesArray = includesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludesArray = excludesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("includes", JSON.stringify(includesArray));
      formData.append("excludes", JSON.stringify(excludesArray));

      if (frontFile) formData.append("front_image", frontFile);
      if (sideFile) formData.append("side_image", sideFile);
      else if (formMode === "edit" && removeSideImage) formData.append("remove_side_image", "true");

      if (backFile) formData.append("back_image", backFile);
      else if (formMode === "edit" && removeBackImage) formData.append("remove_back_image", "true");

      if (formMode === "edit") {
        await driverAPI.updateVehicle(formData);
        toast.success("Your vehicle details have been updated.");
      } else {
        await driverAPI.createVehicle(formData);
        toast.success("Vehicle registered successfully.");
      }

      closeForm();
      await reload();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; error?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          "Could not save your vehicle. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!data.can_manage || !data.own_vehicle) return;
    setDeleting(true);
    try {
      await driverAPI.deleteVehicle();
      toast.success("Vehicle deleted. You can register a new vehicle anytime.");
      setConfirmDelete(false);
      setFormMode("closed");
      await reload();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; error?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          "Could not delete this vehicle.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const isPublicDriver = data.can_manage;
  const company = data.driver.company;
  const ownVehicle = data.own_vehicle;
  const assignedVehicles = data.assigned_vehicles;

  return (
    <main id="driver-workspace-root" className={`page ${ws.page}`}>
      <div id="driver-vehicle-root" className={ws.shell}>
        {/* TOP DRIVER WORKSPACE NAV */}
        <nav className={ws.topNav} aria-label="Driver workspace navigation">
          <div className={ws.topNavTabs}>
            <Link href="/driver/dashboard/" className={ws.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/driver/bookings/" className={ws.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
            <Link href="/driver/trips/" className={ws.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link
              href="/driver/vehicle/"
              className={`${ws.topNavLink} ${ws.topNavLinkActive}`}
              aria-current="page"
            >
              <Car size={15} aria-hidden="true" />
              Vehicle
            </Link>
            <Link href="/driver/insight/" className={ws.topNavLink}>
              <BarChart3 size={15} aria-hidden="true" />
              Insight
            </Link>
          </div>

          <button
            type="button"
            className={ws.btnSecondary}
            onClick={() => void reload()}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? ws.spin : ""} aria-hidden="true" />
            Refresh
          </button>
        </nav>

        {/* HERO HEADER */}
        <header className={ws.heroCard}>
          <div className={ws.heroCopy}>
            <div className={ws.eyebrowRow}>
              <span className={ws.eyebrow}>
                {isPublicDriver ? (
                  <Car size={13} aria-hidden="true" />
                ) : (
                  <Building2 size={13} aria-hidden="true" />
                )}
                {isPublicDriver
                  ? "Public hire driver · Direct registration"
                  : `Private hire driver · ${company?.name ?? "Assigned company"}`}
              </span>

              {isPublicDriver ? (
                <span
                  className={`${styles.slotBadge} ${
                    ownVehicle ? styles.slotBadgeFull : ""
                  }`}
                >
                  <ShieldCheck size={12} aria-hidden="true" />
                  {ownVehicle ? "1 / 1 vehicle registered" : "0 / 1 vehicle slot available"}
                </span>
              ) : (
                <span className={styles.lockBadge}>
                  <Lock size={12} aria-hidden="true" />
                  View only · Company managed
                </span>
              )}
            </div>

            <h1 className={ws.heroTitle}>
              {isPublicDriver ? "My Registered Vehicle" : "Assigned Company Vehicle"}
            </h1>
          </div>

          <div className={ws.heroActions}>
            {isPublicDriver && !ownVehicle && formMode === "closed" ? (
              <button type="button" className={ws.btnPrimary} onClick={openCreateForm}>
                <Plus size={16} aria-hidden="true" />
                Register Vehicle
              </button>
            ) : isPublicDriver && ownVehicle && formMode === "closed" ? (
              <button type="button" className={ws.btnPrimary} onClick={openEditForm}>
                <Pencil size={15} aria-hidden="true" />
                Edit Vehicle
              </button>
            ) : null}
          </div>
        </header>

        {/* ROLE POLICY BANNER */}
        {isPublicDriver ? (
          <section
            className={`${styles.policyBanner} ${styles.policyBannerInfo}`}
            aria-label="Public hire driver vehicle policy"
          >
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div className={styles.policyCopy}>
              <strong>1 Vehicle per Public Hire Driver</strong>
              <p>
                Your registered vehicle automatically appears on your bookings, WhatsApp trip
                cards, and monthly insight reports. To switch to another car, edit your current
                vehicle or delete it first before registering a new one.
              </p>
            </div>
          </section>
        ) : (
          <section
            className={styles.policyBanner}
            aria-label="Private hire driver read-only policy"
          >
            <span className={styles.policyIcon} aria-hidden="true">
              <Lock size={18} />
            </span>
            <div className={styles.policyCopy}>
              <strong>View-only access — managed by {company?.name ?? "your company"}</strong>
              <p>
                As a company private hire driver, your assigned vehicle is registered and
                maintained by {company?.name ?? "your company"}. Adding, editing, or deleting
                vehicles is disabled here — contact your company manager if any details need
                updating.
              </p>
            </div>
          </section>
        )}

        {/* MAIN 2-COLUMN CONTENT */}
        <div className={styles.vehicleLayout}>
          <div className={styles.vehicleColumn}>
            {/* PUBLIC HIRE DRIVER: CREATE / EDIT FORM */}
            {isPublicDriver && formMode !== "closed" ? (
              <section className={styles.formCard} aria-labelledby="driver-vehicle-form-title">
                <header className={styles.formHeader}>
                  <div>
                    <h2 id="driver-vehicle-form-title">
                      {formMode === "edit" ? "Edit Registered Vehicle" : "Register Your Vehicle"}
                    </h2>
                    <p>
                      {formMode === "edit"
                        ? "Update your vehicle specs, availability, inclusions, or photos."
                        : "Enter the same vehicle details companies register — 1 vehicle per public hire driver."}
                    </p>
                  </div>
                  <button type="button" className={ws.btnSecondary} onClick={closeForm}>
                    <X size={15} aria-hidden="true" />
                    Cancel
                  </button>
                </header>

                <form onSubmit={handleSubmit} className={styles.sectionStack}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="dv-name" className={styles.fieldLabel}>
                        Vehicle Name / Model <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id="dv-name"
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Toyota Alphard VIP"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="dv-plate" className={styles.fieldLabel}>
                        Plate / Registration Number <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id="dv-plate"
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Z 942 AB"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="dv-category" className={styles.fieldLabel}>
                        Category
                      </label>
                      <select
                        id="dv-category"
                        className={styles.select}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {VEHICLE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGridCompact}>
                      <div className={styles.field}>
                        <label htmlFor="dv-capacity" className={styles.fieldLabel}>
                          Seats (Pax)
                        </label>
                        <input
                          id="dv-capacity"
                          type="number"
                          min={1}
                          max={60}
                          className={styles.input}
                          value={capacity}
                          onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="dv-luggage" className={styles.fieldLabel}>
                          Luggage Bags
                        </label>
                        <input
                          id="dv-luggage"
                          type="number"
                          min={0}
                          max={60}
                          className={styles.input}
                          value={luggageCapacity}
                          onChange={(e) => setLuggageCapacity(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3-Photo Upload Section */}
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Vehicle Photos{" "}
                      <span className={styles.requiredMark}>* (Front view is required)</span>
                    </span>

                    <div className={styles.uploadGrid}>
                      {/* Front Image */}
                      <div
                        className={`${styles.uploadSlot} ${
                          frontPreview ? styles.uploadSlotFilled : ""
                        }`}
                        onClick={() => frontInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            frontInputRef.current?.click();
                          }
                        }}
                      >
                        <input
                          ref={frontInputRef}
                          type="file"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={(e) => pickFile(e, "front")}
                        />
                        {frontPreview ? (
                          <Image
                            src={frontPreview}
                            alt="Front view preview"
                            width={180}
                            height={96}
                            className={styles.uploadPreview}
                            unoptimized
                          />
                        ) : (
                          <Upload size={24} color="#08428c" aria-hidden="true" />
                        )}
                        <span className={styles.uploadTitle}>
                          Front View <span className={styles.requiredMark}>*</span>
                        </span>
                        <span className={styles.uploadHint}>
                          {frontPreview ? "Tap to replace" : "Tap to upload"}
                        </span>
                      </div>

                      {/* Side Image */}
                      <div
                        className={`${styles.uploadSlot} ${
                          sidePreview ? styles.uploadSlotFilled : ""
                        }`}
                        onClick={() => sideInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            sideInputRef.current?.click();
                          }
                        }}
                      >
                        <input
                          ref={sideInputRef}
                          type="file"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={(e) => pickFile(e, "side")}
                        />
                        {sidePreview ? (
                          <>
                            <button
                              type="button"
                              className={styles.removePhotoBtn}
                              aria-label="Remove side view photo"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSideFile(null);
                                setSidePreview(null);
                                setRemoveSideImage(true);
                              }}
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                            <Image
                              src={sidePreview}
                              alt="Side view preview"
                              width={180}
                              height={96}
                              className={styles.uploadPreview}
                              unoptimized
                            />
                          </>
                        ) : (
                          <Upload size={24} color="#64748b" aria-hidden="true" />
                        )}
                        <span className={styles.uploadTitle}>Side View</span>
                        <span className={styles.uploadHint}>
                          {sidePreview ? "Tap to replace" : "Optional"}
                        </span>
                      </div>

                      {/* Back Image */}
                      <div
                        className={`${styles.uploadSlot} ${
                          backPreview ? styles.uploadSlotFilled : ""
                        }`}
                        onClick={() => backInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            backInputRef.current?.click();
                          }
                        }}
                      >
                        <input
                          ref={backInputRef}
                          type="file"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={(e) => pickFile(e, "back")}
                        />
                        {backPreview ? (
                          <>
                            <button
                              type="button"
                              className={styles.removePhotoBtn}
                              aria-label="Remove back view photo"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBackFile(null);
                                setBackPreview(null);
                                setRemoveBackImage(true);
                              }}
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                            <Image
                              src={backPreview}
                              alt="Back view preview"
                              width={180}
                              height={96}
                              className={styles.uploadPreview}
                              unoptimized
                            />
                          </>
                        ) : (
                          <Upload size={24} color="#64748b" aria-hidden="true" />
                        )}
                        <span className={styles.uploadTitle}>Back View</span>
                        <span className={styles.uploadHint}>
                          {backPreview ? "Tap to replace" : "Optional"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inclusions & Exclusions */}
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="dv-includes" className={styles.fieldLabel}>
                        What&apos;s Included (one per line)
                      </label>
                      <textarea
                        id="dv-includes"
                        rows={3}
                        className={styles.textarea}
                        placeholder={"A/C\nFuel\nMineral Water"}
                        value={includesText}
                        onChange={(e) => setIncludesText(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="dv-excludes" className={styles.fieldLabel}>
                        What&apos;s Excluded (one per line)
                      </label>
                      <textarea
                        id="dv-excludes"
                        rows={3}
                        className={styles.textarea}
                        placeholder={"Driver tips\nPark entry fees"}
                        value={excludesText}
                        onChange={(e) => setExcludesText(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className={styles.field}>
                    <label htmlFor="dv-desc" className={styles.fieldLabel}>
                      Vehicle Description / Notes (Optional)
                    </label>
                    <textarea
                      id="dv-desc"
                      rows={3}
                      className={styles.textarea}
                      placeholder="Share details about comfort, air conditioning, Wi-Fi, child seats, or luggage guidelines..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Availability */}
                  <div className={styles.checkboxRow}>
                    <input
                      id="dv-available"
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                    />
                    <label htmlFor="dv-available">
                      Vehicle is currently active and available for trips
                    </label>
                  </div>

                  <div className={styles.formFooter}>
                    <button
                      type="button"
                      className={ws.btnSecondary}
                      onClick={closeForm}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className={ws.btnPrimary} disabled={submitting}>
                      {submitting ? (
                        <>
                          <LoaderCircle size={16} className={ws.spin} aria-hidden="true" />
                          Saving…
                        </>
                      ) : formMode === "edit" ? (
                        "Update Vehicle"
                      ) : (
                        "Register Vehicle"
                      )}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            {/* PUBLIC HIRE DRIVER: DELETE CONFIRMATION CARD */}
            {isPublicDriver && ownVehicle && confirmDelete ? (
              <section className={styles.deleteConfirmCard} role="alert">
                <strong>Delete {ownVehicle.name} ({ownVehicle.plate_number})?</strong>
                <p>
                  This will remove your registered vehicle and its uploaded photos from your
                  driver account. Afterward, your 1-vehicle slot will be free to register a new
                  vehicle.
                </p>
                <div className={styles.deleteConfirmActions}>
                  <button
                    type="button"
                    className={styles.btnDangerSolid}
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? (
                      <>
                        <LoaderCircle size={15} className={ws.spin} aria-hidden="true" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} aria-hidden="true" />
                        Yes, Delete Vehicle
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={ws.btnSecondary}
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep Vehicle
                  </button>
                </div>
              </section>
            ) : null}

            {/* PUBLIC HIRE DRIVER: VEHICLE DISPLAY OR EMPTY STATE */}
            {isPublicDriver && formMode === "closed" ? (
              ownVehicle ? (
                <VehicleShowcaseCard
                  vehicle={ownVehicle}
                  readOnly={false}
                  onEdit={openEditForm}
                  onRequestDelete={() => setConfirmDelete(true)}
                />
              ) : (
                <section className={ws.stateCard}>
                  <span className={ws.stateIcon} aria-hidden="true">
                    <Car size={28} />
                  </span>
                  <h3>No vehicle registered yet</h3>
                  <p>
                    Register your vehicle with photos, plate number, passenger seats, luggage
                    capacity, and amenities. Public hire drivers can register 1 vehicle and edit
                    or replace it anytime.
                  </p>
                  <div className={ws.stateActions}>
                    <button type="button" className={ws.btnPrimary} onClick={openCreateForm}>
                      <Plus size={16} aria-hidden="true" />
                      Register Your Vehicle
                    </button>
                  </div>
                </section>
              )
            ) : null}

            {/* PRIVATE HIRE DRIVER (COMPANY ASSIGNED): READ-ONLY ASSIGNED VEHICLES */}
            {!isPublicDriver ? (
              assignedVehicles.length > 0 ? (
                assignedVehicles.map((vehicle) => (
                  <VehicleShowcaseCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    readOnly
                    companyName={company?.name}
                    services={vehicle.services}
                    assignmentSource={vehicle.assignment_source}
                  />
                ))
              ) : (
                <section className={ws.stateCard}>
                  <span className={ws.stateIcon} aria-hidden="true">
                    <AlertCircle size={28} />
                  </span>
                  <h3>No company vehicle assigned yet</h3>
                  <p>
                    {company?.name ?? "Your company"} has not linked a fleet vehicle to your
                    driver account yet. Once your company assigns you a vehicle through Private
                    Hire Services or a transport booking, its full details and photos will appear
                    here automatically.
                  </p>
                  <div className={ws.stateActions}>
                    <Link href="/driver/bookings/" className={ws.linkSecondary}>
                      View Bookings
                    </Link>
                  </div>
                </section>
              )
            ) : null}
          </div>

          {/* RIGHT SIDEBAR: DRIVER PROFILE + COMPANY CONTACT / RULES */}
          <aside className={styles.asideStack}>
            <section className={styles.infoCard} aria-label="Driver vehicle summary">
              <h2 className={styles.infoCardTitle}>
                <ShieldCheck size={17} aria-hidden="true" />
                Driver &amp; Fleet Status
              </h2>
              <ul className={styles.detailList}>
                <li className={styles.detailRow}>
                  <span>Driver</span>
                  <strong>{data.driver.name}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>Account type</span>
                  <strong>{isPublicDriver ? "Public Hire Driver" : "Private Hire Driver"}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>License</span>
                  <strong>{data.driver.license_number || "Verified"}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>Vehicle access</span>
                  <strong>{isPublicDriver ? "Full (1 vehicle max)" : "View only"}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>Registered / Assigned</span>
                  <strong>
                    {isPublicDriver
                      ? ownVehicle
                        ? "1 of 1"
                        : "0 of 1"
                      : `${assignedVehicles.length} ${
                          assignedVehicles.length === 1 ? "vehicle" : "vehicles"
                        }`}
                  </strong>
                </li>
              </ul>
            </section>

            {!isPublicDriver && company ? (
              <section className={styles.infoCard} aria-label="Company fleet contact">
                <h2 className={styles.infoCardTitle}>
                  <Building2 size={17} aria-hidden="true" />
                  Company Fleet Manager
                </h2>
                <ul className={styles.detailList}>
                  <li className={styles.detailRow}>
                    <span>Company</span>
                    <strong>{company.name}</strong>
                  </li>
                  {company.contact_phone ? (
                    <li className={styles.detailRow}>
                      <span>
                        <Phone size={12} aria-hidden="true" /> Phone
                      </span>
                      <a href={`tel:${company.contact_phone}`}>{company.contact_phone}</a>
                    </li>
                  ) : null}
                  {company.contact_email ? (
                    <li className={styles.detailRow}>
                      <span>
                        <Mail size={12} aria-hidden="true" /> Email
                      </span>
                      <a href={`mailto:${company.contact_email}`}>{company.contact_email}</a>
                    </li>
                  ) : null}
                  {company.address ? (
                    <li className={styles.detailRow}>
                      <span>
                        <MapPin size={12} aria-hidden="true" /> Office
                      </span>
                      <strong>{company.address}</strong>
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : (
              <section className={styles.infoCard} aria-label="Registration guidelines">
                <h2 className={styles.infoCardTitle}>
                  <Car size={17} aria-hidden="true" />
                  Vehicle Registration Rules
                </h2>
                <ul className={styles.ruleList}>
                  <li className={styles.ruleItem}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>One active vehicle per public hire driver account.</span>
                  </li>
                  <li className={styles.ruleItem}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>Clear front photo is mandatory; side &amp; back photos are optional.</span>
                  </li>
                  <li className={styles.ruleItem}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>
                      Edit plate numbers, capacity, inclusions, or availability anytime.
                    </span>
                  </li>
                  <li className={styles.ruleItem}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>
                      Delete your current vehicle whenever you need to register a replacement car.
                    </span>
                  </li>
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
