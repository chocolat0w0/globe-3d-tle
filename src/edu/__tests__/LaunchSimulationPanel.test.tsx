import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LaunchSimulationPanel } from "../components/LaunchSimulationPanel";

describe("LaunchSimulationPanel", () => {
  it("閉じるボタン押下で onClose を呼ぶ", () => {
    const onClose = vi.fn();

    render(
      <LaunchSimulationPanel
        draft={{ altitudeKm: 700, inclinationDeg: 45, cameraMode: "detail" }}
        launched={null}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打ち上げシミュレーションを閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
