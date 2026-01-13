import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateDocumentImage,
  QuotationData,
  StatementData,
  TaxInvoiceData,
} from "@/lib/document-image";

type DocumentType = "quotation" | "statement" | "tax-invoice";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = await params;

    // 문서 유형 검증
    const validTypes: DocumentType[] = ["quotation", "statement", "tax-invoice"];
    if (!validTypes.includes(type as DocumentType)) {
      return NextResponse.json(
        { error: "지원하지 않는 문서 유형입니다" },
        { status: 400 }
      );
    }

    let documentData: QuotationData | StatementData | TaxInvoiceData;

    switch (type) {
      case "quotation": {
        const quotation = await prisma.quotation.findUnique({
          where: { id },
          include: {
            customer: true,
            createdBy: { select: { name: true, email: true } },
            items: true,
          },
        });

        if (!quotation) {
          return NextResponse.json(
            { error: "견적서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        documentData = {
          quotationNo: quotation.quotationNo,
          subject: quotation.note || undefined,
          totalAmount: quotation.supplyAmount,
          taxAmount: quotation.taxAmount,
          validUntil: quotation.validUntil?.toISOString() || new Date().toISOString(),
          note: quotation.note || undefined,
          createdAt: quotation.issueDate.toISOString(),
          customer: {
            name: quotation.receiverName,
            businessName: quotation.receiverName,
            businessNo: quotation.receiverBusinessNo || undefined,
            ceoName: quotation.receiverCeoName || undefined,
            phone: quotation.receiverPhone || undefined,
            address: quotation.receiverAddr || undefined,
          },
          createdBy: {
            name: quotation.createdBy?.name || "담당자",
            email: quotation.createdBy?.email || "",
          },
          items: quotation.items.map((item) => ({
            description: item.itemName,
            qty: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.supplyAmount,
          })),
        } as QuotationData;
        break;
      }

      case "statement": {
        const statement = await prisma.statement.findUnique({
          where: { id },
          include: {
            salesOrder: true,
            customer: true,
            createdBy: { select: { name: true, email: true } },
            items: true,
          },
        });

        if (!statement) {
          return NextResponse.json(
            { error: "거래명세서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        documentData = {
          statementNo: statement.statementNo,
          issueDate: statement.issueDate.toISOString(),
          totalAmount: statement.supplyAmount,
          taxAmount: statement.taxAmount,
          note: statement.note || undefined,
          customer: {
            name: statement.receiverName,
            businessName: statement.receiverName,
            businessNo: statement.receiverBusinessNo || undefined,
            ceoName: statement.receiverCeoName || undefined,
            address: statement.receiverAddr || undefined,
          },
          salesOrderNo: statement.salesOrder?.salesOrderNo || "-",
          createdBy: {
            name: statement.createdBy?.name || "담당자",
            email: statement.createdBy?.email || "",
          },
          items: statement.items.map((item) => ({
            description: item.itemName,
            qty: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.supplyAmount,
          })),
        } as StatementData;
        break;
      }

      case "tax-invoice": {
        const taxInvoice = await prisma.taxInvoice.findUnique({
          where: { id },
        });

        if (!taxInvoice) {
          return NextResponse.json(
            { error: "세금계산서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        documentData = {
          ntsConfirmNo: taxInvoice.ntsConfirmNo || undefined,
          issueDate: taxInvoice.issueDate.toISOString(),
          supplierName: taxInvoice.supplierName,
          supplierBusinessNo: taxInvoice.supplierBusinessNo,
          supplierCeoName: taxInvoice.supplierCeoName || undefined,
          supplierAddr: taxInvoice.supplierAddr || undefined,
          receiverName: taxInvoice.receiverName,
          receiverBusinessNo: taxInvoice.receiverBusinessNo,
          receiverCeoName: taxInvoice.receiverCeoName || undefined,
          receiverAddr: taxInvoice.receiverAddr || undefined,
          supplyAmount: taxInvoice.supplyAmount,
          taxAmount: taxInvoice.taxAmount,
          totalAmount: taxInvoice.totalAmount,
        } as TaxInvoiceData;
        break;
      }

      default:
        return NextResponse.json(
          { error: "지원하지 않는 문서 유형입니다" },
          { status: 400 }
        );
    }

    // 이미지 생성
    const imageBuffer = await generateDocumentImage(
      type as DocumentType,
      documentData
    );

    // 이미지 반환
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${type}-${id}.png"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Document image generation error:", error);
    return NextResponse.json(
      { error: "이미지 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
