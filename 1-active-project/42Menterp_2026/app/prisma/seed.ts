import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@42ment.com" },
    update: {},
    create: {
      email: "admin@42ment.com",
      password: hashedPassword,
      name: "관리자",
      role: "SUPER_ADMIN",
    },
  });

  console.log("Created admin user:", admin.email);

  // Create sample channels (공급업체) - ChannelType: REVIEW, SAVE, DIRECTION, TRAFFIC
  const channels = [
    { name: "피닉스", code: "PHOENIX", type: "TRAFFIC" as const, baseUnitPrice: 35 },
    { name: "히든", code: "HIDDEN", type: "TRAFFIC" as const, baseUnitPrice: 35 },
    { name: "호올스", code: "HOALLS", type: "TRAFFIC" as const, baseUnitPrice: 35 },
    { name: "말차", code: "MATCHA", type: "DIRECTION" as const, baseUnitPrice: 80 },
    { name: "버즈빌", code: "BUZZVIL", type: "TRAFFIC" as const, baseUnitPrice: 30 },
    { name: "퍼플페퍼", code: "PURPLE_PEPPER", type: "SAVE" as const, baseUnitPrice: 23 },
    { name: "애드머스", code: "ADMUS", type: "SAVE" as const, baseUnitPrice: 25 },
    { name: "불곰", code: "BEAR", type: "SAVE" as const, baseUnitPrice: 20 },
  ];

  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { code: channel.code },
      update: {},
      create: channel,
    });
    console.log("Created channel:", channel.name);
  }

  // Create 20 products (마케팅 서비스)
  const products = [
    // 트래픽 (10개)
    { code: "PHOENIX", name: "피닉스", type: "TRAFFIC" as const, saleUnitPrice: 50, costUnitPrice: 35, description: "트래픽 상품 - 피닉스" },
    { code: "HOALLS", name: "호올스", type: "TRAFFIC" as const, saleUnitPrice: 50, costUnitPrice: 35, description: "트래픽 상품 - 호올스" },
    { code: "HIDDEN", name: "히든", type: "TRAFFIC" as const, saleUnitPrice: 50, costUnitPrice: 35, description: "트래픽 상품 - 히든" },
    { code: "EXCELLENT", name: "엑셀런트", type: "TRAFFIC" as const, saleUnitPrice: 55, costUnitPrice: 40, description: "트래픽 상품 - 엑셀런트" },
    { code: "TOSS", name: "토스", type: "TRAFFIC" as const, saleUnitPrice: 60, costUnitPrice: 45, description: "트래픽 상품 - 토스" },
    { code: "DATA", name: "다타", type: "TRAFFIC" as const, saleUnitPrice: 55, costUnitPrice: 38, description: "트래픽 상품 - 다타" },
    { code: "UNDERTHEDEAL", name: "언더더딜", type: "TRAFFIC" as const, saleUnitPrice: 55, costUnitPrice: 38, description: "트래픽 상품 - 언더더딜" },
    { code: "PERFECT", name: "퍼펙트", type: "TRAFFIC" as const, saleUnitPrice: 60, costUnitPrice: 42, description: "트래픽 상품 - 퍼펙트" },
    { code: "BUZZVIL", name: "버즈빌", type: "TRAFFIC" as const, saleUnitPrice: 45, costUnitPrice: 30, description: "트래픽 상품 - 버즈빌" },
    { code: "TENK", name: "텐케이", type: "TRAFFIC" as const, saleUnitPrice: 50, costUnitPrice: 35, description: "트래픽 상품 - 텐케이" },

    // 길찾기 (3개)
    { code: "HOMERUNBALL", name: "홈런볼/길찾", type: "DIRECTION" as const, saleUnitPrice: 100, costUnitPrice: 70, description: "길찾기 상품 - 홈런볼" },
    { code: "MATCHA_DIR", name: "말차길찾기", type: "DIRECTION" as const, saleUnitPrice: 110, costUnitPrice: 80, description: "길찾기 상품 - 말차" },
    { code: "BUZZVIL_DIR", name: "버즈빌길", type: "DIRECTION" as const, saleUnitPrice: 90, costUnitPrice: 65, description: "길찾기 상품 - 버즈빌" },

    // 블로그 (2개)
    { code: "REAL_BLOG", name: "실블", type: "BLOG" as const, saleUnitPrice: 150, costUnitPrice: 100, description: "블로그 상품 - 실명블로그" },
    { code: "ANON_BLOG", name: "비실", type: "BLOG" as const, saleUnitPrice: 120, costUnitPrice: 80, description: "블로그 상품 - 비실명블로그" },

    // 리뷰 (3개)
    { code: "GET", name: "겟", type: "REVIEW" as const, saleUnitPrice: 80, costUnitPrice: 55, description: "리뷰 상품 - 겟" },
    { code: "EXTRA", name: "추가", type: "REVIEW" as const, saleUnitPrice: 70, costUnitPrice: 50, description: "리뷰 상품 - 추가리뷰" },
    { code: "247", name: "247", type: "REVIEW" as const, saleUnitPrice: 85, costUnitPrice: 60, description: "리뷰 상품 - 247" },

    // 영수증 (3개)
    { code: "RECEIPT_PURPLE", name: "영수증(퍼플)", type: "RECEIPT" as const, saleUnitPrice: 35, costUnitPrice: 23, description: "영수증 상품 - 퍼플페퍼" },
    { code: "RECEIPT_AD", name: "영수증(애드)", type: "RECEIPT" as const, saleUnitPrice: 38, costUnitPrice: 25, description: "영수증 상품 - 애드머스" },
    { code: "RECEIPT_BEAR", name: "영수증(불곰)", type: "RECEIPT" as const, saleUnitPrice: 32, costUnitPrice: 20, description: "영수증 상품 - 불곰" },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        type: product.type,
        saleUnitPrice: product.saleUnitPrice,
        costUnitPrice: product.costUnitPrice,
        description: product.description,
      },
      create: product,
    });
    console.log("Created product:", product.name);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
