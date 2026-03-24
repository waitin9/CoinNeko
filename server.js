const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize DB
const db = new Database('./coinneko.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    gacha_tickets INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    transacted_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    month TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    UNIQUE(user_id, category_id, month),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS cat_species (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    rarity TEXT CHECK(rarity IN ('common','rare','epic','legendary')) NOT NULL,
    emoji TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS user_cats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cat_species_id TEXT NOT NULL,
    star_level INTEGER DEFAULT 1,
    acquired_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(cat_species_id) REFERENCES cat_species(id)
  );

  CREATE TABLE IF NOT EXISTS gacha_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cat_species_id TEXT NOT NULL,
    pulled_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    checkin_date TEXT NOT NULL,
    transactions_count INTEGER DEFAULT 0,
    UNIQUE(user_id, checkin_date)
  );
`);

// Seed default data
const catCount = db.prepare('SELECT COUNT(*) as c FROM cat_species').get();
if (catCount.c === 0) {
  const cats = [
    { id: uuidv4(), name: '小廚師', job_title: '廚師貓', rarity: 'common', emoji: '👨‍🍳', description: '精通各式料理，最愛計算食材成本' },
    { id: uuidv4(), name: '阿法官', job_title: '律師貓', rarity: 'rare', emoji: '⚖️', description: '辯才無礙，從不多花一分錢' },
    { id: uuidv4(), name: '碼農橘', job_title: '程式貓', rarity: 'rare', emoji: '💻', description: '每天 Debug 人生，收入穩定' },
    { id: uuidv4(), name: '白袍喵', job_title: '護士貓', rarity: 'common', emoji: '🏥', description: '細心照顧每筆帳目的健康' },
    { id: uuidv4(), name: '書生貓', job_title: '老師貓', rarity: 'common', emoji: '📚', description: '知識就是財富，理財也要學' },
    { id: uuidv4(), name: '偵探黑', job_title: '偵探貓', rarity: 'epic', emoji: '🔍', description: '追蹤每一分錢的去向' },
    { id: uuidv4(), name: '太空喵', job_title: '太空人貓', rarity: 'epic', emoji: '🚀', description: '夢想是存到足夠的火箭燃料' },
    { id: uuidv4(), name: '藝術喵', job_title: '畫家貓', rarity: 'rare', emoji: '🎨', description: '把每個月的收支畫成藝術' },
    { id: uuidv4(), name: '鐵路貓', job_title: '司機貓', rarity: 'common', emoji: '🚂', description: '財富列車準時出發' },
    { id: uuidv4(), name: '魔法貓', job_title: '魔法師貓', rarity: 'legendary', emoji: '🪄', description: '傳說中能讓錢自己增值的貓' },
    { id: uuidv4(), name: '船長喵', job_title: '船長貓', rarity: 'epic', emoji: '⚓', description: '航行在財富之海，從不迷航' },
    { id: uuidv4(), name: '皇家貓', job_title: '國王貓', rarity: 'legendary', emoji: '👑', description: '月底達標才會現身的傳說之貓' },
  ];
  const insertCat = db.prepare('INSERT INTO cat_species (id, name, job_title, rarity, emoji, description) VALUES (?,?,?,?,?,?)');
  cats.forEach(c => insertCat.run(c.id, c.name, c.job_title, c.rarity, c.emoji, c.description));
}

const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
if (categoryCount.c === 0) {
  const cats2 = [
    { id: uuidv4(), name: '餐飲', icon: '🍜', type: 'expense' },
    { id: uuidv4(), name: '交通', icon: '🚌', type: 'expense' },
    { id: uuidv4(), name: '購物', icon: '🛍️', type: 'expense' },
    { id: uuidv4(), name: '娛樂', icon: '🎮', type: 'expense' },
    { id: uuidv4(), name: '醫療', icon: '💊', type: 'expense' },
    { id: uuidv4(), name: '住房', icon: '🏠', type: 'expense' },
    { id: uuidv4(), name: '薪資', icon: '💰', type: 'income' },
    { id: uuidv4(), name: '兼職', icon: '💼', type: 'income' },
    { id: uuidv4(), name: '投資', icon: '📈', type: 'income' },
    { id: uuidv4(), name: '其他支出', icon: '📦', type: 'expense' },
    { id: uuidv4(), name: '其他收入', icon: '🎁', type: 'income' },
  ];
  const insertCat2 = db.prepare('INSERT INTO categories (id, name, icon, type) VALUES (?,?,?,?)');
  cats2.forEach(c => insertCat2.run(c.id, c.name, c.icon, c.type));
}

// Seed default user
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  db.prepare('INSERT INTO users (id, username, coins, gacha_tickets) VALUES (?,?,?,?)').run(uuidv4(), '喵喵理財師', 0, 3);
}

// === ROUTES ===

// User
app.get('/api/user', (req, res) => {
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  res.json(user);
});

// Categories
app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(cats);
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const { month } = req.query;
  let query = `SELECT t.*, c.name as cat_name, c.icon as cat_icon, c.type as cat_type
               FROM transactions t JOIN categories c ON t.category_id = c.id
               ORDER BY t.transacted_at DESC`;
  if (month) {
    query = `SELECT t.*, c.name as cat_name, c.icon as cat_icon, c.type as cat_type
             FROM transactions t JOIN categories c ON t.category_id = c.id
             WHERE strftime('%Y-%m', t.transacted_at) = ? ORDER BY t.transacted_at DESC`;
    return res.json(db.prepare(query).all(month));
  }
  res.json(db.prepare(query).all());
});

app.post('/api/transactions', (req, res) => {
  const { category_id, amount, note } = req.body;
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (!category_id || !amount) return res.status(400).json({ error: 'Missing fields' });

  const id = uuidv4();
  db.prepare('INSERT INTO transactions (id, user_id, category_id, amount, note) VALUES (?,?,?,?,?)').run(id, user.id, category_id, amount, note || '');

  // Give coins
  const coinsEarned = 10;
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coinsEarned, user.id);

  // Check daily checkin
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = ?').get(user.id, today);
  let ticketEarned = 0;
  if (!existing) {
    db.prepare('INSERT INTO daily_checkins (id, user_id, checkin_date, transactions_count) VALUES (?,?,?,1)').run(uuidv4(), user.id, today);
    ticketEarned = 1;
    db.prepare('UPDATE users SET gacha_tickets = gacha_tickets + 1 WHERE id = ?').run(user.id);
  } else {
    db.prepare('UPDATE daily_checkins SET transactions_count = transactions_count + 1 WHERE user_id = ? AND checkin_date = ?').run(user.id, today);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ success: true, coins_earned: coinsEarned, ticket_earned: ticketEarned, user: updatedUser });
});

app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Summary stats
app.get('/api/summary', (req, res) => {
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  const income = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE c.type='income' AND strftime('%Y-%m', t.transacted_at) = ?`).get(m);
  const expense = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE c.type='expense' AND strftime('%Y-%m', t.transacted_at) = ?`).get(m);
  const byCategory = db.prepare(`SELECT c.name, c.icon, c.type, COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE strftime('%Y-%m', t.transacted_at) = ? GROUP BY c.id ORDER BY total DESC`).all(m);
  res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, byCategory });
});

// Budgets
app.get('/api/budgets', (req, res) => {
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  const budgets = db.prepare(`SELECT b.*, c.name as cat_name, c.icon as cat_icon,
    COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = b.category_id AND strftime('%Y-%m', t.transacted_at) = b.month), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.month = ?`).all(m);
  res.json(budgets);
});

app.post('/api/budgets', (req, res) => {
  const { category_id, month, limit_amount } = req.body;
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  const id = uuidv4();
  try {
    db.prepare('INSERT OR REPLACE INTO budgets (id, user_id, category_id, month, limit_amount) VALUES (?,?,?,?,?)').run(id, user.id, category_id, month, limit_amount);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Cats
app.get('/api/cats/species', (req, res) => {
  res.json(db.prepare('SELECT * FROM cat_species ORDER BY rarity DESC, name').all());
});

app.get('/api/cats/collection', (req, res) => {
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  const collected = db.prepare(`SELECT uc.*, cs.name, cs.job_title, cs.rarity, cs.emoji, cs.description
    FROM user_cats uc JOIN cat_species cs ON uc.cat_species_id = cs.id
    WHERE uc.user_id = ? ORDER BY uc.acquired_at DESC`).all(user.id);
  res.json(collected);
});

// Gacha pull
app.post('/api/gacha/pull', (req, res) => {
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  const { use_coins } = req.body;

  if (use_coins) {
    if (user.coins < 100) return res.status(400).json({ error: '貓咪幣不足（需要 100 枚）' });
    db.prepare('UPDATE users SET coins = coins - 100 WHERE id = ?').run(user.id);
  } else {
    if (user.gacha_tickets < 1) return res.status(400).json({ error: '扭蛋券不足' });
    db.prepare('UPDATE users SET gacha_tickets = gacha_tickets - 1 WHERE id = ?').run(user.id);
  }

  // Weighted random
  const rand = Math.random();
  let rarity;
  if (rand < 0.005) rarity = 'legendary';
  else if (rand < 0.05) rarity = 'epic';
  else if (rand < 0.25) rarity = 'rare';
  else rarity = 'common';

  const pool = db.prepare('SELECT * FROM cat_species WHERE rarity = ?').all(rarity);
  const picked = pool[Math.floor(Math.random() * pool.length)];

  // Check duplicate
  const existing = db.prepare('SELECT * FROM user_cats WHERE user_id = ? AND cat_species_id = ?').get(user.id, picked.id);
  let isDuplicate = false;
  if (existing) {
    isDuplicate = true;
    if (existing.star_level < 5) {
      db.prepare('UPDATE user_cats SET star_level = star_level + 1 WHERE id = ?').run(existing.id);
      db.prepare('UPDATE users SET coins = coins + 30 WHERE id = ?').run(user.id);
    } else {
      db.prepare('UPDATE users SET coins = coins + 50 WHERE id = ?').run(user.id);
    }
  } else {
    db.prepare('INSERT INTO user_cats (id, user_id, cat_species_id) VALUES (?,?,?)').run(uuidv4(), user.id, picked.id);
  }
  db.prepare('INSERT INTO gacha_history (id, user_id, cat_species_id) VALUES (?,?,?)').run(uuidv4(), user.id, picked.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ cat: picked, is_duplicate: isDuplicate, user: updatedUser });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🐱 CoinNeko server running at http://localhost:${PORT}`);
});
