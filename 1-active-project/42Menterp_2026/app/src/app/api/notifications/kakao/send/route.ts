import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createKakaoService, generateDocumentMessage } from "@/lib/kakao";
import { generateDocumentImage } from "@/lib/document-image";
import { z } from "zod";
import { format } from "date-fns";

const sendSchema = z.object({
  documentType: z.enum(["quotation", "statement", "tax-invoice"]),
  documentId: z.string(),
  recipientPhone: z.string().min(10, "전화번호를 입력해주세요"),
  includeImage: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, documentId, recipientPhone, includeImage } =
      sendSchema.parse(body);

    // 카카오 서비스 확인
    const kakaoService = createKakaoService();
    if (!kakaoService) {
      return NextResponse.json(
        { error: "카카오 알림톡 API가 설정되지 않았습니다" },
        { status: 400 }
      );
    }

    let messageData: {
      customerName: string;
      documentNo: string;
      totalAmount: number;
      issueDate: string;
      viewUrl?: string;
    };

    // 문서 데이터 조회
    switch (documentType) {
      case "quotation": {
        const quotation = await prisma.quotation.findUnique({
          where: { id: documentId },
        });

        if (!quotation) {
          return NextResponse.json(
            { error: "견적서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        messageData = {
          customerName: quotation.receiverName,
          documentNo: quotation.quotationNo,
          totalAmount: quotation.supplyAmount + quotation.taxAmount,
          issueDate: format(quotation.issueDate, "yyyy-MM-dd"),
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quotations/${documentId}/preview`,
        };
        break;
      }

      case "statement": {
        const statement = await prisma.statement.findUnique({
          where: { id: documentId },
        });

        if (!statement) {
          return NextResponse.json(
            { error: "거래명세서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        messageData = {
          customerName: statement.receiverName,
          documentNo: statement.statementNo,
          totalAmount: statement.supplyAmount + statement.taxAmount,
          issueDate: format(statement.issueDate, "yyyy-MM-dd"),
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/statements/${documentId}/preview`,
        };
        break;
      }

      case "tax-invoice": {
        const taxInvoice = await prisma.taxInvoice.findUnique({
          where: { id: documentId },
        });

        if (!taxInvoice) {
          return NextResponse.json(
            { error: "세금계산서를 찾을 수 없습니다" },
            { status: 404 }
          );
        }

        messageData = {
          customerName: taxInvoice.receiverName,
          documentNo: taxInvoice.ntsConfirmNo || taxInvoice.id,
          totalAmount: taxInvoice.totalAmount,
          issueDate: format(taxInvoice.issueDate, "yyyy-MM-dd"),
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "지원하지 않는 문서 유형입니다" },
          { status: 400 }
        );
    }

    // 메시지 생성
    const message = generateDocumentMessage(documentType, messageData);

    let result;

    if (includeImage) {
      // 이미지 생성 및 업로드
      try {
        const imageBuffer = await generateDocumentImage(
          documentType,
          await getDocumentDataForImage(documentType, documentId)
        );

        // 이미지 업로드
        const uploadResult = await kakaoService.uploadImage(
          imageBuffer,
          `${documentType}-${documentId}.png`
        );

        if (uploadResult.success && uploadResult.imageUrl) {
          // 이미지 포함 친구톡 발송
          result = await kakaoService.sendFriendtalk({
            to: recipientPhone,
            text: message,
            imageUrl: uploadResult.imageUrl,
            buttons: messageData.viewUrl
              ? [
                  {
                    buttonType: "WL",
                    buttonName: "자세히 보기",
                    linkMo: messageData.viewUrl,
                    linkPc: messageData.viewUrl,
                  },
                ]
              : undefined,
          });
        } else {
          // 이미지 업로드 실패 시 텍스트만 발송
          result = await kakaoService.sendFriendtalk({
            to: recipientPhone,
            text: message,
          });
        }
      } catch (imageError) {
        console.error("이미지 생성 실패, 텍스트만 발송:", imageError);
        result = await kakaoService.sendFriendtalk({
          to: recipientPhone,
          text: message,
        });
      }
    } else {
      // 텍스트만 발송
      result = await kakaoService.sendFriendtalk({
        to: recipientPhone,
        text: message,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "발송에 실패했습니다" },
        { status: 400 }
      );
    }

    // 발송 이력 저장
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "SYSTEM",
        title: `${getDocumentTypeName(documentType)} 발송`,
        message: `${messageData.customerName}님께 ${getDocumentTypeName(documentType)}(${messageData.documentNo})를 카카오톡으로 발송했습니다.`,
        data: {
          documentType,
          documentId,
          documentNo: messageData.documentNo,
          recipientPhone,
          messageId: result.messageId,
        },
        channel: "KAKAO",
        status: "READ",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "카카오톡 발송이 완료되었습니다",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Kakao send error:", error);
    return NextResponse.json(
      { error: "카카오톡 발송에 실패했습니다" },
      { status: 500 }
    );
  }
}

function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    quotation: "견적서",
    statement: "거래명세서",
    "tax-invoice": "세금계산서",
  };
  return names[type] || type;
}

async function getDocumentDataForImage(type: string, id: string) {
  switch (type) {
    case "quotation": {
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          createdBy: { select: { name: true, email: true } },
          items: true,
        },
      });

      if (!quotation) throw new Error("견적서를 찾을 수 없습니다");

      return {
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
      };
    }

    case "statement": {
      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          salesOrder: true,
          createdBy: { select: { name: true, email: true } },
          items: true,
        },
      });

      if (!statement) throw new Error("거래명세서를 찾을 수 없습니다");

      return {
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
      };
    }

    case "tax-invoice": {
      const taxInvoice = await prisma.taxInvoice.findUnique({
        where: { id },
      });

      if (!taxInvoice) throw new Error("세금계산서를 찾을 수 없습니다");

      return {
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
      };
    }

    default:
      throw new Error("지원하지 않는 문서 유형입니다");
  }
}
