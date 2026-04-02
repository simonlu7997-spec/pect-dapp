import { describe, it, expect } from "vitest";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

describe("Resend Email Service", () => {
  it("should have RESEND_API_KEY configured", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY must be set").toBeTruthy();
    expect(apiKey?.startsWith("re_"), "RESEND_API_KEY should start with 're_'").toBe(true);
  });

  it("should have EMAIL_FROM configured", () => {
    const from = process.env.EMAIL_FROM;
    expect(from, "EMAIL_FROM must be set").toBeTruthy();
    expect(from?.includes("@"), "EMAIL_FROM should be a valid email").toBe(true);
  });

  it("should be able to initialize Resend client", () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("Skipping Resend client test: RESEND_API_KEY not set");
      return;
    }
    const resend = new Resend(apiKey);
    expect(resend).toBeDefined();
  });
});
