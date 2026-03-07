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
    id: "night-ocean-observation",
    shortLabel: "ミッション3",
    title: "夜の海を観察せよ！",
    description:
      "夜や雲の多い場面でも観測できる衛星を選ぼう。既存の衛星から最適な種類を見つける問題です。",
    hint: "夜や雲でも強いのは、電波を使うSAR衛星です。",
    successMessage: "正解！ 夜の海にはSAR衛星がぴったりです。",
    kind: "satellite-selection",
    criteria: {
      requiredIconType: "sar",
    },
  },
];

export const PHASE4_MISSION_IDS = PHASE4_MISSION_DEFINITIONS.map((mission) => mission.id);
