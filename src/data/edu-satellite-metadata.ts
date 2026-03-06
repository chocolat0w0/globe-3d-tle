export interface EduSatelliteMetadata {
  /** sample-tle.json の id と一致 */
  id: string;
  /** 子供向け表示名（カタカナ表記） */
  displayName: string;
  /** カテゴリアイコン */
  iconType: "optical" | "sar" | "weather";
  /** カードのアクセント色 */
  cardColor: string;
  /** ミッション説明（2-3文、小学生向け） */
  missionDescription: string;
  /** 運用機関 */
  operator: string;
  /** 国/地域（絵文字 + 名前） */
  origin: string;
  /** 高度と身近な比較 */
  altitude: {
    km: number;
    comparison: string;
  };
  /** 解像度と身近な比較 */
  resolution: {
    meters: number;
    comparison: string;
  };
  /** センサー種類の子供向け説明 */
  sensorType: {
    type: "光学" | "SAR（レーダー）" | "赤外線";
    explanation: string;
  };
  /** この衛星でわかること（3-4項目） */
  capabilities: string[];
  /** 面白い豆知識 */
  funFact: string;
}

export const eduSatelliteMetadata: EduSatelliteMetadata[] = [
  {
    id: "sentinel1a",
    displayName: "センチネル1A",
    iconType: "sar",
    cardColor: "#0e8f7d",
    missionDescription:
      "雲が多い日でも、地面のようすを観察できる衛星です。夜でも観測できるので、災害の確認にも活やくします。",
    operator: "欧州宇宙機関（ESA）",
    origin: "🇪🇺 ヨーロッパ",
    altitude: { km: 693, comparison: "飛行機の約70倍の高さ" },
    resolution: { meters: 5, comparison: "校庭くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "電波を出して地面からはね返ってきた信号を読み取るカメラ",
    },
    capabilities: ["洪水の広がり確認", "地すべりの変化チェック", "海の氷の観測"],
    funFact: "1日に地球をだいたい14周します。",
  },
  {
    id: "sentinel1b",
    displayName: "センチネル1B",
    iconType: "sar",
    cardColor: "#167d8c",
    missionDescription:
      "センチネル1Aの相棒として打ち上げられた衛星です。2機で協力して、より速く地球を見回ります。",
    operator: "欧州宇宙機関（ESA）",
    origin: "🇪🇺 ヨーロッパ",
    altitude: { km: 693, comparison: "飛行機の約70倍の高さ" },
    resolution: { meters: 5, comparison: "校庭くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "雨や雲に負けず、地面の形の変化を見つけることができる",
    },
    capabilities: ["災害後の被害確認", "森や湿地の観測", "船の位置の確認"],
    funFact: "双子のように似た軌道を飛び、観測のすき間を減らします。",
  },
  {
    id: "terrasar",
    displayName: "テラサーX",
    iconType: "sar",
    cardColor: "#118f5d",
    missionDescription:
      "とても細かく地面を観測できる衛星です。町の中の変化や地形の凹凸をくわしく調べるのが得意です。",
    operator: "ドイツ航空宇宙センター（DLR）",
    origin: "🇩🇪 ドイツ",
    altitude: { km: 514, comparison: "飛行機の約50倍の高さ" },
    resolution: { meters: 1, comparison: "車くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "細い電波ビームで地面をなぞるように撮る高精細レーダー",
    },
    capabilities: ["都市の地盤変化監視", "火山周辺の観測", "山岳地形の測定"],
    funFact: "1mクラスの細かさで見える、レーダー衛星のベテランです。",
  },
  {
    id: "tandemx",
    displayName: "タンデムX",
    iconType: "sar",
    cardColor: "#1c9a69",
    missionDescription:
      "テラサーXとペアで飛び、地球の立体地図を作るために活やくする衛星です。高低差をくわしく測れます。",
    operator: "ドイツ航空宇宙センター（DLR）",
    origin: "🇩🇪 ドイツ",
    altitude: { km: 514, comparison: "飛行機の約50倍の高さ" },
    resolution: { meters: 1, comparison: "車くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "2機で同時に観測して高さ情報を作り出す立体観測レーダー",
    },
    capabilities: ["立体地図づくり", "山の高さ比較", "森林の高さ推定"],
    funFact: "地球全体の3D地形データを作る大仕事をしました。",
  },
  {
    id: "capella",
    displayName: "カペラ18",
    iconType: "sar",
    cardColor: "#2b8f7f",
    missionDescription:
      "小型でも高性能なレーダー衛星です。必要な場所をすばやく狙って、細かい観測を行います。",
    operator: "Capella Space",
    origin: "🇺🇸 アメリカ",
    altitude: { km: 525, comparison: "飛行機の約50倍の高さ" },
    resolution: { meters: 0.5, comparison: "机くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "とても細かい反射の違いを読み取り、小さな変化も見つける",
    },
    capabilities: ["港の監視", "災害時の緊急撮影", "都市インフラの変化確認"],
    funFact: "50cmくらいまで見えるので、細かい形の違いが分かります。",
  },
  {
    id: "iceye",
    displayName: "アイスアイX47",
    iconType: "sar",
    cardColor: "#2f7b90",
    missionDescription:
      "地球のどこで何が起こっているかを短い時間で確認できる衛星です。災害対応のスピードに強みがあります。",
    operator: "ICEYE",
    origin: "🇫🇮 フィンランド",
    altitude: { km: 560, comparison: "飛行機の約55倍の高さ" },
    resolution: { meters: 1, comparison: "車くらいの大きさが見える" },
    sensorType: {
      type: "SAR（レーダー）",
      explanation: "いつでも観測できる電波カメラで、すばやく情報を届ける",
    },
    capabilities: ["洪水マップ作成", "海上監視", "氷や雪の分布確認"],
    funFact: "小型衛星をたくさん運用して、観測の回数を増やしています。",
  },
  {
    id: "sentinel2a",
    displayName: "センチネル2A",
    iconType: "optical",
    cardColor: "#3a8f2d",
    missionDescription:
      "地球の色をきれいに撮る光学衛星です。森や畑の健康状態を調べるのに使われます。",
    operator: "欧州宇宙機関（ESA）",
    origin: "🇪🇺 ヨーロッパ",
    altitude: { km: 786, comparison: "飛行機の約80倍の高さ" },
    resolution: { meters: 10, comparison: "バスくらいの大きさが見える" },
    sensorType: {
      type: "光学",
      explanation: "太陽の光を使って、ふつうの写真のように地球を撮影する",
    },
    capabilities: ["森林の健康チェック", "農作物の育ち具合確認", "湖や海の色の観測"],
    funFact: "色を13種類に分けて記録できる、色の博士のような衛星です。",
  },
  {
    id: "sentinel2b",
    displayName: "センチネル2B",
    iconType: "optical",
    cardColor: "#4e9a38",
    missionDescription:
      "センチネル2Aと交代しながら地球を撮影します。地球の変化を短い間かくで追いかけられます。",
    operator: "欧州宇宙機関（ESA）",
    origin: "🇪🇺 ヨーロッパ",
    altitude: { km: 786, comparison: "飛行機の約80倍の高さ" },
    resolution: { meters: 10, comparison: "バスくらいの大きさが見える" },
    sensorType: {
      type: "光学",
      explanation: "明るい昼間に強く、地面の色や植生の違いをくっきり写せる",
    },
    capabilities: ["山火事の跡確認", "川や海のにごり監視", "都市の広がり観測"],
    funFact: "2Aと2Bがペアで働くことで、同じ場所をより早く見直せます。",
  },
  {
    id: "worldview3",
    displayName: "ワールドビュー3",
    iconType: "optical",
    cardColor: "#b36f11",
    missionDescription:
      "とても高い解像度で撮影できる光学衛星です。細かな建物や道路の形を詳しく見られます。",
    operator: "Maxar",
    origin: "🇺🇸 アメリカ",
    altitude: { km: 617, comparison: "飛行機の約60倍の高さ" },
    resolution: { meters: 0.3, comparison: "ノートくらいの大きさが見える" },
    sensorType: {
      type: "光学",
      explanation: "非常に細かい写真を撮る高性能カメラ",
    },
    capabilities: ["災害現場の詳細確認", "道路や建物の調査", "地図更新の材料づくり"],
    funFact: "30cmクラスの解像度で、世界トップレベルの細かさです。",
  },
  {
    id: "himawari",
    displayName: "ひまわり8号",
    iconType: "weather",
    cardColor: "#df7e20",
    missionDescription:
      "日本の天気予報で活やくしている気象衛星です。いつも同じ場所から地球を見守ります。",
    operator: "気象庁",
    origin: "🇯🇵 日本",
    altitude: { km: 35786, comparison: "東京からシドニーくらいの高さ" },
    resolution: { meters: 500, comparison: "町全体のようすが分かる" },
    sensorType: {
      type: "赤外線",
      explanation: "雲や地面が出す熱を観測して、夜の天気も見守るカメラ",
    },
    capabilities: ["台風の進路監視", "雲の動き観測", "大雨の兆し発見"],
    funFact: "地球の自転と同じ速さで回るため、日本の上空に止まって見えます。",
  },
];

export const eduSatelliteMetadataMap = eduSatelliteMetadata.reduce<
  Record<string, EduSatelliteMetadata>
>((acc, metadata) => {
  acc[metadata.id] = metadata;
  return acc;
}, {});
