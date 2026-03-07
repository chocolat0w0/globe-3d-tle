import type { MissionDefinition } from "../types/phase4";

export const PHASE4_MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: "cover-japan-day",
    shortLabel: "ミッション1",
    title: "日本全体を1日で撮影せよ！",
    description:
      "日本列島から沖縄まで、1日のどこかでまとめて見渡せる衛星を設計しよう。大事なのは通る回数ではなく、日本全体がちゃんと視野に入ることです。",
    hint: "広く見えるカメラにして、日本全体が1回で入るくらい高いところから見てみよう。",
    successMessage: "成功！ 日本全体をすばやく観測できる設計になりました。",
    kind: "custom-design",
    criteria: {
      requiredCameraMode: "wide",
      requiresFullJapanCoverage: true,
    },
  },
  {
    id: "rapid-disaster-response",
    shortLabel: "ミッション2",
    title: "災害が起きた場所をすぐに撮影せよ！",
    description:
      "細かく見えるカメラで、被災地を何度も見直せる設計を目指そう。低めの高度と通過回数がポイントです。",
    hint: "よく見えるカメラ、高度900km以下、日本上空5回以上が目安です。",
    successMessage: "成功！ 災害対応向けのすばやい観測設計になりました。",
    kind: "custom-design",
    criteria: {
      requiredCameraMode: "detail",
      maxAltitudeKm: 900,
      minJapanPassesPerDay: 5,
    },
  },
  {
    id: "target-discovery",
    shortLabel: "ミッション3",
    title: "謎の生き物を発見せよ！",
    description:
      "世界のどこかで不思議な生き物が目撃されました！まずは広い範囲を見渡せる衛星でスキャンして、次に高解像度の衛星で正体を確かめよう。",
    hint: "ステップ1では広く見える衛星（解像度5m以上）、ステップ2ではくわしく見える衛星（解像度1m以下）を選ぼう。",
    successMessage: "すごい！衛星の使い分けで生き物を発見できたね！",
    kind: "target-discovery",
    criteria: {
      wideMinResolutionMeters: 5,
      detailMaxResolutionMeters: 1,
    },
  },
];

export const PHASE4_MISSION_IDS = PHASE4_MISSION_DEFINITIONS.map((mission) => mission.id);
