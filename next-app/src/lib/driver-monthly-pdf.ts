import type { DriverMonthlyInsights } from "@/lib/driver-insight-metrics";

export type DriverPdfProfile = {
  driverName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  companyName: string;
  vehicleLabel: string;
};

const PAGE_W = 595.28; // A4 width in pt
const PAGE_H = 841.89; // A4 height in pt
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

function pdfSafeText(raw: string): string {
  // Type1 WinAnsi safe ASCII normalization so PDF text renders reliably across all viewers.
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u00B7/g, "|")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncateText(value: string, maxChars: number): string {
  const clean = value.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 3))}...`;
}

function rgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

class PdfPageBuilder {
  private ops: string[] = [];

  rectFill(x: number, topY: number, w: number, h: number, fillHex: string) {
    const y = PAGE_H - topY - h;
    this.ops.push(`${rgb(fillHex)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  rectBox(
    x: number,
    topY: number,
    w: number,
    h: number,
    fillHex: string,
    strokeHex: string,
    lineWidth = 0.75,
  ) {
    const y = PAGE_H - topY - h;
    this.ops.push(
      `${lineWidth.toFixed(2)} w ${rgb(fillHex)} rg ${rgb(strokeHex)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`,
    );
  }

  hLine(x1: number, x2: number, topY: number, strokeHex: string, lineWidth = 0.6) {
    const y = PAGE_H - topY;
    this.ops.push(
      `${lineWidth.toFixed(2)} w ${rgb(strokeHex)} RG ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`,
    );
  }

  text(
    x: number,
    topY: number,
    value: string,
    size: number,
    colorHex: string,
    bold = false,
  ) {
    const y = PAGE_H - topY - size * 0.82;
    const font = bold ? "/F2" : "/F1";
    this.ops.push(
      `BT ${font} ${size.toFixed(1)} Tf ${rgb(colorHex)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfSafeText(
        value,
      )}) Tj ET`,
    );
  }

  content(): string {
    return this.ops.join("\n");
  }
}

function drawFooter(page: PdfPageBuilder, pageNum: number, totalPages: number, monthLabel: string) {
  const y = PAGE_H - 34;
  page.hLine(MARGIN, PAGE_W - MARGIN, y - 6, "#d7e2f0", 0.6);
  page.text(
    MARGIN,
    y,
    `Travel. Zanzibar | Driver Monthly Insight Report (${monthLabel})`,
    8,
    "#526580",
    false,
  );
  page.text(
    PAGE_W - MARGIN - 54,
    y,
    `Page ${pageNum} of ${totalPages}`,
    8,
    "#526580",
    true,
  );
}

/**
 * Generates a professionally designed multi-page A4 binary PDF (v1.4)
 * containing driver profile metadata, monthly KPIs, weekly vector bar chart,
 * top destinations summary, and the full monthly trips ledger.
 */
export function buildDriverMonthlyReportPdf(
  profile: DriverPdfProfile,
  insights: DriverMonthlyInsights,
  generatedAt = new Date(),
): Uint8Array {
  const pages: PdfPageBuilder[] = [];
  const p1 = new PdfPageBuilder();
  pages.push(p1);

  // 1. TOP OCEAN-NAVY EXECUTIVE HEADER BANNER
  p1.rectFill(0, 0, PAGE_W, 118, "#08428c");
  p1.rectFill(0, 114, PAGE_W, 4, "#15803d");

  p1.text(MARGIN, 22, "TRAVEL. ZANZIBAR  |  DRIVER OPERATIONS STATEMENT", 8.5, "#bfd7f4", true);
  p1.text(MARGIN, 38, `Monthly Work Report - ${insights.monthLabel}`, 20, "#ffffff", true);
  p1.text(
    MARGIN,
    68,
    `Driver: ${truncateText(profile.driverName, 36)}   |   Operator: ${truncateText(profile.companyName, 34)}`,
    9.5,
    "#e2edf9",
    false,
  );
  p1.text(
    MARGIN,
    84,
    `Phone: ${profile.phone || "N/A"}   |   License: ${profile.licenseNumber || "N/A"}   |   Vehicle: ${truncateText(profile.vehicleLabel || "Assigned fleet", 30)}`,
    8.5,
    "#bfd7f4",
    false,
  );

  const generatedStr = generatedAt.toISOString().slice(0, 10);
  p1.text(PAGE_W - MARGIN - 110, 22, `Issued: ${generatedStr}`, 8.5, "#e2edf9", false);

  // 2. FOUR KPI METRIC CARDS
  let cursorY = 136;
  const kpiGap = 10;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;
  const kpiH = 66;
  const kpiCards = [
    {
      label: "TOTAL TRIPS",
      value: String(insights.kpis.totalTrips),
      sub: `${insights.kpis.completedTrips} done | ${insights.kpis.completionRatePct}% rate`,
      accent: "#08428c",
    },
    {
      label: "DISTANCE DRIVEN",
      value: `${insights.kpis.totalDistanceKm.toFixed(1)} km`,
      sub: `Avg ${insights.kpis.avgDistanceKm.toFixed(1)} km / trip`,
      accent: "#0f766e",
    },
    {
      label: "PASSENGERS",
      value: String(insights.kpis.totalPassengers),
      sub: `${Math.round(insights.kpis.totalDurationMins / 60)}h ${insights.kpis.totalDurationMins % 60}m drive time`,
      accent: "#15803d",
    },
    {
      label: "RECORDED FARES",
      value:
        insights.kpis.totalEarningsTzs > 0
          ? `${insights.kpis.totalEarningsTzs.toLocaleString("en-US")} TZS`
          : "0 TZS",
      sub: "Confirmed & completed",
      accent: "#b45309",
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = MARGIN + idx * (kpiW + kpiGap);
    p1.rectBox(x, cursorY, kpiW, kpiH, "#f6faff", "#d7e2f0", 0.75);
    p1.rectFill(x, cursorY, kpiW, 3.5, card.accent);
    p1.text(x + 10, cursorY + 11, card.label, 7.2, "#526580", true);
    p1.text(x + 10, cursorY + 25, truncateText(card.value, 16), 13.5, "#12223a", true);
    p1.text(x + 10, cursorY + 47, truncateText(card.sub, 24), 7.4, "#526580", false);
  });

  cursorY += kpiH + 20;

  // 3. TWO-COLUMN VISUAL ANALYTICS SECTION (WEEKLY VECTOR BAR CHART + STATUS / DESTINATIONS)
  const leftW = CONTENT_W * 0.56;
  const rightW = CONTENT_W - leftW - 14;
  const chartBoxH = 166;
  const leftX = MARGIN;
  const rightX = MARGIN + leftW + 14;

  // Left box: Weekly Trips Bar Chart
  p1.rectBox(leftX, cursorY, leftW, chartBoxH, "#ffffff", "#d7e2f0", 0.75);
  p1.text(leftX + 12, cursorY + 12, "WEEKLY TRIP VOLUME (TOTAL vs COMPLETED)", 8, "#08428c", true);

  const plotX = leftX + 26;
  const plotTop = cursorY + 34;
  const plotW = leftW - 40;
  const plotH = 96;
  const maxWeekVal = Math.max(1, ...insights.weeklySeries.map((w) => w.total));

  // Horizontal grid lines
  for (let g = 0; g <= 3; g += 1) {
    const gy = plotTop + (plotH * g) / 3;
    p1.hLine(plotX, plotX + plotW, gy, "#e6eef7", 0.5);
  }

  const slotW = plotW / Math.max(1, insights.weeklySeries.length);
  insights.weeklySeries.forEach((week, idx) => {
    const groupX = plotX + idx * slotW + 8;
    const barW = Math.min(18, (slotW - 22) / 2);
    const totalH = (week.total / maxWeekVal) * (plotH - 6);
    const doneH = (week.completed / maxWeekVal) * (plotH - 6);

    if (totalH > 0) {
      p1.rectFill(groupX, plotTop + plotH - totalH, barW, totalH, "#08428c");
    } else {
      p1.rectFill(groupX, plotTop + plotH - 2, barW, 2, "#dbe7f6");
    }

    if (doneH > 0) {
      p1.rectFill(groupX + barW + 3, plotTop + plotH - doneH, barW, doneH, "#15803d");
    } else {
      p1.rectFill(groupX + barW + 3, plotTop + plotH - 2, barW, 2, "#dcfce7");
    }

    p1.text(groupX + 2, plotTop + plotH + 6, `W${idx + 1}`, 7.5, "#334763", true);
    p1.text(groupX, plotTop + plotH + 17, `${week.total}/${week.completed}`, 6.8, "#526580", false);
  });

  // Legend
  p1.rectFill(leftX + 12, cursorY + chartBoxH - 16, 8, 8, "#08428c");
  p1.text(leftX + 24, cursorY + chartBoxH - 16, "Total trips", 7.2, "#334763", false);
  p1.rectFill(leftX + 86, cursorY + chartBoxH - 16, 8, 8, "#15803d");
  p1.text(leftX + 98, cursorY + chartBoxH - 16, "Completed", 7.2, "#334763", false);

  // Right box: Status Breakdown & Top Destinations
  p1.rectBox(rightX, cursorY, rightW, chartBoxH, "#ffffff", "#d7e2f0", 0.75);
  p1.text(rightX + 12, cursorY + 12, "TOP DESTINATIONS THIS MONTH", 8, "#08428c", true);

  if (insights.topDestinations.length === 0) {
    p1.text(rightX + 12, cursorY + 42, "No trips recorded in this month.", 8.5, "#526580", false);
  } else {
    const maxDest = Math.max(1, ...insights.topDestinations.map((d) => d.trips));
    insights.topDestinations.slice(0, 5).forEach((dest, idx) => {
      const rowY = cursorY + 32 + idx * 24;
      p1.text(rightX + 12, rowY, truncateText(dest.name, 24), 8, "#12223a", true);
      p1.text(
        rightX + rightW - 56,
        rowY,
        `${dest.trips}x | ${dest.distanceKm.toFixed(0)}km`,
        7.3,
        "#526580",
        false,
      );
      const barFullW = rightW - 24;
      const barFillW = Math.max(6, (dest.trips / maxDest) * barFullW);
      p1.rectFill(rightX + 12, rowY + 12, barFullW, 4.5, "#edf4fc");
      p1.rectFill(rightX + 12, rowY + 12, barFillW, 4.5, "#08428c");
    });
  }

  cursorY += chartBoxH + 22;

  // 4. FULL MONTHLY TRIPS LEDGER TABLE (AUTO-PAGINATED ACROSS PAGES)
  const colX = {
    date: MARGIN + 6,
    ref: MARGIN + 64,
    route: MARGIN + 124,
    customer: MARGIN + 306,
    pax: MARGIN + 388,
    dist: MARGIN + 414,
    status: MARGIN + 458,
  };

  const drawTableHeader = (pg: PdfPageBuilder, topY: number) => {
    pg.text(MARGIN, topY - 16, `FULL MONTHLY TRIPS LEDGER (${insights.trips.length} RECORDS)`, 8.5, "#08428c", true);
    pg.rectFill(MARGIN, topY, CONTENT_W, 22, "#08428c");
    pg.text(colX.date, topY + 6, "Date", 7.8, "#ffffff", true);
    pg.text(colX.ref, topY + 6, "Ref", 7.8, "#ffffff", true);
    pg.text(colX.route, topY + 6, "Route (Origin -> Destination)", 7.8, "#ffffff", true);
    pg.text(colX.customer, topY + 6, "Customer", 7.8, "#ffffff", true);
    pg.text(colX.pax, topY + 6, "Pax", 7.8, "#ffffff", true);
    pg.text(colX.dist, topY + 6, "Dist", 7.8, "#ffffff", true);
    pg.text(colX.status, topY + 6, "Status", 7.8, "#ffffff", true);
    return topY + 22;
  };

  let activePage = p1;
  let tableY = drawTableHeader(activePage, cursorY + 16);

  if (insights.trips.length === 0) {
    activePage.rectBox(MARGIN, tableY, CONTENT_W, 38, "#f8fbff", "#d7e2f0", 0.6);
    activePage.text(
      MARGIN + 12,
      tableY + 14,
      `No bookings were logged for ${insights.monthLabel}. Select another month on /driver/insight/ to export.`,
      8.5,
      "#526580",
      false,
    );
  } else {
    const rowH = 22;
    const bottomLimit = PAGE_H - 58;

    insights.trips.forEach((row, idx) => {
      if (tableY + rowH > bottomLimit) {
        activePage = new PdfPageBuilder();
        pages.push(activePage);
        activePage.rectFill(0, 0, PAGE_W, 44, "#08428c");
        activePage.text(
          MARGIN,
          16,
          `Travel. Zanzibar | ${profile.driverName} - ${insights.monthLabel} (continued)`,
          10,
          "#ffffff",
          true,
        );
        tableY = drawTableHeader(activePage, 74);
      }

      const bg = idx % 2 === 0 ? "#ffffff" : "#f7faff";
      activePage.rectFill(MARGIN, tableY, CONTENT_W, rowH, bg);
      activePage.hLine(MARGIN, MARGIN + CONTENT_W, tableY + rowH, "#e2ecf6", 0.45);

      const routeText = `${row.origin.split(",")[0]} -> ${row.destination.split(",")[0]}`;
      const statusColor =
        row.status === "completed"
          ? "#15803d"
          : row.status === "cancelled"
            ? "#be123c"
            : "#08428c";

      activePage.text(colX.date, tableY + 6.5, row.date, 7.6, "#334763", false);
      activePage.text(colX.ref, tableY + 6.5, truncateText(row.reference, 11), 7.6, "#12223a", true);
      activePage.text(colX.route, tableY + 6.5, truncateText(routeText, 38), 7.6, "#12223a", false);
      activePage.text(colX.customer, tableY + 6.5, truncateText(row.customer, 16), 7.6, "#334763", false);
      activePage.text(colX.pax, tableY + 6.5, String(row.passengers), 7.6, "#334763", false);
      activePage.text(
        colX.dist,
        tableY + 6.5,
        row.distanceKm != null ? `${row.distanceKm.toFixed(1)}k` : "-",
        7.6,
        "#334763",
        false,
      );
      activePage.text(
        colX.status,
        tableY + 6.5,
        truncateText(row.status.replace("_", " "), 12),
        7.4,
        statusColor,
        true,
      );

      tableY += rowH;
    });
  }

  // Stamp page footers on all pages
  pages.forEach((pg, index) => {
    drawFooter(pg, index + 1, pages.length, insights.monthLabel);
  });

  // Assemble clean PDF 1.4 binary document with accurate byte offsets
  const objects: string[] = [];
  // Obj 1: Catalog
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  // Obj 2: Pages (placeholder, filled below)
  objects.push("");
  // Obj 3: Helvetica Regular
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  // Obj 4: Helvetica Bold
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageObjNumbers: number[] = [];
  for (const pg of pages) {
    const stream = pg.content();
    const contentObjNum = objects.length + 1;
    const streamBytes = Buffer.byteLength(stream, "latin1");
    objects.push(`<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`);

    const pageObjNum = objects.length + 1;
    pageObjNumbers.push(pageObjNum);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`,
    );
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjNumbers.length} >>`;

  const chunks: string[] = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
  const offsets: number[] = [0];
  let byteLength = Buffer.byteLength(chunks[0], "latin1");

  objects.forEach((objBody, idx) => {
    const objNum = idx + 1;
    offsets.push(byteLength);
    const serialized = `${objNum} 0 obj\n${objBody}\nendobj\n`;
    chunks.push(serialized);
    byteLength += Buffer.byteLength(serialized, "latin1");
  });

  const xrefOffset = byteLength;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n"];
  for (let i = 1; i <= objects.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(xrefLines.join(""), trailer);
  return new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
}
