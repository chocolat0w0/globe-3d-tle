import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { BaseMapLayer } from "../BaseMapLayer";

const { state, urlTemplateProviderMock } = vi.hoisted(() => ({
  state: {
    imageryLayerProps: undefined as Record<string, unknown> | undefined,
  },
  urlTemplateProviderMock: vi.fn((options: Record<string, unknown>) => ({ options })),
}));

vi.mock("cesium", () => ({
  UrlTemplateImageryProvider: urlTemplateProviderMock,
}));

vi.mock("resium", () => ({
  ImageryLayer: (props: Record<string, unknown>) => {
    state.imageryLayerProps = props;
    return <div data-testid="imagery-layer" />;
  },
}));

describe("BaseMapLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.imageryLayerProps = undefined;
  });

  it("ImageryLayer に imageryProvider を渡す", () => {
    render(<BaseMapLayer />);

    expect(state.imageryLayerProps).toEqual(
      expect.objectContaining({
        imageryProvider: expect.anything(),
      }),
    );
    expect(state.imageryLayerProps?.nightAlpha).toBeUndefined();
    expect(state.imageryLayerProps?.dayAlpha).toBeUndefined();
  });

  it("UrlTemplateImageryProvider をタイルURLで初期化する", () => {
    render(<BaseMapLayer />);

    expect(urlTemplateProviderMock).toHaveBeenCalledTimes(1);
    expect(urlTemplateProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/tiles/{z}/{x}/{y}.png",
      }),
    );
  });
});
