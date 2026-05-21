const fs = require('fs');

// 1. Ozoe君の設定情報
const CLIENT_ID = '248217';
const CLIENT_SECRET = 'd589345c90c6c6881d575ee8a2a9025c4a6f8d22';

// ★さっき取得した引換券（code）をここに入れる！
let INITIAL_CODE = '567c977a59b3ec37dc896c9e6f76c0f8d0feb460'; 

const TOKEN_FILE = 'token.json';

// Stravaからデータを持ってくるメイン処理
async function fetchStravaData() {
  try {
    let tokens = {};

    // 2. パスポート（トークン）があるか確認、なければ引換券を使って発行する
    if (fs.existsSync(TOKEN_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    } else {
      console.log("🎟 初回実行：引換券を使ってパスポートを発行します...");
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: INITIAL_CODE,
          grant_type: 'authorization_code'
        })
      });
      tokens = await res.json();
      if (!tokens.refresh_token) throw new Error("パスポートの発行に失敗しました。URLの有効期限（数分）が切れた可能性があります。");
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    }

    // 3. パスポートの期限が切れていたら自動で更新する
    if (tokens.expires_at * 1000 < Date.now()) {
      console.log("🔄 パスポートの期限切れ！新しく更新します...");
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token
        })
      });
      const newTokens = await res.json();
      tokens.access_token = newTokens.access_token;
      tokens.refresh_token = newTokens.refresh_token;
      tokens.expires_at = newTokens.expires_at;
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    }

    // 4. 本物のStravaデータ室から直近の練習データを引っ張ってくる
    console.log("🏃‍♂️ Stravaから本物のデータを取得中...");
    const activitiesRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=30`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const activities = await activitiesRes.json();

    if (!Array.isArray(activities)) {
      console.error("データ取得エラー:", activities);
      return;
    }

    // 5. カレンダーが見やすい形（日付、距離、種目、ペース）にデータを整形する
    const formattedData = activities.map(act => {
      // メートルをキロに変換 (例: 5000m -> 5.0km)
      const distanceKm = (act.distance / 1000).toFixed(1) + 'km';
      
      // 日付を日本のタイムゾーンで見やすくする (例: 2026-05-22)
      const dateStr = new Date(act.start_date_local).toISOString().split('T')[0];
      
      // 1kmあたりのペース計算 (分:秒)
      let paceStr = '-';
      if (act.type === 'Run' && act.distance > 0) {
        const totalSecondsPerKm = (act.moving_time) / (act.distance / 1000);
        const mins = Math.floor(totalSecondsPerKm / 60);
        const secs = Math.floor(totalSecondsPerKm % 60).toString().padStart(2, '0');
        paceStr = `${mins}:${secs}/km`;
      }

      return {
        date: dateStr,
        distance: distanceKm,
        type: act.type,      // Run, Ride, Walk などが自動で入る
        pace: paceStr
      };
    });

    // 6. できたデータを「data.json」に書き出す
    fs.writeFileSync('data.json', JSON.stringify(formattedData, null, 2), 'utf-8');
    console.log("✨ 成功！本物のデータで「data.json」を更新したで！");

  } catch (error) {
    console.error("⚠️ エラーが発生しました:", error.message);
  }
}

fetchStravaData();
