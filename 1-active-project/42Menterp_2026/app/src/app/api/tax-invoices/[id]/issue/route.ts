import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBarobillService } from "@/lib/barobill";
import { format } from "date-fns";

// 세금계산서 발행 (바로빌 연동)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 세금계산서 조회
    const taxInvoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!taxInvoice) {
      return NextResponse.json(
        { error: "세금계산서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (taxInvoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 세금계산서만 발행할 수 있습니다" },
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

    // 바로빌 API 호출
    const result = await barobillService.issueTaxInvoice({
      // 공급자 정보
      invoicerCorpNum: taxInvoice.supplierBusinessNo,
      invoicerMgtKey: taxInvoice.id,
      invoicerCorpName: taxInvoice.supplierName,
      invoicerCeoName: taxInvoice.supplierCeoName || "",
      invoicerAddr: taxInvoice.supplierAddr || "",
      invoicerBizType: taxInvoice.supplierBizType || "",
      invoicerBizClass: taxInvoice.supplierBizClass || "",
      invoicerEmail: taxInvoice.supplierEmail || "",

      // 공급받는자 정보
      invoiceeCorpNum: taxInvoice.receiverBusinessNo,
      invoiceeCorpName: taxInvoice.receiverName,
      invoiceeCeoName: taxInvoice.receiverCeoName || "",
      invoiceeAddr: taxInvoice.receiverAddr || "",
      invoiceeBizType: taxInvoice.receiverBizType || "",
      invoiceeBizClass: taxInvoice.receiverBizClass || "",
      invoiceeEmail1: taxInvoice.receiverEmail || "",

      // 세금계산서 정보
      taxType: taxInvoice.taxType as "TAX" | "ZERO" | "FREE",
      issueType: "NORMAL",
      purposeType: taxInvoice.purposeType as "CHARGE" | "PROOF",
      writeDate: format(new Date(taxInvoice.issueDate), "yyyyMMdd"),
      supplyCostTotal: taxInvoice.supplyAmount,
      taxTotal: taxInvoice.taxAmount,
      totalAmount: taxInvoice.totalAmount,
      remark1: taxInvoice.remark || "",

      // 품목
      items: taxInvoice.items.map((item) => ({
        purchaseExpiryDate: format(new Date(taxInvoice.issueDate), "yyyyMMdd"),
        itemName: item.itemName,
        itemSpec: item.itemSpec || "",
        itemQuantity: item.quantity,
        itemUnitCost: item.unitPrice,
        itemSupplyValue: item.supplyAmount,
        itemTaxValue: item.taxAmount,
        itemNote: item.note || "",
      })),
    });

    if (result.stateCode < 0) {
      // 발행 실패
      await prisma.taxInvoice.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: result.stateMessage,
        },
      });

      return NextResponse.json(
        { error: result.stateMessage || "세금계산서 발행에 실패했습니다" },
        { status: 500 }
      );
    }

    // 발행 성공 - DB 업데이트
    const updatedInvoice = await prisma.taxInvoice.update({
      where: { id },
      data: {
        status: "ISSUED",
        ntsConfirmNo: result.ntsConfirmNum,
        barobillId: result.invoiceId,
        issuedAt: new Date(),
        issuedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInvoice.id,
        ntsConfirmNo: result.ntsConfirmNum,
        barobillId: result.invoiceId,
        status: updatedInvoice.status,
      },
    });
  } catch (error) {
    console.error("세금계산서 발행 API 에러:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "발행에 실패했습니다" },
      { status: 500 }
    );
  }
}
