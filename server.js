const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.static('public'));

const PRODUCTS = [
  { file: 'IMG_0407.png', keywords: ['zero кокос', 'зеро кокос', 'zero coconut', 'кокос zero', 'coconut zero'], flavor: 'coconut' },
  { file: 'IMG_0408.png', keywords: ['zero груша', 'зеро груша', 'zero pear', 'груша zero', 'груша'], flavor: 'pear' },
  { file: 'IMG_0409.png', keywords: ['zero ваниль', 'зеро ваниль', 'zero vanilla', 'ваниль zero'], flavor: 'vanilla' },
  { file: 'IMG_0090.png', keywords: ['zero шоколад', 'зеро шоколад', 'zero chocolate'], flavor: 'chocolate' },
  { file: 'IMG_0107.png', keywords: ['zero клубника', 'зеро клубника', 'zero strawberry', 'клубника zero'], flavor: 'strawberry' },
  { file: 'IMG_0261.png', keywords: ['twins кофе', 'твинс кофе', 'twins coffee'], flavor: 'coffee' },
  { file: 'IMG_3914.png', keywords: ['twins ваниль', 'твинс ваниль', 'twins vanilla'], flavor: 'vanilla' },
  { file: 'IMG_3913.png', keywords: ['twins шоколад', 'твинс шоколад', 'twins chocolate'], flavor: 'chocolate' },
  { file: 'IMG_0161.png', keywords: ['twins лимон', 'твинс лимон', 'twins lemon'], flavor: 'lemon' },
  { file: 'IMG_0214.png', keywords: ['фисташк', 'pistachio', '36 фисташк'], flavor: 'pistachio' },
  { file: 'IMG_0217.png', keywords: ['миндаль', 'арахис', 'almond', 'peanut', '36 миндаль'], flavor: 'peanut' },
  { file: 'IMG_0211.png', keywords: ['фундук изюм', 'hazelnut raisin', '36 фундук'], flavor: 'hazelnut' },
  { file: 'IMG_0240.png', keywords: ['vegan', 'веган', 'choconuts'], flavor: 'chocolate' },
  { file: 'IMG_0239.png', keywords: ['prometheus', 'прометеус', 'прометей'], flavor: 'energy' },
  { file: 'IMG_2029.webp', keywords: ['тортик фисташк', 'тортик вишн', 'tortik pistachio', 'tortik cherry'], flavor: 'pistachio' },
  { file: 'IMG_3905.webp', keywords: ['тортик шоколад кокос', 'tortik chocolate coconut'], flavor: 'chocolate_coconut' },
  { file: 'IMG_3911.webp', keywords: ['тортик кокос', 'тортик карамель', 'tortik coconut', 'tortik caramel'], flavor: 'caramel' },
  { file: 'IMG_3906.webp', keywords: ['тортик грецкий', 'тортик латте', 'tortik walnut', 'tortik latte'], flavor: 'coffee' },
  { file: 'IMG_3908.webp', keywords: ['тортик арахис', 'tortik peanut'], flavor: 'peanut' },
  { file: 'IMG_3909.webp', keywords: ['тортик фундук', 'тортик шоколад', 'tortik hazelnut', 'tortik chocolate'], flavor: 'hazelnut' },
  { file: 'IMG_3906.webp', keywords: ['тортик', 'tortik'], flavor: 'caramel' },
  { file: 'IMG_2029.webp', keywords: ['coco joy', 'кокос джой', 'cocojoy'], flavor: 'coconut' },
  { file: 'IMG_1227.png', keywords: ['протеин ваниль', 'whey ваниль', 'protein vanilla', 'whey vanilla'], flavor: 'vanilla' },
  { file: 'IMG_1228.png', keywords: ['whey', 'вей протеин', 'протеин банан', 'protein banana'], flavor: 'banana' },
  { file: 'IMG_0108.jpeg', keywords: ['gainer', 'гейнер', 'gain'], flavor: 'energy' },
  { file: 'IMG_0161.png', keywords: ['twins', 'твинс'], flavor: 'lemon' },
  { file: 'IMG_0107.png', keywords: ['zero', 'зеро'], flavor: 'strawberry' },
  { file: 'IMG_0214.png', keywords: ['батончик', 'bar', 'бар'], flavor: 'chocolate' },
  { file: 'IMG_1228.png', keywords: ['протеин', 'protein', 'белок'], flavor: 'vanilla' },
];

const FLAVOR_BACKGROUNDS = {
  chocolate:        'dark melting chocolate waves and liquid chocolate splashes, cocoa powder dust cloud, cacao beans scattered, dark rich brown tones, cinematic moody',
  vanilla:          'soft cream ivory vanilla smoke swirls, vanilla bean pods floating, warm golden milk haze, silky liquid waves, elegant warm dark background',
  strawberry:       'fresh red strawberries exploding with juice splashes, pink berry particles, glossy red drops flying, vibrant dark moody background',
  lemon:            'bright yellow lemon slices exploding with citrus juice spray, zest particles flying, sharp yellow light rays on deep black background',
  coconut:          'white coconut shavings floating like snow, coconut shell halves, milky white liquid splash, tropical palm leaf shadow, dark exotic background',
  coffee:           'dark espresso liquid splash swirling, roasted coffee beans scattered, steam wisps rising, dark mocha rich brown tones, barista aesthetic',
  caramel:          'golden caramel sauce dripping and swirling, toffee shards flying, warm amber liquid wave, glossy golden droplets on black background',
  peanut:           'roasted peanuts scattered mid-air, smooth peanut butter swirl ribbon, warm earthy brown textures, natural matte dark background',
  hazelnut:         'hazelnuts and praline pieces flying, dark chocolate hazelnut cream swirl, warm brown elegant tones, rich nutty dark atmosphere',
  pistachio:        'crushed pistachio nuts scattered, soft sage green particles floating, cream swirl with green pistachio pieces, muted elegant dark background',
  banana:           'ripe yellow banana slices and cream wave, tropical yellow particles floating, smooth milkshake swirl, warm yellow glow on dark background',
  pear:             'fresh green pear slices with juice droplets, pear halves with liquid splash, subtle green haze, elegant fruit particles on dark background',
  chocolate_coconut:'melting dark chocolate waves mixed with white coconut flakes swirling, two-tone dramatic splash, tropical dark moody atmosphere',
  energy:           'electric blue and crimson red energy sparks, lightning bolt trails, power surge neon glow, dynamic light streaks on pure black background',
};

function getProductMatch(prompt) {
  const p = prompt.replace(/\[type:\w+\]/, '').toLowerCase();
  for (const product of PRODUCTS) {
    for (const keyword of product.keywords) {
      if (p.includes(keyword)) {
        return product;
      }
    }
  }
  return null;
}

function buildBackgroundPrompt(flavor, contentType) {
  const flavorDesc = FLAVOR_BACKGROUNDS[flavor] || FLAVOR_BACKGROUNDS.chocolate;
  const moodMap = {
    promo:        'dramatic studio lighting, luxury commercial style, deep shadows, volumetric god rays',
    motivational: 'intense high contrast, powerful explosive energy, dynamic diagonal composition',
    educational:  'clean balanced composition, soft diffused elegant light, premium minimalist',
    product:      'cinematic premium studio atmosphere, refined dual rim lighting, sophisticated dark',
  };
  const mood = moodMap[contentType] || moodMap.promo;
  const positive = `Abstract dark advertising background, ${flavorDesc}, pure black base, subtle dark red accent glow on edges, ${mood}, 4K high detail, background only, no products, no text, no logos, no people`;
  const negative = 'product, bottle, jar, bar, wrapper, person, face, text, watermark, logo, words, letters, white background, bright colors, cartoon, low quality, blurry';
  return { positive, negative };
}

function buildFullPrompt(rawPrompt) {
  const typeMatch = rawPrompt.match(/\[type:(\w+)\]/);
  const contentType = typeMatch ? typeMatch[1] : 'promo';
  const topic = rawPrompt.replace(/\[type:\w+\]/, '').trim();
  const t = topic.toLowerCase();
  let productDesc;
  if (t.includes('батончик') || t.includes('bar') || t.includes('twins') || t.includes('zero'))
    productDesc = 'protein bar wrapper, sports nutrition snack bar broken in half showing filling';
  else if (t.includes('протеин') || t.includes('protein') || t.includes('whey'))
    productDesc = 'protein powder jar with metal shaker bottle, fine powder artistically spilling';
  else if (t.includes('креатин') || t.includes('creatine'))
    productDesc = 'creatine monohydrate supplement jar, crystalline powder scattered on surface';
  else if (t.includes('гейнер') || t.includes('gainer'))
    productDesc = 'large mass gainer supplement bag with powder explosion';
  else if (t.includes('предтрен') || t.includes('pre-workout'))
    productDesc = 'pre-workout supplement jar with electric neon energy sparks around it';
  else if (t.includes('тортик') || t.includes('tortik'))
    productDesc = 'protein cake dessert with chocolate coating, creamy filling cross-section';
  else
    productDesc = 'sports nutrition supplement jar and shaker bottle, protein powder';
  const moodMap = {
    promo:        'dramatic golden rim lighting, luxury commercial hero shot, smoke mist at base',
    motivational: 'intense electric blue neon glow, high contrast, powerful athletic energy mood',
    educational:  'clean cool blue-white clinical lighting, ingredient elements placed around product',
    product:      'warm amber and cool white dual rim lighting, premium dark studio, cinematic',
  };
  const mood = moodMap[contentType] || moodMap.promo;
  const positive = `Professional advertising product photography, ${productDesc}, pure black background, ${mood}, photorealistic 8K, razor sharp focus, no text, no watermarks, no people`;
  const negative = 'text, watermark, logo, readable letters, white background, bright background, cartoon, low quality, blurry, nsfw, person face';
  return { positive, negative };
}

app.post('/api/generate', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const typeMatch = prompt.match(/\[type:(\w+)\]/);
    const contentType = typeMatch ? typeMatch[1] : 'promo';
    const productMatch = getProductMatch(prompt);

    if (productMatch) {
      const { positive, negative } = buildBackgroundPrompt(productMatch.flavor, contentType);
      const bgRes = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
        },
        body: JSON.stringify({
          text_prompts: [
            { text: positive, weight: 1 },
            { text: negative, weight: -1 }
          ],
          cfg_scale: 8,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 35
        })
      });
      const bgData = await bgRes.json();
      if (bgData.artifacts && bgData.artifacts[0]) {
        res.json({ productImage: '/' + productMatch.file, backgroundBase64: bgData.artifacts[0].base64, flavor: productMatch.flavor });
      } else {
        res.json({ productImage: '/' + productMatch.file });
      }
      return;
    }

    const { positive, negative } = buildFullPrompt(prompt);
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [
          { text: positive, weight: 1 },
          { text: negative, weight: -1 }
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
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/vk-post', async (req, res) => {
  try {
    const { message, imageBase64 } = req.body;
    const token = process.env.VK_TOKEN;
    const groupId = process.env.VK_GROUP_ID;
    let attachments = '';
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
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
