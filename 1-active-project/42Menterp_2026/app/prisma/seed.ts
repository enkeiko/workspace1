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

  // Create sample channels
  const channels = [
    { name: "피닉스", code: "PHOENIX", type: "REVIEW" as const, baseUnitPrice: 100 },
    { name: "말차", code: "MATCHA", type: "REVIEW" as const, baseUnitPrice: 80 },
    { name: "히든", code: "HIDDEN", type: "TRAFFIC" as const, baseUnitPrice: 35 },
    { name: "호올스", code: "HALLS", type: "REVIEW" as const, baseUnitPrice: 90 },
    { name: "엑셀런트", code: "EXCELLENT", type: "TRAFFIC" as const, baseUnitPrice: 40 },
    { name: "토스", code: "TOSS", type: "SAVE" as const, baseUnitPrice: 50 },
    { name: "퍼플페퍼", code: "PURPLE_PEPPER", type: "TRAFFIC" as const, baseUnitPrice: 23 },
  ];

  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { code: channel.code },
      update: {},
      create: channel,
    });
    console.log("Created channel:", channel.name);
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
