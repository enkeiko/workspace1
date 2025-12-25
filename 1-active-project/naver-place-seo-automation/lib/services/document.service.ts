import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { sanitizeFileName } from "@/lib/utils/file-validator";

export interface CreateDocumentData {
  customerId?: number;
  storeId?: number;
  orderId?: number;
  documentType: string;
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  mimeType?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateDocumentData {
  customerId?: number;
  storeId?: number;
  orderId?: number;
  documentType?: string;
  description?: string;
  tags?: string[];
}

export interface GetDocumentsOptions {
  customerId?: number;
  storeId?: number;
  orderId?: number;
  documentType?: string;
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

/**
 * 파일 저장 경로 생성
 */
function getStoragePath(): string {
  const storagePath = process.env.FILE_STORAGE_PATH || path.join(process.cwd(), "public", "uploads");
  
  // 절대 경로로 변환
  const absolutePath = path.resolve(storagePath);
  const allowedBasePath = path.resolve(process.cwd());
  
  // 허용된 디렉토리 내부인지 검증
  if (!absolutePath.startsWith(allowedBasePath)) {
    throw new ValidationError("파일 저장 경로가 허용되지 않습니다.");
  }
  
  return absolutePath;
}

/**
 * 파일 경로 생성
 */
function generateFilePath(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  const timestamp = Date.now();
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const uniqueFileName = `${name}_${timestamp}${ext}`;
  return path.join(getStoragePath(), uniqueFileName);
}

/**
 * 파일 저장
 */
async function saveFile(file: File): Promise<{ filePath: string; fileName: string; fileSize: string }> {
  const storagePath = getStoragePath();
  
  // 디렉토리 생성 (없는 경우)
  try {
    await mkdir(storagePath, { recursive: true });
  } catch (error) {
    // 이미 존재하는 경우 무시
  }

  const filePath = generateFilePath(file.name);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  return {
    filePath,
    fileName: path.basename(filePath),
    fileSize: file.size.toString(),
  };
}

/**
 * 파일 삭제
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    // 파일이 없는 경우 무시
    console.warn(`파일 삭제 실패: ${filePath}`, error);
  }
}

export const documentService = {
  /**
   * 문서 목록 조회
   */
  async getDocuments(options: GetDocumentsOptions = {}) {
    const {
      customerId,
      storeId,
      orderId,
      documentType,
      page,
      limit = 20,
      search,
      tags,
    } = options;

    const where: Prisma.DocumentWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (documentType) {
      where.documentType = documentType;
    }

    if (tags && tags.length > 0) {
      // SQLite에서는 JSON 배열 검색이 제한적이므로 OR 조건으로 각 태그를 포함하는 문서 검색
      where.OR = [
        ...(where.OR || []),
        ...tags.map(tag => ({
          tags: { contains: tag },
        })),
      ];
    }

    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { description: { contains: search } },
        { documentType: { contains: search } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return {
      documents,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 문서 상세 조회
   */
  async getDocumentById(id: number) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessNumber: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }

    return document;
  },

  /**
   * 문서 생성 (파일 업로드 포함)
   */
  async createDocument(data: CreateDocumentData, file?: File) {
    // 고객 존재 확인 (있는 경우)
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new NotFoundError("고객을 찾을 수 없습니다.");
      }
    }

    // 매장 존재 확인 (있는 경우)
    if (data.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: data.storeId },
      });
      if (!store) {
        throw new NotFoundError("매장을 찾을 수 없습니다.");
      }
      // 매장이 해당 고객의 것인지 확인
      if (data.customerId && store.customerId !== data.customerId) {
        throw new ValidationError("매장이 해당 고객의 것이 아닙니다.");
      }
    }

    // 주문 존재 확인 (있는 경우)
    if (data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
      });
      if (!order) {
        throw new NotFoundError("주문을 찾을 수 없습니다.");
      }
      // 주문이 해당 고객의 것인지 확인
      if (data.customerId && order.customerId !== data.customerId) {
        throw new ValidationError("주문이 해당 고객의 것이 아닙니다.");
      }
    }

    let savedFileInfo: { filePath: string; fileName: string; fileSize: string } | null = null;

    // 파일이 있는 경우 저장
    if (file) {
      savedFileInfo = await saveFile(file);
    } else if (!data.filePath) {
      throw new ValidationError("파일 또는 파일 경로가 필요합니다.");
    }

    try {
      const fileName = savedFileInfo?.fileName || data.fileName;
      const filePath = savedFileInfo?.filePath || data.filePath;

      if (!fileName || !filePath) {
        throw new ValidationError("파일명과 파일 경로가 필요합니다.");
      }

      const document = await prisma.document.create({
        data: {
          customerId: data.customerId || null,
          storeId: data.storeId || null,
          orderId: data.orderId || null,
          documentType: data.documentType,
          fileName,
          filePath,
          fileSize: savedFileInfo?.fileSize || data.fileSize || null,
          mimeType: data.mimeType || file?.type || null,
          description: data.description || null,
          tags: data.tags ? JSON.stringify(data.tags) : null,
        },
      });

      return await this.getDocumentById(document.id);
    } catch (error) {
      // DB 저장 실패 시 파일 삭제 (롤백)
      if (savedFileInfo) {
        await deleteFile(savedFileInfo.filePath);
      }
      throw error;
    }
  },

  /**
   * 문서 수정
   */
  async updateDocument(id: number, data: UpdateDocumentData) {
    // 존재 여부 확인
    const existingDocument = await this.getDocumentById(id);

    // 고객 존재 확인 (변경하는 경우)
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new NotFoundError("고객을 찾을 수 없습니다.");
      }
    }

    // 매장 존재 확인 (변경하는 경우)
    if (data.storeId !== undefined) {
      if (data.storeId) {
        const store = await prisma.store.findUnique({
          where: { id: data.storeId },
        });
        if (!store) {
          throw new NotFoundError("매장을 찾을 수 없습니다.");
        }
        // 매장이 해당 고객의 것인지 확인
        const customerId = data.customerId || existingDocument.customerId;
        if (customerId && store.customerId !== customerId) {
          throw new ValidationError("매장이 해당 고객의 것이 아닙니다.");
        }
      }
    }

    // 주문 존재 확인 (변경하는 경우)
    if (data.orderId !== undefined) {
      if (data.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
        });
        if (!order) {
          throw new NotFoundError("주문을 찾을 수 없습니다.");
        }
        // 주문이 해당 고객의 것인지 확인
        const customerId = data.customerId || existingDocument.customerId;
        if (customerId && order.customerId !== customerId) {
          throw new ValidationError("주문이 해당 고객의 것이 아닙니다.");
        }
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        customerId: data.customerId,
        storeId: data.storeId !== undefined ? data.storeId : undefined,
        orderId: data.orderId !== undefined ? data.orderId : undefined,
        documentType: data.documentType,
        description: data.description,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });

    return await this.getDocumentById(document.id);
  },

  /**
   * 문서 삭제
   */
  async deleteDocument(id: number) {
    // 존재 여부 확인
    const document = await this.getDocumentById(id);

    // 파일 삭제
    if (document.filePath) {
      await deleteFile(document.filePath);
    }

    // DB에서 문서 삭제
    await prisma.document.delete({
      where: { id },
    });
  },

  /**
   * 문서 다운로드 경로 반환
   */
  async getDocumentDownloadPath(id: number): Promise<string> {
    const document = await this.getDocumentById(id);

    if (!document.filePath) {
      throw new NotFoundError("파일 경로를 찾을 수 없습니다.");
    }

    // 파일 존재 확인
    const fs = await import("fs/promises");
    try {
      await fs.access(document.filePath);
    } catch {
      throw new NotFoundError("파일을 찾을 수 없습니다.");
    }

    return document.filePath;
  },
};

