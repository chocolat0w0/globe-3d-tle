import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as Cesium from "cesium";
import { AoiLayer } from "../AoiLayer";

type EventCallback = (event?: unknown) => void;

type HandlerState = {
  callbacks: Record<string, EventCallback | undefined>;
  destroy: ReturnType<typeof vi.fn>;
};

const mockState = vi.hoisted(() => ({
  viewer: undefined as unknown,
  handlers: [] as HandlerState[],
  fromDegreesMock: vi.fn((lon: number, lat: number) => ({ lon, lat, source: "fromDegrees" })),
}));

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: mockState.viewer }),
}));

vi.mock("cesium", () => {
  class MockColor {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number, g: number, b: number, a = 1) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }

    withAlpha(alpha: number) {
      return new MockColor(this.r, this.g, this.b, alpha);
    }
  }

  class MockPolygonHierarchy {
    positions: unknown[];

    constructor(positions: unknown[]) {
      this.positions = positions;
    }
  }

  class MockCallbackProperty {
    callback: () => unknown;
    isConstant: boolean;

    constructor(callback: () => unknown, isConstant: boolean) {
      this.callback = callback;
      this.isConstant = isConstant;
    }
  }

  class MockScreenSpaceEventHandler {
    callbacks: Record<string, EventCallback | undefined> = {};
    setInputAction = vi.fn((cb: EventCallback, type: unknown) => {
      this.callbacks[String(type)] = cb;
    });
    destroy = vi.fn();

    constructor() {
      mockState.handlers.push(this as unknown as HandlerState);
    }
  }

  (MockColor as unknown as { YELLOW: MockColor; WHITE: MockColor }).YELLOW = new MockColor(
    1,
    1,
    0,
    1,
  );
  (MockColor as unknown as { YELLOW: MockColor; WHITE: MockColor }).WHITE = new MockColor(
    1,
    1,
    1,
    1,
  );

  return {
    Color: MockColor,
    CallbackProperty: MockCallbackProperty,
    PolygonHierarchy: MockPolygonHierarchy,
    ScreenSpaceEventHandler: MockScreenSpaceEventHandler,
    ScreenSpaceEventType: {
      LEFT_CLICK: "LEFT_CLICK",
      LEFT_DOUBLE_CLICK: "LEFT_DOUBLE_CLICK",
      MOUSE_MOVE: "MOUSE_MOVE",
    },
    Cartesian3: {
      fromDegrees: mockState.fromDegreesMock,
    },
    Cartographic: {
      fromCartesian: vi.fn((cartesian: { lon: number; lat: number }) => ({
        longitude: cartesian.lon,
        latitude: cartesian.lat,
      })),
    },
    Math: {
      toDegrees: vi.fn((value: number) => value),
    },
  };
});

function createViewer() {
  const addedEntities: unknown[] = [];
  const add = vi.fn((entity: Record<string, unknown>) => {
    const added = { id: `entity-${addedEntities.length}`, ...entity };
    addedEntities.push(added);
    return added;
  });
  const remove = vi.fn();
  const getPickRay = vi.fn(() => ({ id: "ray" }));
  const pick = vi.fn();

  const viewer = {
    entities: { add, remove },
    scene: {
      canvas: {},
      globe: { pick },
    },
    camera: { getPickRay },
  };

  return { viewer, addedEntities, remove, pick };
}

function getLatestHandler() {
  const handler = mockState.handlers[mockState.handlers.length - 1];
  if (!handler) {
    throw new Error("ScreenSpaceEventHandler が生成されていません");
  }
  return handler;
}

function trigger(type: Cesium.ScreenSpaceEventType, event?: unknown) {
  const handler = getLatestHandler();
  const cb = handler.callbacks[String(type)];
  if (!cb) {
    throw new Error(`イベントハンドラ未登録: ${type}`);
  }
  cb(event);
}

describe("AoiLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.viewer = undefined;
    mockState.handlers = [];
  });

  it("point モードで LEFT_CLICK すると Point AOI が確定する", () => {
    const { viewer, pick } = createViewer();
    pick.mockReturnValue({ lon: 139.7, lat: 35.6 });
    mockState.viewer = viewer;
    const onAoiChange = vi.fn();

    render(<AoiLayer aoi={null} mode="point" onAoiChange={onAoiChange} />);

    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 100, y: 120 } });

    expect(onAoiChange).toHaveBeenCalledTimes(1);
    expect(onAoiChange).toHaveBeenCalledWith({
      type: "Point",
      coordinate: [139.7, 35.6],
    });
  });

  it("polygon モードで頂点が 2 つ以下なら LEFT_DOUBLE_CLICK しても確定しない", () => {
    const { viewer, pick } = createViewer();
    pick.mockReturnValueOnce({ lon: 130, lat: 30 }).mockReturnValueOnce({ lon: 140, lat: 35 });
    mockState.viewer = viewer;
    const onAoiChange = vi.fn();

    render(<AoiLayer aoi={null} mode="polygon" onAoiChange={onAoiChange} />);

    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 1, y: 1 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 2, y: 2 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    expect(onAoiChange).not.toHaveBeenCalled();
  });

  it("polygon モードで頂点が 3 つ以上なら LEFT_DOUBLE_CLICK で Polygon AOI を確定する", () => {
    const { viewer, pick } = createViewer();
    pick
      .mockReturnValueOnce({ lon: 130, lat: 30 })
      .mockReturnValueOnce({ lon: 140, lat: 30 })
      .mockReturnValueOnce({ lon: 140, lat: 40 });
    mockState.viewer = viewer;
    const onAoiChange = vi.fn();

    render(<AoiLayer aoi={null} mode="polygon" onAoiChange={onAoiChange} />);

    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 1, y: 1 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 2, y: 2 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 3, y: 3 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    expect(onAoiChange).toHaveBeenCalledTimes(1);
    expect(onAoiChange).toHaveBeenCalledWith({
      type: "Polygon",
      coordinates: [
        [130, 30],
        [140, 30],
        [140, 40],
      ],
    });
  });

  it("polygon モード解除時に handler を破棄し、頂点マーカーとゴムバンドを削除する", () => {
    const { viewer, pick, addedEntities, remove } = createViewer();
    pick.mockReturnValueOnce({ lon: 130, lat: 30 }).mockReturnValueOnce({ lon: 140, lat: 35 });
    mockState.viewer = viewer;
    const onAoiChange = vi.fn();

    const { rerender } = render(<AoiLayer aoi={null} mode="polygon" onAoiChange={onAoiChange} />);
    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 1, y: 1 } });
    trigger(Cesium.ScreenSpaceEventType.LEFT_CLICK, { position: { x: 2, y: 2 } });
    const polygonHandler = getLatestHandler();

    rerender(<AoiLayer aoi={null} mode="none" onAoiChange={onAoiChange} />);

    const [rubberbandEntity, vertex1, vertex2] = addedEntities;
    expect(polygonHandler.destroy).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenNthCalledWith(1, vertex1);
    expect(remove).toHaveBeenNthCalledWith(2, vertex2);
    expect(remove).toHaveBeenNthCalledWith(3, rubberbandEntity);
  });
});
