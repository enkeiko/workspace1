import { BlockedWordRepository } from '../database';

// 스팸 필터
export class SpamFilter {
  private blockedWords: Set<string>;
  private initialized: boolean = false;

  constructor() {
    this.blockedWords = new Set();
  }

  // 차단 단어 로드
  initialize(): void {
    if (this.initialized) return;
    
    const words = BlockedWordRepository.getAll();
    this.blockedWords = new Set(words.map(w => w.toLowerCase()));
    this.initialized = true;
  }

  // 스팸 체크
  isSpam(text: string): { isSpam: boolean; reason?: string } {
    if (!this.initialized) {
      this.initialize();
    }

    const lowerText = text.toLowerCase();

    // 1. 차단 단어 체크
    for (const word of this.blockedWords) {
      if (lowerText.includes(word)) {
        return { isSpam: true, reason: `차단된 단어 포함: ${word}` };
      }
    }

    // 2. URL 과다 포함 체크
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      return { isSpam: true, reason: 'URL 과다 포함' };
    }

    // 3. 반복 문자 체크 (예: ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ)
    if (/(.)\1{9,}/u.test(text)) {
      return { isSpam: true, reason: '반복 문자 과다' };
    }

    // 4. 특수문자 과다 체크
    const specialCharRatio = (text.match(/[^\w\s가-힣]/g) || []).length / text.length;
    if (text.length > 10 && specialCharRatio > 0.5) {
      return { isSpam: true, reason: '특수문자 과다' };
    }

    // 5. 전화번호 패턴 체크
    if (/01[0-9]-?\d{4}-?\d{4}/.test(text)) {
      return { isSpam: true, reason: '전화번호 포함' };
    }

    // 6. 금융 관련 스팸 패턴
    const financialSpam = ['대출', '급전', '카드 현금화', '승인율', '무직자'];
    for (const pattern of financialSpam) {
      if (lowerText.includes(pattern)) {
        return { isSpam: true, reason: `금융 스팸 패턴: ${pattern}` };
      }
    }

    return { isSpam: false };
  }

  // 차단 단어 추가
  addBlockedWord(word: string): boolean {
    const success = BlockedWordRepository.add(word);
    if (success) {
      this.blockedWords.add(word.toLowerCase());
    }
    return success;
  }

  // 차단 단어 제거
  removeBlockedWord(word: string): boolean {
    const success = BlockedWordRepository.remove(word);
    if (success) {
      this.blockedWords.delete(word.toLowerCase());
    }
    return success;
  }

  // 차단 단어 목록 반환
  getBlockedWords(): string[] {
    return Array.from(this.blockedWords);
  }

  // 텍스트 정제 (위험한 HTML 제거)
  sanitize(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
}

export const spamFilter = new SpamFilter();

