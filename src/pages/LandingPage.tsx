import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing">
      {/* 星のきらめき背景 */}
      <div className="landing-stars" aria-hidden="true">
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} className="star" />
        ))}
      </div>

      {/* 軌道リング装飾 */}
      <div className="landing-orbit-ring" aria-hidden="true" />
      <div className="landing-orbit-ring landing-orbit-ring--2" aria-hidden="true" />

      {/* ヘッダー */}
      <header className="landing-header">
        <div className="landing-logo">
          <svg
            className="landing-logo-icon"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
            <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
            <ellipse
              cx="24"
              cy="24"
              rx="22"
              ry="8"
              stroke="currentColor"
              strokeWidth="1.5"
              transform="rotate(-25 24 24)"
              opacity="0.6"
            />
            <circle cx="38" cy="14" r="2.5" fill="currentColor" />
          </svg>
          <h1 className="landing-title">
            Globe 3D <span className="landing-title-accent">TLE</span>
          </h1>
        </div>
        <p className="landing-subtitle">
          衛星軌道の可視化と学習のためのプラットフォーム
        </p>
      </header>

      {/* モード選択カード */}
      <main className="landing-cards">
        <Link to="/pro" className="landing-card landing-card--pro">
          <div className="landing-card-glow" aria-hidden="true" />
          <div className="landing-card-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
              <path
                d="M28 8C28 8 38 18 38 28C38 38 28 48 28 48"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <path
                d="M28 8C28 8 18 18 18 28C18 38 28 48 28 48"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <line x1="8" y1="28" x2="48" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.25" />
              <ellipse
                cx="28"
                cy="28"
                rx="26"
                ry="9"
                stroke="currentColor"
                strokeWidth="1.8"
                transform="rotate(-30 28 28)"
              />
              <circle cx="46" cy="16" r="3" fill="currentColor" />
              <ellipse
                cx="28"
                cy="28"
                rx="24"
                ry="7"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.5"
                transform="rotate(20 28 28)"
              />
              <circle cx="10" cy="38" r="2" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <div className="landing-card-body">
            <h2 className="landing-card-title">Pro Mode</h2>
            <p className="landing-card-desc">
              軌道解析・フットプリント・スワス可視化。
              <br />
              10機同時追跡、AOI描画対応。
            </p>
          </div>
          <span className="landing-card-arrow">→</span>
        </Link>

        <Link to="/edu" className="landing-card landing-card--edu">
          <div className="landing-card-glow" aria-hidden="true" />
          <div className="landing-card-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="30" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
              <path
                d="M12 30C12 30 20 22 28 22C36 22 44 30 44 30"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <circle cx="28" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="28" cy="18" r="2" fill="currentColor" />
              <path
                d="M18 44L28 38L38 44"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="44" cy="14" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="14" cy="16" r="1.5" fill="currentColor" opacity="0.4" />
              <path
                d="M22 10L24 6L26 10"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
          </div>
          <div className="landing-card-body">
            <h2 className="landing-card-title">Edu Mode</h2>
            <p className="landing-card-desc">
              衛星の世界を探検しよう。
              <br />
              打ち上げシミュレーション・ミッション体験。
            </p>
          </div>
          <span className="landing-card-arrow">→</span>
        </Link>
      </main>
    </div>
  );
}
