import { describe, expect, it } from "vitest";
import {
  OTP_LENGTH,
  applyOtpBackspace,
  applyOtpInput,
  emptyOtpDigits,
  isOtpComplete,
  sanitizeOtpDigits,
} from "@/lib/otp";

describe("OTP verification input helpers", () => {
  it("strips non-digits cleanly (including spaces, dashes, and letters)", () => {
    expect(sanitizeOtpDigits("12-34 56")).toBe("123456");
    expect(sanitizeOtpDigits("ab98cd76ef54321")).toBe("987654");
    expect(sanitizeOtpDigits("hello")).toBe("");
  });

  it("handles sequential single-digit typing and advances focus", () => {
    let digits = emptyOtpDigits(OTP_LENGTH);
    const entered = ["4", "8", "2", "9", "1", "0"];

    entered.forEach((char, idx) => {
      const res = applyOtpInput(digits, idx, char);
      digits = res.digits;
      expect(res.changedIndices).toEqual([idx]);
      expect(res.nextFocusIndex).toBe(Math.min(idx + 1, OTP_LENGTH - 1));
    });

    expect(digits).toEqual(entered);
    expect(isOtpComplete(digits)).toBe(true);
  });

  it("distributes pasted or iOS/Android autofilled 6-digit codes across all boxes", () => {
    const res = applyOtpInput(emptyOtpDigits(), 0, "Code: 739 204");
    expect(res.digits).toEqual(["7", "3", "9", "2", "0", "4"]);
    expect(res.changedIndices).toEqual([0, 1, 2, 3, 4, 5]);
    expect(res.nextFocusIndex).toBe(5);
    expect(isOtpComplete(res.digits)).toBe(true);
  });

  it("replaces an existing digit cleanly when Android keyboards append to a filled cell", () => {
    const start = ["5", "2", "3", "", "", ""];
    const appended = applyOtpInput(start, 0, "57");
    expect(appended.digits).toEqual(["7", "2", "3", "", "", ""]);
    expect(appended.nextFocusIndex).toBe(1);

    const prepended = applyOtpInput(start, 1, "92");
    expect(prepended.digits).toEqual(["5", "9", "3", "", "", ""]);
    expect(prepended.nextFocusIndex).toBe(2);
  });

  it("handles backspace on filled and empty cells cleanly", () => {
    const filled = ["1", "2", "3", "", "", ""];
    const clearCurrent = applyOtpBackspace(filled, 2);
    expect(clearCurrent.digits).toEqual(["1", "2", "", "", "", ""]);
    expect(clearCurrent.nextFocusIndex).toBe(2);

    const stepBack = applyOtpBackspace(clearCurrent.digits, 2);
    expect(stepBack.digits).toEqual(["1", "", "", "", "", ""]);
    expect(stepBack.nextFocusIndex).toBe(1);
    expect(isOtpComplete(stepBack.digits)).toBe(false);
  });

  it("requires all 6 digits (never completes at 4) and lets users fill boxes 5 and 6 directly", () => {
    let digits = emptyOtpDigits(OTP_LENGTH);
    for (let i = 0; i < 4; i += 1) {
      const res = applyOtpInput(digits, i, String(i + 1));
      digits = res.digits;
    }
    expect(digits).toEqual(["1", "2", "3", "4", "", ""]);
    expect(isOtpComplete(digits)).toBe(false);

    const fifth = applyOtpInput(digits, 4, "5");
    expect(fifth.digits).toEqual(["1", "2", "3", "4", "5", ""]);
    expect(fifth.nextFocusIndex).toBe(5);
    expect(isOtpComplete(fifth.digits)).toBe(false);

    const sixth = applyOtpInput(fifth.digits, 5, "6");
    expect(sixth.digits).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(sixth.nextFocusIndex).toBe(5);
    expect(isOtpComplete(sixth.digits)).toBe(true);
  });

  it("allows editing box 5 or box 6 directly and ignores stray non-digit keystrokes", () => {
    const directSixth = applyOtpInput(emptyOtpDigits(OTP_LENGTH), 5, "9");
    expect(directSixth.digits).toEqual(["", "", "", "", "", "9"]);
    expect(directSixth.changedIndices).toEqual([5]);
    expect(isOtpComplete(directSixth.digits)).toBe(false);

    const strayLetter = applyOtpInput(directSixth.digits, 5, "9a");
    expect(strayLetter.digits).toEqual(["", "", "", "", "", "9"]);
    expect(strayLetter.changedIndices).toEqual([]);
    expect(strayLetter.nextFocusIndex).toBe(5);

    const onlyLetter = applyOtpInput(directSixth.digits, 5, "x");
    expect(onlyLetter.digits).toEqual(["", "", "", "", "", "9"]);
    expect(onlyLetter.changedIndices).toEqual([]);
    expect(onlyLetter.nextFocusIndex).toBe(5);

    const cleared = applyOtpInput(directSixth.digits, 5, "");
    expect(cleared.digits).toEqual(["", "", "", "", "", ""]);
    expect(cleared.changedIndices).toEqual([5]);
  });
});
