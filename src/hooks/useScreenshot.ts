import { useCallback, useState } from "react";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureAndShare = useCallback(async () => {
    const viewer = window.__CESIUM_VIEWER__;
    if (!viewer || isCapturing) return;

    setIsCapturing(true);

    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const removeListener = viewer.scene.postRender.addEventListener(() => {
          removeListener();
          resolve(viewer.canvas.toDataURL("image/png"));
        });
        // requestRenderMode が有効でも確実に1フレーム描画させる
        viewer.scene.requestRender();
      });

      const blob = dataUrlToBlob(dataUrl);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `orbit-view-${timestamp}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Web Share API でファイル共有を試みる
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Satellite Orbit View",
          text: "衛星軌道ビューを共有します",
          files: [file],
        });
      } else {
        // 非対応ブラウザ（デスクトップChrome等）はダウンロードにフォールバック
        downloadBlob(blob, filename);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  return { captureAndShare, isCapturing };
}
