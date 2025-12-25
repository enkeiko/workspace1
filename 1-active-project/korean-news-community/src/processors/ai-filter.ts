import axios from 'axios';
import { CollectedItem } from '../collectors/types';

// OpenRouter API 설정
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-flash-1.5';

const openrouterApi = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3002',
    'X-Title': 'Korean News Community'
  }
});

// AI 기반 카테고리 분류
export async function classifyWithAI(item: CollectedItem): Promise<{
  category: 'ai-vibe' | 'local-biz' | 'excluded';
  confidence: number;
  reason: string;
}> {
  if (!OPENROUTER_API_KEY) {
    // AI가 없으면 기본 필터 사용
    return {
      category: 'excluded',
      confidence: 0,
      reason: 'AI API 키 미설정'
    };
  }

  const prompt = `다음 뉴스 기사를 분석하여 카테고리를 분류해주세요.

제목: ${item.title}
요약: ${item.summary || item.content?.slice(0, 300) || '없음'}

카테고리:
1. "ai-vibe": AI, 자동화, 바이브코딩, ChatGPT, SaaS, 노코드, 수익화, 부업, 1인 사업, 디지털 노마드 등과 관련된 기사
2. "local-biz": 자영업, 소상공인, 네이버 플레이스, 리뷰 마케팅, 로컬 SEO, 오프라인 매장, 매출 증대 등과 관련된 기사
3. "excluded": 위 두 카테고리와 관련이 없거나, 주식/투자/연예/정치 등 무관한 기사

다음 형식으로만 응답하세요 (JSON):
{
  "category": "ai-vibe" | "local-biz" | "excluded",
  "confidence": 0-100,
  "reason": "분류 이유 한 줄"
}`;

  try {
    const response = await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 뉴스 기사를 카테고리별로 분류하는 전문가입니다. 정확하고 일관된 분류를 위해 JSON 형식으로만 응답하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3, // 낮은 온도로 일관성 확보
      response_format: { type: 'json_object' }
    });

    const text = response.data.choices[0]?.message?.content || '{}';
    const result = JSON.parse(text);

    return {
      category: result.category || 'excluded',
      confidence: result.confidence || 0,
      reason: result.reason || '분류 완료'
    };
  } catch (error: any) {
    console.error(`❌ AI 분류 실패 (${item.title.slice(0, 30)}...):`, error.message);
    return {
      category: 'excluded',
      confidence: 0,
      reason: `AI 분류 실패: ${error.message}`
    };
  }
}

// 배치 분류 (여러 기사 한번에)
export async function classifyBatchWithAI(
  items: CollectedItem[]
): Promise<Array<{
  item: CollectedItem;
  category: 'ai-vibe' | 'local-biz' | 'excluded';
  confidence: number;
  reason: string;
}>> {
  const results: Array<{
    item: CollectedItem;
    category: 'ai-vibe' | 'local-biz' | 'excluded';
    confidence: number;
    reason: string;
  }> = [];

  for (const item of items) {
    const classification = await classifyWithAI(item);
    results.push({
      item,
      ...classification
    });

    // API 호출 간격 (Rate limit 방지)
    await delay(500);
  }

  return results;
}

// AI 기반 기사 품질 평가
export async function evaluateArticleQuality(item: CollectedItem): Promise<{
  isRelevant: boolean;
  score: number; // 0-10
  reason: string;
}> {
  if (!OPENROUTER_API_KEY) {
    return {
      isRelevant: true,
      score: 5,
      reason: 'AI API 키 미설정 - 기본 평가 사용'
    };
  }

  const categoryContext = item.category === 'ai-vibe'
    ? 'AI, 자동화, 바이브코딩, SaaS, 수익화에 관심 있는 독자'
    : '자영업, 오프라인 매장, 네이버 플레이스, 리뷰 마케팅에 관심 있는 소상공인';

  const prompt = `다음 뉴스 기사가 "${categoryContext}"에게 유용한지 평가해주세요.

제목: ${item.title}
요약: ${item.summary || item.content?.slice(0, 300) || '없음'}

평가 기준:
- 실용성: 당장 적용 가능한 정보인가?
- 수익 직결: 수익이나 매출에 직접 도움이 되는가?
- 관련성: 타겟 독자에게 정말 필요한 정보인가?

다음 형식으로만 응답하세요 (JSON):
{
  "isRelevant": true/false,
  "score": 0-10,
  "reason": "평가 이유 한 줄"
}`;

  try {
    const response = await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 뉴스 기사의 비즈니스 가치를 평가하는 전문가입니다. 엄격하고 객관적으로 평가하세요. JSON 형식으로만 응답하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const text = response.data.choices[0]?.message?.content || '{}';
    const result = JSON.parse(text);

    return {
      isRelevant: result.isRelevant !== false,
      score: result.score || 5,
      reason: result.reason || '평가 완료'
    };
  } catch (error: any) {
    console.error(`❌ AI 품질 평가 실패:`, error.message);
    return {
      isRelevant: true,
      score: 5,
      reason: `평가 실패: ${error.message}`
    };
  }
}

function delay(ms: number): Promise<void> {
  return Promise.resolve(setTimeout(() => {}, ms) as any);
}

// AI 필터 사용 가능 여부
export function isAIFilterAvailable(): boolean {
  return !!OPENROUTER_API_KEY;
}



