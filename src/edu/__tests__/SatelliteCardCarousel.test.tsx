import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEduSatellites } from "../hooks/useEduSatellites";
import { SatelliteCardCarousel } from "../components/SatelliteCardCarousel";

describe("SatelliteCardCarousel", () => {
  it("カード選択と詳細表示のコールバックを呼び分ける", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);
    const onSelectSatellite = vi.fn();
    const onOpenDetails = vi.fn();

    render(
      <SatelliteCardCarousel
        satellites={cards}
        selectedSatelliteId={cards[0].id}
        onSelectSatellite={onSelectSatellite}
        onOpenDetails={onOpenDetails}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "この衛星を見る" })[1]);
    expect(onSelectSatellite).toHaveBeenCalledWith(cards[1].id);

    fireEvent.click(screen.getAllByRole("button", { name: "くわしく" })[0]);
    expect(onOpenDetails).toHaveBeenCalledWith(cards[0].id);
  });

  it("選択中カードにis-selectedクラスを付与する", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);

    render(
      <SatelliteCardCarousel
        satellites={cards}
        selectedSatelliteId={cards[0].id}
        onSelectSatellite={vi.fn()}
        onOpenDetails={vi.fn()}
      />,
    );

    const firstCard = screen.getByText(cards[0].displayName).closest("article");
    const secondCard = screen.getByText(cards[1].displayName).closest("article");

    expect(firstCard).toHaveClass("is-selected");
    expect(secondCard).not.toHaveClass("is-selected");
  });
});
