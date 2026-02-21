import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoPanel } from "../InfoPanel";

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: undefined }),
}));

describe("InfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mode buttons with correct pressed state", () => {
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
      />
    );

    const geodesic = screen.getByRole("button", { name: "Geodesic" });
    const cartesian = screen.getByRole("button", { name: "Cartesian" });

    expect(geodesic).toHaveAttribute("aria-pressed", "true");
    expect(cartesian).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onOrbitRenderModeChange('cartesian') when Cartesian button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cartesian" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("cartesian");
  });

  it("calls onOrbitRenderModeChange('geodesic') when Geodesic button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="cartesian"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Geodesic" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("geodesic");
  });
});
