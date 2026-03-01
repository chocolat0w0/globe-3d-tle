import { useScreenshot } from "../../hooks/useScreenshot";

export function ScreenshotButton() {
  const { captureAndShare, isCapturing } = useScreenshot();

  return (
    <button
      type="button"
      className={`ui-button screenshot-btn${isCapturing ? " is-capturing" : ""}`}
      onClick={captureAndShare}
      disabled={isCapturing}
      aria-label="スクリーンショットを撮って共有"
      title="Share View"
    >
      <span className="screenshot-btn-icon" aria-hidden="true">
        {isCapturing ? "⏳" : "📷"}
      </span>
      <span className="screenshot-btn-label">
        {isCapturing ? "Capturing..." : "Share View"}
      </span>
    </button>
  );
}
