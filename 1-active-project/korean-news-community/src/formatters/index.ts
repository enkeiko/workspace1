import fs from 'fs';
import path from 'path';
import { ArticleRepository, Article, UpdateLogRepository } from '../database';
import { config } from '../config';
import { formatKakaoOutput, formatKakaoShort } from './kakao';
import { formatHtmlOutput } from './html';
import { formatMarkdownOutput } from './markdown';

export interface UpdateData {
  aiVibe: Article[];
  localBiz: Article[];
  updateTime: string;
}

// 출력 디렉토리 생성
function ensureOutputDir(): void {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

// 모든 포맷 출력 생성
export async function generateAllOutputs(hoursAgo: number = 6): Promise<{
  success: boolean;
  files: string[];
  error?: string;
}> {
  try {
    ensureOutputDir();
    
    // 최근 기사 조회
    const aiVibe = ArticleRepository.getRecentByTimeRange(hoursAgo, 'ai-vibe')
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 10);
    
    const localBiz = ArticleRepository.getRecentByTimeRange(hoursAgo, 'local-biz')
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 10);
    
    const now = new Date();
    const updateTime = now.toTimeString().slice(0, 5);
    
    const data: UpdateData = { aiVibe, localBiz, updateTime };
    const files: string[] = [];
    
    // 1. 카카오톡 포맷
    const kakaoContent = formatKakaoOutput(data);
    const kakaoPath = path.join(config.outputDir, 'kakao_output.txt');
    fs.writeFileSync(kakaoPath, kakaoContent, 'utf-8');
    files.push('kakao_output.txt');
    
    // 2. HTML 포맷
    const htmlContent = formatHtmlOutput(data);
    const htmlPath = path.join(config.outputDir, 'web_output.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    files.push('web_output.html');
    
    // 3. Markdown 포맷 (통합)
    const mdContent = formatMarkdownOutput(data);
    const mdPath = path.join(config.outputDir, 'web_output.md');
    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    files.push('web_output.md');
    
    // 4. AI·바이브코딩 전용 Markdown
    const aiVibeMd = formatCategoryMarkdown(aiVibe, 'ai-vibe', updateTime);
    const aiVibePath = path.join(config.outputDir, 'ai-vibe-news.md');
    fs.writeFileSync(aiVibePath, aiVibeMd, 'utf-8');
    files.push('ai-vibe-news.md');
    
    // 5. 자영업·플레이스 전용 Markdown
    const localBizMd = formatCategoryMarkdown(localBiz, 'local-biz', updateTime);
    const localBizPath = path.join(config.outputDir, 'local-biz-news.md');
    fs.writeFileSync(localBizPath, localBizMd, 'utf-8');
    files.push('local-biz-news.md');
    
    console.log(`📄 출력 파일 생성 완료: ${files.join(', ')}`);
    
    return { success: true, files };
  } catch (error: any) {
    console.error('❌ 출력 파일 생성 실패:', error.message);
    return { success: false, files: [], error: error.message };
  }
}

// 특정 포맷만 생성
export function generateKakaoOutput(data: UpdateData): string {
  return formatKakaoOutput(data);
}

export function generateHtmlOutput(data: UpdateData): string {
  return formatHtmlOutput(data);
}

export function generateMarkdownOutput(data: UpdateData): string {
  return formatMarkdownOutput(data);
}

// 최근 업데이트 데이터 가져오기
export function getLatestUpdateData(hoursAgo: number = 6): UpdateData {
  const aiVibe = ArticleRepository.getRecentByTimeRange(hoursAgo, 'ai-vibe')
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
    .slice(0, 10);
  
  const localBiz = ArticleRepository.getRecentByTimeRange(hoursAgo, 'local-biz')
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
    .slice(0, 10);
  
  const updateTime = new Date().toTimeString().slice(0, 5);
  
  return { aiVibe, localBiz, updateTime };
}

// 카테고리별 Markdown 생성
function formatCategoryMarkdown(
  articles: Article[],
  category: 'ai-vibe' | 'local-biz',
  updateTime: string
): string {
  const isAiVibe = category === 'ai-vibe';
  const emoji = isAiVibe ? '🔵' : '🟢';
  const title = isAiVibe ? 'AI · 바이브코딩 뉴스' : '자영업 · 네이버 플레이스 뉴스';
  const tags = isAiVibe 
    ? ['AI', '자동화', '바이브코딩', 'ChatGPT', 'SaaS', '노코드', '수익화', '부업']
    : ['자영업', '네이버플레이스', '리뷰마케팅', '로컬SEO', '매출', '오프라인', '소상공인'];
  const footer = isAiVibe 
    ? '*이 뉴스레터가 도움이 되셨다면 공유해주세요!* 🚀'
    : '*우리 매장 매출 올리는 꿀팁, 놓치지 마세요!* 💪';

  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  let md = `# ${emoji} ${title}\n\n`;
  md += `> 📅 ${dateStr} | ⏰ ${updateTime} 업데이트\n\n`;
  md += `---\n\n`;
  md += `## 📰 오늘의 주요 소식\n\n`;

  if (articles.length === 0) {
    md += `> 📭 새로운 소식이 없습니다.\n\n`;
  } else {
    articles.slice(0, 10).forEach((article, index) => {
      // 제목 (링크 포함)
      md += `### ${index + 1}. [${article.title}](${article.original_url})\n\n`;
      
      // 요약 (더 자세하게)
      if (article.summary) {
        let summary = article.summary;
        // 요약이 너무 짧으면 제목 정보 추가
        if (summary.length < 150) {
          summary = `${summary} ${article.title}에 대한 상세 내용은 원문을 확인하세요.`;
        }
        md += `${summary}\n\n`;
      } else {
        md += `${article.title}에 대한 최신 소식입니다. 자세한 내용은 원문을 확인하세요.\n\n`;
      }
      
      // 메타 정보
      md += `**출처**: ${article.source_name || '알 수 없음'}`;
      if (article.total_score) {
        md += ` | **점수**: ${article.total_score.toFixed(1)}/10`;
      }
      md += `\n\n`;
      
      // 링크 (명확하게)
      md += `🔗 [전체 기사 읽기 →](${article.original_url})\n\n`;
      md += `---\n\n`;
    });
  }

  md += `## 🏷️ 관련 태그\n\n`;
  md += tags.map(t => `\`#${t}\``).join(' ') + '\n\n';
  md += `---\n\n`;
  md += `## 📲 더 많은 소식\n\n`;
  md += `🔗 **사이트 방문**: http://localhost:3000\n\n`;
  md += `⏰ **업데이트 시간**: 07:00 / 12:00 / 18:00 / 23:00\n\n`;
  md += `---\n\n`;
  md += footer + '\n';

  return md;
}

export { formatKakaoOutput, formatKakaoShort } from './kakao';
export { formatHtmlOutput } from './html';
export { formatMarkdownOutput, formatMarkdownTable, formatSimpleMarkdown } from './markdown';

