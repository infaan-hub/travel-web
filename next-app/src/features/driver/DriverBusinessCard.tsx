"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Car,
  CreditCard,
  FileText,
  ImageDown,
  LoaderCircle,
  Phone,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  BUSINESS_CARD_QR_URL,
  exportBusinessCardPdfBlob,
  exportBusinessCardPngBlob,
  getDriverInitials,
  slugifyBusinessCardFilename,
  triggerBlobDownload,
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
};

const QUIET_MODULES = 3;

export default function DriverBusinessCard({ driver, vehicles }: Props) {
  const toast = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    vehicles[0]?.id ?? null,
  );
  const [busyAction, setBusyAction] = useState<"share" | "image" | "pdf" | null>(null);
  const [failedDriverUrl, setFailedDriverUrl] = useState<string | null>(null);
  const [failedVehicleUrl, setFailedVehicleUrl] = useState<string | null>(null);

  const activeVehicle = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  }, [vehicles, selectedVehicleId]);

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

  const operatorLabel = driver.is_public
    ? "Public Hire"
    : driver.company?.name || "Private Hire";

  const cardData: DriverBusinessCardData = useMemo(
    () => ({
      driverName: driver.name,
      driverPhone: driver.phone,
      driverImageUrl: driver.image_url,
      operatorLabel,
      licenseNumber: driver.license_number,
      vehicle: activeVehicle
        ? {
            id: activeVehicle.id,
            name: activeVehicle.name,
            plateNumber: activeVehicle.plate_number,
            category: activeVehicle.category,
            capacity: activeVehicle.capacity,
            luggageCapacity: activeVehicle.luggage_capacity,
            frontImageUrl: activeVehicle.front_image_url || null,
          }
        : null,
    }),
    [driver, operatorLabel, activeVehicle],
  );

  const showDriverPhoto = Boolean(
    driver.image_url && failedDriverUrl !== driver.image_url,
  );
  const vehicleFrontUrl = activeVehicle?.front_image_url || null;
  const showVehiclePhoto = Boolean(
    vehicleFrontUrl && failedVehicleUrl !== vehicleFrontUrl,
  );

  const handleShare = async () => {
    if (busyAction) return;
    setBusyAction("share");
    try {
      const pngBlob = await exportBusinessCardPngBlob(cardData);
      const filename = slugifyBusinessCardFilename(driver.name, "png");
      const pngFile = new File([pngBlob], filename, { type: "image/png" });
      const summaryText = activeVehicle
        ? `${driver.name} · ${driver.phone} · ${activeVehicle.name} (${activeVehicle.plate_number})`
        : `${driver.name} · ${driver.phone}`;

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [pngFile] })
        ) {
          await navigator.share({
            title: `${driver.name} — Business Card`,
            files: [pngFile],
          });
          return;
        }
        await navigator.share({
          title: `${driver.name} — Business Card`,
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
      const filename = slugifyBusinessCardFilename(driver.name, "png");
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
      const filename = slugifyBusinessCardFilename(driver.name, "pdf");
      triggerBlobDownload(pdfBlob, filename);
      toast.success("Business card downloaded as PDF.");
    } catch {
      toast.error("Could not generate business card PDF.");
    } finally {
      setBusyAction(null);
    }
  };

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

        {vehicles.length > 1 ? (
          <div className={styles.vehiclePicker} role="tablist" aria-label="Select business card vehicle">
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
                  onClick={() => setSelectedVehicleId(veh.id)}
                >
                  {veh.plate_number}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Boarding-Pass Ticket Stage */}
      <div className={styles.passStage}>
        <article className={styles.boardingPass} aria-label={`${driver.name} business card`}>
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
                  {showDriverPhoto && driver.image_url ? (
                    <Image
                      src={driver.image_url}
                      alt={driver.name}
                      width={58}
                      height={58}
                      unoptimized
                      className={styles.driverAvatarImg}
                      onError={() => setFailedDriverUrl(driver.image_url)}
                    />
                  ) : (
                    <div className={styles.driverAvatarFallback} aria-hidden="true">
                      {getDriverInitials(driver.name)}
                    </div>
                  )}
                </div>

                <div className={styles.driverMeta}>
                  <span className={styles.driverEyebrow}>Driver · {operatorLabel}</span>
                  <h3 className={styles.driverName}>{driver.name}</h3>
                  {driver.phone ? (
                    <a href={`tel:${driver.phone}`} className={styles.driverPhonePill}>
                      <Phone size={12} aria-hidden="true" />
                      {driver.phone}
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
                  {showVehiclePhoto && vehicleFrontUrl ? (
                    <Image
                      src={vehicleFrontUrl}
                      alt={`${activeVehicle?.name || "Vehicle"} front view`}
                      width={160}
                      height={106}
                      unoptimized
                      className={styles.vehiclePhotoImg}
                      onError={() => setFailedVehicleUrl(vehicleFrontUrl)}
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
                      {activeVehicle ? activeVehicle.name : "Pending vehicle"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Plate No.</span>
                    <span className={styles.plateTag}>
                      {activeVehicle ? activeVehicle.plate_number : "PENDING"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Category</span>
                    <span className={styles.specValueSoft}>
                      {activeVehicle ? activeVehicle.category : "Standard"}
                    </span>
                  </div>

                  <div className={styles.specField}>
                    <span className={styles.specLabel}>Capacity</span>
                    <span className={styles.specValueSoft}>
                      {activeVehicle
                        ? `${activeVehicle.capacity} Seats · ${activeVehicle.luggage_capacity} Bags`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

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
