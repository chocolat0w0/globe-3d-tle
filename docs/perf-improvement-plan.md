# パフォーマンス改善計画

## ベースライン要約（2026-02-22 計測）

| 指標 | 実測値 | 目標値 | 判定 |
| --- | --- | --- | --- |
| Worker RTT avg（初期ロード） | 278.8ms | < 1000ms | ✅ 大幅クリア |
| Worker RTT p95（初期ロード） | 346.6ms | — | ✅ |
| FPS p95（安定後） | 85.5 fps | > 60fps | ✅ 大幅クリア |
| FPS p95（操作中・10機+FP） | 115.4 fps | > 30fps | ✅ 大幅クリア |
| FP update avg | 0.002ms | < 1ms | ✅ ほぼゼロ |
| Heap（シナリオD後） | 74.4 MB | < 500MB | ✅ 極めて低い |
| Cache 使用量（30エントリ） | 1.65 MB | — | ✅ 軽量 |

**結論**: 全指標で目標を大幅に上回っている。パフォーマンス上の緊急課題はない。

---

## 5施策の評価

### 施策 1: Entity → Primitive 移行

| 項目 | 内容 |
| --- | --- |
| 目的 | ポリゴン描画のスループット向上（100機規模での高速化） |
| 判定基準 | FPS p95 < 30fps |
| 実測値 | FPS p95 = **115.4 fps**（操作中・10機+FP全表示） |
| **判断** | **不要** |
| 根拠 | 現状の 10機 規模では Entity API で十分。Primitive への移行は実装コストが高く（Cesium の低レベル API を直接操作）、将来 50機超になった際に改めて検討する。 |

---

### 施策 2: stepSec 可変化（カメラ高度連動）

| 項目 | 内容 |
| --- | --- |
| 目的 | 遠景時の不要なサンプリング密度を下げて Worker 負荷を削減 |
| 判定基準 | RTT avg > 500ms（現状は任意） |
| 実測値 | Worker RTT avg = **278.8ms** |
| **判断** | **実行**（将来の拡張への備えとして） |
| 根拠 | 現状の RTT は許容範囲だが、衛星数増加やフットプリント計算が加わると負荷が増す可能性がある。カメラ高度連動は UX にも貢献する（遠景時に余分な計算コストを払わない）。実装コストも低い。 |

---

### 施策 3: フットプリント更新間引き

| 項目 | 内容 |
| --- | --- |
| 目的 | `postRender` コールバックのフットプリント更新コストを削減 |
| 判定基準 | FP update avg > 1ms |
| 実測値 | FP update avg = **0.002ms** |
| **判断** | **不要** |
| 根拠 | 更新コストがほぼゼロ（0.002ms）であり、間引きによる複雑化のメリットがない。 |

---

### 施策 4: LRU キャッシュサイズ拡大

| 項目 | 内容 |
| --- | --- |
| 目的 | 多日移動時のキャッシュヒット率向上 |
| 判定基準 | Heap > 500MB またはキャッシュミス頻発 |
| 実測値 | Heap = 74.4MB、キャッシュ効率 = 30/70（先読みが積極的に機能） |
| **判断** | **不要** |
| 根拠 | 現状でも前後3日分（30エントリ）が先読みされており、スライダー操作でキャッシュミスが観測されなかった。70エントリ（10機×7日）の現設定で十分。 |

---

### 施策 5: Web Worker 並列化（複数 Worker）

| 項目 | 内容 |
| --- | --- |
| 目的 | 10機を複数 Worker に分散して計算時間を短縮 |
| 判定基準 | RTT avg > 1000ms かつ単一 Worker がボトルネック |
| 実測値 | Worker RTT avg = **278.8ms** |
| **判断** | **不要** |
| 根拠 | 現状の RTT は十分低く、並列化による実装複雑度の増加（Worker プール管理、ロードバランシング）を正当化できない。 |

---

## 実装: stepSec カメラ高度連動

### 設計方針

カメラ高度（`viewer.camera.positionCartographic.height`）に応じて stepSec を動的に切り替える。
遠景時は粗いサンプリング（120秒）、近景時は高精度（30秒）にすることで、不要な計算コストを削減する。

### 高度バンド定義

| カメラ高度 | stepSec | サンプル数/衛星/日 | 用途 |
| --- | --- | --- | --- |
| < 5,000 km | 30 | 2,880 | 高精度（近景・地表詳細確認） |
| 5,000〜20,000 km | 60 | 1,440 | 中精度（大陸スケール表示） |
| > 20,000 km | 120 | 720 | 低精度（全球俯瞰） |

### アーキテクチャ

```
App.tsx
  state: stepSec (default: 30)
  ↓ onStepSecChange callback
GlobeRenderer
  └── StepSecController  ← viewer.camera.positionCartographic.height を監視
        ↓ calls onStepSecChange(newStepSec) ← デバウンス 1秒
App.tsx
  ↓ stepSec prop
  ├── SatelliteLayer → useOrbitData({ stepSec })
  └── FootprintLayer → useFootprintData({ stepSec })
```

### 重要な設計判断

- **デバウンス 1秒**: ズームアニメーション中の連続した stepSec 変更を防ぐ
- **SwathLayer は対象外**: スワスは日窓単位で静的描画。stepSec 変更でスワス再計算するメリットがない
- **キャッシュ互換性**: `stepSec` はキャッシュキー `${satelliteId}:${dayStartMs}:${stepSec}` に含まれるため、異なる stepSec は自動的に別エントリとして管理される

### 変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| `src/components/Globe/GlobeRenderer.tsx` | `StepSecController` 内部コンポーネント追加、`onStepSecChange` prop 追加 |
| `src/components/Globe/SatelliteLayer.tsx` | `stepSec` prop 追加（デフォルト 30）、`useOrbitData` に渡す |
| `src/App.tsx` | `stepSec` state 追加、各レイヤーに配布 |

---

## 優先順位サマリー

| 優先度 | 施策 | 判断 | 理由 |
| --- | --- | --- | --- |
| 1 | stepSec 可変化 | **実行** | 将来拡張への備え、UX向上 |
| 2 | Entity → Primitive 移行 | 保留 | 50機超になったら再検討 |
| 3 | キャッシュサイズ拡大 | 不要 | 現設定で十分 |
| 4 | FP 更新間引き | 不要 | コストがほぼゼロ |
| 5 | Worker 並列化 | 不要 | RTT が許容範囲内 |
