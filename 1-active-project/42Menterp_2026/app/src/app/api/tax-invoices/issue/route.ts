import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBarobillService } from "@/lib/barobill";
import { z } from "zod";
import { format } from "date-fns";

const issueSchema = z.object({
  settlementIds: z.array(z.string()).min(1, "정산 항목을 선택해주세요"),
  // 공급받는자 정보
  receiverCorpNum: z.string().min(10, "사업자번호를 입력해주세요"),
  receiverCorpName: z.string().min(1, "상호명을 입력해주세요"),
  receiverCeoName: z.string().min(1, "대표자명을 입력해주세요"),
  receiverAddr: z.string().optional(),
  receiverEmail: z.string().email().optional(),
  // 세금계산서 정보
  taxType: z.enum(["TAX", "ZERO", "FREE"]).default("TAX"),
  purposeType: z.enum(["CHARGE", "PROOF"]).default("CHARGE"),
  remark: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = issueSchema.parse(body);

    // 바로빌 서비스 확인
    const barobill = createBarobillService();
    if (!barobill) {
      return NextResponse.json(
        { error: "바로빌 API가 설정되지 않았습니다" },
        { status: 400 }
      );
    }

    // 정산 데이터 조회
    const settlements = await prisma.settlement.findMany({
      where: {
        id: { in: validatedData.settlementIds },
        type: "REVENUE",
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      include: {
        store: true,
        channel: true,
      },
    });

    if (settlements.length === 0) {
      return NextResponse.json(
        { error: "발행 가능한 정산 항목이 없습니다" },
        { status: 400 }
      );
    }

    // 금액 계산
    const supplyCostTotal = settlements.reduce((sum, s) => sum + s.amount, 0);
    const taxTotal = Math.round(supplyCostTotal * 0.1); // 10% 부가세
    const totalAmount = supplyCostTotal + taxTotal;

    // 문서번호 생성
    const mgtKey = `TI${format(new Date(), "yyyyMMddHHmmss")}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 품목 생성
    const items = settlements.map((s) => ({
      purchaseExpiryDate: format(new Date(s.createdAt), "yyyyMMdd"),
      itemName: `${s.store.name} - ${s.channel?.name || "마케팅"} 서비스`,
      itemSpec: s.settlementMonth,
      itemQuantity: 1,
      itemUnitCost: s.amount,
      itemSupplyValue: s.amount,
      itemTaxValue: Math.round(s.amount * 0.1),
      itemNote: s.description || "",
    }));

    // 세금계산서 발행
    const result = await barobill.issueTaxInvoice({
      // 공급자 (42ment)
      invoicerCorpNum: process.env.BAROBILL_CORP_NUM!,
      invoicerMgtKey: mgtKey,
      invoicerCorpName: process.env.COMPANY_NAME || "42ment",
      invoicerCeoName: process.env.COMPANY_CEO || "",
      invoicerAddr: process.env.COMPANY_ADDR || "",
      invoicerBizType: process.env.COMPANY_BIZ_TYPE || "",
      invoicerBizClass: process.env.COMPANY_BIZ_CLASS || "",
      invoicerEmail: process.env.COMPANY_EMAIL || "",

      // 공급받는자
      invoiceeCorpNum: validatedData.receiverCorpNum.replace(/[^0-9]/g, ""),
      invoiceeCorpName: validatedData.receiverCorpName,
      invoiceeCeoName: validatedData.receiverCeoName,
      invoiceeAddr: validatedData.receiverAddr || "",
      invoiceeEmail1: validatedData.receiverEmail || "",

      // 세금계산서 정보
      taxType: validatedData.taxType,
      issueType: "NORMAL",
      purposeType: validatedData.purposeType,
      writeDate: format(new Date(), "yyyyMMdd"),
      supplyCostTotal,
      taxTotal,
      totalAmount,
      remark1: validatedData.remark || "",

      items,
    });

    if (result.stateCode < 0) {
      return NextResponse.json(
        { error: result.stateMessage || "세금계산서 발행에 실패했습니다" },
        { status: 400 }
      );
    }

    // DB에 세금계산서 기록
    const taxInvoice = await prisma.taxInvoice.create({
      data: {
        type: "SALES",
        taxType: validatedData.taxType,
        purposeType: validatedData.purposeType,
        status: "ISSUED",
        issueDate: new Date(),
        // 공급자 (42ment)
        supplierBusinessNo: process.env.BAROBILL_CORP_NUM || "",
        supplierName: process.env.COMPANY_NAME || "42ment",
        supplierCeoName: process.env.COMPANY_CEO || null,
        supplierAddr: process.env.COMPANY_ADDR || null,
        supplierBizType: process.env.COMPANY_BIZ_TYPE || null,
        supplierBizClass: process.env.COMPANY_BIZ_CLASS || null,
        supplierEmail: process.env.COMPANY_EMAIL || null,
        // 공급받는자
        receiverBusinessNo: validatedData.receiverCorpNum.replace(/[^0-9]/g, ""),
        receiverName: validatedData.receiverCorpName,
        receiverCeoName: validatedData.receiverCeoName,
        receiverAddr: validatedData.receiverAddr || null,
        receiverEmail: validatedData.receiverEmail || null,
        // 금액
        supplyAmount: supplyCostTotal,
        taxAmount: taxTotal,
        totalAmount,
        // 발행 정보
        ntsConfirmNo: result.ntsConfirmNum || null,
        barobillId: mgtKey,
        remark: validatedData.remark || null,
        issuedAt: new Date(),
        issuedById: session.user.id,
      },
    });

    // 정산 상태 업데이트 (세금계산서 발행됨)
    await prisma.settlement.updateMany({
      where: { id: { in: validatedData.settlementIds } },
      data: { status: "CONFIRMED" },
    });

    return NextResponse.json({
      success: true,
      taxInvoice: {
        id: taxInvoice.id,
        ntsConfirmNo: result.ntsConfirmNum,
        barobillId: mgtKey,
        totalAmount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Tax invoice issue error:", error);
    return NextResponse.json(
      { error: "세금계산서 발행에 실패했습니다" },
      { status: 500 }
    );
  }
}
