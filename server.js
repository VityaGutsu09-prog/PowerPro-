const express = require(‘express’);
const cors = require(‘cors’);
const fetch = require(‘node-fetch’);
const FormData = require(‘form-data’);
const path = require(‘path’);

const app = express();
app.use(cors());
app.use(express.json({ limit: ‘10mb’ }));
app.use(express.static(path.join(__dirname, ‘public’)));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VK_TOKEN = process.env.VK_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

// ─── ПРОДУКТЫ БРЕНДОВ ─────────────────────────────────────────────────────────
const PRODUCTS = {
powerpro: {
name: ‘PowerPro’,
products: [‘Протеин’, ‘Гейнер’, ‘Протеиновые батончики’],
description: ‘Спортивное питание премиум класса для серьёзных атлетов’,
tone: ‘мощный, мотивирующий, профессиональный’,
colors: ‘оранжевый и чёрный’,
},
fitwins: {
name: ‘FitWins’,
products: [‘Протеин’, ‘Гейнер’, ‘Протеиновые батончики’],
description: ‘Спортивное питание для активных и целеустремлённых людей’,
tone: ‘дружелюбный, мотивирующий, доступный’,
colors: ‘зелёный и белый’,
},
};

// ─── GENERATE TEXT ────────────────────────────────────────────────────────────
app.post(’/api/generate’, async (req, res) => {
const { topic, contentType, brand, country, lang } = req.body;

const langMap = {
ru: ‘русском’,
uk: ‘украинском’,
th: ‘тайском (с переводом на английский)’,
};

const b = PRODUCTS[brand] || PRODUCTS.powerpro;
const countryLabel = { ru: ‘Россия’, ua: ‘Украина’, th: ‘Таиланд’ }[country] || ‘Россия’;
const productsList = b.products.join(’, ’);

const prompt = `Ты — эксперт по контент-маркетингу спортивного питания.

БРЕНД: ${b.name} (${countryLabel})
ПРОДУКТЫ БРЕНДА: ${productsList}
ПОЗИЦИОНИРОВАНИЕ: ${b.description}
ТОНАЛЬНОСТЬ: ${b.tone}
ТЕМА/ПРОДУКТ: ${topic}
ТИП КОНТЕНТА: ${contentType}
ЯЗЫК: ${langMap[lang] || ‘русском’}

Важно: упоминай конкретный продукт бренда ${b.name} (${productsList}) — не абстрактный “протеин”, а именно наш.

Создай:

1. ВКОНТАКТЕ ПОСТ: цепляющий текст 150-300 слов с эмодзи
1. ХЭШТЕГИ ВК: 12 релевантных хэштегов
1. INSTAGRAM CAPTION: 80-150 слов
1. INSTAGRAM REELS СЦЕНАРИЙ: 4 сцены с тайтлами и описанием
1. INSTAGRAM ХЭШТЕГИ: 22 хэштега
1. TIKTOK ТЕКСТ: 50-80 слов, дерзко и коротко

Строго JSON без markdown:
{
“vk_post”: “…”,
“vk_hashtags”: “…”,
“ig_caption”: “…”,
“ig_reels”: “…”,
“ig_hashtags”: “…”,
“tiktok”: “…”
}`;

try {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’,
},
body: JSON.stringify({
model: ‘claude-opus-4-5’,
max_tokens: 2000,
messages: [{ role: ‘user’, content: prompt }],
}),
});

```
const data = await response.json();
const text = data.content[0].text;

let parsed;
try {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
} catch {
  parsed = { vk_post: text, vk_hashtags: '', ig_caption: '', ig_reels: '', ig_hashtags: '', tiktok: '' };
}

res.json(parsed);
```

} catch (err) {
console.error(‘Generate error:’, err);
res.status(500).json({ error: err.message });
}
});

// ─── ANALYZE TRENDS ───────────────────────────────────────────────────────────
app.post(’/api/trends’, async (req, res) => {
const { country, brand } = req.body;

const countryMap = {
ru: { name: ‘Россия’, lang: ‘русском’, market: ‘российском’ },
ua: { name: ‘Украина’, lang: ‘украинском’, market: ‘украинском’ },
th: { name: ‘Таиланд’, lang: ‘английском/тайском’, market: ‘тайском’ },
};

const c = countryMap[country] || countryMap.ru;
const b = PRODUCTS[brand] || PRODUCTS.powerpro;
const productsList = b.products.join(’, ’);

const systemPrompt = `Ты — аналитик рынка спортивного питания. Используй веб-поиск для поиска актуальных данных. Отвечай строго в JSON без markdown и без лишнего текста.`;

const userPrompt = `Проведи полный анализ рынка спортивного питания в ${c.name} для бренда ${b.name}.

Наши продукты: ${productsList}

Используй веб-поиск. Найди:

1. ТОП ТРЕНДОВЫХ ПРОДУКТОВ — что сейчас покупают в категориях: протеин, гейнеры, батончики — в ${c.name}
1. АНАЛИЗ КОНКУРЕНТОВ — кто продаёт протеин/гейнеры/батончики в ${c.name}, их сильные стороны
1. ТРЕНДОВЫЕ ТЕМЫ ДЛЯ КОНТЕНТА — что заходит в фитнес-соцсетях прямо сейчас
1. ЛУЧШЕЕ ВРЕМЯ ПОСТИНГА — для ${c.name} по дням и часам
1. ПОПУЛЯРНЫЕ ХЭШТЕГИ — топ хэштеги для протеина, гейнеров, батончиков в ${c.name}

Верни строго JSON (без ```):
{
“top_products”: [
{
“product”: “Название продукта/категории”,
“trend_reason”: “Почему на хайпе”,
“our_angle”: “Как ${b.name} может это использовать”,
“score”: 95
}
],
“competitors”: [
{
“name”: “Название конкурента”,
“strengths”: “Сильные стороны”,
“weakness”: “Слабые стороны / наше преимущество”,
“market”: “${c.name}”
}
],
“content_themes”: [
{
“theme”: “Тема”,
“description”: “Описание”,
“format”: “Reels / Пост / Stories”,
“example_topic”: “Пример темы поста”
}
],
“posting_schedule”: {
“best_days”: [“Понедельник”, “Среда”, “Пятница”],
“best_times”: [“8:00-9:00”, “12:00-13:00”, “19:00-21:00”],
“frequency”: “Рекомендуемая частота постинга”
},
“hashtags”: {
“protein”: [“хэштег1”, “хэштег2”],
“gainer”: [“хэштег1”, “хэштег2”],
“bars”: [“хэштег1”, “хэштег2”],
“brand”: [“хэштег1”, “хэштег2”]
},
“summary”: “Главный вывод — 2-3 предложения о рынке”,
“opportunity”: “Главная возможность для ${b.name} прямо сейчас”
}`;

try {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’,
‘anthropic-beta’: ‘web-search-2025-03-05’,
},
body: JSON.stringify({
model: ‘claude-opus-4-5’,
max_tokens: 5000,
system: systemPrompt,
tools: [{ type: ‘web_search_20250305’, name: ‘web_search’, max_uses: 8 }],
messages: [{ role: ‘user’, content: userPrompt }],
}),
});

```
const data = await response.json();
if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

const allText = (data.content || [])
  .filter(b => b.type === 'text')
  .map(b => b.text)
  .join('\n');

let parsed;
try {
  const jsonMatch = allText.match(/\{[\s\S]*\}/);
  parsed = JSON.parse(jsonMatch ? jsonMatch[0] : allText);
} catch {
  parsed = {
    top_products: [],
    competitors: [],
    content_themes: [],
    posting_schedule: {},
    hashtags: {},
    summary: allText,
    opportunity: '',
  };
}

res.json(parsed);
```

} catch (err) {
console.error(‘Trends error:’, err);
res.status(500).json({ error: err.message });
}
});

// ─── GENERATE IMAGE ───────────────────────────────────────────────────────────
app.post(’/api/generate-image’, async (req, res) => {
const { topic, style, brand } = req.body;
const b = PRODUCTS[brand] || PRODUCTS.powerpro;
const prompt = `Professional sports nutrition product advertisement, ${topic}, ${style || 'modern gym aesthetic'}, ${b.colors} color scheme, high quality product photography, dramatic lighting, 4k`;

try {
const formData = new FormData();
formData.append(‘prompt’, prompt);
formData.append(‘output_format’, ‘jpeg’);
formData.append(‘width’, ‘1024’);
formData.append(‘height’, ‘1024’);

```
const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${STABILITY_API_KEY}`,
    Accept: 'image/*',
    ...formData.getHeaders(),
  },
  body: formData,
});

if (!response.ok) throw new Error(`Stability AI: ${await response.text()}`);
const buffer = await response.buffer();
res.json({ image: `data:image/jpeg;base64,${buffer.toString('base64')}` });
```

} catch (err) {
console.error(‘Image error:’, err);
res.status(500).json({ error: err.message });
}
});

// ─── PUBLISH TO VK ────────────────────────────────────────────────────────────
app.post(’/api/publish-vk’, async (req, res) => {
const { text, imageBase64 } = req.body;
try {
let attachments = ‘’;

```
if (imageBase64) {
  const { response: { upload_url } } = await (await fetch(
    `https://api.vk.com/method/photos.getWallUploadServer?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.131`
  )).json();

  const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const form = new FormData();
  form.append('photo', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  const uploadData = await (await fetch(upload_url, { method: 'POST', body: form })).json();

  const { response: [photo] } = await (await fetch(
    `https://api.vk.com/method/photos.saveWallPhoto?group_id=${VK_GROUP_ID}&photo=${uploadData.photo}&server=${uploadData.server}&hash=${uploadData.hash}&access_token=${VK_TOKEN}&v=5.131`
  )).json();
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
res.json({ success: true, post_id: postData.response.post_id });
```

} catch (err) {
console.error(‘VK error:’, err);
res.status(500).json({ error: err.message });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PowerPro Agent on port ${PORT}`));
