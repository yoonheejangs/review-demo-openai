import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

if (!OPENAI_API_KEY) {
  console.warn('[WARN] OPENAI_API_KEY is not set. API endpoints will fail until you add it to .env');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function requireApiKey(req, res, next) {
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' });
  next();
}

async function callOpenAIText(systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'review_demo_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              feedback: { type: 'string' },
              suggestedPrompt: { type: 'string' },
              polishedPrompt: { type: 'string' },
              strengths: { type: 'string' },
              improvements: { type: 'string' },
              revisedPrompt: { type: 'string' },
              score: { type: 'string' }
            }
          },
          strict: false
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI text error', data);
    throw new Error(data.error?.message || 'OpenAI 텍스트 요청에 실패했습니다.');
  }
  const rawText = data.output_text || '{}';
  return JSON.parse(rawText);
}

app.post('/api/guide', requireApiKey, async (req, res) => {
  try {
    const { mode, userPrompt = '', targetScene = '', blocks = {}, level = '' } = req.body || {};
    let systemPrompt = '당신은 한국어로 설명하는 친절한 생성형 AI 프롬프트 코치입니다. 간결하면서도 교육적이고 격려하는 톤으로 답하십시오.';
    let userMessage = '';

    if (mode === 'group1_hint') {
      userMessage = `실험의 Group 1(자유 작성) 조건을 설명하는 심사용 데모입니다. 사용자가 작성한 프롬프트를 읽고, 어떤 요소를 보완하면 좋은지 3~5문장으로 피드백하세요. 그리고 개선된 프롬프트 1개를 suggestedPrompt에 넣어 주세요.\n목표 장면: ${targetScene}\n사용자 프롬프트: ${userPrompt}`;
    } else if (mode === 'group2_prompt') {
      userMessage = `실험의 Group 2(블록 조립 기반 맥락 제공) 조건입니다. 아래 블록 조합을 바탕으로 자연스러운 한국어 프롬프트 한 문단을 polishedPrompt에 작성하세요. 또한 선택 조합의 강점과 더해지면 좋을 요소를 짧게 feedback에 작성하세요.\n블록 조합(JSON): ${JSON.stringify(blocks, null, 2)}\n목표 장면: ${targetScene}`;
    } else if (mode === 'group3_feedback') {
      userMessage = `실험의 Group 3(심화 스캐폴딩) 조건입니다. 사용자의 프롬프트를 5대 요소(주제/대상, 세부 요소, 조명/분위기, 구도/시점, 스타일) 기준으로 평가하세요. score에는 0~100 숫자만 넣고, strengths에는 강점, improvements에는 보완점, revisedPrompt에는 더 완성도 높은 개선 프롬프트를 작성하세요. 레벨 기대치: ${level}.\n사용자 프롬프트: ${userPrompt}`;
    } else {
      return res.status(400).json({ error: '지원하지 않는 guide mode입니다.' });
    }

    const result = await callOpenAIText(systemPrompt, userMessage);
    res.json(result);
  } catch (error) {
    console.error('/api/guide error', error);
    res.status(500).json({ error: error.message || 'AI 가이드 생성 중 오류가 발생했습니다.' });
  }
});

app.post('/api/generate-image', requireApiKey, async (req, res) => {
  try {
    const { prompt, group = 'demo' } = req.body || {};
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
      console.error('OpenAI image error', data);
      throw new Error(data.error?.message || 'OpenAI 이미지 생성에 실패했습니다.');
    }

    const item = data.data?.[0];
    const b64 = item?.b64_json;
    if (!b64) {
      throw new Error('OpenAI 이미지 응답에서 b64_json을 찾지 못했습니다.');
    }
    res.json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      revisedPrompt: data.data?.[0]?.revised_prompt || '',
      group
    });
  } catch (error) {
    console.error('/api/generate-image error', error);
    res.status(500).json({ error: error.message || '이미지 생성 중 오류가 발생했습니다.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`OpenAI review demo server running: http://localhost:${port}`);
});
