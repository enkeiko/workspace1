import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * 거래처목록(1~94).xls 레거시 데이터 임포트 API
 *
 * 컬럼 매핑:
 * - Index 1: 거래처등록번호 → businessNo
 * - Index 3: 거래처상호 → name
 * - Index 4: 대표자명 → representative
 * - Index 5: 사업자주소 → address
 * - Index 9: 성명 → contactName
 * - Index 10/11: 전화번호/휴대전화번호 → contactPhone
 * - Index 13: 이메일주소 → contactEmail
 * - Index 14: 비고 → memo
 */

interface ImportOptions {
  updateExisting?: boolean;
  skipInvalid?: boolean;
  headerRow?: number;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: {
    row: number;
    businessNo?: string;
    name?: string;
    error: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const optionsStr = formData.get("options") as string;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    const options: ImportOptions = optionsStr ? JSON.parse(optionsStr) : {};
    const { updateExisting = false, skipInvalid = true, headerRow = 4 } = options;

    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // 헤더 행부터 시작 (0-indexed)
    const dataRows = data.slice(headerRow);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = headerRow + i + 1;

      // 빈 행 건너뛰기
      if (!row || row.length === 0 || !row[1]) {
        continue;
      }

      const businessNo = normalizeBusinessNo(String(row[1] || "").trim());
      const name = String(row[3] || "").trim();
      const representative = String(row[4] || "").trim() || null;
      const address = String(row[5] || "").trim() || null;
      const contactName = String(row[9] || "").trim() || null;
      const phone = String(row[10] || row[11] || "").trim() || null;
      const email = String(row[13] || "").trim() || null;
      const memo = String(row[14] || "").trim() || null;

      // 필수 필드 검증
      if (!businessNo || !name) {
        if (skipInvalid) {
          result.skipped++;
          result.errors.push({
            row: rowNumber,
            businessNo: businessNo || undefined,
            name: name || undefined,
            error: "사업자번호 또는 상호 누락",
          });
          continue;
        } else {
          return NextResponse.json(
            {
              error: `${rowNumber}행: 사업자번호 또는 상호가 누락되었습니다`,
              result,
            },
            { status: 400 }
          );
        }
      }

      // 사업자번호 형식 검증
      if (!isValidBusinessNo(businessNo)) {
        if (skipInvalid) {
          result.skipped++;
          result.errors.push({
            row: rowNumber,
            businessNo,
            name,
            error: "유효하지 않은 사업자번호 형식",
          });
          continue;
        }
      }

      // 이메일 형식 검증
      const validEmail = email && isValidEmail(email) ? email : null;

      try {
        // 기존 고객 확인
        const existingCustomer = await prisma.customer.findUnique({
          where: { businessNo },
        });

        if (existingCustomer) {
          if (updateExisting) {
            await prisma.customer.update({
              where: { businessNo },
              data: {
                name,
                representative,
                address,
                contactName,
                contactPhone: phone,
                contactEmail: validEmail,
                memo: memo ? `${existingCustomer.memo || ""}\n${memo}`.trim() : existingCustomer.memo,
              },
            });
            result.updated++;
          } else {
            result.skipped++;
            result.errors.push({
              row: rowNumber,
              businessNo,
              name,
              error: "이미 등록된 사업자번호 (updateExisting: false)",
            });
          }
        } else {
          await prisma.customer.create({
            data: {
              name,
              businessNo,
              representative,
              address,
              contactName,
              contactPhone: phone,
              contactEmail: validEmail,
              memo,
              status: "ACTIVE",
            },
          });
          result.created++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          businessNo,
          name,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        });
        if (!skipInvalid) {
          throw error;
        }
        result.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: result,
      message: `등록: ${result.created}건, 수정: ${result.updated}건, 건너뜀: ${result.skipped}건`,
    });
  } catch (error) {
    console.error("Failed to import legacy customers:", error);
    return NextResponse.json(
      { error: "거래처 임포트에 실패했습니다" },
      { status: 500 }
    );
  }
}

// 사업자번호 정규화 (하이픈 제거)
function normalizeBusinessNo(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

// 사업자번호 형식 검증 (10자리 숫자)
function isValidBusinessNo(value: string): boolean {
  return /^\d{10}$/.test(value);
}

// 이메일 형식 검증
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
