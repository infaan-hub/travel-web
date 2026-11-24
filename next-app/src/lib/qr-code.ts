/**
 * Pure, dependency-free ISO/IEC 18004 QR Code matrix generator (Versions 1–5,
 * Error Correction Level M, Byte mode). Runs offline in both browser and Node,
 * allowing crisp SVG and untainted high-DPI HTML5 Canvas / PDF rendering.
 */

export const BUSINESS_CARD_QR_URL = "https://travelisland.vercel.app/";

type VersionSpec = {
  version: number;
  size: number;
  blocks: number;
  dataCodewordsPerBlock: number;
  ecCodewordsPerBlock: number;
  alignmentCenters: readonly number[];
};

const VERSION_SPECS_M: readonly VersionSpec[] = [
  { version: 1, size: 21, blocks: 1, dataCodewordsPerBlock: 16, ecCodewordsPerBlock: 10, alignmentCenters: [] },
  { version: 2, size: 25, blocks: 1, dataCodewordsPerBlock: 28, ecCodewordsPerBlock: 16, alignmentCenters: [6, 18] },
  { version: 3, size: 29, blocks: 1, dataCodewordsPerBlock: 44, ecCodewordsPerBlock: 26, alignmentCenters: [6, 22] },
  { version: 4, size: 33, blocks: 2, dataCodewordsPerBlock: 32, ecCodewordsPerBlock: 18, alignmentCenters: [6, 26] },
  { version: 5, size: 37, blocks: 2, dataCodewordsPerBlock: 43, ecCodewordsPerBlock: 24, alignmentCenters: [6, 30] },
];

// GF(256) log/exp tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j += 1) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

function computeFormatBits(ecIndicator: number, mask: number): number {
  const data = ((ecIndicator & 0b11) << 3) | (mask & 0b111);
  let rem = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((rem >> bit) & 1) {
      rem ^= 0x537 << (bit - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function maskBit(mask: number, r: number, c: number): boolean {
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
    case 7:
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function penaltyScore(modules: boolean[][]): number {
  const n = modules.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-color modules in rows/cols
  for (let r = 0; r < n; r += 1) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c += 1) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const spec = VERSION_SPECS_M.find(
    (candidate) => bytes.length + 2 <= candidate.blocks * candidate.dataCodewordsPerBlock,
  );
  if (!spec) {
    throw new Error(`QR payload exceeds supported Version 5-M capacity (${bytes.length} bytes).`);
  }

  const totalDataCodewords = spec.blocks * spec.dataCodewordsPerBlock;
  const bits: number[] = [];
  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i -= 1) {
      bits.push((val >> i) & 1);
    }
  };

  // Byte mode indicator (0100) + 8-bit character count
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const byte of bytes) {
    pushBits(byte, 8);
  }

  const maxDataBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, terminatorLen);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i += 1) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < totalDataCodewords; i += 1, p += 1) {
    dataBytes[i] = padBytes[p % 2];
  }

  // Split into blocks, compute Reed-Solomon EC, and interleave
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blocks; b += 1) {
    const start = b * spec.dataCodewordsPerBlock;
    const slice = dataBytes.slice(start, start + spec.dataCodewordsPerBlock);
    dataBlocks.push(slice);
    ecBlocks.push(rsComputeRemainder(slice, spec.ecCodewordsPerBlock));
  }

  const codewords: number[] = [];
  for (let i = 0; i < spec.dataCodewordsPerBlock; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      codewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      codewords.push(ecBlocks[b][i]);
    }
  }

  const streamBits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i -= 1) {
      streamBits.push((cw >> i) & 1);
    }
  }

  const n = spec.size;
  const baseModules: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const isFunction: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    baseModules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + 1-module white separators
  const placeFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inInner));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Alignment patterns
  const centers = spec.alignmentCenters;
  for (const cr of centers) {
    for (const cc of centers) {
      if (
        (cr === 6 && cc === 6) ||
        (cr === 6 && cc === n - 7) ||
        (cr === n - 7 && cc === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < n - 8; i += 1) {
    if (!isFunction[6][i]) setFunc(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunc(i, 6, i % 2 === 0);
  }

  // Dark module + reserve format info slots
  setFunc(n - 8, 8, true);
  for (let i = 0; i <= 8; i += 1) {
    if (!isFunction[8][i]) setFunc(8, i, false);
    if (!isFunction[i][8]) setFunc(i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) {
    setFunc(8, n - 1 - i, false);
  }
  for (let i = 0; i < 7; i += 1) {
    setFunc(n - 1 - i, 8, false);
  }

  // Place data bits in 2-column upward/downward zigzag
  let bitIdx = 0;
  let upward = true;
  for (let rightCol = n - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing column
    for (let step = 0; step < n; step += 1) {
      const r = upward ? n - 1 - step : step;
      for (let dc = 0; dc < 2; dc += 1) {
        const c = rightCol - dc;
        if (!isFunction[r][c]) {
          const dark = bitIdx < streamBits.length ? streamBits[bitIdx] === 1 : false;
          baseModules[r][c] = dark;
          bitIdx += 1;
        }
      }
    }
    upward = !upward;
  }

  const writeFormatInfo = (target: boolean[][], mask: number) => {
    // EC Level M = 00
    const format = computeFormatBits(0b00, mask);
    const getBit = (idx: number) => ((format >> idx) & 1) === 1;

    // Copy 1 around top-left finder (MSB bit 14 -> LSB bit 0)
    const tlCoords: Array<[number, number]> = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    for (let i = 0; i < 15; i += 1) {
      const [r, c] = tlCoords[i];
      target[r][c] = getBit(14 - i);
    }

    // Copy 2 split bottom-left & top-right (MSB bit 14 -> LSB bit 0)
    for (let i = 0; i < 7; i += 1) {
      target[n - 1 - i][8] = getBit(14 - i);
    }
    for (let i = 0; i < 8; i += 1) {
      target[8][n - 8 + i] = getBit(7 - i);
    }
  };

  // Pick optimal mask (0..7) with lowest penalty score
  let bestMatrix = baseModules;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = baseModules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : maskBit(mask, r, c) ? !val : val)),
    );
    writeFormatInfo(candidate, mask);
    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}
