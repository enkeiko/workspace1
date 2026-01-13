import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBarobillService, BANK_CODES } from "@/lib/barobill";

// 계좌 실명조회 API
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bankCode, accountNo, accountHolder } = await request.json();

    if (!bankCode || !accountNo || !accountHolder) {
      return NextResponse.json(
        { error: "은행코드, 계좌번호, 예금주명을 모두 입력해주세요" },
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

    const result = await barobillService.checkBankAccount(
      bankCode,
      accountNo,
      accountHolder
    );

    const bankName = BANK_CODES[bankCode as keyof typeof BANK_CODES] || bankCode;

    return NextResponse.json({
      success: true,
      data: {
        bankCode,
        bankName,
        accountNo: result.accountNo,
        accountHolder: result.accountHolder,
        isMatch: result.matchResult === "1",
        matchResult: result.matchResult,
        stateCode: result.stateCode,
        stateMessage: result.stateMessage,
      },
    });
  } catch (error) {
    console.error("계좌 실명조회 API 에러:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

// 은행 코드 목록 조회
export async function GET() {
  return NextResponse.json({
    banks: Object.entries(BANK_CODES).map(([code, name]) => ({
      code,
      name,
    })),
  });
}
