const fs = require('fs');

// 1. Ozoe君の固定設定情報
const CLIENT_ID = '248217';
const CLIENT_SECRET = 'd589345c90c6c6881d575ee8a2a9025c4a6f8d22';
// 永続パスポート（リフレッシュトークン）
const REFRESH_TOKEN = '68b99c0966f363c40046a6fbfd639b980fe169cc'; 

const DATA_FILE = 'data.json';

async function fetchStravaData() {
  try {
    console.log("🏃‍♂️ 永続パスポートを使って、Stravaから最新のアクセスキーを発行します...");
    
    // 期限切れにならないパスポートを使って、その都度最新の鍵をもらう
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      throw new Error("アクセスキーの取得に失敗しました。設定を確認してください。: " + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;
    console.log("🔑 最新の鍵をゲット！Stravaから練習データを引っこ抜きます...");

    // Stravaから直近の練習データを取得
    const activitiesRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=5`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const activities = await activitiesRes.json();

    if (!Array.isArray(activities)) {
      throw new Error("データの取得に失敗しました。: " + JSON.stringify(activities));
    }

    // 相方のカレンダーが見やすい形にデータを整形
    const formattedData = activities.map(act => {
      const distanceKm = (act.distance / 1000).toFixed(1); // メートルをキロメートルに変換
      
      // ペースの計算（秒/km から 分:秒/km に変換）
      const totalSeconds = act.moving_time / (act.distance / 1000);
      const min = Math.floor(totalSeconds / 60);
      const sec = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      const paceStr = act.distance > 0 ? `${min}:${sec}/km` : "-";

      // 日付を日本時間っぽく綺麗にする
      const dateStr = act.start_date_local.split('T')[0];

      // アクティビティタイプ（Run, Walk など）
      let typeStr = act.type;
      if (typeStr === 'Run') typeStr = 'Run';

      return {
        date: dateStr,
        distance: `${distanceKm}km`,
        type: typeStr,
        pace: paceStr
      };
    });

    // 倉庫の data.json に本物のデータを上書き保存する
    fs.writeFileSync(DATA_FILE, JSON.stringify(formattedData, null, 2), 'utf8');
    console.log("🎉 本物の練習データを data.json にバチコーンと保存しました！");

  } catch (error) {
    console.error("❌ エラーが発生しました:", error.message);
    process.exit(1);
  }
}

fetchStravaData();
