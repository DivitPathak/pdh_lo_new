import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaskedText } from "./MaskedText";

describe("MaskedText", () => {
  it("renders plain text without chips when no tokens exist", () => {
    const { container } = render(<MaskedText text="Simple rent agreement for 11 months." />);
    expect(container.textContent).toBe("Simple rent agreement for 11 months.");
    expect(container.querySelectorAll(".masked-chip")).toHaveLength(0);
  });

  it("renders privacy tokens as masked chips", () => {
    const { container } = render(
      <MaskedText text="Agreement with [Name] and Aadhaar [आधार] verified." />,
    );
    const chips = container.querySelectorAll(".masked-chip");
    expect(chips).toHaveLength(2);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("आधार")).toBeInTheDocument();
  });
});
