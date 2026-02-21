import { useEffect, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { Aoi, AoiDrawingMode } from "../../types/polygon";

interface Props {
  aoi: Aoi | null;
  mode: AoiDrawingMode;
  onAoiChange: (aoi: Aoi) => void;
}

const VERTEX_COLOR = Cesium.Color.YELLOW;
const RUBBERBAND_COLOR = Cesium.Color.YELLOW.withAlpha(0.6);
const POLYGON_FILL_COLOR = new Cesium.Color(1.0, 1.0, 1.0, 0.15);
const POLYGON_OUTLINE_COLOR = Cesium.Color.WHITE;
const POINT_COLOR = Cesium.Color.YELLOW;

export function AoiLayer({ aoi, mode, onAoiChange }: Props) {
  const { viewer } = useCesium();

  // 描画中の状態（Reactのstateではなくrefで管理してCesiumと同期）
  const verticesRef = useRef<Cesium.Cartesian3[]>([]);
  const vertexEntitiesRef = useRef<Cesium.Entity[]>([]);
  const rubberbandEntityRef = useRef<Cesium.Entity | null>(null);
  // CallbackPropertyから参照されるマウス位置
  const mouseCartesianRef = useRef<Cesium.Cartesian3 | null>(null);

  // 確定済みAOIのEntity
  const aoiEntityRef = useRef<Cesium.Entity | null>(null);

  // 確定済みAOIの描画
  useEffect(() => {
    if (!viewer) return;

    // 既存のAOI Entityを削除
    if (aoiEntityRef.current) {
      viewer.entities.remove(aoiEntityRef.current);
      aoiEntityRef.current = null;
    }

    if (!aoi) return;

    if (aoi.type === "Point") {
      const [lon, lat] = aoi.coordinate;
      aoiEntityRef.current = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 12,
          color: POINT_COLOR,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
      });
    } else {
      const positions = aoi.coordinates.map(([lon, lat]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat)
      );
      aoiEntityRef.current = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: POLYGON_FILL_COLOR,
          outline: true,
          outlineColor: POLYGON_OUTLINE_COLOR,
          outlineWidth: 2,
        },
      });
    }

    return () => {
      if (aoiEntityRef.current) {
        viewer.entities.remove(aoiEntityRef.current);
        aoiEntityRef.current = null;
      }
    };
  }, [viewer, aoi]);

  // 描画インタラクション
  useEffect(() => {
    if (!viewer || mode === "none") return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // ゴムバンドライン Entity（ポリゴンモードのみ）
    if (mode === "polygon") {
      const positions = new Cesium.CallbackProperty(() => {
        const pts = [...verticesRef.current];
        if (mouseCartesianRef.current) {
          pts.push(mouseCartesianRef.current);
        }
        // 3点以上なら閉じる仮線を追加
        if (pts.length >= 2 && verticesRef.current.length >= 2) {
          pts.push(pts[0]);
        }
        return pts.length >= 2 ? pts : undefined;
      }, false);

      rubberbandEntityRef.current = viewer.entities.add({
        polyline: {
          positions,
          width: 1.5,
          material: RUBBERBAND_COLOR,
          clampToGround: false,
        },
      });

      handler.setInputAction(
        (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
          const ray = viewer.camera.getPickRay(e.endPosition);
          if (!ray) return;
          const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          mouseCartesianRef.current = cartesian ?? null;
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      );
    }

    // 左クリック: 頂点追加（ポリゴン）またはポイント確定
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const ray = viewer.camera.getPickRay(e.position);
        if (!ray) return;
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (!cartesian) return;

        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);

        if (mode === "point") {
          onAoiChange({ type: "Point", coordinate: [lon, lat] });
          return;
        }

        // ポリゴンモード: 頂点追加
        verticesRef.current = [...verticesRef.current, cartesian];

        const marker = viewer.entities.add({
          position: cartesian,
          point: {
            pixelSize: 7,
            color: VERTEX_COLOR,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
        });
        vertexEntitiesRef.current.push(marker);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    // ダブルクリック: ポリゴン確定（3点以上）
    if (mode === "polygon") {
      handler.setInputAction(
        () => {
          const verts = verticesRef.current;
          if (verts.length < 3) return;

          const coordinates = verts.map((c) => {
            const carto = Cesium.Cartographic.fromCartesian(c);
            return [
              Cesium.Math.toDegrees(carto.longitude),
              Cesium.Math.toDegrees(carto.latitude),
            ] as [number, number];
          });

          onAoiChange({ type: "Polygon", coordinates });
        },
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      );
    }

    return () => {
      handler.destroy();

      // 頂点マーカーとゴムバンドを削除
      vertexEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
      vertexEntitiesRef.current = [];
      verticesRef.current = [];
      mouseCartesianRef.current = null;

      if (rubberbandEntityRef.current) {
        viewer.entities.remove(rubberbandEntityRef.current);
        rubberbandEntityRef.current = null;
      }
    };
  }, [viewer, mode, onAoiChange]);

  return null;
}
