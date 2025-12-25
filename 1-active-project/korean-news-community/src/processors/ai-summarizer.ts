import axios from 'axios';

// OpenRouter API 설정 (다양한 AI 모델 지원)
// 발급: https://openrouter.ai/keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-flash-1.5'; // 안정적인 Gemini 모델

const openrouterApi = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Korean News Community'
  }
});

// AI 요약 생성
export async function generateAISummary(
  title: string,
  content: string,
  category: 'ai-vibe' | 'local-biz'
): Promise<{ summary: string; actionIdea: string }> {
  if (!OPENROUTER_API_KEY) {
    console.log('⚠️ OpenRouter API 키 미설정 - 기본 요약 사용');
    return {
      summary: content.slice(0, 200) + '...',
      actionIdea: getDefaultActionIdea(category)
    };
  }

  const categoryContext = category === 'ai-vibe'
    ? 'AI, 자동화, 바이브코딩, SaaS, 수익화에 관심 있는 독자'
    : '자영업, 오프라인 매장, 네이버 플레이스, 리뷰 마케팅에 관심 있는 소상공인';

  const prompt = `다음 뉴스 기사를 분석해주세요.

제목: ${title}

내용: ${content.slice(0, 2000)}

타겟 독자: ${categoryContext}

다음 형식으로 응답해주세요:

## 요약
(2-3문장으로 핵심 내용 요약)

## 적용 아이디어
(독자가 당장 실행할 수 있는 구체적인 한 줄 액션)`;

  try {
    const response = await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 한국 비즈니스 뉴스를 분석하는 전문가입니다. 실용적이고 행동 가능한 인사이트를 제공합니다. 한국어로 답변하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const text = response.data.choices[0]?.message?.content || '';
    
    // 응답 파싱
    const summaryMatch = text.match(/## 요약\s*([\s\S]*?)(?=## 적용|$)/);
    const actionMatch = text.match(/## 적용 아이디어\s*([\s\S]*?)$/);
    
    const summary = summaryMatch 
      ? summaryMatch[1].trim() 
      : text.slice(0, 200);
    
    const actionIdea = actionMatch 
      ? actionMatch[1].trim() 
      : getDefaultActionIdea(category);

    console.log(`✅ AI 요약 생성 완료: ${title.slice(0, 30)}...`);
    
    return { summary, actionIdea };
  } catch (error: any) {
    console.error('❌ AI 요약 실패:', error.message);
    return {
      summary: content.slice(0, 200) + '...',
      actionIdea: getDefaultActionIdea(category)
    };
  }
}

// 배치 요약 (여러 기사 한번에)
export async function generateBatchSummaries(
  articles: Array<{
    title: string;
    content: string;
    category: 'ai-vibe' | 'local-biz';
  }>
): Promise<Array<{ summary: string; actionIdea: string }>> {
  const results: Array<{ summary: string; actionIdea: string }> = [];
  
  for (const article of articles) {
    const result = await generateAISummary(
      article.title,
      article.content,
      article.category
    );
    results.push(result);
    
    // API 호출 간격 (Rate limit 방지)
    await delay(500);
  }
  
  return results;
}

// 태그 자동 생성
export async function generateAITags(
  title: string,
  content: string
): Promise<string[]> {
  if (!OPENROUTER_API_KEY) {
    return [];
  }

  try {
    const response = await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '뉴스 기사에서 관련 태그를 추출하는 전문가입니다. 태그만 쉼표로 구분해서 응답하세요.'
        },
        {
          role: 'user',
          content: `다음 기사에서 5개 이하의 핵심 태그를 추출하세요.\n\n제목: ${title}\n\n내용: ${content.slice(0, 500)}\n\n태그 (쉼표 구분):`
        }
      ],
      max_tokens: 100,
      temperature: 0.5
    });

    const text = response.data.choices[0]?.message?.content || '';
    const tags = text.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    
    return tags.slice(0, 5);
  } catch (error) {
    return [];
  }
}

// 점수 예측 (AI 기반)
export async function predictArticleScore(
  title: string,
  content: string,
  category: 'ai-vibe' | 'local-biz'
): Promise<{
  practicality: number;
  profitPotential: number;
  scalability: number;
}> {
  if (!OPENROUTER_API_KEY) {
    return { practicality: 5, profitPotential: 5, scalability: 5 };
  }

  const categoryContext = category === 'ai-vibe'
    ? '디지털 수익화, AI 자동화, 1인 사업'
    : '오프라인 매장 매출, 네이버 플레이스 SEO, 리뷰 마케팅';

  try {
    const response = await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '뉴스 기사의 비즈니스 가치를 평가하는 전문가입니다. 숫자만 응답하세요.'
        },
        {
          role: 'user',
          content: `다음 기사를 ${categoryContext} 관점에서 평가하세요.

제목: ${title}
내용: ${content.slice(0, 500)}

1-10점으로 평가 (숫자만):
- 실용성:
- 수익 직결 가능성:
- 확장 가능성:`
        }
      ],
      max_tokens: 50,
      temperature: 0.3
    });

    const text = response.data.choices[0]?.message?.content || '';
    const numbers = text.match(/\d+/g) || [];
    
    return {
      practicality: parseInt(numbers[0]) || 5,
      profitPotential: parseInt(numbers[1]) || 5,
      scalability: parseInt(numbers[2]) || 5
    };
  } catch (error) {
    return { practicality: 5, profitPotential: 5, scalability: 5 };
  }
}

// 기본 액션 아이디어
function getDefaultActionIdea(category: 'ai-vibe' | 'local-biz'): string {
  if (category === 'ai-vibe') {
    return '이 기술/트렌드를 내 업무나 사이드 프로젝트에 어떻게 적용할지 생각해보세요.';
  }
  return '이 전략을 우리 매장 상황에 맞게 적용할 방법을 고민해보세요.';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API 키 확인
export function isOpenAIConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}

// 사용량 체크 (비용 관리)
export async function checkUsage(): Promise<{
  available: boolean;
  message: string;
}> {
  if (!OPENROUTER_API_KEY) {
    return { available: false, message: 'API 키 미설정' };
  }

  try {
    // 간단한 테스트 요청
    await openrouterApi.post('/chat/completions', {
      model: AI_MODEL,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    return { available: true, message: 'API 정상 작동' };
  } catch (error: any) {
    if (error.response?.status === 429) {
      return { available: false, message: 'Rate limit 초과' };
    }
    if (error.response?.status === 401) {
      return { available: false, message: 'API 키 오류' };
    }
    return { available: false, message: error.message };
  }
}

// 추천 모델 목록
export const RECOMMENDED_MODELS = {
  free: [
    'google/gemini-2.0-flash-exp:free',      // Gemini 2.0 무료
    'meta-llama/llama-3.2-3b-instruct:free', // Llama 3.2 무료
    'qwen/qwen-2-7b-instruct:free',          // Qwen 2 무료
  ],
  cheap: [
    'google/gemini-flash-1.5',               // $0.075/1M tokens
    'anthropic/claude-3-haiku',              // $0.25/1M tokens  
    'openai/gpt-4o-mini',                    // $0.15/1M tokens
  ],
  quality: [
    'anthropic/claude-3.5-sonnet',           // 최고 품질
    'openai/gpt-4o',                         // GPT-4o
    'google/gemini-pro-1.5',                 // Gemini Pro
  ]
};

