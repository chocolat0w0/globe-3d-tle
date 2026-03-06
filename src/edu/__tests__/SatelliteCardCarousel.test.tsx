import { fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CUSTOM_SATELLITE_ID } from "../../lib/edu/custom-orbit";
import { SatelliteCardCarousel } from "../components/SatelliteCardCarousel";
import { useEduSatellites } from "../hooks/useEduSatellites";

describe("SatelliteCardCarousel", () => {
  it("先頭に『あなたの衛星』カードを表示する", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);

    render(
      <SatelliteCardCarousel
        customSatellite={result.current.customSatellite}
        satellites={cards}
        selectedSatelliteId={result.current.customSatellite.id}
        onSelectSatellite={vi.fn()}
        onOpenDetails={vi.fn()}
        onOpenLaunchPanel={vi.fn()}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("あなたの衛星");
    expect(headings[0].closest("article")).toHaveClass("is-selected");
  });

  it("自分の衛星カード本体クリックで詳細表示コールバックを呼ぶ", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);
    const onOpenDetails = vi.fn();

    render(
      <SatelliteCardCarousel
        customSatellite={result.current.customSatellite}
        satellites={cards}
        selectedSatelliteId={null}
        onSelectSatellite={vi.fn()}
        onOpenDetails={onOpenDetails}
        onOpenLaunchPanel={vi.fn()}
      />,
    );

    const customCard = screen.getByLabelText("あなたの衛星のカード");
    fireEvent.click(customCard);
    expect(onOpenDetails).toHaveBeenCalledWith(CUSTOM_SATELLITE_ID);
  });

  it("未打ち上げ時の『衛星を打ち上げる』クリックで打ち上げパネル表示コールバックを呼ぶ", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);
    const onOpenLaunchPanel = vi.fn();

    render(
      <SatelliteCardCarousel
        customSatellite={result.current.customSatellite}
        satellites={cards}
        selectedSatelliteId={null}
        onSelectSatellite={vi.fn()}
        onOpenDetails={vi.fn()}
        onOpenLaunchPanel={onOpenLaunchPanel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "衛星を打ち上げる" }));
    expect(onOpenLaunchPanel).toHaveBeenCalledTimes(1);
  });

  it("既存衛星カードの選択と詳細表示コールバックを呼び分ける", () => {
    const { result } = renderHook(() => useEduSatellites());
    const cards = result.current.satellites.slice(0, 2);
    const onSelectSatellite = vi.fn();
    const onOpenDetails = vi.fn();

    render(
      <SatelliteCardCarousel
        customSatellite={result.current.customSatellite}
        satellites={cards}
        selectedSatelliteId={cards[0].id}
        onSelectSatellite={onSelectSatellite}
        onOpenDetails={onOpenDetails}
        onOpenLaunchPanel={vi.fn()}
      />,
    );

    const secondExistingCard = screen.getByText(cards[1].displayName).closest("article");
    expect(secondExistingCard).not.toBeNull();
    fireEvent.click(
      within(secondExistingCard as HTMLElement).getByRole("button", { name: "この衛星を見る" }),
    );
    expect(onSelectSatellite).toHaveBeenCalledWith(cards[1].id);

    const firstExistingCard = screen.getByText(cards[0].displayName).closest("article");
    expect(firstExistingCard).not.toBeNull();
    fireEvent.click(
      within(firstExistingCard as HTMLElement).getByRole("button", { name: "くわしく" }),
    );
    expect(onOpenDetails).toHaveBeenCalledWith(cards[0].id);
  });
});
