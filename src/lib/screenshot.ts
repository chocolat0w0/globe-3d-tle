import type { Viewer } from "cesium";

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Cesium Viewer の現在の描画内容をスクリーンショットとして PNG ダウンロードする。
 *
 * postRender コールバック内で gl.readPixels() を使用するため、
 * preserveDrawingBuffer: true は不要。Viewer のリマウントも不要。
 */
export function captureGlobeScreenshot(viewer: Viewer): void {
  if (viewer.isDestroyed()) return;

  const removeListener = viewer.scene.postRender.addEventListener(() => {
    removeListener();
    if (viewer.isDestroyed()) return;

    const canvas = viewer.scene.canvas;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return;

    const width = canvas.width;
    const height = canvas.height;

    // フレームバッファからピクセルを読み取り（WebGL は左下原点）
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // 上下反転
    const rowBytes = width * 4;
    const flipped = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row++) {
      const srcOffset = row * rowBytes;
      const dstOffset = (height - 1 - row) * rowBytes;
      flipped.set(pixels.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
    }

    // オフスクリーン Canvas に描画して PNG 化
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const imageData = new ImageData(new Uint8ClampedArray(flipped.buffer), width, height);
    ctx.putImageData(imageData, 0, 0);

    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `globe-${formatTimestamp(new Date())}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  });

  // 描画をトリガーして postRender を発火させる
  viewer.scene.requestRender();
}
