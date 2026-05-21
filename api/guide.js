
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

async function callOpenAIText(systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
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
            type: 'object', additionalProperties: false,
            properties: {
              feedback: { type: 'string' }, suggestedPrompt: { type: 'string' }, polishedPrompt: { type: 'string' }, strengths: { type: 'string' }, improvements: { type: 'string' }, revisedPrompt: { type: 'string' }, score: { type: 'string' }
            }
          },
          strict: false
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI 텍스트 요청에 실패했습니다.');
  return JSON.parse(data.output_text || '{}');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' });
  try {
    const { mode, userPrompt = '', targetScene = '', blocks = {}, level = '' } = req.body || {};
    let userMessage = '';
    const systemPrompt = '당신은 한국어로 설명하는 친절한 생성형 AI 프롬프트 코치입니다. 간결하면서도 교육적이고 격려하는 톤으로 답하십시오.';
    if (mode === 'group1_hint') {
      userMessage = `실험의 Group 1(자유 작성) 조건을 설명하는 심사용 데모입니다. 사용자가 작성한 프롬프트를 읽고, 어떤 요소를 보완하면 좋은지 3~5문장으로 피드백하세요. 그리고 개선된 프롬프트 1개를 suggestedPrompt에 넣어 주세요.
목표 장면: ${targetScene}
사용자 프롬프트: ${userPrompt}`;
    } else if (mode === 'group2_prompt') {
      userMessage = `실험의 Group 2(블록 조립 기반 맥락 제공) 조건입니다. 아래 블록 조합을 바탕으로 자연스러운 한국어 프롬프트 한 문단을 polishedPrompt에 작성하세요. 또한 선택 조합의 강점과 더해지면 좋을 요소를 짧게 feedback에 작성하세요.
블록 조합(JSON): ${JSON.stringify(blocks, null, 2)}
목표 장면: ${targetScene}`;
    } else if (mode === 'group3_feedback') {
      userMessage = `실험의 Group 3(심화 스캐폴딩) 조건입니다. 사용자의 프롬프트를 5대 요소(주제/대상, 세부 요소, 조명/분위기, 구도/시점, 스타일) 기준으로 평가하세요. score에는 0~100 숫자만 넣고, strengths에는 강점, improvements에는 보완점, revisedPrompt에는 더 완성도 높은 개선 프롬프트를 작성하세요. 레벨 기대치: ${level}.
사용자 프롬프트: ${userPrompt}`;
    } else {
      return res.status(400).json({ error: '지원하지 않는 guide mode입니다.' });
    }
    const result = await callOpenAIText(systemPrompt, userMessage);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'AI 가이드 생성 중 오류가 발생했습니다.' });
  }
};
