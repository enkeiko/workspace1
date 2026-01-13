import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBarobillService, CORP_STATE_CODES } from "@/lib/barobill";

// 사업자 상태조회 API
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessNo, saveResult } = await request.json();

    if (!businessNo) {
      return NextResponse.json(
        { error: "사업자번호를 입력해주세요" },
        { status: 400 }
      );
    }

    const barobillService = createBarobillService();
    if (!barobillService) {
      return NextResponse.json(
        { error: "바로빌 API 설정이 필요합니다" },
        { status: 500 }
      );
    }

    const result = await barobillService.checkCorpState(businessNo);

    // 상태 변환
    const taxTypeLabel =
      CORP_STATE_CODES.TAX_TYPE[
        result.taxType as keyof typeof CORP_STATE_CODES.TAX_TYPE
      ] || "알 수 없음";
    const closedStateLabel =
      CORP_STATE_CODES.CLOSED_STATE[
        result.closedState as keyof typeof CORP_STATE_CODES.CLOSED_STATE
      ] || "알 수 없음";

    // DB에 저장 (옵션)
    if (saveResult) {
      await prisma.businessCheck.create({
        data: {
          businessNo: result.corpNum,
          corpName: result.corpName || null,
          taxType: result.taxType,
          taxTypeLabel,
          closedState: result.closedState,
          closedStateLabel,
          closedDate: result.closedDate
            ? new Date(
                result.closedDate.replace(
                  /(\d{4})(\d{2})(\d{2})/,
                  "$1-$2-$3"
                )
              )
            : null,
          status:
            result.closedState === "01"
              ? "ACTIVE"
              : result.closedState === "02"
              ? "SUSPENDED"
              : "CLOSED",
          checkedById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        corpNum: result.corpNum,
        corpName: result.corpName,
        taxType: result.taxType,
        taxTypeLabel,
        taxTypeDate: result.taxTypeDate,
        closedState: result.closedState,
        closedStateLabel,
        closedDate: result.closedDate,
        isActive: result.closedState === "01",
        stateCode: result.stateCode,
        stateMessage: result.stateMessage,
      },
    });
  } catch (error) {
    console.error("사업자 상태조회 API 에러:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
