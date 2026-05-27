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

    return {
      id: activity.id,
      date: activity.start_date_local.slice(0, 10),
      name: activity.name,
      type: activity.type,
      distance: `${distanceKm.toFixed(2)}km`,
      time_sec: activity.moving_time,
      pace: `${paceMin}:${paceSec}/km`
    };
  });

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf-8');

  console.log("成功！Stravaデータをdata.jsonに保存しました。");
}

fetchStravaData().catch(error => {
  console.error(error.message);
  process.exit(1);
});
