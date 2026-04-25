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
            'Сывороточный протеин ВЭЙ PROTEIN 1кг — вкусы: Ваниль (2290₽), Шоколад (2290₽)',
            'Протеиновый коктейль ВЕЙ ШЕЙК 900г — вкусы: Ванильное мороженое, Клубника, Молочный шоколад, Молочная вишня, Банан (1545₽)',
            'Комплексный протеин МИКС 900г — 5 источников белка + урсоловая кислота — вкусы: Лайм-мята, Шоколад-корица, Медовое печенье (2250₽)',
            'Протеин ФЕМИН для женщин + Slim Body Formula — 300г: Клубника, Смородина / 1000г: Смородина, Шоколад (2350₽)',
          ],
          bars: [
            'Зеро 40% неглазированные батончики без сахара',
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
            'Протеин Whey 1кг — вкусы: Клубника со сливками, Flat White, Банан, Ваниль, Варёная сгущёнка, Сгущёнка, Лесная ягода (1425 грн)',
            'Протеин Femine 1кг — вкусы: Медовая дыня, Сочный апельсин (1460 грн)',
            'Протеин Mix 1кг — вкус: Шоколад-кокос (1365 грн)',
          ],
          gainers: [
            'Гейнер 1кг — вкус: Шоколад (660 грн)',
          ],
          bars: [
            'Протеиновый батончик 36% белка, 60г — вкус: Мокачино (57 грн)',
            'Paste Bar 30% без сахара 45г — вкусы: Арахисовая паста, Кунжутная паста, Миндальная паста, Подсолнечная паста, Паста грецкого ореха (52 грн)',
            'Vegan Bar 32% без сахара с орехами, сухофруктами и злаками, 60г (66 грн)',
            'Paste Bar Mix Box (50 грн)',
          ],
          other: [
            'Фитнес-джем Zero с карнитином 200г — вкусы: Апельсин, Персик, Вишня, Яблоко (82 грн)',
          ],
        },
      },
      th: {
        market: 'Thailand',
        site: 'powerpro.th',
        catalog: {
          proteins: [
            'Whey Protein — flavors: Vanilla, Chocolate, Strawberry',
            'Mix Protein — 5 protein sources',
          ],
          bars: [
            'Protein Bar 36% — Mocha flavor',
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
          proteins: ['Протеин FitWins Whey', 'Протеиновые батончики FitWins'],
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
  const langMap = { ru: 'русском', uk: 'украинском', th: 'тайском (с переводом на английский)' };
  const info = getProductInfo(brand, country);

  const prompt = `Ты — эксперт по контент-маркетингу спортивного питания.

БРЕНД: ${info.brandName}
РЫНОК: ${info.market}
ТОНАЛЬНОСТЬ: ${info.tone}
ТЕМА: ${topic}
ТИП КОНТЕНТА: ${contentType}
ЯЗЫК: ${langMap[lang] || 'русском'}

РЕАЛЬНЫЙ КАТАЛОГ ПРОДУКТОВ ${info.brandName} для ${info.market}:
${info.catalogText}

ВАЖНО: Упоминай КОНКРЕТНЫЕ продукты из каталога выше с реальными названиями, вкусами и ценами. Не выдумывай продукты которых нет.

Создай:
1. ВКОНТАКТЕ ПОСТ: 150-300 слов с эмодзи
2. ХЭШТЕГИ ВК: 12 хэштегов
3. INSTAGRAM CAPTION: 80-150 слов
4. REELS СЦЕНАРИЙ: 4 сцены с тайтлами
5. INSTAGRAM ХЭШТЕГИ: 22 хэштега
6. TIKTOK: 50-80 слов, дерзко

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
  const info = getProductInfo(brand, country);

  const systemPrompt = `Ты — аналитик рынка спортивного питания. Используй веб-поиск. Отвечай строго JSON без markdown.`;

  const userPrompt = `Проведи анализ рынка спортпита в ${info.market} для бренда ${info.brandName}.

Наши конкретные продукты:
${info.catalogText}

Найди через веб-поиск актуальные данные (апрель-май 2025):
1. Топ трендовых продуктов именно в наших категориях (протеин/батончики/гейнеры) в ${info.market}
2. Конкуренты в ${info.market} в этих же категориях — их плюсы и наши преимущества
3. Трендовые темы для контента в фитнес-соцсетях прямо сейчас
4. Лучшее время постинга в ${info.market}
5. Популярные хэштеги по нашим категориям

Верни JSON:
{
  "top_products": [{"product":"...","trend_reason":"...","our_angle":"...","score":95}],
  "competitors": [{"name":"...","strengths":"...","weakness":"..."}],
  "content_themes": [{"theme":"...","description":"...","format":"...","example_topic":"..."}],
  "posting_schedule": {"best_days":["..."],"best_times":["..."],"frequency":"..."},
  "hashtags": {"protein":["..."],"bars":["..."],"brand":["..."]},
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
