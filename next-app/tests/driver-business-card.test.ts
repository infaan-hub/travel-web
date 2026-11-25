import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUSINESS_CARD_QR_URL,
  buildBusinessCardPdfFromJpeg,
  getDriverInitials,
  parseBusinessCardOverrides,
  slugifyBusinessCardFilename,
} from "@/lib/driver-business-card";
import { generateQrMatrix } from "@/lib/qr-code";

function maskPredicate(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function isVersion3FunctionModule(r: number, c: number): boolean {
  const n = 29;
  if (r <= 8 && c <= 8) return true;
  if (r <= 8 && c >= n - 8) return true;
  if (r >= n - 8 && c <= 8) return true;
  if (r === 6 || c === 6) return true;
  if (Math.abs(r - 22) <= 2 && Math.abs(c - 22) <= 2) return true;
  return false;
}

describe("driver boarding-pass business card utilities", () => {
  it("encodes https://travelisland.vercel.app/ into a valid, round-trip decodable Version 3-M QR matrix", () => {
    expect(BUSINESS_CARD_QR_URL).toBe("https://travelisland.vercel.app/");

    const matrix = generateQrMatrix(BUSINESS_CARD_QR_URL);
    expect(matrix).toHaveLength(29);
    for (const row of matrix) {
      expect(row).toHaveLength(29);
    }

    // Verify 7x7 finder centers + white separators
    expect(matrix[0][0]).toBe(true);
    expect(matrix[3][3]).toBe(true);
    expect(matrix[7][7]).toBe(false);
    expect(matrix[0][28]).toBe(true);
    expect(matrix[28][0]).toBe(true);
    // Alignment pattern center at (22, 22)
    expect(matrix[22][22]).toBe(true);
    expect(matrix[21][21]).toBe(false);
    expect(matrix[20][20]).toBe(true);

    // Read top-left 15-bit format info (MSB..LSB) and verify Copy 2 matches identically
    const tlCoords: Array<[number, number]> = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    let rawFormat1 = 0;
    for (const [r, c] of tlCoords) {
      rawFormat1 = (rawFormat1 << 1) | (matrix[r][c] ? 1 : 0);
    }

    let rawFormat2 = 0;
    for (let i = 0; i < 7; i += 1) {
      rawFormat2 = (rawFormat2 << 1) | (matrix[28 - i][8] ? 1 : 0);
    }
    for (let i = 0; i < 8; i += 1) {
      rawFormat2 = (rawFormat2 << 1) | (matrix[8][21 + i] ? 1 : 0);
    }
    expect(rawFormat1).toBe(rawFormat2);

    const unmaskedFormat = rawFormat1 ^ 0x5412;
    const ecIndicator = (unmaskedFormat >> 13) & 0b11;
    const mask = (unmaskedFormat >> 10) & 0b111;
    expect(ecIndicator).toBe(0b00); // Level M

    // Unmask zigzag stream and decode Byte-mode payload
    const bits: number[] = [];
    let upward = true;
    for (let rightCol = 28; rightCol >= 1; rightCol -= 2) {
      if (rightCol === 6) rightCol = 5;
      for (let step = 0; step < 29; step += 1) {
        const r = upward ? 28 - step : step;
        for (let dc = 0; dc < 2; dc += 1) {
          const c = rightCol - dc;
          if (!isVersion3FunctionModule(r, c)) {
            const bit = matrix[r][c] !== maskPredicate(mask, r, c);
            bits.push(bit ? 1 : 0);
          }
        }
      }
      upward = !upward;
    }

    const readBits = (offset: number, len: number) => {
      let v = 0;
      for (let i = 0; i < len; i += 1) {
        v = (v << 1) | bits[offset + i];
      }
      return v;
    };

    const mode = readBits(0, 4);
    const byteLen = readBits(4, 8);
    expect(mode).toBe(0b0100);
    expect(byteLen).toBe(BUSINESS_CARD_QR_URL.length);

    const payload = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i += 1) {
      payload[i] = readBits(12 + i * 8, 8);
    }
    expect(new TextDecoder().decode(payload)).toBe("https://travelisland.vercel.app/");
  });

  it("formats driver initials and clean download filenames", () => {
    expect(getDriverInitials("Salim Khamis")).toBe("SK");
    expect(getDriverInitials("Amina")).toBe("AM");
    expect(getDriverInitials("  Juma   Ali   Bakari ")).toBe("JB");
    expect(getDriverInitials("")).toBe("DR");

    expect(slugifyBusinessCardFilename("Salim Khamis", "png")).toBe(
      "salim-khamis-business-card.png",
    );
    expect(slugifyBusinessCardFilename("Salim Khamis", "pdf")).toBe(
      "salim-khamis-business-card.pdf",
    );
    expect(slugifyBusinessCardFilename("   ", "png")).toBe("driver-business-card.png");
  });

  it("builds a valid binary PDF 1.4 with intact JPEG bytes and exact xref offsets", () => {
    const sampleJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    const pdfBytes = buildBusinessCardPdfFromJpeg(sampleJpeg, 1416, 576);
    const latin1 = Buffer.from(pdfBytes).toString("latin1");

    expect(latin1.startsWith("%PDF-1.4\n")).toBe(true);
    expect(latin1.endsWith("%%EOF\n")).toBe(true);
    expect(latin1).toContain("/Subtype /Image /Width 1416 /Height 576");
    expect(latin1).toContain(`/Filter /DCTDecode /Length ${sampleJpeg.byteLength}`);

    // Confirm raw binary JPEG header/footer bytes were preserved without UTF-8 corruption
    const streamMarker = "stream\n";
    const obj4Idx = latin1.indexOf("4 0 obj");
    const streamDataStart = latin1.indexOf(streamMarker, obj4Idx) + streamMarker.length;
    const embeddedSlice = pdfBytes.slice(streamDataStart, streamDataStart + sampleJpeg.byteLength);
    expect(Array.from(embeddedSlice)).toEqual(Array.from(sampleJpeg));

    // Verify startxref points directly to xref table
    const startxrefMatch = latin1.match(/startxref\n(\d+)\n%%EOF/);
    expect(startxrefMatch).not.toBeNull();
    const xrefOffset = Number(startxrefMatch![1]);
    expect(latin1.slice(xrefOffset, xrefOffset + 5)).toBe("xref\n");

    expect(() => buildBusinessCardPdfFromJpeg(new Uint8Array(0), 100, 100)).toThrow();
  });

  it("parses saved business card overrides safely", () => {
    expect(parseBusinessCardOverrides(null)).toBeNull();
    expect(parseBusinessCardOverrides("not-json")).toBeNull();

    const parsed = parseBusinessCardOverrides(
      JSON.stringify({
        companyName: "Zanzibar Coastal Transfers",
        vehiclesByKey: {
          "12": { name: "Toyota Alphard VIP", plateNumber: "Z 441 AB", capacity: 7 },
        },
      }),
    );
    expect(parsed?.companyName).toBe("Zanzibar Coastal Transfers");
    expect(parsed?.vehiclesByKey?.["12"]?.name).toBe("Toyota Alphard VIP");
  });

  it("renders Private Hire + company badge, inline driver/vehicle editor, and QR without URL text", () => {
    const componentSrc = readFileSync(
      path.resolve(__dirname, "../src/features/driver/DriverBusinessCard.tsx"),
      "utf8",
    );
    const builderSrc = readFileSync(
      path.resolve(__dirname, "../src/lib/driver-business-card.ts"),
      "utf8",
    );

    expect(componentSrc).not.toContain("travelisland.vercel.app");
    expect(builderSrc).not.toContain("travelisland.vercel.app");
    expect(componentSrc).not.toContain("Public Hire");
    expect(builderSrc).not.toContain("PUBLIC HIRE");
    expect(componentSrc).toContain("Driver · Private Hire");
    expect(builderSrc).toContain("DRIVER  ·  PRIVATE HIRE");
    expect(componentSrc).toContain("displayCompanyName");
    expect(componentSrc).toContain("Edit card");
    expect(componentSrc).toContain("Driver information");
    expect(componentSrc).toContain("Vehicle information");
    expect(componentSrc).toContain("Business card");
    expect(componentSrc).toContain("Share");
    expect(componentSrc).toContain("Download as image");
    expect(componentSrc).toContain("Download as PDF");
  });
});
