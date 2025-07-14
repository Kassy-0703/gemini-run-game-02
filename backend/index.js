const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // CORSミドルウェアをインポート

const app = express();
const port = 3000;

// CORSを有効にする
app.use(cors());
app.use(express.json()); // JSONボディをパースするためのミドルウェア

// データベースの初期化
const db = new sqlite3.Database('./rankings.db', (err) => {
    if (err) {
        console.error('データベース接続エラー:', err.message);
    } else {
        console.log('データベースに接続しました。');
        db.run(`CREATE TABLE IF NOT EXISTS rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// ランキング取得API
app.get('/rankings', (req, res) => {
    db.all('SELECT name, score FROM rankings ORDER BY score DESC LIMIT 10', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// ランキング保存API
app.post('/rankings', (req, res) => {
    const { name, score } = req.body;
    if (!name || typeof score !== 'number') {
        res.status(400).json({ error: '名前とスコアは必須です。' });
        return;
    }

    db.run('INSERT INTO rankings (name, score) VALUES (?, ?)', [name, score], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, name, score });
    });
});

// サーバー起動
app.listen(port, () => {
    console.log(`ランキングAPIサーバーが http://localhost:${port} で起動しました。`);
});
