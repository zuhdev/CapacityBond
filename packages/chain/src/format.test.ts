import { describe, expect, it } from "vitest";
import { formatBot, formatBps, formatDuration, shortAddress, statusName, statusTone, validateEvidenceURI } from "./format";

describe("format", () => {
  it("formats native BOT without implying a token contract", () => {
    expect(formatBot(1_500_000_000_000_000_000n)).toBe("1.5");
    expect(formatBot(0n)).toBe("0");
  });

  it("formats splits and durations", () => {
    expect(formatBps(10_000)).toBe("100%");
    expect(formatBps(5_000)).toBe("50%");
    expect(formatBps(5_050)).toBe("50.5%");
    expect(formatDuration(600)).toBe("10 min");
    expect(formatDuration(86_400)).toBe("1 d");
  });

  it("maps reservation states to human labels and tones", () => {
    expect(statusName(2)).toBe("Active");
    expect(statusName(4)).toBe("Claimable");
    expect(statusTone(4)).toBe("attention");
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("rejects unsafe evidence references", () => {
    expect(validateEvidenceURI("ipfs://demo/checkpoint.json")).toBeNull();
    expect(validateEvidenceURI("javascript:alert(1)")).toContain("not allowed");
    expect(validateEvidenceURI("two words")).toContain("whitespace");
    expect(validateEvidenceURI("")).toContain("Add");
  });
});
