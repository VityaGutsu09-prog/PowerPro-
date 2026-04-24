const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.static('public'));

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

function getImagePrompt(prompt) {
  const p = prompt.toLowerCase();
  
  if (p.includes('whey') || p.includes('протеин') || p.includes('protein shake') || p.includes('белок')) {
    return `Professional lifestyle photography, PowerPro Whey Protein 1kg bag, dark moody atmosphere, cinematic lighting, protein powder splash, gym aesthetic, dark black background with dramatic red and yellow accent lighting, banana or vanilla flavor visualization, no fake text, no labels, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('gainer') || p.includes('гейнер')) {
    return `Professional lifestyle photography, PowerPro Gainer 30 1kg bag, dark moody atmosphere, cinematic lighting, banana flavor, mass gainer powder splash, gym aesthetic, dark black background with dramatic yellow accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('zero') || p.includes('зеро')) {
    return `Professional lifestyle photography, PowerPro ZERO protein bar 40% protein, dark moody cinematic lighting, strawberry or chocolate cookie flavor, ingredients scattered artistically, dark black background with dramatic red accent lighting, no fake text on products, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('twins') || p.includes('твинс')) {
    return `Professional lifestyle photography, PowerPro TWINS Bar double protein bar 25% protein, dark moody cinematic lighting, chocolate coating with cookie filling, lemon or vanilla flavor, ingredients scattered artistically, dark background with accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('tortik') || p.includes('тортик')) {
    return `Professional lifestyle photography, PowerPro TORTIK protein cake bar, dark moody cinematic lighting, coconut caramel or hazelnut chocolate filling, wafer layers visible, dark background with dramatic lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('vegan') || p.includes('веган')) {
    return `Professional lifestyle photography, PowerPro Vegan Bar protein bar, dark moody cinematic lighting, choconuts hazelnut flavor, plant based ingredients scattered artistically, dark background with green and brown accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('prometheus') || p.includes('прометеус')) {
    return `Professional lifestyle photography, PowerPro Prometheus protein bar sugar free, dark moody cinematic lighting, caramel nuts filling, dark background with dramatic orange and brown accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('coco') || p.includes('кокос') || p.includes('coconut')) {
    return `Professional lifestyle photography, PowerPro Coco Joy coconut caramel bar, dark moody cinematic lighting, coconut flakes and soft caramel, dark background with blue and gold accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('36%') || p.includes('36 процент') || p.includes('power pro bar')) {
    return `Professional lifestyle photography, PowerPro 36% protein bar, dark moody cinematic lighting, almond peanut or pistachio flavor, nuts scattered artistically around bar, dark background with dramatic red and silver accent lighting, no fake text, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  if (p.includes('батончик') || p.includes('bar') || p.includes('бар')) {
    return `Professional lifestyle photography, PowerPro protein bar, dark moody atmosphere, cinematic lighting, rich chocolate textures, ingredients scattered artistically, dark black background with dramatic red and yellow accent lighting, no fake text on products, no labels, ultra realistic, 8k, commercial food photography, ${prompt}`;
  }
  
  return `Professional lifestyle photography of PowerPro sports nutrition product, dark moody atmosphere, cinematic lighting, rich textures, gym lifestyle aesthetic, ingredients scattered artistically, dark black background with dramatic red and yellow accent lighting, no fake text on products, no labels, ultra realistic, 8k, commercial food photography, ${prompt}`;
}

app.post('/api/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const smartPrompt = getImagePrompt(prompt);
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [
          { text: smartPrompt, weight: 1 },
          { text: "blurry, watermark, cartoon, anime, low quality, fake text, readable letters, misspelled words, blue colors, white background", weight: -1 }
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
