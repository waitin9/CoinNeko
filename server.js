const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3001;

app.use(cors({ credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
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
    // === 初始 12 隻 ===
    { id: uuidv4(), name: '小廚師', job_title: '廚師貓', rarity: 'common', emoji: '👨‍🍳', description: '看到菜價上漲會眉頭一皺，對食材CP值有莫名的偏執。' },
    { id: uuidv4(), name: '米津律師', job_title: '律師貓', rarity: 'rare', emoji: '⚖️', description: '結帳時心算絕對比收銀機還快，連一塊錢都不放過。' },
    { id: uuidv4(), name: '科技貓', job_title: '程式貓', rarity: 'rare', emoji: '💻', description: '靠著肝指數換薪水，最大的願望是程式一次跑過不要報錯。' },
    { id: uuidv4(), name: '白袍喵', job_title: '護士貓', rarity: 'common', emoji: '🏥', description: '職業病是看到帳本赤字就像看到血壓飆高一樣緊張。' },
    { id: uuidv4(), name: '書生貓', job_title: '老師貓', rarity: 'common', emoji: '📚', description: '堅信「書中自有黃金屋」，但買書的錢永遠比賺的還多。' },
    { id: uuidv4(), name: '柯南貓', job_title: '偵探貓', rarity: 'epic', emoji: '🔍', description: '你以為不見的五十塊，其實都難逃牠的法眼。' },
    { id: uuidv4(), name: '太空喵', job_title: '太空人貓', rarity: 'epic', emoji: '🚀', description: '腦波極弱，只要看到特價，錢包經常呈現無重力狀態。' },
    { id: uuidv4(), name: '藝術喵', job_title: '畫家貓', rarity: 'rare', emoji: '🎨', description: '買顏料花錢如流水，只能把月底吃土的日常畫成悲傷油畫。' },
    { id: uuidv4(), name: '鐵路貓', job_title: '司機貓', rarity: 'common', emoji: '🚂', description: '每天精算1200通勤月票到底要搭幾次才回本的精明貓貓。' },
    { id: uuidv4(), name: '魔法貓', job_title: '魔法師貓', rarity: 'legendary', emoji: '🪄', description: '會用神秘咒語讓戶頭數字變多（其實只是定存利息發了）。' },
    { id: uuidv4(), name: '船長喵', job_title: '船長貓', rarity: 'epic', emoji: '⚓', description: '股市裡的超級航海王，看到綠油油的跌停板也面不改色。' },
    { id: uuidv4(), name: '冰冰的貓', job_title: '雪花貓', rarity: 'legendary', emoji: '❄️', description: '夏天的時候很有幫助，但冬天的時候抱牠會冷。' },

    // === 普通級 (Common) - 守護日常生活的貓咪 ===
    { id: uuidv4(), name: '拉花大師', job_title: '咖啡師貓', rarity: 'common', emoji: '☕', description: '寧願午餐少吃一點，也絕對要喝一杯星巴克續命。' },
    { id: uuidv4(), name: '麵包超人', job_title: '烘焙貓', rarity: 'common', emoji: '🥐', description: '看到剛出爐的麵包就腦波弱，恩格爾係數嚴重超標。' },
    { id: uuidv4(), name: '菜市場阿姨', job_title: '攤販貓', rarity: 'common', emoji: '🥬', description: '「老闆算便宜一點啦！」這句話已經刻在牠的DNA裡。' },
    { id: uuidv4(), name: '街頭藝人', job_title: '駐唱貓', rarity: 'common', emoji: '🎸', description: '街頭賣藝賺來的打賞，剛好夠買晚上的超商打折便當。' },
    { id: uuidv4(), name: '使命必達', job_title: '外送貓', rarity: 'common', emoji: '🛵', description: '只要有跑單加給，半夜三點送飲料上陽明山也使命必達。' },
    { id: uuidv4(), name: '壯壯壯貓', job_title: '教練貓', rarity: 'common', emoji: '🏋️‍♂️', description: '覺得與其花錢看醫生，不如把錢全拿去買高蛋白粉。' },
    { id: uuidv4(), name: '超柔軟貓', job_title: '瑜珈貓', rarity: 'common', emoji: '🧘', description: '只要靜下心來打坐，就感覺不到月底肚子餓了呢。' },
    { id: uuidv4(), name: '熬夜追劇', job_title: '沙發貓', rarity: 'common', emoji: '🍿', description: '為了看獨家韓劇，默默綁定了五個串流平台當盤子。' },
    { id: uuidv4(), name: '超大鏡頭', job_title: '攝影貓', rarity: 'common', emoji: '📷', description: '攝影窮三代，為了買新鏡頭已經吃了兩個月的泡麵。' },
    { id: uuidv4(), name: '種花貓貓', job_title: '園丁貓', rarity: 'common', emoji: '🌻', description: '買觀葉植物花了一大筆錢，結果最後還是養死。' },
    { id: uuidv4(), name: '白衣天使', job_title: '護理貓', rarity: 'common', emoji: '💉', description: '日夜顛倒排班換來的血汗錢，常常不小心就報復性消費。' },
    { id: uuidv4(), name: '熱血教師', job_title: '教育貓', rarity: 'common', emoji: '🏫', description: '苦口婆心勸學生存錢，自己卻愛瘋狂抽各種盲盒玩具。' },
    { id: uuidv4(), name: '交通樞紐', job_title: '公車貓', rarity: 'common', emoji: '🚌', description: '為了省十塊錢的捷運轉乘費，寧願多走十五分鐘的路。' },
    { id: uuidv4(), name: '家事達人', job_title: '管家貓', rarity: 'common', emoji: '🧹', description: '看到大賣場特價的衛生紙，不囤個五箱就會渾身不對勁。' },
    { id: uuidv4(), name: '很會管理書', job_title: '圖書管理員貓', rarity: 'common', emoji: '📖', description: '善用圖書館資源的終極白嫖客，堅持絕對不買實體書。' },
    { id: uuidv4(), name: '很會收銀', job_title: '超商貓', rarity: 'common', emoji: '🏪', description: '每天看盡奧客的臉色，最大的願望是準時下班吃宵夜。' },
    { id: uuidv4(), name: '修修補補', job_title: '裁縫貓', rarity: 'common', emoji: '🧵', description: '東西壞了第一反應是「還能修」，絕對不輕易被勸敗換新。' },
    { id: uuidv4(), name: '拯救動物', job_title: '獸醫貓', rarity: 'common', emoji: '🐶', description: '自己吃得很隨便，但動物的罐頭絕對要買最頂的。' },
    { id: uuidv4(), name: '貓貓先生有快遞', job_title: '物流貓', rarity: 'common', emoji: '📦', description: '看著大家瘋狂網購，常常懷疑大家是不是背著牠偷偷發財。' },
    { id: uuidv4(), name: '洗車大師', job_title: '洗車貓', rarity: 'common', emoji: '🧽', description: '賺的都是勞力辛苦錢，每一分錢絕對都花在刀口上。' },

    // === 稀有級 (Rare) - 具備專業技能的貓咪 ===
    { id: uuidv4(), name: '豚骨拉麵', job_title: '拉麵師傅貓', rarity: 'rare', emoji: '🍜', description: '吃拉麵一定要選麵硬味濃，為了排人氣名店可以站兩個小時。' },
    { id: uuidv4(), name: '無人機貓', job_title: '飛手貓', rarity: 'rare', emoji: '🚁', description: '正在苦讀準備考證照，等當完兵就要靠這個接案發大財。' },
    { id: uuidv4(), name: '爆肝打字機', job_title: '工程師貓', rarity: 'rare', emoji: '💻', description: '靠著吞Ｂ群和咖啡撐過無數個死線，最恨聽到「需求變更」。' },
    { id: uuidv4(), name: '靈感泉源', job_title: '貼圖畫家貓', rarity: 'rare', emoji: '🎨', description: '曾經熬夜爆肝畫了一套 40 張的貓咪貼圖，結果現在只剩自己買來用。' },
    { id: uuidv4(), name: '正義鐵槌', job_title: '法官貓', rarity: 'rare', emoji: '⚖️', description: '「你真的需要這個酷東西嗎？」每次你想亂花錢時牠都會在耳邊低語。' },
    { id: uuidv4(), name: '超級會飛', job_title: '機長貓', rarity: 'rare', emoji: '✈️', description: '出國玩絕對要搶到超便宜的紅眼廉航機票，算盤打得超精。' },
    { id: uuidv4(), name: '深海尋寶', job_title: '潛水貓', rarity: 'rare', emoji: '🤿', description: '總能在特賣會花車的最深處，精準挖到便宜又好看的衣服。' },
    { id: uuidv4(), name: '星空觀測', job_title: '天文貓', rarity: 'rare', emoji: '🔭', description: '經常因為看星星看到忘我，不小心錯過末班車只好花大錢搭計程車。' },
    { id: uuidv4(), name: '建築師阿貓', job_title: '建築貓', rarity: 'rare', emoji: '🏗️', description: '重度強迫症，記帳的每一筆數字連尾數都必須對齊得整整齊齊。' },
    { id: uuidv4(), name: '變變變變', job_title: '魔術貓', rarity: 'rare', emoji: '🎩', description: '聲稱能把錢變不見，結果只是藏在洗衣機裡的外套口袋裡。' },
    { id: uuidv4(), name: '只會指揮', job_title: '指揮家貓', rarity: 'rare', emoji: '🎼', description: '信用卡的回饋節奏與趴數抓得極度精準，傳說中的「卡神」。' },
    { id: uuidv4(), name: '很會甩尾', job_title: '賽車貓', rarity: 'rare', emoji: '🏎️', description: '買股票喜歡當沖，心臟很大顆，但偶爾也是會翻車跌進水溝。' },
    { id: uuidv4(), name: '雪中送雪', job_title: '滑雪貓', rarity: 'rare', emoji: '⛷️', description: '當你月底戶頭剩下兩位數時，牠會默默借你五百塊的大好人。' },
    { id: uuidv4(), name: '荒野求生', job_title: '露營貓', rarity: 'rare', emoji: '⛺', description: '崇尚極簡生活，最高紀錄是一個禮拜靠白吐司只花了一千塊。' },
    { id: uuidv4(), name: '美味特調', job_title: '調酒貓', rarity: 'rare', emoji: '🍸', description: '下班後最喜歡去酒吧喝一杯，但結帳時看到帳單會瞬間清醒。' },

    // === 史詩級 (Epic) - 難以捉摸的高手貓咪 ===
    { id: uuidv4(), name: '追星狂粉', job_title: '鐵粉貓', rarity: 'epic', emoji: '✨', description: '很喜歡 winter ，為了買小卡和演唱會門票連泡麵都願意吃。' },
    { id: uuidv4(), name: '暗夜潛行', job_title: '黑客貓', rarity: 'epic', emoji: '🕶️', description: '資管系的隱藏高手，資料結構跟演算法作業總是能用最詭異的方式解開。' },
    { id: uuidv4(), name: '流量密碼', job_title: '百萬網紅貓', rarity: 'epic', emoji: '📱', description: '隨便發個廢文都有幾千個讚，靠業配賺得比你想像的還要多很多。' },
    { id: uuidv4(), name: '預見未來', job_title: '占卜貓', rarity: 'epic', emoji: '🔮', description: '其實根本不會算命，只是用手機大數據偷聽猜出你下個月會買什麼。' },
    { id: uuidv4(), name: '古墓奇兵', job_title: '考古貓', rarity: 'epic', emoji: '🦴', description: '真正的特異功能是每次換季整理衣服，都能在舊外套口袋摸出兩百塊。' },
    { id: uuidv4(), name: '百步穿楊', job_title: '弓箭手貓', rarity: 'epic', emoji: '🏹', description: '網購搶單手速極快，雙11的限量特價品絕對逃不出牠的手掌心。' },
    { id: uuidv4(), name: '忍者寧賈', job_title: '忍者貓', rarity: 'epic', emoji: '🥷', description: '喜歡把私房錢藏在極度隱密的地方，結果時間久了連自己都忘記放哪。' },
    { id: uuidv4(), name: '銀河探險', job_title: '太空貓', rarity: 'epic', emoji: '🚀', description: '買了超多虛擬貨幣夢想一飛衝天上太空，目前還在地球表面吃土。' },
    { id: uuidv4(), name: '通通很靈', job_title: '通靈貓', rarity: 'epic', emoji: '👻', description: '專門負責安撫那些因為你衝動購物，而白白慘死花掉的鈔票怨靈。' },
    { id: uuidv4(), name: '百戰百勝', job_title: '電競貓', rarity: 'epic', emoji: '🎮', description: '雖然常常打電動打到忘記吃飯，但比賽贏下來的獎金非常可觀。' },

    // === 傳說級 (Legendary) - 擁有神祕力量的夢幻貓咪 ===
    { id: uuidv4(), name: '貓咪國國王', job_title: '國王貓', rarity: 'legendary', emoji: '👑', description: '財富自由的頂點，據說出門連發票都不拿，因為懶得對獎。' },
    { id: uuidv4(), name: '蛤利波特', job_title: '魔法師貓', rarity: 'legendary', emoji: '🪄', description: '運氣好到隨便買張刮刮樂都會中獎，擁有純正的歐洲人血統。' },
    { id: uuidv4(), name: '很有錢的貓', job_title: '財神貓', rarity: 'legendary', emoji: '🧧', description: '傳說中，每個月初能把你記帳本的錯誤爛帳一筆勾銷的神秘力量。' },
    { id: uuidv4(), name: 'Too Long', job_title: '屠龍貓', rarity: 'legendary', emoji: '🐉', description: '能夠無情輾壓所有信用卡卡債，連走路都有風的傳說級大佬。' },
    { id: uuidv4(), name: '一籠馬斯克', job_title: '鑽石貓', rarity: 'legendary', emoji: '💎', description: '不要問牠的戶頭到底有多少錢，因為那數字連牠自己也數不完。' }
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

// Seed default data (cats + categories only — users are now per-visitor)

// === PER-VISITOR USER MIDDLEWARE ===
function getOrCreateUser(req, res) {
  let visitorId = req.cookies?.visitor_id;
  if (!visitorId) {
    visitorId = uuidv4();
    res.cookie('visitor_id', visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
  }
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(visitorId);
  if (!user) {
    db.prepare('INSERT INTO users (id, username, coins, gacha_tickets) VALUES (?,?,?,?)').run(visitorId, '喵喵理財師', 100, 3);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(visitorId);
  }
  return { user, visitorId, res };
}

// === ROUTES ===

// User
app.get('/api/user', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  res.json(user);
});

// Categories
app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(cats);
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  const { month } = req.query;
  let query = `SELECT t.*, c.name as cat_name, c.icon as cat_icon, c.type as cat_type
               FROM transactions t JOIN categories c ON t.category_id = c.id
               WHERE t.user_id = ?
               ORDER BY t.transacted_at DESC`;
  if (month) {
    query = `SELECT t.*, c.name as cat_name, c.icon as cat_icon, c.type as cat_type
             FROM transactions t JOIN categories c ON t.category_id = c.id
             WHERE t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ?
             ORDER BY t.transacted_at DESC`;
    return res.json(db.prepare(query).all(user.id, month));
  }
  res.json(db.prepare(query).all(user.id));
});

app.post('/api/transactions', (req, res) => {
  const { category_id, amount, note } = req.body;
  const { user } = getOrCreateUser(req, res);
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
  const { user } = getOrCreateUser(req, res);
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true });
});

// Summary stats
app.get('/api/summary', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  const income = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND c.type='income' AND strftime('%Y-%m', t.transacted_at) = ?`).get(user.id, m);
  const expense = db.prepare(`SELECT COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND c.type='expense' AND strftime('%Y-%m', t.transacted_at) = ?`).get(user.id, m);
  const byCategory = db.prepare(`SELECT c.name, c.icon, c.type, COALESCE(SUM(t.amount),0) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.transacted_at) = ? GROUP BY c.id ORDER BY total DESC`).all(user.id, m);
  res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, byCategory });
});

// Budgets
app.get('/api/budgets', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  const budgets = db.prepare(`SELECT b.*, c.name as cat_name, c.icon as cat_icon,
    COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = b.category_id AND t.user_id = b.user_id AND strftime('%Y-%m', t.transacted_at) = b.month), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.user_id = ? AND b.month = ?`).all(user.id, m);
  res.json(budgets);
});

app.post('/api/budgets', (req, res) => {
  const { category_id, month, limit_amount } = req.body;
  const { user } = getOrCreateUser(req, res);
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
  res.json(db.prepare(`
    SELECT * FROM cat_species 
    ORDER BY 
      CASE rarity 
        WHEN 'legendary' THEN 1 
        WHEN 'epic' THEN 2 
        WHEN 'rare' THEN 3 
        WHEN 'common' THEN 4 
      END, 
      name
  `).all());
});

app.get('/api/cats/collection', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  const collected = db.prepare(`SELECT uc.*, cs.name, cs.job_title, cs.rarity, cs.emoji, cs.description
    FROM user_cats uc JOIN cat_species cs ON uc.cat_species_id = cs.id
    WHERE uc.user_id = ? ORDER BY uc.acquired_at DESC`).all(user.id);
  res.json(collected);
});

// Gacha pull
app.post('/api/gacha/pull', (req, res) => {
  const { user } = getOrCreateUser(req, res);
  const { use_coins } = req.body;

  if (use_coins) {
    if (user.coins < 50) return res.status(400).json({ error: '貓咪幣不足（需要 50 枚）' });
    db.prepare('UPDATE users SET coins = coins - 50 WHERE id = ?').run(user.id);
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