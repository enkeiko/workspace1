import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import {
  CommentRepository,
  LikeRepository,
  SubmissionRepository,
  ArticleRepository,
  Comment,
  Submission
} from '../database';
import { spamFilter } from './spam-filter';
import { generateNickname, validateNickname, generateNicknameFromUUID } from './nickname-generator';

export { generateNickname, validateNickname, generateNicknameFromUUID };

// 댓글 관련 서비스
export const CommentService = {
  // 댓글 작성
  create(data: {
    articleId: number;
    userUuid: string;
    nickname: string;
    content: string;
    parentId?: number;
  }): { success: boolean; error?: string; commentId?: number } {
    // 닉네임 검증
    const nicknameValidation = validateNickname(data.nickname);
    if (!nicknameValidation.valid) {
      return { success: false, error: nicknameValidation.error };
    }

    // 내용 검증
    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: '댓글 내용을 입력해주세요.' };
    }

    if (data.content.length > 1000) {
      return { success: false, error: '댓글은 1000자 이하로 작성해주세요.' };
    }

    // 스팸 체크
    const spamCheck = spamFilter.isSpam(data.content);
    if (spamCheck.isSpam) {
      return { success: false, error: '부적절한 내용이 포함되어 있습니다.' };
    }

    // XSS 방지
    const sanitizedContent = xss(data.content.trim());

    try {
      const commentId = CommentRepository.insert({
        article_id: data.articleId,
        parent_id: data.parentId,
        user_uuid: data.userUuid,
        nickname: xss(data.nickname.trim()),
        content: sanitizedContent
      });

      return { success: true, commentId };
    } catch (error: any) {
      return { success: false, error: '댓글 작성에 실패했습니다.' };
    }
  },

  // 댓글 목록 조회
  getByArticleId(
    articleId: number,
    orderBy: 'recent' | 'popular' = 'recent'
  ): Comment[] {
    return CommentRepository.findByArticleId(articleId, { orderBy });
  },

  // 댓글 삭제 (관리자)
  delete(commentId: number): boolean {
    try {
      CommentRepository.delete(commentId);
      return true;
    } catch {
      return false;
    }
  },

  // 스팸 처리 (관리자)
  markAsSpam(commentId: number): boolean {
    try {
      CommentRepository.markAsSpam(commentId);
      return true;
    } catch {
      return false;
    }
  }
};

// 좋아요 관련 서비스
export const LikeService = {
  // 기사 좋아요 토글
  toggleArticleLike(articleId: number, userUuid: string): {
    success: boolean;
    liked: boolean;
  } {
    const hasLiked = LikeRepository.hasLikedArticle(articleId, userUuid);
    
    if (hasLiked) {
      LikeRepository.unlikeArticle(articleId, userUuid);
      return { success: true, liked: false };
    } else {
      LikeRepository.likeArticle(articleId, userUuid);
      return { success: true, liked: true };
    }
  },

  // 기사 좋아요 여부 확인
  hasLikedArticle(articleId: number, userUuid: string): boolean {
    return LikeRepository.hasLikedArticle(articleId, userUuid);
  },

  // 댓글 좋아요 토글
  toggleCommentLike(commentId: number, userUuid: string): {
    success: boolean;
    liked: boolean;
  } {
    try {
      const liked = LikeRepository.likeComment(commentId, userUuid);
      if (liked) {
        return { success: true, liked: true };
      } else {
        LikeRepository.unlikeComment(commentId, userUuid);
        return { success: true, liked: false };
      }
    } catch {
      LikeRepository.unlikeComment(commentId, userUuid);
      return { success: true, liked: false };
    }
  }
};

// 기사 제출 관련 서비스
export const SubmissionService = {
  // 기사 제출
  submit(data: {
    userUuid: string;
    category: 'ai-vibe' | 'local-biz';
    title: string;
    url: string;
    description?: string;
    nickname?: string;
  }): { success: boolean; error?: string; submissionId?: number } {
    // URL 검증
    if (!data.url || !isValidUrl(data.url)) {
      return { success: false, error: '올바른 URL을 입력해주세요.' };
    }

    // 제목 검증
    if (!data.title || data.title.trim().length < 5) {
      return { success: false, error: '제목을 5자 이상 입력해주세요.' };
    }

    if (data.title.length > 200) {
      return { success: false, error: '제목은 200자 이하로 입력해주세요.' };
    }

    // 스팸 체크
    const contentToCheck = `${data.title} ${data.description || ''} ${data.url}`;
    const spamCheck = spamFilter.isSpam(contentToCheck);
    if (spamCheck.isSpam) {
      return { success: false, error: '부적절한 내용이 포함되어 있습니다.' };
    }

    try {
      const submissionId = SubmissionRepository.insert({
        user_uuid: data.userUuid,
        category: data.category,
        title: xss(data.title.trim()),
        url: data.url.trim(),
        description: data.description ? xss(data.description.trim()) : undefined,
        submitter_nickname: data.nickname || '익명'
      });

      return { success: true, submissionId };
    } catch (error: any) {
      return { success: false, error: '제출에 실패했습니다.' };
    }
  },

  // 대기 중인 제출 목록 조회 (관리자)
  getPending(): Submission[] {
    return SubmissionRepository.findPending();
  },

  // 제출 승인 (관리자)
  approve(submissionId: number, submission: Submission): {
    success: boolean;
    articleId?: number;
    error?: string;
  } {
    try {
      // 기사로 변환하여 저장
      const articleId = ArticleRepository.insert({
        category: submission.category,
        title: submission.title,
        summary: submission.description || '',
        original_url: submission.url,
        source_name: '사용자 제출',
        is_user_submitted: 1
      });

      // 제출 상태 업데이트
      SubmissionRepository.approve(submissionId, articleId);

      return { success: true, articleId };
    } catch (error: any) {
      return { success: false, error: '승인 처리에 실패했습니다.' };
    }
  },

  // 제출 거부 (관리자)
  reject(submissionId: number, note?: string): boolean {
    try {
      SubmissionRepository.reject(submissionId, note);
      return true;
    } catch {
      return false;
    }
  }
};

// 사용자 UUID 관리
export const UserService = {
  // UUID 생성 또는 가져오기
  getOrCreateUUID(existingUuid?: string): string {
    if (existingUuid && isValidUUID(existingUuid)) {
      return existingUuid;
    }
    return uuidv4();
  },

  // 기본 닉네임 생성
  getDefaultNickname(uuid: string): string {
    return generateNicknameFromUUID(uuid);
  }
};

// 유틸리티 함수
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

