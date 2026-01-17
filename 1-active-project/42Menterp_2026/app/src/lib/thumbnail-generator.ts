/**
 * 썸네일 생성기
 *
 * 작업 증빙 URL에서 썸네일 이미지를 생성합니다.
 *
 * 전략:
 * 1. OG(Open Graph) 이미지 추출 시도
 * 2. Favicon 추출 시도
 * 3. 기본 플레이스홀더 반환
 *
 * 참고: 서버리스 환경(Vercel)에서는 Puppeteer 스크린샷이 제한적입니다.
 * 프로덕션에서는 별도 서버 또는 외부 서비스(screenshotmachine, urlbox 등) 사용 권장
 */

import { put } from "@vercel/blob";

// OG 이미지 추출을 위한 메타태그 파싱
interface OGMetadata {
  ogImage?: string;
  ogTitle?: string;
  favicon?: string;
}

/**
 * URL에서 OG 메타데이터 추출
 */
async function extractOGMetadata(url: string): Promise<OGMetadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    // OG 이미지 추출
    const ogImageMatch = html.match(
      /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i
    ) || html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i
    );

    // OG 타이틀 추출
    const ogTitleMatch = html.match(
      /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i
    ) || html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i
    );

    // Favicon 추출
    const faviconMatch = html.match(
      /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i
    ) || html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i
    );

    const result: OGMetadata = {};

    if (ogImageMatch?.[1]) {
      result.ogImage = resolveUrl(url, ogImageMatch[1]);
    }

    if (ogTitleMatch?.[1]) {
      result.ogTitle = ogTitleMatch[1];
    }

    if (faviconMatch?.[1]) {
      result.favicon = resolveUrl(url, faviconMatch[1]);
    }

    return result;
  } catch (error) {
    console.error("OG metadata extraction error:", error);
    return {};
  }
}

/**
 * 상대 URL을 절대 URL로 변환
 */
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }

  try {
    const base = new URL(baseUrl);
    return new URL(relativeUrl, base).href;
  } catch {
    return relativeUrl;
  }
}

/**
 * 이미지를 다운로드하여 Vercel Blob에 업로드
 */
async function uploadImageToBlob(
  imageUrl: string,
  filename: string
): Promise<string | null> {
  try {
    // 환경변수 확인
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("BLOB_READ_WRITE_TOKEN not set, skipping blob upload");
      return imageUrl; // Blob 토큰이 없으면 원본 URL 반환
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();

    // 파일 확장자 결정
    let extension = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = "jpg";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    } else if (contentType.includes("gif")) {
      extension = "gif";
    }

    // Vercel Blob에 업로드
    const blob = await put(`thumbnails/${filename}.${extension}`, buffer, {
      access: "public",
      contentType,
    });

    return blob.url;
  } catch (error) {
    console.error("Image upload error:", error);
    return null;
  }
}

/**
 * 기본 플레이스홀더 URL 생성
 */
function getPlaceholderUrl(text: string): string {
  const encodedText = encodeURIComponent(text.substring(0, 20));
  return `https://placehold.co/400x300/e2e8f0/64748b?text=${encodedText}`;
}

/**
 * 썸네일 생성 메인 함수
 *
 * @param url - 작업 증빙 URL
 * @param itemId - PurchaseOrderItem ID (파일명용)
 * @returns 생성된 썸네일 URL 또는 null
 */
export async function generateThumbnail(
  url: string,
  itemId: string
): Promise<string | null> {
  try {
    // 1. OG 메타데이터 추출 시도
    const metadata = await extractOGMetadata(url);

    // 2. OG 이미지가 있으면 사용
    if (metadata.ogImage) {
      const thumbnailUrl = await uploadImageToBlob(metadata.ogImage, itemId);
      if (thumbnailUrl) {
        return thumbnailUrl;
      }
    }

    // 3. OG 이미지가 없으면 플레이스홀더 반환
    const domain = new URL(url).hostname;
    return getPlaceholderUrl(domain);
  } catch (error) {
    console.error("Thumbnail generation error:", error);

    // 에러 시 플레이스홀더 반환
    try {
      const domain = new URL(url).hostname;
      return getPlaceholderUrl(domain);
    } catch {
      return getPlaceholderUrl("Error");
    }
  }
}

/**
 * 다중 썸네일 일괄 생성
 */
export async function generateThumbnails(
  items: Array<{ url: string; itemId: string }>
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // 병렬 처리 (최대 5개씩)
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(({ url, itemId }) => generateThumbnail(url, itemId))
    );

    batch.forEach((item, index) => {
      const result = batchResults[index];
      results.set(
        item.itemId,
        result.status === "fulfilled" ? result.value : null
      );
    });
  }

  return results;
}

/**
 * 특정 도메인에 대한 썸네일 전략
 */
export function getThumbnailStrategy(url: string): "og" | "screenshot" | "placeholder" {
  try {
    const hostname = new URL(url).hostname;

    // 블로그 플랫폼 - OG 이미지 지원
    if (
      hostname.includes("blog.naver.com") ||
      hostname.includes("tistory.com") ||
      hostname.includes("brunch.co.kr") ||
      hostname.includes("velog.io") ||
      hostname.includes("medium.com")
    ) {
      return "og";
    }

    // 네이버 플레이스 - 스크린샷 필요
    if (hostname.includes("naver.me") || hostname.includes("map.naver.com")) {
      return "screenshot";
    }

    // 기타 - OG 시도
    return "og";
  } catch {
    return "placeholder";
  }
}
