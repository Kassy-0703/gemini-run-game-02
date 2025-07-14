const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// Renderが自動的に設定するPORT環境変数を使用するか、なければ3000番ポートを使用
const port = process.env.PORT || 3000;

// CORSを有効にする
app.use(cors());
app.use(express.json()); // JSONボディをパースするためのミドルウェア

// PostgreSQLへの接続設定
// Renderの環境変数 DATABASE_URL を自動的に使用します
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // RenderのDBに接続するためにSSL接続が必要
  ssl: {
    rejectUnauthorized: false,
  },
});

// データベーステーブルの初期化
const initializeDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS rankings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('Database table "rankings" is ready.');
  } catch (err) {
    console.error('Error creating database table:', err);
    // アプリケーションの起動を中止
    process.exit(1);
  }
};

// ランキング取得API
app.get('/rankings', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, score FROM rankings ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rankings:', err);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// ランキング保存API
app.post('/rankings', async (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Valid name and score are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO rankings (name, score) VALUES ($1, $2) RETURNING *',
      [name, score]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving ranking:', err);
    res.status(500).json({ error: 'Failed to save ranking' });
  }
});

// 管理者パスワード (本番環境では環境変数を使用)
const ADMIN_RESET_PASSWORD = process.env.ADMIN_RESET_PASSWORD || '2104';

// ランキングリセットAPI (管理者用)
app.post('/rankings/reset', async (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_RESET_PASSWORD) {
    return res.status(403).json({ error: 'Incorrect password.' });
  }

  try {
    await pool.query('DELETE FROM rankings');
    res.status(200).json({ message: 'Rankings have been reset.' });
  } catch (err) {
    console.error('Error resetting rankings:', err);
    res.status(500).json({ error: 'Failed to reset rankings' });
  }
});

// サーバー起動
const startServer = async () => {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`Ranking API server is running on port ${port}.`);
  });
};

startServer();