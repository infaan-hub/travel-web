export const OTP_LENGTH = 6;

export function emptyOtpDigits(length: number = OTP_LENGTH): string[] {
  return Array.from({ length }, () => "");
}

export function sanitizeOtpDigits(raw: string, maxLength: number = OTP_LENGTH): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
}

export function isOtpComplete(digits: readonly string[], length: number = OTP_LENGTH): boolean {
  return digits.length === length && digits.every((digit) => /^\d$/.test(digit));
}

export type OtpUpdateResult = {
  digits: string[];
  nextFocusIndex: number;
  changedIndices: number[];
};

/**
 * Applies typed, pasted, or OS-autofilled numeric input into a segmented OTP array.
 */
export function applyOtpInput(
  current: readonly string[],
  index: number,
  rawValue: string,
  length: number = OTP_LENGTH,
): OtpUpdateResult {
  const next = Array.from({ length }, (_, idx) => current[idx] ?? "");
  const cleaned = sanitizeOtpDigits(rawValue, length);
  const changedIndices: number[] = [];

  if (!cleaned) {
    if (index >= 0 && index < length && next[index] !== "") {
      next[index] = "";
      changedIndices.push(index);
    }
    return { digits: next, nextFocusIndex: Math.max(0, Math.min(index, length - 1)), changedIndices };
  }

  // Full code paste or iOS/Android one-time-code autofill fills from slot 0.
  if (cleaned.length >= length) {
    for (let i = 0; i < length; i += 1) {
      next[i] = cleaned[i] ?? "";
      changedIndices.push(i);
    }
    return { digits: next, nextFocusIndex: length - 1, changedIndices };
  }

  // Android soft keyboards often append to an already-filled single-digit cell
  // instead of replacing its selection (e.g. "5" + "7" -> "57"). Replace only
  // the current cell with the newly typed digit and advance cleanly.
  const target = Math.max(0, Math.min(index, length - 1));
  if (cleaned.length === 2 && next[target]) {
    const replacement =
      cleaned[0] === next[target]
        ? cleaned[1]
        : cleaned[1] === next[target]
          ? cleaned[0]
          : null;
    if (replacement !== null) {
      next[target] = replacement;
      changedIndices.push(target);
      return {
        digits: next,
        nextFocusIndex: Math.min(target + 1, length - 1),
        changedIndices,
      };
    }
  }

  // Multi-digit paste/input starting at current slot.
  if (cleaned.length > 1) {
    let cursor = target;
    for (let i = 0; i < cleaned.length && cursor < length; i += 1, cursor += 1) {
      next[cursor] = cleaned[i];
      changedIndices.push(cursor);
    }
    return {
      digits: next,
      nextFocusIndex: Math.min(cursor, length - 1),
      changedIndices,
    };
  }

  // Single digit entry.
  next[target] = cleaned;
  changedIndices.push(target);
  return {
    digits: next,
    nextFocusIndex: Math.min(target + 1, length - 1),
    changedIndices,
  };
}

/**
 * Handles Backspace inside a segmented OTP input: clears current cell if filled,
 * otherwise moves back one cell and clears it.
 */
export function applyOtpBackspace(
  current: readonly string[],
  index: number,
  length: number = OTP_LENGTH,
): OtpUpdateResult {
  const next = Array.from({ length }, (_, idx) => current[idx] ?? "");
  const target = Math.max(0, Math.min(index, length - 1));

  if (next[target]) {
    next[target] = "";
    return { digits: next, nextFocusIndex: target, changedIndices: [target] };
  }

  if (target > 0) {
    next[target - 1] = "";
    return { digits: next, nextFocusIndex: target - 1, changedIndices: [target - 1] };
  }

  return { digits: next, nextFocusIndex: 0, changedIndices: [] };
}
