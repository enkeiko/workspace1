import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client 생성
 *
 * 개발 환경에서는 쿼리 로그 활성화 가능:
 * - LOG_PRISMA_QUERIES=true 설정 시 쿼리 로그 출력
 * - 성능 분석 및 N+1 쿼리 감지에 유용
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  // 개발 환경에서 쿼리 로그 활성화 여부
  const enableQueryLog =
    process.env.NODE_ENV === "development" &&
    process.env.LOG_PRISMA_QUERIES === "true";

  const logConfig: ("query" | "info" | "warn" | "error")[] = enableQueryLog
    ? ["query", "info", "warn", "error"]
    : process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"];

  const client = new PrismaClient({
    adapter,
    log: logConfig,
  });

  // 쿼리 로그 이벤트 리스너 (LOG_PRISMA_QUERIES=true 시에만 동작)
  if (enableQueryLog) {
    client.$on("query", (e: { query: string; params: string; duration: number }) => {
      console.log("📝 Query:", e.query);
      console.log("   Params:", e.params);
      console.log(`   Duration: ${e.duration}ms`);
      console.log("---");
    });

    console.log("🔍 Prisma Query Logging ENABLED");
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
