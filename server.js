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

    // 💓 平均心拍数からトレーニング強度を自動判定
    // Ozoe君の心拍ゾーンに合わせて、ここの数字（150や165）は自由にいじって調整してな！
    let intensity = "ジョグ（低強度）";
    if (activity.has_heartrate && activity.average_heartrate) {
      if (activity.average_heartrate >= 165) {
        intensity = "無酸素（超高強度）";
      } else if (activity.average_heartrate >= 150) {
        intensity = "テンポ（高強度有酸素）";
      }
    } else {
      intensity = "データなし";
    }

    return {
      id: activity.id,
      date: activity.start_date_local.slice(0, 10),
      name: activity.name,
      type: typeJa, // 日本語変換版
      distance: `${distanceKm.toFixed(2)}km`,
      time_sec: activity.moving_time,
      pace: `${paceMin}:${paceSec}/km`,
      intensity: intensity,
      avg_heartrate: activity.has_heartrate && activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate: activity.has_heartrate && activity.max_heartrate ? Math.round(activity.max_heartrate) : null
    };
  });

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf-8');

  console.log("成功！Stravaデータを強度付きでdata.jsonに保存しました。");
}

fetchStravaData().catch(error => {
  console.error(error.message);
  process.exit(1);
});
