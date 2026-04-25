const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VK_TOKEN = process.env.VK_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

// ── БАЗА ЗНАНИЙ ────────────────────────────────────────────────────────────────
const LEARNING_FILE = path.join(__dirname, 'learning.json');

function loadLearning() {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
    }
  } catch {}
  return { posts: [], hashtags: {}, products: {}, patterns: [] };
}

function saveLearning(data) {
  try { fs.writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2)); } catch {}
}

function getTopPatterns(brand, country, limit = 5) {
  const db = loadLearning();
  return db.posts
    .filter(p => p.brand === brand && p.country === country && p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getTopHashtags(brand, country) {
  const db = loadLearning();
  const key = `${brand}_${country}`;
  const tags = db.hashtags[key] || {};
  return Object.entries(tags)
    .sort((a, b) => b[1].reach - a[1].reach)
    .slice(0, 10)
    .map(([tag, data]) => `${tag} (охват ~${data.reach})`)
    .join(', ');
}

function savePost(postData) {
  const db = loadLearning();
  db.posts.push({
    id: Date.now(),
    ...postData,
    score: 0,
    vk_stats: null,
    created_at: new Date().toISOString(),
  });
  if (db.posts.length > 500) db.posts = db.posts.slice(-500);
  saveLearning(db);
  return db.posts[db.posts.length - 1];
}

function updatePostScore(postId, score) {
  const db = loadLearning();
  const post = db.posts.find(p => p.id === postId);
  if (post) { post.manual_score = score; post.score = (post.vk_score || 0) + score * 10; }
  saveLearning(db);
}

function updateVKStats(postId, vkPostId, stats) {
  const db = loadLearning();
  const post = db.posts.find(p => p.id === postId);
  if (post) {
    post.vk_post_id = vkPostId;
    post.vk_stats = stats;
    const vkScore = (stats.likes || 0) * 3 + (stats.reposts || 0) * 5 + Math.floor((stats.reach || 0) / 100);
    post.vk_score = vkScore;
    post.score = vkScore + (post.manual_score || 0) * 10;

    // Обновляем статистику хэштегов
    const key = `${post.brand}_${post.country}`;
    if (!db.hashtags[key]) db.hashtags[key] = {};
    const hashtags = (post.vk_hashtags || '').split(/\s+/).filter(h => h.startsWith('#'));
    hashtags.forEach(tag => {
      if (!db.hashtags[key][tag]) db.hashtags[key][tag] = { reach: 0, uses: 0 };
      db.hashtags[key][tag].reach = Math.max(db.hashtags[key][tag].reach, stats.reach || 0);
      db.hashtags[key][tag].uses++;
    });

    // Обновляем статистику продуктов
    if (!db.products[post.topic]) db.products[post.topic] = { total_reach: 0, posts: 0 };
    db.products[post.topic].total_reach += stats.reach || 0;
    db.products[post.topic].posts++;
  }
  saveLearning(db);
}

// ── ПРОДУКТЫ ───────────────────────────────────────────────────────────────────
const PRODUCTS = {
  powerpro: {
    name: 'PowerPro',
    tone: 'мощный, мотивирующий, профессиональный',
    colors: 'orange and black',
    byCountry: {
      ru: {
        market: 'Россия',
        catalog: {
          proteins: [
            'Сывороточный протеин ВЭЙ PROTEIN 1кг — Ваниль, Шоколад (2290₽)',
            'Протеиновый коктейль ВЕЙ ШЕЙК 900г — Ванильное мороженое, Клубника, Молочный шоколад, Молочная вишня, Банан (1545₽)',
            'Комплексный протеин МИКС 900г — 5 источников белка + урсоловая кислота — Лайм-мята, Шоколад-корица, Медовое печенье (2250₽)',
            'Протеин ФЕМИН для женщин + Slim Body Formula — 300г: Клубника, Смородина / 1000г: Смородина, Шоколад (2350₽)',
          ],
          bars: [
            'Зеро 40% неглазированные без сахара',
            '36% с орехами и кранчами без сахара',
            '36% мультибелковые без сахара',
            '25% с орехами и кранчами без сахара',
            '20% с арахисом в шоколаде без сахара',
            'Гематобар 35% неглазированные',
            'Коконат бар на основе кокоса без сахара',
            'Веган 20% с орехами и кранчами без сахара',
            'Натс Бар многослойные с орехами без сахара',
            'Прометеус с орехами в карамели без сахара',
            'Коко Джой с кокосом и карамелью без сахара',
            'Твинс бар двойной с мягкой карамелью без сахара',
          ],
          other: ['Аминокислоты БЦАА МЕГА СТРОНГ', 'Креатины', 'Гейнеры', 'Десерты', 'Смеси для выпечки'],
        },
      },
      ua: {
        market: 'Украина',
        catalog: {
          proteins: [
            'Протеин Whey 1кг — Клубника со сливками, Flat White, Банан, Ваниль, Варёная сгущёнка, Сгущёнка, Лесная ягода (1425 грн)',
            'Протеин Femine 1кг — Медовая дыня, Сочный апельсин (1460 грн)',
            'Протеин Mix 1кг — Шоколад-кокос (1365 грн)',
          ],
          gainers: ['Гейнер 1кг — Шоколад (660 грн)'],
          bars: [
            'Протеиновый батончик 36% белка 60г — Мокачино (57 грн)',
            'Paste Bar 30% без сахара 45г — Арахисовая паста, Кунжутная паста, Миндальная паста, Подсолнечная паста, Паста грецкого ореха (52 грн)',
            'Vegan Bar 32% без сахара с орехами, сухофруктами и злаками 60г (66 грн)',
          ],
          other: ['Фитнес-джем Zero с карнитином 200г — Апельсин, Персик, Вишня, Яблоко (82 грн)'],
        },
      },
      th: {
        market: 'Thailand',
        catalog: {
          proteins: ['Whey Protein — Vanilla, Chocolate, Strawberry', 'Mix Protein — 5 protein sources'],
          bars: ['Protein Bar 36% — Mocha', 'Paste Bar 30% sugar-free — Peanut, Almond, Sesame', 'Vegan Bar 32% sugar-free'],
        },
      },
    },
  },
  fitwins: {
    name: 'FitWins',
    tone: 'дружелюбный, мотивирующий, доступный',
    colors: 'green and white',
    byCountry: {
      ru: { market: 'Россия', catalog: { bars: ['FitWins Crunch Bar 25% без сахара'] } },
      ua: { market: 'Украина', catalog: { bars: ['FitWins Crunch Bar 25% MIX — разные вкусы, 50г без сахара'] } },
      th: { market: 'Thailand', catalog: { bars: ['FitWins Crunch Bar 25% sugar-free'] } },
    },
  },
};

function getProductInfo(brand, country) {
  const b = PRODUCTS[brand] || PRODUCTS.powerpro;
  const countryData = b.byCountry[country] || b.byCountry.ru;
  const cat = countryData.catalog;
  const lines = [];
  if (cat.proteins) lines.push('ПРОТЕИНЫ:\n' + cat.proteins.join('\n'));
  if (cat.gainers) lines.push('ГЕЙНЕРЫ:\n' + cat.gainers.join('\n'));
  if (cat.bars) lines.push('БАТОНЧИКИ:\n' + cat.bars.join('\n'));
  if (cat.other) lines.push('ДРУГОЕ:\n' + cat.other.join('\n'));
  return { brandName: b.name, tone: b.tone, colors: b.colors, market: countryData.market, catalogText: lines.join('\n\n') };
}

// ── GENERATE TEXT ──────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { topic, contentType, brand, country, lang } = req.body;
  const langMap = { ru: 'русском', uk: 'украинском', th: 'английском' };
  const info = getProductInfo(brand, country);

  // Загружаем топ паттерны из обучения
  const topPatterns = getTopPatterns(brand, country);
  const topHashtags = getTopHashtags(brand, country);
  const learningContext = topPatterns.length > 0 ? `
УСПЕШНЫЕ ПОСТЫ (учись у них — они получили больше всего лайков и охвата):
${topPatterns.map((p, i) => `
[Пост #${i+1} | Оценка: ${p.score} | Охват: ${p.vk_stats?.reach || 'н/д'} | Лайки: ${p.vk_stats?.likes || 'н/д'}]
Тема: ${p.topic}
Тип: ${p.contentType}
Пост ВК: ${(p.vk_post || '').slice(0, 300)}...
`).join('\n')}

ХЭШТЕГИ КОТОРЫЕ ДАВАЛИ МАКСИМАЛЬНЫЙ ОХВАТ:
${topHashtags || 'Данных пока нет — накапливается'}
` : 'История генераций пока пуста — работай как обычно.';

  const prompt = `Ты — эксперт по контент-маркетингу спортивного питания. Сейчас апрель 2026 года.

БРЕНД: ${info.brandName}
РЫНОК: ${info.market}
ТОНАЛЬНОСТЬ: ${info.tone}
ТЕМА: ${topic}
ТИП КОНТЕНТА: ${contentType}
ЯЗЫК: ${langMap[lang] || 'русском'}

РЕАЛЬНЫЙ КАТАЛОГ ${info.brandName}:
${info.catalogText}

${learningContext}

ПРАВИЛА:
- Год 2026, никогда не пиши 2024 или 2025
- Упоминай конкретные продукты из каталога с ценами
- Текст связный, живой, не разбитый на слова
- Учись у успешных постов выше — копируй их стиль и структуру
- Используй хэштеги с высоким охватом

Создай:
1. ВКОНТАКТЕ ПОСТ: 150-300 слов с эмодзи
2. ХЭШТЕГИ ВК: 12 хэштегов через пробел
3. INSTAGRAM CAPTION: 80-150 слов
4. REELS СЦЕНАРИЙ: 4 сцены
5. INSTAGRAM ХЭШТЕГИ: 22 хэштега
6. TIKTOK: 50-80 слов, дерзко

Строго JSON без markdown:
{"vk_post":"...","vk_hashtags":"...","ig_caption":"...","ig_reels":"...","ig_hashtags":"...","tiktok":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const text = data.content[0].text;
    let parsed;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch {
      parsed = { vk_post: text, vk_hashtags: '', ig_caption: '', ig_reels: '', ig_hashtags: '', tiktok: '' };
    }

    // Сохраняем в базу обучения
    const saved = savePost({ topic, contentType, brand, country, ...parsed });
    parsed.learning_id = saved.id;

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RATE POST (ручная оценка) ──────────────────────────────────────────────────
app.post('/api/rate', async (req, res) => {
  const { postId, score } = req.body;
  updatePostScore(postId, score);
  res.json({ success: true });
});

// ── FETCH VK STATS ─────────────────────────────────────────────────────────────
app.post('/api/vk-stats', async (req, res) => {
  const { postId, vkPostId } = req.body;
  try {
    const statsRes = await fetch(
      `https://api.vk.com/method/wall.getById?posts=-${VK_GROUP_ID}_${vkPostId}&access_token=${VK_TOKEN}&v=5.131`
    );
    const statsData = await statsRes.json();
    const post = statsData.response?.[0];
    if (post) {
      const stats = {
        likes: post.likes?.count || 0,
        reposts: post.reposts?.count || 0,
        views: post.views?.count || 0,
        comments: post.comments?.count || 0,
        reach: post.views?.count || 0,
      };
      updateVKStats(postId, vkPostId, stats);
      res.json({ success: true, stats });
    } else {
      res.json({ success: false, error: 'Post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LEARNING STATS ─────────────────────────────────────────────────────────────
app.get('/api/learning-stats', (req, res) => {
  const db = loadLearning();
  const { brand, country } = req.query;

  const posts = db.posts.filter(p =>
    (!brand || p.brand === brand) && (!country || p.country === country)
  );

  const topPosts = [...posts].sort((a, b) => b.score - a.score).slice(0, 5);
  const topProducts = Object.entries(db.products)
    .sort((a, b) => b[1].total_reach - a[1].total_reach)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  const key = `${brand}_${country}`;
  const topHashtags = Object.entries(db.hashtags[key] || {})
    .sort((a, b) => b[1].reach - a[1].reach)
    .slice(0, 10)
    .map(([tag, data]) => ({ tag, ...data }));

  res.json({
    total_posts: posts.length,
    total_reach: posts.reduce((s, p) => s + (p.vk_stats?.reach || 0), 0),
    avg_likes: posts.length ? Math.round(posts.reduce((s, p) => s + (p.vk_stats?.likes || 0), 0) / posts.length) : 0,
    top_posts: topPosts,
    top_products: topProducts,
    top_hashtags: topHashtags,
  });
});

// ── ANALYZE TRENDS ─────────────────────────────────────────────────────────────
app.post('/api/trends', async (req, res) => {
  const { country, brand } = req.body;
  const info = getProductInfo(brand, country);

  const systemPrompt = `Ты — senior аналитик рынка спортивного питания с 10-летним опытом. Апрель 2026 года.
Проводишь глубокий анализ с реальными данными из интернета. Даёшь конкретные actionable инсайты.
Отвечаешь строго JSON без markdown.`;

  const userPrompt = `Проведи ГЛУБОКИЙ анализ рынка спортпита в ${info.market} для бренда ${info.brandName}.

НАШ КАТАЛОГ:
${info.catalogText}

Используй веб-поиск по каждому блоку:
🔍 тренды спортпита ${info.market} 2026
🔍 топ протеины батончики ${info.market} популярные 2026
🔍 конкуренты спортивное питание ${info.market} цены
🔍 фитнес контент соцсети ${info.market} что заходит 2026
🔍 лучшее время постинга фитнес ${info.market}
🔍 хэштеги протеин батончики ${info.market}

Верни JSON:
{
  "market_overview": { "size": "...", "growth": "...", "key_insight": "..." },
  "top_products": [{ "product": "...", "trend_reason": "...", "our_angle": "...", "action": "...", "score": 95 }],
  "competitors": [{ "name": "...", "strengths": "...", "weakness": "...", "price_compare": "...", "our_advantage": "..." }],
  "content_themes": [{ "theme": "...", "why_works": "...", "format": "...", "hook": "...", "example_topic": "..." }],
  "content_plan": [{ "day": "...", "theme": "...", "product": "...", "format": "...", "hook": "..." }],
  "posting_schedule": { "best_days": ["..."], "best_times": ["..."], "frequency": "...", "platform_priority": "..." },
  "hashtags": { "protein": ["..."], "bars": ["..."], "fitness": ["..."], "brand": ["..."] },
  "summary": "...",
  "opportunity": "...",
  "red_flags": "..."
}

Ровно: 5 top_products, 4 competitors, 6 content_themes, 7 дней content_plan.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const allText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    let parsed;
    try {
      const m = allText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : allText);
    } catch {
      parsed = { top_products: [], competitors: [], content_themes: [], content_plan: [], posting_schedule: {}, hashtags: {}, summary: allText, opportunity: '', red_flags: '' };
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATE IMAGE ─────────────────────────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const { topic, style, brand, country } = req.body;
  const info = getProductInfo(brand, country || 'ru');
  const prompt = `Professional sports nutrition advertisement, ${topic}, ${style || 'modern gym aesthetic'}, ${info.colors} color scheme, product photography, dramatic lighting, 4k`;
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'jpeg');
    formData.append('width', '1024');
    formData.append('height', '1024');
    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, Accept: 'image/*', ...formData.getHeaders() },
      body: formData,
    });
    if (!response.ok) throw new Error(`Stability AI: ${await response.text()}`);
    const buffer = await response.buffer();
    res.json({ image: `data:image/jpeg;base64,${buffer.toString('base64')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLISH TO VK ──────────────────────────────────────────────────────────────
app.post('/api/publish-vk', async (req, res) => {
  const { text, imageBase64, learningId } = req.body;
  try {
    let attachments = '';
    if (imageBase64) {
      const uploadServerRes = await fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.131`);
      const { response: { upload_url } } = await uploadServerRes.json();
      const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const form = new FormData();
      form.append('photo', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
      const uploadData = await (await fetch(upload_url, { method: 'POST', body: form })).json();
      const saveRes = await fetch(`https://api.vk.com/method/photos.saveWallPhoto?group_id=${VK_GROUP_ID}&photo=${uploadData.photo}&server=${uploadData.server}&hash=${uploadData.hash}&access_token=${VK_TOKEN}&v=5.131`);
      const { response: [photo] } = await saveRes.json();
      attachments = `photo${photo.owner_id}_${photo.id}`;
    }
    const postUrl = new URL('https://api.vk.com/method/wall.post');
    postUrl.searchParams.set('owner_id', `-${VK_GROUP_ID}`);
    postUrl.searchParams.set('message', text);
    postUrl.searchParams.set('attachments', attachments);
    postUrl.searchParams.set('access_token', VK_TOKEN);
    postUrl.searchParams.set('v', '5.131');
    const postData = await (await fetch(postUrl.toString(), { method: 'POST' })).json();
    if (postData.error) throw new Error(postData.error.error_msg);

    // Сохраняем VK post ID для последующей загрузки статистики
    if (learningId) {
      const db = loadLearning();
      const post = db.posts.find(p => p.id === learningId);
      if (post) { post.vk_post_id = postData.response.post_id; saveLearning(db); }
    }

    res.json({ success: true, post_id: postData.response.post_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PowerPro Agent on port ${PORT}`));
