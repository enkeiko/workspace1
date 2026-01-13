import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * 고객 일괄 등록 API (Excel Import 컴포넌트용)
 *
 * 요청 형식:
 * {
 *   data: CustomerImportRow[],
 *   allowUpdate: boolean,
 *   uniqueField: "businessNo"
 * }
 */

const importRowSchema = z.object({
  name: z.string().min(1),
  businessNo: z.string().optional(),
  representative: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  memo: z.string().optional(),
});

interface ImportRequest {
  data: z.infer<typeof importRowSchema>[];
  allowUpdate?: boolean;
  uniqueField?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ImportRequest = await request.json();
    const { data, allowUpdate = false, uniqueField = "businessNo" } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "유효한 데이터가 필요합니다" },
        { status: 400 }
      );
    }

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const validated = importRowSchema.parse(row);

        // 이메일이 빈 문자열이면 null로 변환
        const contactEmail = validated.contactEmail || null;

        // 고유 필드로 중복 확인
        let existing = null;
        if (uniqueField === "businessNo" && validated.businessNo) {
          existing = await prisma.customer.findUnique({
            where: { businessNo: validated.businessNo },
          });
        }

        if (existing) {
          if (allowUpdate) {
            await prisma.customer.update({
              where: { id: existing.id },
              data: {
                name: validated.name,
                representative: validated.representative || null,
                contactName: validated.contactName || null,
                contactPhone: validated.contactPhone || null,
                contactEmail,
                address: validated.address || null,
                memo: validated.memo || null,
              },
            });
            summary.updated++;
          } else {
            summary.skipped++;
          }
        } else {
          await prisma.customer.create({
            data: {
              name: validated.name,
              businessNo: validated.businessNo || null,
              representative: validated.representative || null,
              contactName: validated.contactName || null,
              contactPhone: validated.contactPhone || null,
              contactEmail,
              address: validated.address || null,
              memo: validated.memo || null,
              status: "ACTIVE",
            },
          });
          summary.created++;
        }
      } catch (error) {
        summary.failed++;
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Failed to import customers:", error);
    return NextResponse.json(
      { error: "고객 일괄 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
