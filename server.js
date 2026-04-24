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

app.post('/api/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [{ text: `Professional lifestyle photography of PowerPro protein bar or protein shake, dark moody atmosphere, cinematic lighting, rich chocolate or vanilla textures, gym lifestyle aesthetic, ingredients scattered artistically around product, steam or milk splash effect, dark black background with dramatic red and yellow accent lighting, no text on products, no labels, ultra realistic, 8k, commercial food photography style, ${prompt}`, weight: 1 }, { text: "blurry, text, watermark, cartoon, anime, low quality, blue colors", weight: -1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
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
