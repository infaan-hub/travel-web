"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Building2,
  Car,
  Check,
  CreditCard,
  FileText,
  ImageDown,
  LoaderCircle,
  Pencil,
  Phone,
  RotateCcw,
  Share2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { driverAPI } from "@/lib/api/client";
import { VEHICLE_CATEGORIES } from "@/lib/driver-vehicle";
import {
  BUSINESS_CARD_QR_URL,
  clearBusinessCardOverrides,
  exportBusinessCardPdfBlob,
  exportBusinessCardPngBlob,
  getBusinessCardOverridesSnapshot,
  getDriverInitials,
  parseBusinessCardOverrides,
  slugifyBusinessCardFilename,
  subscribeBusinessCardOverrides,
  triggerBlobDownload,
  writeBusinessCardOverrides,
  type BusinessCardCustomOverrides,
  type DriverBusinessCardData,
} from "@/lib/driver-business-card";
import { generateQrMatrix } from "@/lib/qr-code";
import type {
  DriverVehiclePortalData,
  SerializedDriverVehicle,
} from "@/lib/services/driver-vehicle";
import styles from "@/features/driver/driver-business-card.module.css";

type Props = {
  driver: DriverVehiclePortalData["driver"];
  vehicles: SerializedDriverVehicle[];
  onPortalDataUpdated?: (next: DriverVehiclePortalData) => void;
};

const QUIET_MODULES = 3;
const getServerSnapshot = () => null;

export default function DriverBusinessCard({
  driver,
  vehicles,
  onPortalDataUpdated,
}: Props) {
  const toast = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    vehicles[0]?.id ?? null,
  );
  const [busyAction, setBusyAction] = useState<
    "share" | "image" | "pdf" | "save" | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [failedDriverUrl, setFailedDriverUrl] = useState<string | null>(null);
  const [failedVehicleUrl, setFailedVehicleUrl] = useState<string | null>(null);

  // Draft fields while editing the business card
  const [draftDriverName, setDraftDriverName] = useState("");
  const [draftDriverPhone, setDraftDriverPhone] = useState("");
  const [draftCompanyName, setDraftCompanyName] = useState("");
  const [draftDriverFile, setDraftDriverFile] = useState<File | null>(null);
  const [draftDriverPreview, setDraftDriverPreview] = useState<string | null>(null);

  const [draftVehName, setDraftVehName] = useState("");
  const [draftVehPlate, setDraftVehPlate] = useState("");
  const [draftVehCategory, setDraftVehCategory] = useState<string>(VEHICLE_CATEGORIES[0]);
  const [draftVehCapacity, setDraftVehCapacity] = useState(4);
  const [draftVehLuggage, setDraftVehLuggage] = useState(2);
  const [draftVehFrontFile, setDraftVehFrontFile] = useState<File | null>(null);
  const [draftVehFrontPreview, setDraftVehFrontPreview] = useState<string | null>(null);

  const driverPhotoInputRef = useRef<HTMLInputElement>(null);
  const vehFrontInputRef = useRef<HTMLInputElement>(null);
  const previewBlobUrlsRef = useRef<string[]>([]);

  const revokePreviewUrls = useCallback(() => {
    for (const url of previewBlobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewBlobUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => revokePreviewUrls();
  }, [revokePreviewUrls]);

  const rawOverrides = useSyncExternalStore(
    subscribeBusinessCardOverrides,
    () => getBusinessCardOverridesSnapshot(driver.id),
    getServerSnapshot,
  );
  const savedOverrides = useMemo(
    () => parseBusinessCardOverrides(rawOverrides),
    [rawOverrides],
  );

  const activeVehicle = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  }, [vehicles, selectedVehicleId]);

  const vehicleKey = activeVehicle ? String(activeVehicle.id) : "default";
  const isCompanyDriver = !driver.is_public || Boolean(driver.company);
  const vehOverride = savedOverrides?.vehiclesByKey?.[vehicleKey];

  const resolvedDriverName = savedOverrides?.driverName || driver.name;
  const resolvedDriverPhone = savedOverrides?.driverPhone || driver.phone;
  const resolvedDriverImage =
    savedOverrides?.driverImageUrl !== undefined
      ? savedOverrides.driverImageUrl
      : driver.image_url;
  const resolvedCompanyName = isCompanyDriver
    ? savedOverrides?.companyName ?? driver.company?.name ?? ""
    : "";

  const resolvedVehName = vehOverride?.name ?? activeVehicle?.name ?? "";
  const resolvedVehPlate = vehOverride?.plateNumber ?? activeVehicle?.plate_number ?? "";
  const resolvedVehCategory =
    vehOverride?.category ?? activeVehicle?.category ?? VEHICLE_CATEGORIES[0];
  const resolvedVehCapacity = vehOverride?.capacity ?? activeVehicle?.capacity ?? 4;
  const resolvedVehLuggage =
    vehOverride?.luggageCapacity ?? activeVehicle?.luggage_capacity ?? 2;
  const resolvedVehFrontUrl =
    vehOverride?.frontImageUrl !== undefined
      ? vehOverride.frontImageUrl
      : activeVehicle?.front_image_url || null;

  // Live displayed values (uses live draft while editing, saved values otherwise)
  const displayDriverName = isEditing
    ? draftDriverName.trim() || driver.name
    : resolvedDriverName;
  const displayDriverPhone = isEditing
    ? draftDriverPhone.trim()
    : resolvedDriverPhone;
  const displayDriverImage = isEditing ? draftDriverPreview : resolvedDriverImage;
  const displayCompanyName = isCompanyDriver
    ? (isEditing ? draftCompanyName : resolvedCompanyName).trim()
    : "";

  const displayVehName = isEditing ? draftVehName.trim() : resolvedVehName;
  const displayVehPlate = isEditing
    ? draftVehPlate.trim().toUpperCase()
    : resolvedVehPlate;
  const displayVehCategory = isEditing ? draftVehCategory : resolvedVehCategory;
  const displayVehCapacity = isEditing ? draftVehCapacity : resolvedVehCapacity;
  const displayVehLuggage = isEditing ? draftVehLuggage : resolvedVehLuggage;
  const displayVehFrontUrl = isEditing ? draftVehFrontPreview : resolvedVehFrontUrl;

  const hasVehicleDisplay = Boolean(
    activeVehicle || displayVehName || displayVehPlate || displayVehFrontUrl,
  );

  const qrSvg = useMemo(() => {
    const matrix = generateQrMatrix(BUSINESS_CARD_QR_URL);
    const size = matrix.length + QUIET_MODULES * 2;
    const segments: string[] = [];
    for (let r = 0; r < matrix.length; r += 1) {
      for (let c = 0; c < matrix.length; c += 1) {
        if (matrix[r][c]) {
          segments.push(`M${c + QUIET_MODULES} ${r + QUIET_MODULES}h1v1h-1z`);
        }
      }
    }
    return { viewBoxSize: size, path: segments.join("") };
  }, []);

  const cardData: DriverBusinessCardData = useMemo(
    () => ({
      driverName: displayDriverName,
      driverPhone: displayDriverPhone,
      driverImageUrl: displayDriverImage || null,
      companyName: displayCompanyName || null,
      licenseNumber: driver.license_number,
      vehicle: hasVehicleDisplay
        ? {
            id: activeVehicle?.id,
            name: displayVehName || "Pending vehicle",
            plateNumber: displayVehPlate || "PENDING",
            category: displayVehCategory || VEHICLE_CATEGORIES[0],
            capacity: displayVehCapacity,
            luggageCapacity: displayVehLuggage,
            frontImageUrl: displayVehFrontUrl || null,
          }
        : null,
    }),
    [
      displayDriverName,
      displayDriverPhone,
      displayDriverImage,
      displayCompanyName,
      driver.license_number,
      hasVehicleDisplay,
      activeVehicle?.id,
      displayVehName,
      displayVehPlate,
      displayVehCategory,
      displayVehCapacity,
      displayVehLuggage,
      displayVehFrontUrl,
    ],
  );

  const showDriverPhoto = Boolean(
    displayDriverImage && failedDriverUrl !== displayDriverImage,
  );
  const showVehiclePhoto = Boolean(
    displayVehFrontUrl && failedVehicleUrl !== displayVehFrontUrl,
  );

  const populateDraftFromCurrent = useCallback(
    (veh: SerializedDriverVehicle | null, overrides: BusinessCardCustomOverrides | null) => {
      const vKey = veh ? String(veh.id) : "default";
      const vOv = overrides?.vehiclesByKey?.[vKey];

      setDraftDriverName(overrides?.driverName || driver.name);
      setDraftDriverPhone(overrides?.driverPhone || driver.phone);
      setDraftCompanyName(
        isCompanyDriver ? overrides?.companyName ?? driver.company?.name ?? "" : "",
      );
      setDraftDriverFile(null);
      setDraftDriverPreview(
        overrides?.driverImageUrl !== undefined
          ? overrides.driverImageUrl
          : driver.image_url,
      );

      setDraftVehName(vOv?.name ?? veh?.name ?? "");
      setDraftVehPlate(vOv?.plateNumber ?? veh?.plate_number ?? "");
      setDraftVehCategory(vOv?.category ?? veh?.category ?? VEHICLE_CATEGORIES[0]);
      setDraftVehCapacity(vOv?.capacity ?? veh?.capacity ?? 4);
      setDraftVehLuggage(vOv?.luggageCapacity ?? veh?.luggage_capacity ?? 2);
      setDraftVehFrontFile(null);
      setDraftVehFrontPreview(
        vOv?.frontImageUrl !== undefined
          ? vOv.frontImageUrl
          : veh?.front_image_url || null,
      );
    },
    [driver, isCompanyDriver],
  );

  const toggleEditor = () => {
    if (isEditing) {
      revokePreviewUrls();
      setIsEditing(false);
      return;
    }
    revokePreviewUrls();
    populateDraftFromCurrent(activeVehicle, savedOverrides);
    setIsEditing(true);
  };

  const handleSelectVehicleTab = (veh: SerializedDriverVehicle) => {
    setSelectedVehicleId(veh.id);
    if (isEditing) {
      revokePreviewUrls();
      populateDraftFromCurrent(veh, savedOverrides);
    }
  };

  const handleDriverPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewBlobUrlsRef.current.push(url);
    setDraftDriverFile(file);
    setDraftDriverPreview(url);
    setFailedDriverUrl(null);
  };

  const handleVehFrontPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewBlobUrlsRef.current.push(url);
    setDraftVehFrontFile(file);
    setDraftVehFrontPreview(url);
    setFailedVehicleUrl(null);
  };

  const handleResetDefaults = () => {
    clearBusinessCardOverrides(driver.id);
    revokePreviewUrls();
    populateDraftFromCurrent(activeVehicle, null);
    toast.success("Business card reset to account defaults.");
  };

  const handleSaveCard = async (e: FormEvent) => {
    e.preventDefault();
    if (busyAction) return;

    const cleanName = draftDriverName.trim();
    const cleanPhone = draftDriverPhone.trim();
    if (!cleanName) {
      toast.error("Driver name is required.");
      return;
    }
    if (!cleanPhone) {
      toast.error("Driver phone number is required.");
      return;
    }

    setBusyAction("save");
    try {
      const fd = new FormData();
      fd.append("driver_name", cleanName);
      fd.append("driver_phone", cleanPhone);
      if (draftDriverFile) {
        fd.append("driver_image", draftDriverFile);
      }

      const cleanVehName = draftVehName.trim();
      const cleanVehPlate = draftVehPlate.trim().toUpperCase();
      fd.append("vehicle_name", cleanVehName);
      fd.append("plate_number", cleanVehPlate);
      fd.append("category", draftVehCategory);
      fd.append("capacity", String(draftVehCapacity));
      fd.append("luggage_capacity", String(draftVehLuggage));
      if (draftVehFrontFile) {
        fd.append("front_image", draftVehFrontFile);
      }

      const res = await driverAPI.updateBusinessCard(fd);
      const payload = res.data as {
        portal?: DriverVehiclePortalData;
        card_front_image_url?: string | null;
      };

      const nextPortal = payload?.portal;
      if (nextPortal && onPortalDataUpdated) {
        onPortalDataUpdated(nextPortal);
      }

      const persistedInOwnVehicle = Boolean(
        nextPortal?.can_manage && nextPortal?.own_vehicle,
      );

      const nextOverrides: BusinessCardCustomOverrides = {
        ...(savedOverrides ?? {}),
      };
      // Driver name/phone/image are persisted directly in PostgreSQL now
      delete nextOverrides.driverName;
      delete nextOverrides.driverPhone;
      delete nextOverrides.driverImageUrl;

      if (isCompanyDriver) {
        const cleanComp = draftCompanyName.trim();
        const defaultComp = nextPortal?.driver.company?.name ?? driver.company?.name ?? "";
        if (cleanComp && cleanComp !== defaultComp) {
          nextOverrides.companyName = cleanComp;
        } else {
          delete nextOverrides.companyName;
        }
      } else {
        delete nextOverrides.companyName;
      }

      const nextVehiclesMap = { ...(nextOverrides.vehiclesByKey ?? {}) };
      if (persistedInOwnVehicle) {
        delete nextVehiclesMap.default;
        if (nextPortal?.own_vehicle) {
          delete nextVehiclesMap[String(nextPortal.own_vehicle.id)];
        }
      } else {
        const savedFrontUrl =
          payload?.card_front_image_url ??
          (draftVehFrontPreview && !draftVehFrontPreview.startsWith("blob:")
            ? draftVehFrontPreview
            : activeVehicle?.front_image_url || null);

        nextVehiclesMap[vehicleKey] = {
          name: cleanVehName,
          plateNumber: cleanVehPlate,
          category: draftVehCategory,
          capacity: draftVehCapacity,
          luggageCapacity: draftVehLuggage,
          frontImageUrl: savedFrontUrl,
        };
      }

      if (Object.keys(nextVehiclesMap).length > 0) {
        nextOverrides.vehiclesByKey = nextVehiclesMap;
      } else {
        delete nextOverrides.vehiclesByKey;
      }

      if (Object.keys(nextOverrides).length > 0) {
        writeBusinessCardOverrides(driver.id, nextOverrides);
      } else {
        clearBusinessCardOverrides(driver.id);
      }

      revokePreviewUrls();
      setIsEditing(false);
      toast.success("Business card updated.");
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message || "Could not save business card changes.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    if (busyAction) return;
    setBusyAction("share");
    try {
      const pngBlob = await exportBusinessCardPngBlob(cardData);
      const filename = slugifyBusinessCardFilename(displayDriverName, "png");
      const pngFile = new File([pngBlob], filename, { type: "image/png" });
      const summaryText = cardData.vehicle
        ? `${displayDriverName} · ${displayDriverPhone} · ${cardData.vehicle.name} (${cardData.vehicle.plateNumber})`
        : `${displayDriverName} · ${displayDriverPhone}`;

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [pngFile] })
        ) {
          await navigator.share({
            title: `${displayDriverName} — Business Card`,
            files: [pngFile],
          });
          return;
        }
        await navigator.share({
          title: `${displayDriverName} — Business Card`,
          text: summaryText,
        });
        return;
      }

      if (
        typeof ClipboardItem !== "undefined" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard?.write
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": pngBlob }),
          ]);
          toast.success("Business card copied to clipboard — paste anywhere to share.");
          return;
        } catch {
          // Fall back to direct image download below
        }
      }

      triggerBlobDownload(pngBlob, filename);
      toast.success("Business card downloaded and ready to share.");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      toast.error("Could not share business card right now.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadImage = async () => {
    if (busyAction) return;
    setBusyAction("image");
    try {
      const pngBlob = await exportBusinessCardPngBlob(cardData);
      const filename = slugifyBusinessCardFilename(displayDriverName, "png");
      triggerBlobDownload(pngBlob, filename);
      toast.success("Business card downloaded as image.");
    } catch {
      toast.error("Could not generate business card image.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (busyAction) return;
    setBusyAction("pdf");
    try {
      const pdfBlob = await exportBusinessCardPdfBlob(cardData);
      const filename = slugifyBusinessCardFilename(displayDriverName, "pdf");
      triggerBlobDownload(pdfBlob, filename);
      toast.success("Business card downloaded as PDF.");
    } catch {
      toast.error("Could not generate business card PDF.");
    } finally {
      setBusyAction(null);
    }
  };

  const categoryChoices = useMemo(() => {
    const list: string[] = [...VEHICLE_CATEGORIES];
    if (draftVehCategory && !list.includes(draftVehCategory)) {
      list.unshift(draftVehCategory);
    }
    return list;
  }, [draftVehCategory]);

  return (
    <section
      className={styles.sectionCard}
      aria-labelledby="driver-business-card-heading"
    >
      <div className={styles.sectionHeader}>
        <div className={styles.headingCluster}>
          <span className={styles.headingIcon} aria-hidden="true">
            <CreditCard size={18} />
          </span>
          <div className={styles.headingText}>
            <h2 id="driver-business-card-heading" className={styles.sectionTitle}>
              Business card
            </h2>
            <p className={styles.sectionSub}>
              Small boarding-pass card with driver profile, front vehicle view &amp; scan QR
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {vehicles.length > 1 ? (
            <div
              className={styles.vehiclePicker}
              role="tablist"
              aria-label="Select business card vehicle"
            >
              {vehicles.map((veh) => {
                const isSelected = activeVehicle?.id === veh.id;
                return (
                  <button
                    key={veh.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`${styles.vehiclePill} ${
                      isSelected ? styles.vehiclePillActive : ""
                    }`}
                    onClick={() => handleSelectVehicleTab(veh)}
                  >
                    {veh.plate_number}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            className={`${styles.editToggleBtn} ${
              isEditing ? styles.editToggleBtnActive : ""
            }`}
            onClick={toggleEditor}
          >
            {isEditing ? (
              <>
                <X size={14} aria-hidden="true" />
                Close editor
              </>
            ) : (
              <>
                <Pencil size={14} aria-hidden="true" />
                Edit card
              </>
            )}
          </button>
        </div>
      </div>

      {/* Boarding-Pass Ticket Stage */}
      <div className={styles.passStage}>
        <article
          className={styles.boardingPass}
          aria-label={`${displayDriverName} business card`}
        >
          <span className={styles.notchTop} aria-hidden="true" />
          <span className={styles.notchBottom} aria-hidden="true" />
          <span className={styles.perforationLine} aria-hidden="true" />

          {/* Left QR Code Stub — QR code only, no URL shown */}
          <div className={styles.qrStub}>
            <div className={styles.stubHeader}>Boarding Stub</div>
            <div className={styles.qrStubBody}>
              <div className={styles.qrFrame}>
                <svg
                  className={styles.qrSvg}
                  viewBox={`0 0 ${qrSvg.viewBoxSize} ${qrSvg.viewBoxSize}`}
                  shapeRendering="crispEdges"
                  role="img"
                  aria-label="Scan QR code"
                >
                  <rect
                    width={qrSvg.viewBoxSize}
                    height={qrSvg.viewBoxSize}
                    fill="#ffffff"
                  />
                  <path d={qrSvg.path} fill="#0b2239" />
                </svg>
              </div>
              <span className={styles.scanTag}>Scan Pass</span>
            </div>
          </div>

          {/* Right Boarding-Pass Body — Driver + Vehicle Details */}
          <div className={styles.passMain}>
            <header className={styles.mainHeader}>
              <span className={styles.brandMark}>Travel.</span>
              <span className={styles.passBadge}>Driver Pass</span>
            </header>

            <div className={styles.mainBody}>
              {/* Driver Identity */}
              <div className={styles.driverRow}>
                <div className={styles.driverAvatarWrap}>
                  {showDriverPhoto && displayDriverImage ? (
                    <Image
                      src={displayDriverImage}
                      alt={displayDriverName}
                      width={58}
                      height={58}
                      unoptimized
                      className={styles.driverAvatarImg}
                      onError={() => setFailedDriverUrl(displayDriverImage)}
                    />
                  ) : (
                    <div className={styles.driverAvatarFallback} aria-hidden="true">
                      {getDriverInitials(displayDriverName)}
                    </div>
                  )}
                </div>

                <div className={styles.driverMeta}>
                  <div className={styles.driverEyebrowRow}>
                    <span className={styles.driverEyebrow}>Driver · Private Hire</span>
                    {displayCompanyName ? (
                      <span className={styles.companyBadge}>
                        <Building2 size={11} aria-hidden="true" />
                        {displayCompanyName}
                      </span>
                    ) : null}
                  </div>

                  <h3 className={styles.driverName}>{displayDriverName}</h3>

                  {displayDriverPhone ? (
                    <a href={`tel:${displayDriverPhone}`} className={styles.driverPhonePill}>
                      <Phone size={12} aria-hidden="true" />
                      {displayDriverPhone}
                    </a>
                  ) : (
                    <span className={styles.driverPhonePill}>
                      <Phone size={12} aria-hidden="true" />
                      Phone not set
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.passDivider} aria-hidden="true" />

              {/* Vehicle Front Photo + Specs */}
              <div className={styles.vehicleRow}>
                <div className={styles.vehiclePhotoBox}>
                  {showVehiclePhoto && displayVehFrontUrl ? (
                    <Image
                      src={displayVehFrontUrl}
                      alt={`${displayVehName || "Vehicle"} front view`}
                      width={160}
                      height={106}
                      unoptimized
                      className={styles.vehiclePhotoImg}
                      onError={() => setFailedVehicleUrl(displayVehFrontUrl)}
                    />
                  ) : (
                    <div className={styles.vehiclePhotoFallback} aria-hidden="true">
                      <Car size={26} />
                    </div>
                  )}
                  <span className={styles.frontBadge}>Front</span>
                </div>

                <div className={styles.vehicleSpecsGrid}>
                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Vehicle</span>
                    <span className={styles.specValue}>
                      {hasVehicleDisplay
                        ? displayVehName || "Pending vehicle"
                        : "Pending vehicle"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Plate No.</span>
                    <span className={styles.plateTag}>
                      {hasVehicleDisplay ? displayVehPlate || "PENDING" : "PENDING"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Category</span>
                    <span className={styles.specValueSoft}>
                      {hasVehicleDisplay ? displayVehCategory || "Sedan" : "Standard"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Capacity</span>
                    <span className={styles.specValueSoft}>
                      {hasVehicleDisplay
                        ? `${displayVehCapacity} Seats · ${displayVehLuggage} Bags`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* Inline Editor for Driver Information & Vehicle Information */}
      {isEditing ? (
        <form className={styles.editorPanel} onSubmit={(e) => void handleSaveCard(e)}>
          <div className={styles.editorGrid}>
            {/* Driver Information Group */}
            <div className={styles.editorGroup}>
              <h3 className={styles.editorGroupTitle}>
                <User size={14} aria-hidden="true" />
                Driver information
              </h3>

              <div className={styles.photoUploadRow}>
                <div className={styles.photoThumbCircle}>
                  {draftDriverPreview ? (
                    <Image
                      src={draftDriverPreview}
                      alt="Driver preview"
                      width={44}
                      height={44}
                      unoptimized
                      className={styles.photoThumbImg}
                    />
                  ) : (
                    <span>{getDriverInitials(draftDriverName || driver.name)}</span>
                  )}
                </div>

                <input
                  ref={driverPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenFileInput}
                  onChange={handleDriverPhotoChange}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => driverPhotoInputRef.current?.click()}
                >
                  <Upload size={13} aria-hidden="true" />
                  {draftDriverPreview ? "Change driver photo" : "Upload driver photo"}
                </button>
              </div>

              <label className={styles.fieldLabel}>
                Driver name
                <input
                  type="text"
                  required
                  maxLength={120}
                  className={styles.fieldInput}
                  value={draftDriverName}
                  onChange={(e) => setDraftDriverName(e.target.value)}
                  placeholder="Full driver name"
                />
              </label>

              <label className={styles.fieldLabel}>
                Phone number
                <input
                  type="tel"
                  required
                  maxLength={40}
                  className={styles.fieldInput}
                  value={draftDriverPhone}
                  onChange={(e) => setDraftDriverPhone(e.target.value)}
                  placeholder="+255 777 000 000"
                />
              </label>

              {isCompanyDriver ? (
                <label className={styles.fieldLabel}>
                  Company name
                  <input
                    type="text"
                    maxLength={120}
                    className={styles.fieldInput}
                    value={draftCompanyName}
                    onChange={(e) => setDraftCompanyName(e.target.value)}
                    placeholder={driver.company?.name || "Company name"}
                  />
                </label>
              ) : null}
            </div>

            {/* Vehicle Information Group */}
            <div className={styles.editorGroup}>
              <h3 className={styles.editorGroupTitle}>
                <Car size={14} aria-hidden="true" />
                Vehicle information
              </h3>

              <div className={styles.photoUploadRow}>
                <div className={styles.photoThumbRect}>
                  {draftVehFrontPreview ? (
                    <Image
                      src={draftVehFrontPreview}
                      alt="Vehicle front preview"
                      width={64}
                      height={44}
                      unoptimized
                      className={styles.photoThumbImg}
                    />
                  ) : (
                    <Car size={18} aria-hidden="true" />
                  )}
                </div>

                <input
                  ref={vehFrontInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenFileInput}
                  onChange={handleVehFrontPhotoChange}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => vehFrontInputRef.current?.click()}
                >
                  <Upload size={13} aria-hidden="true" />
                  {draftVehFrontPreview ? "Change front image" : "Upload front image"}
                </button>
              </div>

              <div className={styles.fieldRow2}>
                <label className={styles.fieldLabel}>
                  Vehicle name
                  <input
                    type="text"
                    maxLength={120}
                    className={styles.fieldInput}
                    value={draftVehName}
                    onChange={(e) => setDraftVehName(e.target.value)}
                    placeholder="e.g. Toyota Alphard"
                  />
                </label>

                <label className={styles.fieldLabel}>
                  Plate number
                  <input
                    type="text"
                    maxLength={32}
                    className={styles.fieldInput}
                    value={draftVehPlate}
                    onChange={(e) => setDraftVehPlate(e.target.value)}
                    placeholder="e.g. Z 441 AB"
                  />
                </label>
              </div>

              <label className={styles.fieldLabel}>
                Category
                <select
                  className={styles.fieldInput}
                  value={draftVehCategory}
                  onChange={(e) => setDraftVehCategory(e.target.value)}
                >
                  {categoryChoices.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.fieldRow2}>
                <label className={styles.fieldLabel}>
                  Seats
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={styles.fieldInput}
                    value={draftVehCapacity}
                    onChange={(e) =>
                      setDraftVehCapacity(
                        Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                  />
                </label>

                <label className={styles.fieldLabel}>
                  Luggage bags
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className={styles.fieldInput}
                    value={draftVehLuggage}
                    onChange={(e) =>
                      setDraftVehLuggage(
                        Math.min(60, Math.max(0, Number(e.target.value) || 0)),
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={styles.editorFooter}>
            <button
              type="button"
              className={styles.resetBtn}
              disabled={busyAction !== null}
              onClick={handleResetDefaults}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset defaults
            </button>

            <div className={styles.editorFooterRight}>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={busyAction !== null}
                onClick={toggleEditor}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.actionBtnPrimary}
                disabled={busyAction !== null}
              >
                {busyAction === "save" ? (
                  <>
                    <LoaderCircle size={15} className={styles.spinIcon} aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={15} aria-hidden="true" />
                    Save card
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Share & Download Actions */}
      <div className={styles.actionsBar}>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          disabled={busyAction !== null}
          onClick={() => void handleShare()}
        >
          {busyAction === "share" ? (
            <LoaderCircle size={15} className={styles.spinIcon} aria-hidden="true" />
          ) : (
            <Share2 size={15} aria-hidden="true" />
          )}
          Share
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          disabled={busyAction !== null}
          onClick={() => void handleDownloadImage()}
        >
          {busyAction === "image" ? (
            <LoaderCircle size={15} className={styles.spinIcon} aria-hidden="true" />
          ) : (
            <ImageDown size={15} aria-hidden="true" />
          )}
          Download as image
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          disabled={busyAction !== null}
          onClick={() => void handleDownloadPdf()}
        >
          {busyAction === "pdf" ? (
            <LoaderCircle size={15} className={styles.spinIcon} aria-hidden="true" />
          ) : (
            <FileText size={15} aria-hidden="true" />
          )}
          Download as PDF
        </button>
      </div>
    </section>
  );
}
