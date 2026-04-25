const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VK_TOKEN = process.env.VK_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

const PRODUCTS = {
  powerpro: {
    name: 'PowerPro',
    products: ['Протеин', 'Гейнер', 'Протеиновые батончики'],
    description: 'Спортивное питание премиум класса для серьёзных атлетов',
    tone: 'мощный, мотивирующий, профессиональный',
    colors: 'orange and black',
  },
  fitwins: {
    name: 'FitWins',
    products: ['Протеин', 'Гейнер', 'Протеиновые батончики'],
    description: 'Спортивное питание для активных и целеустремлённых людей',
    tone: 'дружелюбный, мотивирующий, доступный',
    colors: 'green and white',
  },
};

// ── GENERATE TEXT ──────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { topic, contentType, brand, country, lang } = req.body;
  const langMap = { ru: 'русском', uk: 'украинском', th: 'тайском (с переводом на английский)' };
  const b = PRODUCTS[brand] || PRODUCTS.powerpro;
  const countryLabel = { ru: 'Россия', ua: 'Украина', th: 'Таиланд' }[country] || 'Россия';
  const productsList = b.products.join(', ');

  const prompt = `Ты — эксперт по контент-маркетингу спортивного питания.
БРЕНД: ${b.name} (${countryLabel})
ПРОДУКТЫ: ${productsList}
ПОЗИЦИОНИРОВАНИЕ: ${b.description}
ТОНАЛЬНОСТЬ: ${b.tone}
ТЕМА: ${topic}
ТИП: ${contentType}
ЯЗЫК: ${langMap[lang] || 'русском'}

Создай контент упоминая именно продукты ${b.name}.

1. ВКОНТАКТЕ ПОСТ: 150-300 слов с эмодзи
2. ХЭШТЕГИ ВК: 12 хэштегов
3. INSTAGRAM CAPTION: 80-150 слов
4. REELS СЦЕНАРИЙ: 4 сцены
5. INSTAGRAM ХЭШТЕГИ: 22 хэштега
6. TIKTOK: 50-80 слов

Строго JSON без markdown:
{"vk_post":"...","vk_hashtags":"...","ig_caption":"...","ig_reels":"...","ig_hashtags":"...","tiktok":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
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
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ANALYZE TRENDS ─────────────────────────────────────────────────────────────
app.post('/api/trends', async (req, res) => {
  const { country, brand } = req.body;
  const countryMap = {
    ru: { name: 'Россия' },
    ua: { name: 'Украина' },
    th: { name: 'Таиланд' },
  };
  const c = countryMap[country] || countryMap.ru;
  const b = PRODUCTS[brand] || PRODUCTS.powerpro;
  const productsList = b.products.join(', ');

  const systemPrompt = `Ты — аналитик рынка спортивного питания. Используй веб-поиск. Отвечай строго JSON без markdown.`;

  const userPrompt = `Проведи анализ рынка спортпита в ${c.name} для бренда ${b.name}.
Наши продукты: ${productsList}

Найди через веб-поиск:
1. Топ трендовых продуктов в категориях протеин/гейнер/батончики в ${c.name}
2. Конкуренты в ${c.name} — их плюсы и наши преимущества
3. Трендовые темы для контента в фитнес-соцсетях
4. Лучшее время постинга в ${c.name}
5. Популярные хэштеги по категориям

Верни JSON:
{
  "top_products": [{"product":"...","trend_reason":"...","our_angle":"...","score":95}],
  "competitors": [{"name":"...","strengths":"...","weakness":"..."}],
  "content_themes": [{"theme":"...","description":"...","format":"...","example_topic":"..."}],
  "posting_schedule": {"best_days":["..."],"best_times":["..."],"frequency":"..."},
  "hashtags": {"protein":["..."],"gainer":["..."],"bars":["..."],"brand":["..."]},
  "summary": "...",
  "opportunity": "..."
}`;

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
        max_tokens: 5000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const allText = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    let parsed;
    try {
      const m = allText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : allText);
    } catch {
      parsed = { top_products: [], competitors: [], content_themes: [], posting_schedule: {}, hashtags: {}, summary: allText, opportunity: '' };
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATE IMAGE ─────────────────────────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const { topic, style, brand } = req.body;
  const b = PRODUCTS[brand] || PRODUCTS.powerpro;
  const prompt = `Professional sports nutrition advertisement, ${topic}, ${style || 'modern gym aesthetic'}, ${b.colors} color scheme, product photography, dramatic lighting, 4k`;

  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'jpeg');
    formData.append('width', '1024');
    formData.append('height', '1024');

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLISH TO VK ──────────────────────────────────────────────────────────────
app.post('/api/publish-vk', async (req, res) => {
  const { text, imageBase64 } = req.body;
  try {
    let attachments = '';

    if (imageBase64) {
      const uploadServerRes = await fetch(
        `https://api.vk.com/method/photos.getWallUploadServer?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.131`
      );
      const uploadServerData = await uploadServerRes.json();
      const upload_url = uploadServerData.response.upload_url;

      const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const form = new FormData();
      form.append('photo', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
      const uploadData = await (await fetch(upload_url, { method: 'POST', body: form })).json();

      const saveRes = await fetch(
        `https://api.vk.com/method/photos.saveWallPhoto?group_id=${VK_GROUP_ID}&photo=${uploadData.photo}&server=${uploadData.server}&hash=${uploadData.hash}&access_token=${VK_TOKEN}&v=5.131`
      );
      const saveData = await saveRes.json();
      const photo = saveData.response[0];
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PowerPro Agent on port ${PORT}`));
