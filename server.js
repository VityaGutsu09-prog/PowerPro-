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
    tone: 'мощный, мотивирующий, профессиональный',
    colors: 'orange and black',
    byCountry: {
      ru: {
        market: 'Россия',
        site: 'powerprorussia.ru',
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
          other: [
            'Аминокислоты БЦАА МЕГА СТРОНГ',
            'Креатины',
            'Гейнеры',
            'Десерты',
            'Смеси для выпечки',
          ],
        },
      },
      ua: {
        market: 'Украина',
        site: 'powerpro.in.ua',
        catalog: {
          proteins: [
            'Протеин Whey 1кг — Клубника со сливками, Flat White, Банан, Ваниль, Варёная сгущёнка, Сгущёнка, Лесная ягода (1425 грн)',
            'Протеин Femine 1кг — Медовая дыня, Сочный апельсин (1460 грн)',
            'Протеин Mix 1кг — Шоколад-кокос (1365 грн)',
          ],
          gainers: [
            'Гейнер 1кг — Шоколад (660 грн)',
          ],
          bars: [
            'Протеиновый батончик 36% белка 60г — Мокачино (57 грн)',
            'Paste Bar 30% без сахара 45г — Арахисовая паста, Кунжутная паста, Миндальная паста, Подсолнечная паста, Паста грецкого ореха (52 грн)',
            'Vegan Bar 32% без сахара с орехами, сухофруктами и злаками 60г (66 грн)',
            'Paste Bar Mix Box (50 грн)',
          ],
          other: [
            'Фитнес-джем Zero с карнитином 200г — Апельсин, Персик, Вишня, Яблоко (82 грн)',
          ],
        },
      },
      th: {
        market: 'Thailand',
        catalog: {
          proteins: [
            'Whey Protein — Vanilla, Chocolate, Strawberry',
            'Mix Protein — 5 protein sources',
          ],
          bars: [
            'Protein Bar 36% — Mocha',
            'Paste Bar 30% sugar-free — Peanut, Almond, Sesame',
            'Vegan Bar 32% sugar-free',
          ],
        },
      },
    },
  },
  fitwins: {
    name: 'FitWins',
    tone: 'дружелюбный, мотивирующий, доступный',
    colors: 'green and white',
    byCountry: {
      ru: {
        market: 'Россия',
        catalog: {
          bars: ['FitWins Crunch Bar 25% без сахара'],
        },
      },
      ua: {
        market: 'Украина',
        catalog: {
          bars: ['FitWins Crunch Bar 25% MIX — разные вкусы, 50г без сахара'],
        },
      },
      th: {
        market: 'Thailand',
        catalog: {
          bars: ['FitWins Crunch Bar 25% sugar-free'],
        },
      },
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
  return {
    brandName: b.name,
    tone: b.tone,
    colors: b.colors,
    market: countryData.market,
    catalogText: lines.join('\n\n'),
  };
}

// ── GENERATE TEXT ──────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { topic, contentType, brand, country, lang } = req.body;
  const langMap = { ru: 'русском', uk: 'украинском', th: 'английском' };
  const info = getProductInfo(brand, country);

  const prompt = `Ты — эксперт по контент-маркетингу спортивного питания. Сейчас апрель 2026 года.

БРЕНД: ${info.brandName}
РЫНОК: ${info.market}
ТОНАЛЬНОСТЬ: ${info.tone}
ТЕМА: ${topic}
ТИП КОНТЕНТА: ${contentType}
ЯЗЫК: ${langMap[lang] || 'русском'}

РЕАЛЬНЫЙ КАТАЛОГ ${info.brandName} для ${info.market}:
${info.catalogText}

ПРАВИЛА:
- Упоминай КОНКРЕТНЫЕ продукты из каталога с реальными названиями и ценами
- Текущий год 2026 — никогда не пиши 2024 или 2025
- Текст должен быть связным, не разбитым на отдельные слова
- Пиши живо, не как робот

Создай:
1. ВКОНТАКТЕ ПОСТ: 150-300 слов с эмодзи, связный текст
2. ХЭШТЕГИ ВК: 12 хэштегов через пробел
3. INSTAGRAM CAPTION: 80-150 слов
4. REELS СЦЕНАРИЙ: 4 сцены с тайтлами
5. INSTAGRAM ХЭШТЕГИ: 22 хэштега
6. TIKTOK: 50-80 слов, дерзко

Строго JSON без markdown, все значения — обычные строки без переносов внутри:
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
        max_tokens: 2500,
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
  const info = getProductInfo(brand, country);

  const systemPrompt = `Ты — senior аналитик рынка спортивного питания с 10-летним опытом. Апрель 2026 года.
Проводишь глубокий анализ с реальными данными из интернета. Даёшь конкретные actionable инсайты.
Отвечаешь строго JSON без markdown и без лишнего текста.`;

  const userPrompt = `Проведи ГЛУБОКИЙ анализ рынка спортпита в ${info.market} для бренда ${info.brandName}.

НАШ КАТАЛОГ:
${info.catalogText}

Используй веб-поиск по каждому блоку отдельно:

🔍 Поиск 1: тренды спортпита ${info.market} 2026
🔍 Поиск 2: топ протеины батончики ${info.market} 2026 популярные
🔍 Поиск 3: конкуренты спортивное питание ${info.market} цены
🔍 Поиск 4: фитнес контент соцсети ${info.market} что заходит 2026
🔍 Поиск 5: лучшее время постинга фитнес ${info.market}
🔍 Поиск 6: хэштеги протеин батончики ${info.market} охват

Верни JSON:
{
  "market_overview": {
    "size": "Объём рынка с цифрами",
    "growth": "Темп роста в %",
    "key_insight": "Главный инсайт о рынке прямо сейчас"
  },
  "top_products": [
    {
      "product": "Конкретный продукт/категория",
      "trend_reason": "Конкретная причина хайпа с данными",
      "our_angle": "Как ${info.brandName} использует тренд с конкретным продуктом из каталога",
      "action": "Что сделать прямо сейчас",
      "score": 95
    }
  ],
  "competitors": [
    {
      "name": "Конкурент",
      "strengths": "Сильные стороны",
      "weakness": "Слабые места",
      "price_compare": "Их цена vs наша",
      "our_advantage": "Наше преимущество"
    }
  ],
  "content_themes": [
    {
      "theme": "Тема",
      "why_works": "Почему заходит аудитории",
      "format": "Reels / Пост / Stories / TikTok",
      "hook": "Цепляющий хук",
      "example_topic": "Готовая тема поста"
    }
  ],
  "content_plan": [
    {
      "day": "Понедельник",
      "theme": "Тема",
      "product": "Продукт из каталога",
      "format": "Формат",
      "hook": "Хук для поста"
    }
  ],
  "posting_schedule": {
    "best_days": ["Вторник", "Четверг", "Суббота"],
    "best_times": ["7:00-9:00 — утренняя тренировка аудитории", "19:00-21:00 — вечерний пик"],
    "frequency": "Конкретная рекомендация",
    "platform_priority": "Приоритетная платформа и почему"
  },
  "hashtags": {
    "protein": ["#хэштег"],
    "bars": ["#хэштег"],
    "fitness": ["#хэштег"],
    "brand": ["#${info.brandName}"]
  },
  "summary": "3-4 предложения с конкретными цифрами",
  "opportunity": "Главная возможность — что сделать в ближайшие 2 недели",
  "red_flags": "Что НЕ делать — ошибки конкурентов"
}

Ровно: 5 top_products, 4 competitors, 6 content_themes, 7 дней content_plan. Никакой воды — только факты и действия.`;

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
  const { text, imageBase64 } = req.body;
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
    res.json({ success: true, post_id: postData.response.post_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PowerPro Agent on port ${PORT}`));
