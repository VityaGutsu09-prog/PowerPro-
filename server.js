const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.static('public'));

const PRODUCTS = {
  'zero-strawberry': { file: 'IMG_0107.png', keywords: ['zero', 'зеро', 'клубника', 'strawberry'] },
  'zero-chocolate': { file: 'IMG_0090.png', keywords: ['zero шоколад', 'зеро шоколад', 'chocolate cookie'] },
  'zero-pear': { file: 'IMG_0407.png', keywords: ['zero груша', 'зеро груша', 'pear', 'груша'] },
  'zero-vanilla': { file: 'IMG_0408.png', keywords: ['zero ваниль', 'зеро ваниль', 'vanilla cream'] },
  'zero-coconut': { file: 'IMG_0409.png', keywords: ['zero кокос', 'зеро кокос', 'coconut'] },
  'twins-lemon': { file: 'IMG_0161.png', keywords: ['twins лимон', 'твинс лимон', 'lemon cookie'] },
  'twins-coffee': { file: 'IMG_0261.png', keywords: ['twins кофе', 'твинс кофе', 'coffee cookie'] },
  'twins-vanilla': { file: 'IMG_3913.png', keywords: ['twins ваниль', 'твинс ваниль', 'vanilla cookie'] },
  'twins-chocolate': { file: 'IMG_3914.png', keywords: ['twins шоколад', 'твинс шоколад', 'chocolate cookie twins'] },
  'bar-almond': { file: 'IMG_0214.png', keywords: ['36%', '36 процент', 'миндаль', 'арахис', 'almond', 'peanut'] },
  'bar-pistachio': { file: 'IMG_0217.png', keywords: ['фисташк', 'ананас', 'pistachio', 'pineapple'] },
  'bar-hazelnut': { file: 'IMG_0211.png', keywords: ['фундук', 'изюм', 'hazelnut', 'raisin'] },
  'vegan': { file: 'IMG_0240.png', keywords: ['vegan', 'веган', 'choconuts'] },
  'prometheus': { file: 'IMG_0239.png', keywords: ['prometheus', 'прометеус', 'прометей'] },
  'coco-joy': { file: 'IMG_2029.webp', keywords: ['coco', 'кокос джой', 'coco joy'] },
  'tortik-choco-coconut': { file: 'IMG_3905.webp', keywords: ['тортик шоколад кокос', 'tortik chocolate coconut'] },
  'tortik-coconut': { file: 'IMG_3906.webp', keywords: ['тортик кокос', 'tortik coconut caramel'] },
  'tortik-peanut': { file: 'IMG_3908.webp', keywords: ['тортик арахис', 'tortik peanut'] },
  'tortik-walnut': { file: 'IMG_3909.webp', keywords: ['тортик грецкий', 'tortik walnut', 'latte'] },
  'tortik-pistachio': { file: 'IMG_3911.webp', keywords: ['тортик фисташк', 'tortik pistachio', 'cherry'] },
  'tortik-hazelnut': { file: 'IMG_3912.png', keywords: ['тортик фундук', 'tortik hazelnut chocolate'] },
  'whey-banana': { file: 'IMG_1228.png', keywords: ['whey', 'вей', 'протеин банан', 'protein banana', 'whey protein'] },
  'whey-vanilla': { file: 'IMG_1227.png', keywords: ['протеин ваниль', 'protein vanilla', 'whey vanilla'] },
  'gainer': { file: 'IMG_0108.jpeg', keywords: ['gainer', 'гейнер', 'gain'] },
  'tortik': { file: 'IMG_3906.webp', keywords: ['тортик', 'tortik'] },
  'twins': { file: 'IMG_0161.png', keywords: ['twins', 'твинс'] },
  'zero': { file: 'IMG_0107.png', keywords: ['zero', 'зеро'] },
  'bar': { file: 'IMG_0214.png', keywords: ['батончик', 'bar', 'бар'] },
  'protein': { file: 'IMG_1228.png', keywords: ['протеин', 'protein', 'белок'] },
};

function getProductImage(prompt) {
  const p = prompt.toLowerCase();
  for (const [key, product] of Object.entries(PRODUCTS)) {
    for (const keyword of product.keywords) {
      if (p.includes(keyword)) {
        return `/IMG_0090.png`.replace('IMG_0090.png', product.file);
      }
    }
  }
  return null;
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
    const productImage = getProductImage(prompt);
    
    if (productImage) {
      res.json({ productImage });
      return;
    }

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [
          { text: `Professional lifestyle photography of PowerPro sports nutrition product, dark moody atmosphere, cinematic lighting, rich textures, gym lifestyle aesthetic, dark black background with dramatic red and yellow accent lighting, no fake text, no labels, ultra realistic, 8k, ${prompt}`, weight: 1 },
          { text: "blurry, watermark, cartoon, anime, low quality, fake text, readable letters, blue colors, white background", weight: -1 }
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
