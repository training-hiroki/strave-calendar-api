const fs = require('fs');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

async function fetchStravaData() {
  console.log("Stravaアクセストークン取得中...");

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error("アクセストークン取得失敗: " + errorText);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  console.log("Stravaアクティビティ取得中...");

  const activitiesRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=30",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!activitiesRes.ok) {
    const errorText = await activitiesRes.text();
    throw new Error("アクティビティ取得失敗: " + errorText);
  }

  const activities = await activitiesRes.json();

  const data = activities.map(activity => {
    const distanceKm = activity.distance / 1000;
    const movingMinutes = activity.moving_time / 60;
    const paceMinPerKm = distanceKm > 0 ? movingMinutes / distanceKm : 0;

    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60)
      .toString()
      .padStart(2, '0');

    // 🏃 種別を日本語に分かりやすく変換
    let typeJa = activity.type;
    if (activity.type === "Run") typeJa = "ランニング";
    if (activity.type === "Walk") typeJa = "ウォーキング";

    // 🎯 Garminのトレーニング効果（Training Effect）による強度の自動判定
    // 有酸素（aerobic_training_effect）と無酸素（anaerobic_training_effect）の数値を見て自動判定します
    const aerobicTE = activity.aerobic_training_effect;
    const anaerobicTE = activity.anaerobic_training_effect;
    let intensity = "ベース（低強度有酸素）"; // デフォルト値

    if (aerobicTE !== undefined && aerobicTE !== null) {
      // 無酸素の数値が高ければスプリントや無酸素能力と判定
      if (anaerobicTE && anaerobicTE >= 3.0) {
        intensity = "スプリント / 無酸素能力";
      } 
      // 有酸素の数値による判定
      else if (aerobicTE >= 5.0) {
        intensity = "オーバーリーチ（過剰負荷）";
      } else if (aerobicTE >= 4.0) {
        intensity = "ハード（VO2 Max）";
      } else if (aerobicTE >= 3.0) {
        intensity = "テンポ（高強度有酸素）";
      } else if (aerobicTE >= 2.0) {
        intensity = "ベース（低強度有酸素）";
      } else {
        intensity = "リカバリー";
      }
    } else {
      intensity = "データなし";
    }

    return {
      id: activity.id,
      date: activity.start_date_local.slice(0, 10),
      name: activity.name,
      type: typeJa,
      distance: `${distanceKm.toFixed(2)}km`,
      time_sec: activity.moving_time,
      pace: `${paceMin}:${paceSec}/km`,
      intensity: intensity, // 🔥 Garmin自動連動の強度判定
      avg_heartrate: activity.has_heartrate && activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate: activity.has_heartrate && activity.max_heartrate ? Math.round(activity.max_heartrate) : null
    };
  });

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf-8');

  console.log("成功！Garmin自動判定の強度付きでdata.jsonに保存しました。");
}

fetchStravaData().catch(error => {
  console.error(error.message);
  process.exit(1);
});
