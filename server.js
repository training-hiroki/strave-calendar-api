const fs = require('fs');

async function saveStravaData() {
    console.log("JSON作成中...");

    const mockData = [
        { "date": "2026-05-18", "distance": "12.5km", "type": "Run", "pace": "4:15/km" },
        { "date": "2026-05-20", "distance": "8.0km", "type": "Run", "pace": "4:00/km" },
        { "date": "2026-05-21", "distance": "15.0km", "type": "Run", "pace": "4:30/km" }
    ];

    fs.writeFileSync('data.json', JSON.stringify(mockData, null, 2));

    console.log("成功！");
}

saveStravaData();