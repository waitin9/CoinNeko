const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const db = new Database('./coinneko.db');

// --- 1. 初始化資料庫表格 ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    gacha_tickets INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category_id TEXT NOT NULL,
    amount REAL NOT NULL, note TEXT, transacted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category_id TEXT NOT NULL,
    month TEXT NOT NULL, limit_amount REAL NOT NULL,
    UNIQUE(user_id, category_id, month)
  );

  CREATE TABLE IF NOT EXISTS cat_species (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, job_title TEXT NOT NULL,
    rarity TEXT CHECK(rarity IN ('common','rare','epic','legendary')) NOT NULL,
    emoji TEXT NOT NULL, description TEXT
  );

  CREATE TABLE IF NOT EXISTS user_cats (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, cat_species_id TEXT NOT NULL,
    star_level INTEGER DEFAULT 1, acquired_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, cat_species_id)
  );
`);

// --- 2. 初始化貓咪資料 (共 62 隻) ---
const catCount = db.prepare('SELECT COUNT(*) as c FROM cat_species').get();
if (catCount.c === 0) {
  const cats = [
    // 初始 12 隻
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
    // 擴充 Common (20隻)
    { id: uuidv4(), name: '拉花大師', job_title: '咖啡師貓', rarity: 'common', emoji: '☕', description: '認為一杯好咖啡是開啟美好一天的必要投資。' },
    { id: uuidv4(), name: '麵包達人', job_title: '烘焙貓', rarity: 'common', emoji: '🥐', description: '喜歡把零錢像麵團一樣慢慢揉大。' },
    { id: uuidv4(), name: '菜市場阿姨', job_title: '攤販貓', rarity: 'common', emoji: '🥬', description: '殺價功力一流，去市場絕對不吃虧。' },
    { id: uuidv4(), name: '街頭熱唱', job_title: '駐唱貓', rarity: 'common', emoji: '🎸', description: '靠著吉他與歌聲，賺取每一枚打賞的金幣。' },
    { id: uuidv4(), name: '使命必達', job_title: '外送貓', rarity: 'common', emoji: '🛵', description: '跑單超有效率，時間就是金錢的最佳代言人。' },
    { id: uuidv4(), name: '健身狂熱', job_title: '教練貓', rarity: 'common', emoji: '🏋️‍♂️', description: '深蹲和存錢一樣，都需要強大的意志力。' },
    { id: uuidv4(), name: '佛系伸展', job_title: '瑜珈貓', rarity: 'common', emoji: '🧘', description: '面對月底吃土的危機，依然能保持內心平靜。' },
    { id: uuidv4(), name: '深夜追劇', job_title: '沙發貓', rarity: 'common', emoji: '🍿', description: '訂閱了所有串流平台，娛樂支出永遠超標。' },
    { id: uuidv4(), name: '快門瞬間', job_title: '攝影貓', rarity: 'common', emoji: '📷', description: '鏡頭很貴，所以每天都在努力接案賺錢。' },
    { id: uuidv4(), name: '綠手指', job_title: '園丁貓', rarity: 'common', emoji: '🌻', description: '相信只要用心灌溉，財富也會像向日葵一樣盛開。' },
    { id: uuidv4(), name: '白衣天使', job_title: '護理貓', rarity: 'common', emoji: '💉', description: '細心照料你的錢包，預防財務大出血。' },
    { id: uuidv4(), name: '熱血教師', job_title: '教育貓', rarity: 'common', emoji: '🏫', description: '致力於傳授基礎理財觀念給小貓咪們。' },
    { id: uuidv4(), name: '交通樞紐', job_title: '公車貓', rarity: 'common', emoji: '🚌', description: '精算每一趟通勤費用，買定期票最劃算。' },
    { id: uuidv4(), name: '家事達人', job_title: '管家貓', rarity: 'common', emoji: '🧹', description: '把帳本打理得跟家裡的地板一樣一塵不染。' },
    { id: uuidv4(), name: '圖書管理員', job_title: '司書貓', rarity: 'common', emoji: '📖', description: '安靜地在書堆中尋找致富的智慧。' },
    { id: uuidv4(), name: '微笑收銀', job_title: '超商貓', rarity: 'common', emoji: '🏪', description: '「歡迎光臨！請問今天有點數要折抵嗎？」' },
    { id: uuidv4(), name: '巧手修補', job_title: '裁縫貓', rarity: 'common', emoji: '🧵', description: '破掉的衣服和財務漏洞，都能完美縫補。' },
    { id: uuidv4(), name: '動物之友', job_title: '獸醫貓', rarity: 'common', emoji: '🐶', description: '把賺來的錢都拿去買罐頭餵流浪狗了。' },
    { id: uuidv4(), name: '微笑快遞', job_title: '物流貓', rarity: 'common', emoji: '📦', description: '你網購的快樂，由牠來為你準時送達。' },
    { id: uuidv4(), name: '清潔大師', job_title: '洗車貓', rarity: 'common', emoji: '🧽', description: '用勞力換取收入，每一塊錢都閃閃發亮。' },
    // 擴充 Rare (15隻)
    { id: uuidv4(), name: '極致豚骨', job_title: '拉麵師傅貓', rarity: 'rare', emoji: '🍜', description: '對湯頭有著極致堅持，拉麵店月營收破百萬。' },
    { id: uuidv4(), name: '無人機視角', job_title: '飛手貓', rarity: 'rare', emoji: '🚁', description: '擁有專業證照，靠著空拍美景賺取高額外快。' },
    { id: uuidv4(), name: '爆肝打字機', job_title: '工程師貓', rarity: 'rare', emoji: '💻', description: '只要有鍵盤和咖啡，就能創造出無數的程式碼。' },
    { id: uuidv4(), name: '靈感泉源', job_title: '貼圖畫家貓', rarity: 'rare', emoji: '🎨', description: '畫了一組 40 張的爆紅貼圖，正在享受被動收入。' },
    { id: uuidv4(), name: '正義鐵槌', job_title: '法官貓', rarity: 'rare', emoji: '⚖️', description: '公正裁決你的每一筆衝動購物是否合理。' },
    { id: uuidv4(), name: '雲端漫步', job_title: '機長貓', rarity: 'rare', emoji: '✈️', description: '帶領你的資產，安全飛往更高的目標。' },
    { id: uuidv4(), name: '深海尋寶', job_title: '潛水貓', rarity: 'rare', emoji: '🤿', description: '能在深不可測的市場中，精準找到隱藏的寶藏。' },
    { id: uuidv4(), name: '星空觀測', job_title: '天文貓', rarity: 'rare', emoji: '🔭', description: '看著遙遠的星系，思考著長遠的投資計畫。' },
    { id: uuidv4(), name: '精準藍圖', job_title: '建築貓', rarity: 'rare', emoji: '🏗️', description: '一步一腳印，幫你構築穩固的財務金字塔。' },
    { id: uuidv4(), name: '華麗演出', job_title: '魔術貓', rarity: 'rare', emoji: '🎩', description: '能把小錢變大錢，但也要小心障眼法。' },
    { id: uuidv4(), name: '完美節奏', job_title: '指揮家貓', rarity: 'rare', emoji: '🎼', description: '將各項收支調配得像交響樂一樣和諧。' },
    { id: uuidv4(), name: '極速過彎', job_title: '賽車貓', rarity: 'rare', emoji: '🏎️', description: '追求高風險高報酬，資產累積速度極快。' },
    { id: uuidv4(), name: '雪地救援', job_title: '滑雪貓', rarity: 'rare', emoji: '⛷️', description: '當你的財務遇到雪崩時，牠會第一時間出現。' },
    { id: uuidv4(), name: '荒野求生', job_title: '露營貓', rarity: 'rare', emoji: '⛺', description: '只要有帳篷和睡袋，不花錢也能享受生活。' },
    { id: uuidv4(), name: '美味特調', job_title: '調酒貓', rarity: 'rare', emoji: '🍸', description: '將不同的投資組合，調配出最完美的獲利滋味。' },
    // 擴充 Epic (10隻)
    { id: uuidv4(), name: '追星狂粉', job_title: '鐵粉貓', rarity: 'epic', emoji: '✨', description: '為了飛出國看演唱會，展現了超乎常人的存錢毅力。' },
    { id: uuidv4(), name: '暗夜潛行', job_title: '黑客貓', rarity: 'epic', emoji: '🕶️', description: '精通各種加密技術，保護你的數位資產絕對安全。' },
    { id: uuidv4(), name: '流量密碼', job_title: '百萬網紅貓', rarity: 'epic', emoji: '📱', description: '隨便發一則動態都能變現，業配接到手軟。' },
    { id: uuidv4(), name: '預見未來', job_title: '占卜貓', rarity: 'epic', emoji: '🔮', description: '據說能透過水晶球，看見下個月的帳單總額。' },
    { id: uuidv4(), name: '古墓奇兵', job_title: '考古貓', rarity: 'epic', emoji: '🦴', description: '總能在舊衣服的口袋裡，挖出忘記很久的鈔票。' },
    { id: uuidv4(), name: '百步穿楊', job_title: '弓箭手貓', rarity: 'epic', emoji: '🏹', description: '目標明確，每一次出手都能精準命中紅心。' },
    { id: uuidv4(), name: '無影迷蹤', job_title: '忍者貓', rarity: 'epic', emoji: '🥷', description: '能把你的私房錢藏到連你自己都找不到的地方。' },
    { id: uuidv4(), name: '銀河探險', job_title: '太空貓', rarity: 'epic', emoji: '🚀', description: '目標是存到足夠的錢，買下一張前往火星的單程票。' },
    { id: uuidv4(), name: '神秘靈媒', job_title: '通靈貓', rarity: 'epic', emoji: '👻', description: '能幫你跟那些「不知不覺就消失的錢」溝通。' },
    { id: uuidv4(), name: '百戰百勝', job_title: '電競貓', rarity: 'epic', emoji: '🎮', description: '靠著神級的操作技術，贏得無數賽事獎金。' },
    // 擴充 Legendary (5隻)
    { id: uuidv4(), name: '君臨天下', job_title: '國王貓', rarity: 'legendary', emoji: '👑', description: '擁有整座金庫的鑰匙，是財富自由的最高象徵。' },
    { id: uuidv4(), name: '點石成金', job_title: '魔法師貓', rarity: 'legendary', emoji: '🪄', description: '只要揮舞魔杖，就能讓乾癟的錢包瞬間膨脹。' },
    { id: uuidv4(), name: '天降好運', job_title: '財神貓', rarity: 'legendary', emoji: '🧧', description: '只要抽到牠，這個月絕對不會有任何意外支出。' },
    { id: uuidv4(), name: '御風而行', job_title: '龍騎士貓', rarity: 'legendary', emoji: '🐉', description: '駕馭著神話巨獸，以無可匹敵的氣勢輾壓所有帳單。' },
    { id: uuidv4(), name: '世界首富', job_title: '鑽石貓', rarity: 'legendary', emoji: '💎', description: '全身上下散發著金錢的味道，傳說中的頂點。' }
  ];
  const insertCat = db.prepare('INSERT INTO cat_species (id, name, job_title, rarity, emoji, description) VALUES (?,?,?,?,?,?)');
  cats.forEach(c => insertCat.run(c.id, c.name, c.job_title, c.rarity, c.emoji, c.description));
}

// --- 3. 初始化分類 ---
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

// --- 4. 使用者與每日獎勵邏輯 ---
function getOrCreateUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const today = new Date().toISOString().slice(0, 10);

  if (!user) {
    user = { id: userId, username: '新同學貓', coins: 100, gacha_tickets: 3, last_login: today };
    db.prepare('INSERT INTO users (id, username, coins, gacha_tickets, last_login) VALUES (?,?,?,?,?)')
      .run(user.id, user.username, user.coins, user.gacha_tickets, user.last_login);
    return user;
  }

  if (user.last_login !== today) {
    db.prepare('UPDATE users SET gacha_tickets = gacha_tickets + 1, last_login = ? WHERE id = ?')
      .run(today, userId);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    user.daily_reward = true;
  }
  return user;
}

// --- 5. API ROUTES ---
app.get('/api/user', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ error: 'No User ID' });
  res.json(getOrCreateUser(userId));
});

app.post('/api/transactions', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { category_id, amount, note } = req.body;
  const txId = uuidv4();
  db.prepare('INSERT INTO transactions (id, user_id, category_id, amount, note) VALUES (?,?,?,?,?)')
    .run(txId, userId, category_id, amount, note || '');
  db.prepare('UPDATE users SET coins = coins + 10 WHERE id = ?').run(userId);
  res.json({ success: true, user: db.prepare('SELECT * FROM users WHERE id = ?').get(userId) });
});

app.get('/api/summary', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  const income = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE c.type='income' AND t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ?`).get(userId, m);
  const expense = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE c.type='expense' AND t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ?`).get(userId, m);
  const byCategory = db.prepare(`SELECT c.name, c.icon, c.type, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ? GROUP BY c.id ORDER BY total DESC`).all(userId, m);
  res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, byCategory });
});

app.get('/api/transactions', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { month } = req.query;
  const txs = db.prepare(`SELECT t.*, c.name as cat_name, c.icon as cat_icon, c.type as cat_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ? ORDER BY t.transacted_at DESC`).all(userId, month);
  res.json(txs);
});

app.get('/api/cats/species', (req, res) => {
  res.json(db.prepare('SELECT * FROM cat_species ORDER BY rarity DESC, name').all());
});

app.get('/api/cats/collection', (req, res) => {
  const userId = req.headers['x-user-id'];
  const collected = db.prepare(`SELECT uc.*, cs.name, cs.job_title, cs.rarity, cs.emoji, cs.description FROM user_cats uc JOIN cat_species cs ON uc.cat_species_id = cs.id WHERE uc.user_id = ?`).all(userId);
  res.json(collected);
});

app.post('/api/gacha/pull', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { use_coins } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (use_coins) {
    if (user.coins < 50) return res.status(400).json({ error: '幣不足 50' });
    db.prepare('UPDATE users SET coins = coins - 50 WHERE id = ?').run(userId);
  } else {
    if (user.gacha_tickets < 1) return res.status(400).json({ error: '券不足' });
    db.prepare('UPDATE users SET gacha_tickets = gacha_tickets - 1 WHERE id = ?').run(userId);
  }

  const rand = Math.random();
  let rarity = rand < 0.005 ? 'legendary' : rand < 0.05 ? 'epic' : rand < 0.25 ? 'rare' : 'common';
  const pool = db.prepare('SELECT * FROM cat_species WHERE rarity = ?').all(rarity);
  const picked = pool[Math.floor(Math.random() * pool.length)];

  const existing = db.prepare('SELECT * FROM user_cats WHERE user_id = ? AND cat_species_id = ?').get(userId, picked.id);
  if (existing) {
    db.prepare('UPDATE user_cats SET star_level = MIN(star_level + 1, 5) WHERE id = ?').run(existing.id);
    db.prepare('UPDATE users SET coins = coins + 20 WHERE id = ?').run(userId);
  } else {
    db.prepare('INSERT INTO user_cats (id, user_id, cat_species_id) VALUES (?,?,?)').run(uuidv4(), userId, picked.id);
  }
  res.json({ cat: picked, is_duplicate: !!existing, user: db.prepare('SELECT * FROM users WHERE id = ?').get(userId) });
});

app.get('/api/categories', (req, res) => res.json(db.prepare('SELECT * FROM categories').all()));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => console.log(`🐱 CoinNeko Live at port ${PORT}`));