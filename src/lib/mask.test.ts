import { describe, expect, it } from "vitest";
import { maskDeep, maskText } from "./mask";

describe("personal data masking", () => {
  it("hides Aadhaar numbers with or without spaces", () => {
    expect(maskText("Aadhaar 1234 5678 9012").text).toBe("Aadhaar [Aadhaar]");
    expect(maskText("UID 123456789012").text).toBe("UID [Aadhaar]");
  });

  it("hides PAN and IFSC codes", () => {
    expect(maskText("PAN: ABCDE1234F").text).toBe("PAN: [PAN]");
    expect(maskText("IFSC HDFC0001234").text).toBe("IFSC [IFSC]");
  });

  it("hides Indian mobile numbers including at sentence end", () => {
    expect(maskText("Call +91 98765 43210").text).toBe("Call [Phone]");
    expect(maskText("Mob 9876543210").text).toBe("Mob [Phone]");
    expect(maskText("Contact 9876543210.").text).toBe("Contact [Phone].");
    expect(maskText("Aadhaar 1234 5678 9012, verified.").text).toBe("Aadhaar [Aadhaar], verified.");
  });

  it("hides emails and bank account numbers", () => {
    expect(maskText("ravi.k@gmail.com").text).toBe("[Email]");
    expect(maskText("A/c 50100234567812").text).toBe("A/c [Account]");
  });

  it("keeps money amounts, rates, dates, and plain strings readable", () => {
    const s = "Rent ₹25,000 per month, deposit ₹1,50,000, interest 10.5%, from 01/04/2026";
    expect(maskText(s).text).toBe(s);
    expect(maskText(s).count).toBe(0);
    expect(maskText("Clause seven only").count).toBe(0);
    expect(maskText("short").count).toBe(0);
  });

  it("uses Hindi labels when answering in Hindi", () => {
    expect(maskText("फ़ोन 9876543210", "hi").text).toBe("फ़ोन [फ़ोन]");
    expect(maskText("ravi.k@gmail.com", "hi").text).toBe("[ईमेल]");
  });

  it("masks nested results and counts every hidden item", () => {
    const r = maskDeep({
      a: "ABCDE1234F",
      b: ["x 9876543210", { c: "ok", d: null, e: 42 }],
    });
    expect(r.value).toEqual({
      a: "[PAN]",
      b: ["x [Phone]", { c: "ok", d: null, e: 42 }],
    });
    expect(r.count).toBe(2);
  });
});
