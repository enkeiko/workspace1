import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const businessCheckSchema = z.object({
  businessNo: z.string().regex(/^\d{10}$/, "사업자등록번호는 10자리 숫자여야 합니다"),
});

// 바로빌 API 호출 함수 (환경변수로 설정 가능)
async function checkBusinessStatus(businessNo: string): Promise<{
  status: "ACTIVE" | "CLOSED" | "SUSPENDED" | "UNKNOWN";
  businessName?: string;
  result?: Record<string, unknown>;
}> {
  const BAROBILL_API_KEY = process.env.BAROBILL_API_KEY;
  const BAROBILL_CERT_KEY = process.env.BAROBILL_CERT_KEY;
  const BAROBILL_API_URL = process.env.BAROBILL_API_URL || "https://ws.barobill.co.kr";

  // 바로빌 API 키가 없으면 국세청 공개 API 사용 (무료)
  if (!BAROBILL_API_KEY) {
    // 국세청 사업자등록 상태조회 API (공개 API)
    try {
      const response = await fetch(
        `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${process.env.NTS_API_KEY || ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            b_no: [businessNo],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const result = data.data?.[0];

        if (result) {
          let status: "ACTIVE" | "CLOSED" | "SUSPENDED" | "UNKNOWN" = "UNKNOWN";

          // b_stt_cd: 01 - 계속사업자, 02 - 휴업자, 03 - 폐업자
          if (result.b_stt_cd === "01") status = "ACTIVE";
          else if (result.b_stt_cd === "02") status = "SUSPENDED";
          else if (result.b_stt_cd === "03") status = "CLOSED";

          return {
            status,
            businessName: result.tax_type || undefined,
            result: result,
          };
        }
      }

      return { status: "UNKNOWN" };
    } catch (error) {
      console.error("NTS API error:", error);
      return { status: "UNKNOWN" };
    }
  }

  // 바로빌 API 사용
  try {
    // 바로빌 SOAP API 호출 (실제 구현시 SOAP 라이브러리 필요)
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bar="http://www.barobill.co.kr/">
  <soap:Body>
    <bar:CheckCorpNum>
      <bar:CERTKEY>${BAROBILL_CERT_KEY}</bar:CERTKEY>
      <bar:CorpNum>${businessNo}</bar:CorpNum>
    </bar:CheckCorpNum>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(`${BAROBILL_API_URL}/CORPSTATE.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://www.barobill.co.kr/CheckCorpNum",
      },
      body: soapBody,
    });

    if (response.ok) {
      const xmlText = await response.text();
      // XML 파싱 (간단한 구현)
      const statusMatch = xmlText.match(/<CheckCorpNumResult>(\d+)<\/CheckCorpNumResult>/);
      const resultCode = statusMatch ? parseInt(statusMatch[1]) : 0;

      let status: "ACTIVE" | "CLOSED" | "SUSPENDED" | "UNKNOWN" = "UNKNOWN";
      if (resultCode === 1) status = "ACTIVE";
      else if (resultCode === 2) status = "SUSPENDED";
      else if (resultCode === 3) status = "CLOSED";

      return {
        status,
        result: { code: resultCode, raw: xmlText },
      };
    }

    return { status: "UNKNOWN" };
  } catch (error) {
    console.error("Barobill API error:", error);
    return { status: "UNKNOWN" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessNo = searchParams.get("businessNo");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (businessNo) where.businessNo = businessNo;

    const checks = await prisma.businessCheck.findMany({
      where,
      include: {
        checkedBy: { select: { id: true, name: true } },
      },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ checks });
  } catch (error) {
    console.error("Failed to fetch business checks:", error);
    return NextResponse.json(
      { error: "조회 기록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = businessCheckSchema.parse(body);

    // 사업자 상태 조회
    const result = await checkBusinessStatus(validatedData.businessNo);

    // 조회 결과 저장
    const businessCheck = await prisma.businessCheck.create({
      data: {
        businessNo: validatedData.businessNo,
        corpName: result.businessName || null,
        status: result.status,
        result: result.result ? (result.result as Prisma.InputJsonValue) : Prisma.DbNull,
        checkedById: session.user.id,
      },
      include: {
        checkedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(businessCheck, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to check business:", error);
    return NextResponse.json(
      { error: "사업자 상태 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
