const express = require(‘express’);
const cors = require(‘cors’);
const fetch = require(‘node-fetch’);
const FormData = require(‘form-data’);

const app = express();
app.use(cors());
app.use(express.json({limit: ‘10mb’}));
app.use(express.static(‘public’));

const PRODUCTS = [
{ file: ‘IMG_0407.png’, keywords: [‘zero кокос’, ‘зеро кокос’, ‘zero coconut’, ‘кокос zero’, ‘coconut zero’] },
{ file: ‘IMG_0408.png’, keywords: [‘zero груша’, ‘зеро груша’, ‘zero pear’, ‘груша zero’, ‘груша’] },
{ file: ‘IMG_0409.png’, keywords: [‘zero ваниль’, ‘зеро ваниль’, ‘zero vanilla’, ‘ваниль zero’] },
{ file: ‘IMG_0090.png’, keywords: [‘zero шоколад’, ‘зеро шоколад’, ‘zero chocolate’] },
{ file: ‘IMG_0107.png’, keywords: [‘zero клубника’, ‘зеро клубника’, ‘zero strawberry’, ‘клубника zero’] },
{ file: ‘IMG_0261.png’, keywords: [‘twins кофе’, ‘твинс кофе’, ‘twins coffee’] },
{ file: ‘IMG_3914.png’, keywords: [‘twins ваниль’, ‘твинс ваниль’, ‘twins vanilla’] },
{ file: ‘IMG_3913.png’, keywords: [‘twins шоколад’, ‘твинс шоколад’, ‘twins chocolate’] },
{ file: ‘IMG_0161.png’, keywords: [‘twins лимон’, ‘твинс лимон’, ‘twins lemon’] },
{ file: ‘IMG_0214.png’, keywords: [‘фисташк’, ‘pistachio’, ‘36 фисташк’] },
{ file: ‘IMG_0217.png’, keywords: [‘миндаль’, ‘арахис’, ‘almond’, ‘peanut’, ‘36 миндаль’] },
{ file: ‘IMG_0211.png’, keywords: [‘фундук изюм’, ‘hazelnut raisin’, ‘36 фундук’] },
{ file: ‘IMG_0240.png’, keywords: [‘vegan’, ‘веган’, ‘choconuts’] },
{ file: ‘IMG_0239.png’, keywords: [‘prometheus’, ‘прометеус’, ‘прометей’] },
{ file: ‘IMG_2029.webp’, keywords: [‘тортик фисташк’, ‘тортик вишн’, ‘tortik pistachio’, ‘tortik cherry’] },
{ file: ‘IMG_3905.webp’, keywords: [‘тортик шоколад кокос’, ‘tortik chocolate coconut’] },
{ file: ‘IMG_3911.webp’, keywords: [‘тортик кокос’, ‘тортик карамель’, ‘tortik coconut’, ‘tortik caramel’] },
{ file: ‘IMG_3906.webp’, keywords: [‘тортик грецкий’, ‘тортик латте’, ‘tortik walnut’, ‘tortik latte’] },
{ file: ‘IMG_3908.webp’, keywords: [‘тортик арахис’, ‘tortik peanut’] },
{ file: ‘IMG_3909.webp’, keywords: [‘тортик фундук’, ‘тортик шоколад’, ‘tortik hazelnut’, ‘tortik chocolate’] },
{ file: ‘IMG_3906.webp’, keywords: [‘тортик’, ‘tortik’] },
{ file: ‘IMG_2029.webp’, keywords: [‘coco joy’, ‘кокос джой’, ‘cocojoy’] },
{ file: ‘IMG_1227.png’, keywords: [‘протеин ваниль’, ‘whey ваниль’, ‘protein vanilla’, ‘whey vanilla’] },
{ file: ‘IMG_1228.png’, keywords: [‘whey’, ‘вей протеин’, ‘протеин банан’, ‘protein banana’] },
{ file: ‘IMG_0108.jpeg’, keywords: [‘gainer’, ‘гейнер’, ‘gain’] },
{ file: ‘IMG_0161.png’, keywords: [‘twins’, ‘твинс’] },
{ file: ‘IMG_0107.png’, keywords: [‘zero’, ‘зеро’] },
{ file: ‘IMG_0214.png’, keywords: [‘батончик’, ‘bar’, ‘бар’] },
{ file: ‘IMG_1228.png’, keywords: [‘протеин’, ‘protein’, ‘белок’] },
];

function getProductImage(prompt) {
const p = prompt.toLowerCase();
for (const product of PRODUCTS) {
for (const keyword of product.keywords) {
if (p.includes(keyword)) {
return ‘/’ + product.file;
}
}
}
return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Умный промпт: определяем продукт и настроение по теме + типу контента
// ─────────────────────────────────────────────────────────────────────────────
function buildStabilityPrompt(topic) {
const t = topic.toLowerCase();

// Определяем тип продукта
let productDesc;
if (t.includes(‘батончик’) || t.includes(‘bar’) || t.includes(‘twins’) || t.includes(‘zero’)) {
productDesc = ‘protein bar with wrapper, sports nutrition snack bar broken in half showing chocolate filling, rich texture’;
} else if (t.includes(‘протеин’) || t.includes(‘protein’) || t.includes(‘whey’)) {
productDesc = ‘protein powder sports jar with metal shaker bottle, fine white powder artistically spilling around’;
} else if (t.includes(‘креатин’) || t.includes(‘creatine’)) {
productDesc = ‘creatine monohydrate supplement jar, fine crystalline white powder scattered on surface’;
} else if (t.includes(‘bcaa’) || t.includes(‘аминокислот’)) {
productDesc = ‘BCAA amino acids supplement jar with capsules scattered around it’;
} else if (t.includes(‘гейнер’) || t.includes(‘gainer’)) {
productDesc = ‘large mass gainer supplement bag, powder explosion cloud effect’;
} else if (t.includes(‘предтрен’) || t.includes(‘pre-workout’)) {
productDesc = ‘pre-workout supplement jar surrounded by electric neon energy sparks and light trails’;
} else if (t.includes(‘жиросжигател’) || t.includes(‘карнитин’) || t.includes(‘fat’)) {
productDesc = ‘fat burner supplement bottle with warm orange fire ember glow surrounding it’;
} else if (t.includes(‘витамин’) || t.includes(‘vitamin’) || t.includes(‘омега’)) {
productDesc = ‘vitamin supplement bottle with golden capsules floating around it’;
} else if (t.includes(‘коллаген’) || t.includes(‘collagen’)) {
productDesc = ‘collagen beauty supplement jar with golden glitter particles floating’;
} else if (t.includes(‘тортик’) || t.includes(‘tortik’)) {
productDesc = ‘protein cake dessert sports nutrition snack, chocolate coating, cross-section showing creamy filling’;
} else {
productDesc = ‘sports nutrition supplement jar and shaker bottle, protein powder’;
}

// Определяем настроение по типу контента (если есть в теме)
let mood;
if (t.includes(‘акци’) || t.includes(‘реклам’) || t.includes(‘скидк’) || t.includes(‘sale’)) {
mood = ‘dramatic golden rim lighting, luxury commercial hero shot, soft smoke mist at product base, deep shadows’;
} else if (t.includes(‘мотивац’) || t.includes(‘сила’) || t.includes(‘резул’)) {
mood = ‘intense electric blue neon glow, high contrast dramatic lighting, powerful athletic energy mood’;
} else if (t.includes(‘польз’) || t.includes(‘состав’) || t.includes(‘инфо’) || t.includes(‘почему’)) {
mood = ‘clean cool blue-white clinical accent lighting, ingredient elements artistically placed around product’;
} else {
// дефолт — премиум студия
mood = ‘warm amber and cool white dual rim lighting, premium dark studio, volumetric light rays, cinematic’;
}

const positivePrompt = `Professional advertising product photography, ${productDesc}, pure black background, ${mood}, photorealistic 8K, razor sharp focus, award-winning commercial photography, no text, no watermarks, no readable letters, no people`;

const negativePrompt = ‘text, watermark, logo, readable letters, words, white background, bright background, cartoon, illustration, anime, low quality, blurry, pixelated, plastic look, nsfw, person face’;

return { positivePrompt, negativePrompt };
}

app.post(’/api/generate’, async (req, res) => {
try {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: process.env.ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’
},
body: JSON.stringify(req.body)
});
const data = await response.json();
res.json(data);
} catch(e) {
res.status(500).json({ error: e.message });
}
});

app.post(’/api/image’, async (req, res) => {
try {
const { prompt } = req.body;

```
// 1. Сначала ищем готовое фото продукта
const productImage = getProductImage(prompt);
if (productImage) {
  res.json({ productImage });
  return;
}

// 2. Если не нашли — генерируем через Stability AI с умным промптом
const { positivePrompt, negativePrompt } = buildStabilityPrompt(prompt);

const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
  },
  body: JSON.stringify({
    text_prompts: [
      { text: positivePrompt, weight: 1 },
      { text: negativePrompt, weight: -1 }
    ],
    cfg_scale: 9,
    height: 1024,
    width: 1024,
    samples: 1,
    steps: 40
  })
});

const data = await response.json();
res.json(data);
```

} catch(e) {
res.status(500).json({ error: e.message });
}
});

app.post(’/api/vk-post’, async (req, res) => {
try {
const { message, imageBase64 } = req.body;
const token = process.env.VK_TOKEN;
const groupId = process.env.VK_GROUP_ID;
let attachments = ‘’;

```
if (imageBase64) {
  const serverRes = await fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${groupId}&access_token=${token}&v=5.131`);
  const serverData = await serverRes.json();
  if (!serverData.response) throw new Error('VK error: ' + JSON.stringify(serverData));
  
  const uploadUrl = serverData.response.upload_url;
  const blob = Buffer.from(imageBase64, 'base64');
  const form = new FormData();
  form.append('photo', blob, { filename: 'image.jpg', contentType: 'image/jpeg' });
  
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form, headers: form.getHeaders() });
  const uploadData = await uploadRes.json();

  const saveRes = await fetch(`https://api.vk.com/method/photos.saveWallPhoto?group_id=${groupId}&photo=${encodeURIComponent(uploadData.photo)}&server=${uploadData.server}&hash=${uploadData.hash}&access_token=${token}&v=5.131`);
  const saveData = await saveRes.json();
  if (!saveData.response || !saveData.response[0]) throw new Error('VK save error: ' + JSON.stringify(saveData));
  
  const photo = saveData.response[0];
  attachments = `photo${photo.owner_id}_${photo.id}`;
}

const postRes = await fetch(`https://api.vk.com/method/wall.post?owner_id=-${groupId}&message=${encodeURIComponent(message)}&attachments=${attachments}&from_group=1&access_token=${token}&v=5.131`);
const postData = await postRes.json();
res.json(postData);
```

} catch(e) {
res.status(500).json({ error: e.message });
}
});

app.listen(process.env.PORT || 3000, () => console.log(‘Server running’));
