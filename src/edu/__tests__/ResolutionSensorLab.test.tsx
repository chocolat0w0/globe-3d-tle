import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResolutionSensorLab } from "../components/ResolutionSensorLab";
import { useEduSatellites } from "../hooks/useEduSatellites";

vi.mock("../lib/phase3-image-pipeline", () => ({
  getPhase3ImageDataUrl: vi.fn(
    ({ satelliteId, kind }: { satelliteId: string; kind: string }) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`${kind}-${satelliteId}`)}`,
  ),
}));

describe("ResolutionSensorLab", () => {
  it("初期値と操作に応じてコントロール表示が同期する", () => {
    const { result } = renderHook(() => useEduSatellites());

    render(
      <ResolutionSensorLab
        allSatellites={result.current.allEduSatellites}
        opticalSatellites={result.current.opticalSatellites}
        sarSatellites={result.current.sarSatellites}
      />,
    );

    expect(screen.getByLabelText("比較する衛星")).toHaveValue("worldview3");
    expect(screen.getByLabelText("光学衛星")).toHaveValue("sentinel2a");
    expect(screen.getByLabelText("SAR衛星")).toHaveValue("sentinel1a");
    expect(screen.getByRole("button", { name: "天気: はれ" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("比較する衛星"), {
      target: { value: "himawari" },
    });
    expect(screen.getByLabelText("比較する衛星")).toHaveValue("himawari");
    expect(screen.getByText(/いまの選択:/)).toHaveTextContent("町全体のようすが分かる");

    fireEvent.change(screen.getByLabelText("光学衛星"), {
      target: { value: "sentinel2b" },
    });
    expect(screen.getByLabelText("光学衛星")).toHaveValue("sentinel2b");

    fireEvent.change(screen.getByLabelText("SAR衛星"), {
      target: { value: "iceye" },
    });
    expect(screen.getByLabelText("SAR衛星")).toHaveValue("iceye");

    fireEvent.click(screen.getByRole("button", { name: "天気: はれ" }));
    expect(screen.getByRole("button", { name: "天気: くもり" })).toBeInTheDocument();
  });
});
