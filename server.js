const fs = require('fs');

// 1. あなたの鍵（ここは自分のやつに書き換えてな！）
const CLIENT_ID = '248217のClient ID';
const CLIENT_SECRET = 'd589345c90c6c881d575ee8a2a9025c4a6f8d228のClient Secret';

// ※本来はここに「ユーザーの承認（リフレッシュトークン）」が必要なんやけど、
// まずはカレンダー担当が使える「JSONファイル」を自動で書き出すテストをするで！
async function saveStravaData() {
  console.log("Stravaからデータを取得中...");

  // 2. 将来的にStravaから返ってくるデータの見本（JSONの形）
  const mockData = [
    { "date": "2026-05-18", "distance": "12.5km", "type": "Run", "pace": "4:15/km" },
    { "date": "2026-05-20", "distance": "8.0km", "type": "Run", "pace": "4:00/km" },
    { "date": "2026-05-21", "distance": "15.0km", "type": "Run", "pace": "4:30/km" }
  ];

  // 3. 取ってきたデータを「data.json」というファイルにしてフォルダに保存する命令
  fs.writeFileSync('data.json', JSON.stringify(mockData, null, 2), 'utf-8');
  
  console.log("✨ 成功！フォルダの中に「data.json」が作成されたで！");
}

saveStravaData();