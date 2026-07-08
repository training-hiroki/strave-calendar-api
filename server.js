const fs = require("fs");

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

async function fetchStravaData() {
  console.log("Stravaアクセストークン取得中...");

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("GitHub Secrets が不足しています。STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN を確認してください。");
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(
      "アクセストークン取得失敗: status=" +
      tokenRes.status +
      " body=" +
      errorText
    );
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
    throw new Error(
      "アクティビティ取得失敗: status=" +
      activitiesRes.status +
      " body=" +
      errorText
    );
  }

  const activities = await activitiesRes.json();

  const data = activities.map(activity => {
    const distanceKm = activity.distance / 1000;
    const movingMinutes = activity.moving_time / 60;
    const paceMinPerKm = distanceKm > 0 ? movingMinutes / distanceKm : 0;

    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60)
      .toString()
      .padStart(2, "0");

    let typeJa = activity.type;
    if (activity.type === "Run") typeJa = "ランニング";
    if (activity.type === "Walk") typeJa = "ウォーキング";
    if (activity.type === "Ride") typeJa = "自転車";

    return {
      id: activity.id,
      date: activity.start_date_local.slice(0, 10),
      name: activity.name,
      type: typeJa,
      distance_km: Number(distanceKm.toFixed(2)),
      moving_time_sec: activity.moving_time,
      moving_time_text: formatTime(activity.moving_time),
      pace: distanceKm > 0 ? `${paceMin}:${paceSec}/km` : null,
      avg_heartrate:
        activity.has_heartrate && activity.average_heartrate
          ? Math.round(activity.average_heartrate)
          : null,
      max_heartrate:
        activity.has_heartrate && activity.max_heartrate
          ? Math.round(activity.max_heartrate)
          : null
    };
  });

  fs.writeFileSync("data/hiroki.json", JSON.stringify(data, null, 2), "utf-8");

  console.log("成功！評価なし版で data.json に保存しました。");
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  return `${m}:${s.toString().padStart(2, "0")}`;
}

fetchStravaData().catch(error => {
  console.error(error.message);
  process.exit(1);
});
