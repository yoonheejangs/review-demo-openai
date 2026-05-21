const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt, group = 'demo' } = body;

    if (!prompt || prompt.trim().length < 5) {
      return res.status(400).json({ error: '이미지 생성을 위한 프롬프트가 너무 짧습니다.' });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        size: '1024x1024'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI 이미지 생성에 실패했습니다.');
    }

    const item = data.data?.[0];
    const b64 = item?.b64_json;
    if (!b64) {
      throw new Error('OpenAI 이미지 응답에서 b64_json을 찾지 못했습니다.');
    }

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      revisedPrompt: item?.revised_prompt || '',
      group
    });
  } catch (error) {
    console.error('/api/generate-image error', error);
    return res.status(500).json({ error: error.message || '이미지 생성 중 오류가 발생했습니다.' });
  }
}