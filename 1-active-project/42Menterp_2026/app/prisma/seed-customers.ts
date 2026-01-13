/**
 * 거래처목록(1~94).xls 레거시 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-customers.ts
 *
 * 또는 Data 폴더에서 파일 경로 지정:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-customers.ts "../Data/거래처목록(1~94).xls"
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface CustomerRow {
  businessNo: string;
  name: string;
  representative: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  memo: string | null;
}

async function main() {
  // 파일 경로 결정
  const defaultPath = path.join(__dirname, "../../Data/거래처목록(1~94).xls");
  const filePath = process.argv[2] || defaultPath;

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    console.log("\n사용법:");
    console.log("  npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed-customers.ts [파일경로]");
    process.exit(1);
  }

  console.log(`파일 읽기: ${filePath}`);

  // Excel 파일 읽기
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

  console.log(`시트명: ${sheetName}`);
  console.log(`총 행 수: ${data.length}`);

  // 헤더 행 찾기 (거래처등록번호가 있는 행)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some((cell) => String(cell).includes("거래처등록번호"))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error("헤더 행을 찾을 수 없습니다. 기본값(4)을 사용합니다.");
    headerRowIndex = 3; // 0-indexed, 실제 4번째 행
  }

  console.log(`헤더 행: ${headerRowIndex + 1}`);

  // 데이터 행 파싱
  const customers: CustomerRow[] = [];
  const dataRows = data.slice(headerRowIndex + 1);

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const businessNo = normalizeBusinessNo(String(row[1] || "").trim());
    const name = String(row[3] || "").trim();

    // 필수 필드 체크
    if (!businessNo || !name) continue;

    customers.push({
      businessNo,
      name,
      representative: String(row[4] || "").trim() || null,
      address: String(row[5] || "").trim() || null,
      contactName: String(row[9] || "").trim() || null,
      contactPhone: String(row[10] || row[11] || "").trim() || null,
      contactEmail: validateEmail(String(row[13] || "").trim()),
      memo: String(row[14] || "").trim() || null,
    });
  }

  console.log(`파싱된 고객 수: ${customers.length}`);

  // 데이터베이스에 삽입
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const customer of customers) {
    try {
      const existing = await prisma.customer.findUnique({
        where: { businessNo: customer.businessNo },
      });

      if (existing) {
        // 기존 데이터가 없는 필드만 업데이트
        const updateData: Record<string, string | null> = {};
        if (!existing.representative && customer.representative) {
          updateData.representative = customer.representative;
        }
        if (!existing.address && customer.address) {
          updateData.address = customer.address;
        }
        if (!existing.contactName && customer.contactName) {
          updateData.contactName = customer.contactName;
        }
        if (!existing.contactPhone && customer.contactPhone) {
          updateData.contactPhone = customer.contactPhone;
        }
        if (!existing.contactEmail && customer.contactEmail) {
          updateData.contactEmail = customer.contactEmail;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.customer.update({
            where: { businessNo: customer.businessNo },
            data: updateData,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.customer.create({
          data: {
            ...customer,
            status: "ACTIVE",
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`오류 (${customer.name}):`, error);
      skipped++;
    }
  }

  console.log("\n마이그레이션 완료:");
  console.log(`  - 신규 등록: ${created}건`);
  console.log(`  - 정보 보완: ${updated}건`);
  console.log(`  - 건너뜀: ${skipped}건`);
}

function normalizeBusinessNo(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function validateEmail(email: string): string | null {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

main()
  .catch((e) => {
    console.error("마이그레이션 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
