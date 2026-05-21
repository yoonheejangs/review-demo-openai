const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

function safeJsonParse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (e) {}
    }
    return { feedback: text };
  }
}

function fillDefaults(result, mode) {
  const r = result || {};
  if (mode === 'group1_hint') {
    return {
      feedback: r.feedback || '프롬프트의 방향은 좋습니다. 장면의 대상, 조명, 구도, 세부 요소를 조금 더 구체화하면 이미지 생성 결과가 안정적으로 나올 수 있습니다.',
      suggestedPrompt: r.suggestedPrompt || r.polishedPrompt || r.revisedPrompt || '따뜻한 햇살이 비치는 책상 위에 작은 나무와 벤치가 놓인 미니어처 공원 디오라마, 부드러운 자연광, 섬세한 질감, 상단 사선 구도'
    };
  }
  if (mode === 'group2_prompt') {
    return {
      feedback: r.feedback || '선택한 블록들이 장면의 기본 구조를 잘 만들고 있습니다. 분위기, 조명, 구도 요소를 함께 넣으면 프롬프트가 더 선명해집니다.',
      polishedPrompt: r.polishedPrompt || r.suggestedPrompt || r.revisedPrompt || '책상 위에 놓인 미니어처 디오라마 장면입니다. 선택한 블록의 대상과 세부 요소가 조화롭게 배치되어 있고, 따뜻한 조명과 섬세한 디테일이 돋보입니다.'
    };
  }
  if (mode === 'group3_feedback') {
    return {
      score: r.score || '78',
      strengths: r.strengths || '주제와 장면의 방향이 비교적 명확합니다.',
      improvements: r.improvements || '조명, 구도, 스타일, 세부 요소를 더 구체적으로 넣으면 결과물이 더 안정적으로 생성됩니다.',
      revisedPrompt: r.revisedPrompt || r.polishedPrompt || r.suggestedPrompt || '책상 위에 놓인 정교한 미니어처 디오라마, 명확한 주제와 세부 소품, 따뜻한 조명, 상단 사선 구도, 고해상도 디테일'
    };
  }
  return r;
}

async function callOpenAIChat(systemPrompt, userPrompt, mode) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI 텍스트 요청에 실패했습니다.');
  }

  const content = data.choices?.[0]?.message?.content || '';
  return fillDefaults(safeJsonParse(content), mode);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { mode, userPrompt = '', targetScene = '', blocks = {}, level = '' } = body;

    let userMessage = '';
    const systemPrompt = `당신은 한국어로 설명하는 친절한 생성형 AI 프롬프트 코치입니다.
반드시 JSON만 반환하세요. 마크다운, 코드블록, 설명문을 붙이지 마세요.
필요한 필드가 비어 있지 않도록 짧고 명확하게 작성하세요.`;

    if (mode === 'group1_hint') {
      userMessage = `아래 사용자 프롬프트를 보고 초보자에게 줄 보완 피드백을 작성하세요.
JSON 형식:
{"feedback":"3~5문장의 보완 포인트","suggestedPrompt":"개선된 한국어 이미지 생성 프롬프트 1개"}

목표 장면: ${targetScene}
사용자 프롬프트: ${userPrompt}`;
    } else if (mode === 'group2_prompt') {
      userMessage = `아래 블록 조합을 바탕으로 자연스러운 한국어 이미지 생성 프롬프트와 짧은 피드백을 작성하세요.
JSON 형식:
{"polishedPrompt":"자연스러운 한국어 프롬프트 한 문단","feedback":"선택 블록 조합의 강점과 보완점"}

블록 조합:
${JSON.stringify(blocks, null, 2)}
목표 장면: ${targetScene}`;
    } else if (mode === 'group3_feedback') {
      userMessage = `사용자 프롬프트를 5대 요소(주제/대상, 세부 요소, 조명/분위기, 구도/시점, 스타일) 기준으로 평가하세요.
JSON 형식:
{"score":"0~100 사이 숫자","strengths":"강점","improvements":"보완점","revisedPrompt":"개선된 프롬프트"}

레벨 기대치: ${level}
사용자 프롬프트: ${userPrompt}`;
    } else {
      return res.status(400).json({ error: '지원하지 않는 guide mode입니다.' });
    }

    const result = await callOpenAIChat(systemPrompt, userMessage, mode);
    return res.status(200).json(result);
  } catch (error) {
    console.error('/api/guide error', error);
    return res.status(500).json({ error: error.message || 'AI 가이드 생성 중 오류가 발생했습니다.' });
  }
}