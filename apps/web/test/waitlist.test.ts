import { describe, expect, it } from "vitest";
import { waitlistUrl } from "../lib/waitlist.js";

describe("waitlistUrl", () => {
  it("accepts an https address", () => {
    expect(waitlistUrl("https://forms.example.com/abc")).toBe("https://forms.example.com/abc");
    expect(waitlistUrl("  https://forms.example.com/abc  ")).toBe("https://forms.example.com/abc");
  });

  it.each([undefined, "", "   ", "http://forms.example.com/abc", "javascript:alert(1)", "not a url"])(
    "returns null for %j",
    (value) => {
      expect(waitlistUrl(value)).toBeNull();
    },
  );
});
