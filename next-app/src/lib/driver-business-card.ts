import { BUSINESS_CARD_QR_URL, generateQrMatrix } from "@/lib/qr-code";

export { BUSINESS_CARD_QR_URL };

export type BusinessCardVehicleInfo = {
  id?: number;
  name: string;
  plateNumber: string;
  category: string;
  capacity: number;
  luggageCapacity: number;
  frontImageUrl: string | null;
};

export type DriverBusinessCardData = {
  driverName: string;
  driverPhone: string;
  driverImageUrl: string | null;
  companyName?: string | null;
  licenseNumber?: string;
  vehicle: BusinessCardVehicleInfo | null;
};

export type BusinessCardVehicleOverride = {
  name?: string;
  plateNumber?: string;
  category?: string;
  capacity?: number;
  luggageCapacity?: number;
  frontImageUrl?: string | null;
};

export type BusinessCardCustomOverrides = {
  driverName?: string;
  driverPhone?: string;
  driverImageUrl?: string | null;
  companyName?: string;
  vehiclesByKey?: Record<string, BusinessCardVehicleOverride>;
};

const OVERRIDE_KEY_PREFIX = "travel:driver-business-card:v1:";
const OVERRIDE_CHANGE_EVENT = "travel:driver-business-card-change";

export function getBusinessCardOverridesSnapshot(driverId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${OVERRIDE_KEY_PREFIX}${driverId}`);
  } catch {
    return null;
  }
}

export function subscribeBusinessCardOverrides(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(OVERRIDE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(OVERRIDE_CHANGE_EVENT, onChange);
  };
}

export function parseBusinessCardOverrides(
  raw: string | null,
): BusinessCardCustomOverrides | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as BusinessCardCustomOverrides;
  } catch {
    return null;
  }
}

export function readBusinessCardOverrides(
  driverId: number,
): BusinessCardCustomOverrides | null {
  return parseBusinessCardOverrides(getBusinessCardOverridesSnapshot(driverId));
}

export function writeBusinessCardOverrides(
  driverId: number,
  overrides: BusinessCardCustomOverrides,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${OVERRIDE_KEY_PREFIX}${driverId}`,
      JSON.stringify(overrides),
    );
    window.dispatchEvent(new Event(OVERRIDE_CHANGE_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearBusinessCardOverrides(driverId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${OVERRIDE_KEY_PREFIX}${driverId}`);
    window.dispatchEvent(new Event(OVERRIDE_CHANGE_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function getDriverInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function slugifyBusinessCardFilename(
  driverName: string,
  ext: "png" | "pdf",
): string {
  const slug = driverName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "driver"}-business-card.${ext}`;
}

function concatByteChunks(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Builds a single-page binary PDF 1.4 embedding a high-DPI baseline JPEG image
 * of the boarding-pass business card.
 */
export function buildBusinessCardPdfFromJpeg(
  jpegBytes: Uint8Array,
  imgWidthPx: number,
  imgHeightPx: number,
): Uint8Array {
  if (jpegBytes.byteLength === 0) {
    throw new Error("Cannot build PDF from empty JPEG buffer.");
  }

  const encoder = new TextEncoder();
  const ascii = (text: string) => encoder.encode(text);

  // Landscape small boarding-pass sheet in PDF points (7.5" x 3.15")
  const pageW = 540;
  const pageH = 228;
  const marginX = 16;
  const marginY = 14;
  const maxDrawW = pageW - marginX * 2;
  const maxDrawH = pageH - marginY * 2;

  const safeW = Math.max(1, Math.round(imgWidthPx));
  const safeH = Math.max(1, Math.round(imgHeightPx));
  const aspect = safeW / safeH;

  let drawW = maxDrawW;
  let drawH = drawW / aspect;
  if (drawH > maxDrawH) {
    drawH = maxDrawH;
    drawW = drawH * aspect;
  }
  const drawX = (pageW - drawW) / 2;
  const drawY = (pageH - drawH) / 2;

  const contentStream = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = ascii(contentStream);

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.byteLength;
  };

  // PDF 1.4 header + 4-byte binary marker
  push(ascii("%PDF-1.4\n"));
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const offsets: number[] = [0];

  // Object 1: Catalog
  offsets.push(offset);
  push(ascii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));

  // Object 2: Pages
  offsets.push(offset);
  push(ascii("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));

  // Object 3: Page
  offsets.push(offset);
  push(
    ascii(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    ),
  );

  // Object 4: Embedded JPEG XObject
  offsets.push(offset);
  push(
    ascii(
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${safeW} /Height ${safeH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`,
    ),
  );
  push(jpegBytes);
  push(ascii("\nendstream\nendobj\n"));

  // Object 5: Page drawing content stream
  offsets.push(offset);
  push(
    ascii(
      `5 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`,
    ),
  );
  push(contentBytes);
  push(ascii("endstream\nendobj\n"));

  // Cross-reference table (20 bytes per entry)
  const xrefOffset = offset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(ascii(xref));

  // Trailer
  push(
    ascii(
      `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    ),
  );

  return concatByteChunks(chunks);
}

async function loadUntaintedImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url || typeof window === "undefined") return null;

  const loadFromObjectUrl = (blob: Blob): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // 1. Direct CORS-safe fetch -> Blob -> Object URL (prevents any canvas tainting)
  try {
    const res = await fetch(url, {
      mode: url.startsWith("/") ? "same-origin" : "cors",
      credentials: url.startsWith("/") ? "same-origin" : "omit",
    });
    if (res.ok) {
      const blob = await res.blob();
      const loaded = await loadFromObjectUrl(blob);
      if (loaded) return loaded;
    }
  } catch {
    // Fall through to Next image proxy fallback for remote URLs
  }

  // 2. Same-origin Next.js image optimizer fallback for remote URLs without CORS headers
  if (/^https?:\/\//i.test(url)) {
    try {
      const proxyUrl = `/_next/image?url=${encodeURIComponent(url)}&w=640&q=90`;
      const res = await fetch(proxyUrl, { credentials: "same-origin" });
      if (res.ok) {
        const blob = await res.blob();
        const loaded = await loadFromObjectUrl(blob);
        if (loaded) return loaded;
      }
    } catch {
      // Ignore and use vector fallback
    }
  }

  return null;
}

function buildBoardingPassPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  splitX: number,
  notchR: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  // Top edge up to top semi-circular punch notch
  ctx.lineTo(splitX - notchR, y);
  ctx.arc(splitX, y, notchR, Math.PI, 0, true);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  // Right edge
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  // Bottom edge back to bottom semi-circular punch notch
  ctx.lineTo(splitX + notchR, y + h);
  ctx.arc(splitX, y + h, notchR, 0, Math.PI, true);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  // Left edge
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) return;

  const targetRatio = dw / dh;
  const srcRatio = sw / sh;
  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;

  if (srcRatio > targetRatio) {
    sWidth = sh * targetRatio;
    sx = (sw - sWidth) / 2;
  } else {
    sHeight = sw / targetRatio;
    sy = (sh - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const clean = text.trim();
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

function drawCarFrontPlaceholder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
) {
  ctx.save();
  ctx.strokeStyle = "#5b789c";
  ctx.fillStyle = "#dce8f7";
  ctx.lineWidth = 3.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Cabin roof
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy - 4);
  ctx.lineTo(cx - 22, cy - 26);
  ctx.lineTo(cx + 22, cy - 26);
  ctx.lineTo(cx + 34, cy - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front bumper body
  drawRoundedRect(ctx, cx - 44, cy - 4, 88, 28, 9);
  ctx.fill();
  ctx.stroke();

  // Headlights
  ctx.fillStyle = "#08428c";
  ctx.beginPath();
  ctx.arc(cx - 27, cy + 10, 5, 0, Math.PI * 2);
  ctx.arc(cx + 27, cy + 10, 5, 0, Math.PI * 2);
  ctx.fill();

  // Tires
  ctx.fillStyle = "#243b5a";
  drawRoundedRect(ctx, cx - 40, cy + 22, 16, 10, 3);
  ctx.fill();
  drawRoundedRect(ctx, cx + 24, cy + 22, 16, 10, 3);
  ctx.fill();
  ctx.restore();
}

export async function renderBusinessCardCanvas(
  data: DriverBusinessCardData,
  options?: { opaqueBackdrop?: boolean },
): Promise<HTMLCanvasElement> {
  const opaqueBackdrop = options?.opaqueBackdrop ?? false;
  const pad = opaqueBackdrop ? 28 : 8;
  const cardW = 1360;
  const cardH = 520;
  const canvasW = cardW + pad * 2;
  const canvasH = cardH + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context.");
  }

  const [driverImg, vehicleImg] = await Promise.all([
    loadUntaintedImage(data.driverImageUrl),
    loadUntaintedImage(data.vehicle?.frontImageUrl ?? null),
  ]);

  const fontSans = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const x0 = pad;
  const y0 = pad;
  const splitX = x0 + 408;
  const notchR = 24;
  const cornerR = 34;

  if (opaqueBackdrop) {
    ctx.fillStyle = "#eef4fb";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Soft ticket elevation shadow on opaque PDF sheet
    ctx.save();
    ctx.shadowColor = "rgba(8, 42, 92, 0.14)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    buildBoardingPassPath(ctx, x0, y0, cardW, cardH, cornerR, splitX, notchR);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  // Clip everything inside the boarding-pass silhouette
  ctx.save();
  buildBoardingPassPath(ctx, x0, y0, cardW, cardH, cornerR, splitX, notchR);
  ctx.clip();

  // Main surface & left QR stub surface
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x0, y0, cardW, cardH);
  ctx.fillStyle = "#f4f8ff";
  ctx.fillRect(x0, y0, splitX - x0, cardH);

  // Top boarding-pass header band
  const headerH = 82;
  const headerGrad = ctx.createLinearGradient(x0, y0, x0 + cardW, y0);
  headerGrad.addColorStop(0, "#062f66");
  headerGrad.addColorStop(0.55, "#08428c");
  headerGrad.addColorStop(1, "#0d57b2");
  ctx.fillStyle = headerGrad;
  ctx.fillRect(x0, y0, cardW, headerH);

  // Subtle emerald boarding-pass accent line
  ctx.fillStyle = "#15803d";
  ctx.fillRect(x0, y0 + headerH - 4, cardW, 4);

  // Left stub header label
  ctx.fillStyle = "#cfe2fb";
  ctx.font = `800 15px ${fontSans}`;
  ctx.textBaseline = "middle";
  ctx.fillText("BOARDING STUB", x0 + 36, y0 + (headerH - 4) / 2);

  // Right pass header brand & badge
  const rightX = splitX + 42;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 28px ${fontSans}`;
  ctx.fillText("Travel.", rightX, y0 + (headerH - 4) / 2);

  const badgeText = "DRIVER PASS";
  ctx.font = `800 14px ${fontSans}`;
  const badgeW = ctx.measureText(badgeText).width + 28;
  const badgeX = x0 + cardW - 38 - badgeW;
  const badgeY = y0 + (headerH - 4 - 32) / 2;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, 32, 16);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badgeText, badgeX + 14, badgeY + 16);

  // Left QR Code (QR graphic only — no URL text rendered)
  const qrMatrix = generateQrMatrix(BUSINESS_CARD_QR_URL);
  const qrCount = qrMatrix.length;
  const modulePx = 9;
  const quietModules = 3;
  const qrInnerSize = (qrCount + quietModules * 2) * modulePx;
  const stubCenterX = x0 + (splitX - x0) / 2;
  const stubBodyCenterY = y0 + headerH + (cardH - headerH) / 2 - 12;
  const qrBoxX = Math.round(stubCenterX - qrInnerSize / 2);
  const qrBoxY = Math.round(stubBodyCenterY - qrInnerSize / 2);

  drawRoundedRect(ctx, qrBoxX - 8, qrBoxY - 8, qrInnerSize + 16, qrInnerSize + 16, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#d5e3f5";
  ctx.stroke();

  ctx.fillStyle = "#0b2239";
  for (let r = 0; r < qrCount; r += 1) {
    for (let c = 0; c < qrCount; c += 1) {
      if (qrMatrix[r][c]) {
        ctx.fillRect(
          qrBoxX + (c + quietModules) * modulePx,
          qrBoxY + (r + quietModules) * modulePx,
          modulePx,
          modulePx,
        );
      }
    }
  }

  ctx.fillStyle = "#4b6484";
  ctx.font = `800 14px ${fontSans}`;
  ctx.textAlign = "center";
  ctx.fillText("SCAN PASS", stubCenterX, qrBoxY + qrInnerSize + 30);
  ctx.textAlign = "left";

  // Vertical dashed perforation line between top & bottom notches
  ctx.save();
  ctx.strokeStyle = "#b8cde8";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.moveTo(splitX, y0 + notchR + 10);
  ctx.lineTo(splitX, y0 + cardH - notchR - 10);
  ctx.stroke();
  ctx.restore();

  // RIGHT MAIN BODY — TOP: DRIVER IMAGE, NAME & PHONE
  const contentRightEdge = x0 + cardW - 40;
  const avatarSize = 122;
  const avatarX = rightX;
  const avatarY = y0 + headerH + 28;
  const avatarCx = avatarX + avatarSize / 2;
  const avatarCy = avatarY + avatarSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (driverImg) {
    drawCoverImage(ctx, driverImg, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    const avGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avGrad.addColorStop(0, "#08428c");
    avGrad.addColorStop(1, "#0d57b2");
    ctx.fillStyle = avGrad;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 42px ${fontSans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getDriverInitials(data.driverName), avatarCx, avatarCy + 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Avatar ring
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize / 2 + 2, 0, Math.PI * 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#08428c";
  ctx.stroke();

  const driverTextX = avatarX + avatarSize + 28;
  const driverMaxW = contentRightEdge - driverTextX;

  const roleEyebrow = "DRIVER  ·  PRIVATE HIRE";
  ctx.fillStyle = "#526580";
  ctx.font = `800 14px ${fontSans}`;
  ctx.textBaseline = "middle";
  ctx.fillText(roleEyebrow, driverTextX, avatarY + 20);

  const cleanCompany = data.companyName?.trim() || "";
  if (cleanCompany) {
    const eyebrowW = ctx.measureText(roleEyebrow).width;
    const compPillX = driverTextX + eyebrowW + 14;
    const availCompW = contentRightEdge - compPillX;
    if (availCompW > 80) {
      ctx.font = `700 14px ${fontSans}`;
      const fittedComp = fitText(ctx, cleanCompany, availCompW - 24);
      const compPillW = Math.min(availCompW, ctx.measureText(fittedComp).width + 24);
      drawRoundedRect(ctx, compPillX, avatarY + 6, compPillW, 28, 999);
      ctx.fillStyle = "#e8f2ff";
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#b8d3f4";
      ctx.stroke();
      ctx.fillStyle = "#08428c";
      ctx.fillText(fittedComp, compPillX + 12, avatarY + 20);
    }
  }
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#12223a";
  ctx.font = `800 34px ${fontSans}`;
  ctx.fillText(
    fitText(ctx, data.driverName || "Driver", driverMaxW),
    driverTextX,
    avatarY + 68,
  );

  // Phone pill
  const phoneDisplay = data.driverPhone?.trim() || "Phone not set";
  ctx.font = `700 22px ${fontSans}`;
  const phoneText = `TEL  ${phoneDisplay}`;
  const phonePillW = Math.min(driverMaxW, ctx.measureText(phoneText).width + 32);
  drawRoundedRect(ctx, driverTextX, avatarY + 84, phonePillW, 40, 12);
  ctx.fillStyle = "#edf4fc";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#c9dcf4";
  ctx.stroke();
  ctx.fillStyle = "#08428c";
  ctx.textBaseline = "middle";
  ctx.fillText(fitText(ctx, phoneText, phonePillW - 28), driverTextX + 16, avatarY + 104);

  // Horizontal divider between Driver & Vehicle sections
  const dividerY = y0 + headerH + 174;
  ctx.strokeStyle = "#dde7f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX, dividerY);
  ctx.lineTo(contentRightEdge, dividerY);
  ctx.stroke();

  // RIGHT MAIN BODY — BOTTOM: VEHICLE FRONT IMAGE + SPECS
  const vehTopY = dividerY + 22;
  const vehImgW = 248;
  const vehImgH = 156;

  ctx.save();
  drawRoundedRect(ctx, rightX, vehTopY, vehImgW, vehImgH, 18);
  ctx.clip();
  if (vehicleImg) {
    drawCoverImage(ctx, vehicleImg, rightX, vehTopY, vehImgW, vehImgH);
  } else {
    ctx.fillStyle = "#eef4fb";
    ctx.fillRect(rightX, vehTopY, vehImgW, vehImgH);
    drawCarFrontPlaceholder(ctx, rightX + vehImgW / 2, vehTopY + vehImgH / 2 - 2);
  }
  ctx.restore();

  drawRoundedRect(ctx, rightX, vehTopY, vehImgW, vehImgH, 18);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#d2e1f4";
  ctx.stroke();

  // Small "FRONT" tag in top-left of vehicle photo
  drawRoundedRect(ctx, rightX + 10, vehTopY + 10, 68, 24, 8);
  ctx.fillStyle = "rgba(11, 34, 57, 0.76)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 12px ${fontSans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FRONT", rightX + 44, vehTopY + 22);
  ctx.textAlign = "left";

  const specsX = rightX + vehImgW + 28;
  const specsW = contentRightEdge - specsX;
  const colGap = 24;
  const col1W = Math.floor(specsW * 0.56);
  const col2X = specsX + col1W + colGap;
  const col2W = contentRightEdge - col2X;

  const v = data.vehicle;
  const vehicleName = v?.name || "Vehicle not assigned yet";
  const plateLabel = v?.plateNumber || "PENDING";
  const categoryLabel = v?.category || "Standard";
  const capacityLabel = v
    ? `${v.capacity} Seats · ${v.luggageCapacity} Bags`
    : "—";

  // Row 1: VEHICLE & PLATE NO.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#617591";
  ctx.font = `800 13px ${fontSans}`;
  ctx.fillText("VEHICLE", specsX, vehTopY + 20);
  ctx.fillText("PLATE NO.", col2X, vehTopY + 20);

  ctx.fillStyle = "#12223a";
  ctx.font = `800 24px ${fontSans}`;
  ctx.fillText(fitText(ctx, vehicleName, col1W), specsX, vehTopY + 54);

  // License plate badge
  ctx.font = `800 20px ${fontSans}`;
  const plateFit = fitText(ctx, plateLabel, col2W - 24);
  const plateW = Math.min(col2W, Math.max(108, ctx.measureText(plateFit).width + 26));
  drawRoundedRect(ctx, col2X, vehTopY + 29, plateW, 36, 10);
  ctx.fillStyle = "#fef9c3";
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "#eab308";
  ctx.stroke();
  ctx.fillStyle = "#1e293b";
  ctx.textBaseline = "middle";
  ctx.fillText(plateFit, col2X + 13, vehTopY + 47);

  // Row 2: CLASS & CAPACITY
  const row2LabelY = vehTopY + 104;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#617591";
  ctx.font = `800 13px ${fontSans}`;
  ctx.fillText("CLASS", specsX, row2LabelY);
  ctx.fillText("CAPACITY", col2X, row2LabelY);

  ctx.fillStyle = "#1e3554";
  ctx.font = `700 21px ${fontSans}`;
  ctx.fillText(fitText(ctx, categoryLabel, col1W), specsX, row2LabelY + 32);
  ctx.fillText(fitText(ctx, capacityLabel, col2W), col2X, row2LabelY + 32);

  ctx.restore();

  // Crisp boarding-pass outline stroke (around corners + semi-circle notches)
  buildBoardingPassPath(ctx, x0, y0, cardW, cardH, cornerR, splitX, notchR);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#c5d8f0";
  ctx.stroke();

  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode business card as ${mimeType}.`));
      },
      mimeType,
      quality,
    );
  });
}

export async function exportBusinessCardPngBlob(
  data: DriverBusinessCardData,
): Promise<Blob> {
  const canvas = await renderBusinessCardCanvas(data, { opaqueBackdrop: false });
  return canvasToBlob(canvas, "image/png");
}

export async function exportBusinessCardPdfBlob(
  data: DriverBusinessCardData,
): Promise<Blob> {
  const canvas = await renderBusinessCardCanvas(data, { opaqueBackdrop: true });
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.96);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdfBytes = buildBusinessCardPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
