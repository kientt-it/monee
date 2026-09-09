import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile.schema";

const validProfile = {
  fullName: "Nguyễn Minh Anh",
  currency: "VND" as const,
  locale: "vi" as const,
  timezone: "Asia/Ho_Chi_Minh" as const,
  theme: "system" as const,
  completeOnboarding: true,
};

describe("profileSchema", () => {
  it("accepts the supported Vietnamese profile settings", () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("trims the display name", () => {
    const result = profileSchema.parse({ ...validProfile, fullName: "  Minh Anh  " });
    expect(result.fullName).toBe("Minh Anh");
  });

  it("rejects unsupported currency and timezone values", () => {
    expect(profileSchema.safeParse({ ...validProfile, currency: "USD" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...validProfile, timezone: "UTC" }).success).toBe(false);
  });
});
