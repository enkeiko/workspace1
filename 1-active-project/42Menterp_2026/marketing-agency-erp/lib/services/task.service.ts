import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface CreateTaskData {
  customerId: number;
  storeId?: number;
  orderId?: number;
  taskName: string;
  taskType?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date | string;
}

export interface UpdateTaskData {
  customerId?: number;
  storeId?: number;
  orderId?: number;
  taskName?: string;
  taskType?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date | string;
}

export interface GetTasksOptions {
  customerId?: number;
  storeId?: number;
  orderId?: number;
  status?: string;
  priority?: string;
  dueDate?: Date | string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateTimeEntryData {
  taskId: number;
  entryDate: Date | string;
  startTime: Date | string;
  endTime?: Date | string;
  durationMinutes?: number;
  description?: string;
}

export interface UpdateTimeEntryData {
  entryDate?: Date | string;
  startTime?: Date | string;
  endTime?: Date | string | null;
  durationMinutes?: number;
  description?: string;
}

// 유효한 상태 값
const validStatuses = ["pending", "in_progress", "completed", "cancelled"];

// 유효한 우선순위 값
const validPriorities = ["low", "medium", "high", "urgent"];

/**
 * 작업 상태 검증
 */
function validateStatus(status: string | undefined): void {
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 작업 상태입니다: ${status}`);
  }
}

/**
 * 우선순위 검증
 */
function validatePriority(priority: string | undefined): void {
  if (priority && !validPriorities.includes(priority)) {
    throw new ValidationError(`유효하지 않은 우선순위입니다: ${priority}`);
  }
}

/**
 * 시간 기록의 duration 계산
 */
function calculateDuration(
  startTime: Date,
  endTime: Date | null
): number | null {
  if (!endTime) {
    return null;
  }

  const diffMs = endTime.getTime() - startTime.getTime();
  if (diffMs < 0) {
    throw new ValidationError("종료 시간은 시작 시간보다 이후여야 합니다.");
  }

  return Math.floor(diffMs / (1000 * 60)); // 분 단위
}

export const taskService = {
  /**
   * 작업 목록 조회
   */
  async getTasks(options: GetTasksOptions = {}) {
    const {
      customerId,
      storeId,
      orderId,
      status,
      priority,
      dueDate,
      page,
      limit = 20,
      search,
    } = options;

    const where: Prisma.TaskWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (dueDate) {
      where.dueDate = new Date(dueDate);
    }

    if (search) {
      where.OR = [
        { taskName: { contains: search } },
        { description: { contains: search } },
        { taskType: { contains: search } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: [
          { priority: "desc" }, // 우선순위 높은 순
          { dueDate: "asc" }, // 마감일 가까운 순
          { createdAt: "desc" }, // 최신순
        ],
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
          _count: {
            select: {
              timeEntries: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 작업 상세 조회
   */
  async getTaskById(id: number) {
    const task = await prisma.task.findUnique({
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
        timeEntries: {
          orderBy: { entryDate: "desc" },
          take: 10, // 최근 10개만
        },
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError("작업을 찾을 수 없습니다.");
    }

    return task;
  },

  /**
   * 작업 생성
   */
  async createTask(data: CreateTaskData) {
    // 고객 존재 확인
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
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
      if (store.customerId !== data.customerId) {
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
      if (order.customerId !== data.customerId) {
        throw new ValidationError("주문이 해당 고객의 것이 아닙니다.");
      }
    }

    // 상태 검증
    validateStatus(data.status);

    // 우선순위 검증
    validatePriority(data.priority);

    const task = await prisma.task.create({
      data: {
        customerId: data.customerId,
        storeId: data.storeId || null,
        orderId: data.orderId || null,
        taskName: data.taskName,
        taskType: data.taskType || null,
        description: data.description || null,
        status: data.status || "pending",
        priority: data.priority || "medium",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return await this.getTaskById(task.id);
  },

  /**
   * 작업 수정
   */
  async updateTask(id: number, data: UpdateTaskData) {
    // 존재 여부 확인
    const existingTask = await this.getTaskById(id);

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
        const customerId = data.customerId || existingTask.customerId;
        if (store.customerId !== customerId) {
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
        const customerId = data.customerId || existingTask.customerId;
        if (order.customerId !== customerId) {
          throw new ValidationError("주문이 해당 고객의 것이 아닙니다.");
        }
      }
    }

    // 상태 검증
    validateStatus(data.status);

    // 우선순위 검증
    validatePriority(data.priority);

    // 완료된 작업은 수정 제한
    if (existingTask.status === "completed" && data.status && data.status !== "completed") {
      throw new ValidationError("완료된 작업은 상태를 변경할 수 없습니다.");
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        customerId: data.customerId,
        storeId: data.storeId !== undefined ? data.storeId : undefined,
        orderId: data.orderId !== undefined ? data.orderId : undefined,
        taskName: data.taskName,
        taskType: data.taskType,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate !== undefined
          ? (data.dueDate ? new Date(data.dueDate) : null)
          : undefined,
      },
    });

    return await this.getTaskById(task.id);
  },

  /**
   * 작업 삭제
   */
  async deleteTask(id: number) {
    // 존재 여부 확인
    await this.getTaskById(id);

    // 시간 기록이 있는 경우 함께 삭제 (CASCADE)
    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.deleteMany({
        where: { taskId: id },
      });

      await tx.task.delete({
        where: { id },
      });
    });
  },

  /**
   * 작업 상태 변경
   */
  async updateTaskStatus(id: number, status: string) {
    validateStatus(status);

    const task = await this.getTaskById(id);

    // 완료된 작업은 상태 변경 불가
    if (task.status === "completed" && status !== "completed") {
      throw new ValidationError("완료된 작업은 상태를 변경할 수 없습니다.");
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
    });

    return await this.getTaskById(updatedTask.id);
  },

  /**
   * 시간 기록 목록 조회
   */
  async getTimeEntries(taskId: number, options?: { startDate?: Date | string; endDate?: Date | string }) {
    const { startDate, endDate } = options || {};

    // 날짜 범위 검증
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError("유효하지 않은 날짜 형식입니다.");
      }
      if (start > end) {
        throw new ValidationError("시작일은 종료일보다 이전이어야 합니다.");
      }
    }

    const where: Prisma.TimeEntryWhereInput = {
      taskId,
    };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) {
        where.entryDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.entryDate.lte = new Date(endDate);
      }
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      include: {
        task: {
          select: {
            id: true,
            taskName: true,
          },
        },
      },
    });

    // 총 시간 계산
    const totalMinutes = timeEntries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0);
    }, 0);

    return {
      timeEntries,
      totalMinutes,
      totalHours: Math.floor(totalMinutes / 60),
    };
  },

  /**
   * 시간 기록 생성
   */
  async createTimeEntry(data: CreateTimeEntryData) {
    // 작업 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      throw new NotFoundError("작업을 찾을 수 없습니다.");
    }

    const startTime = new Date(data.startTime);
    const endTime = data.endTime ? new Date(data.endTime) : null;
    const entryDate = new Date(data.entryDate);

    // duration 계산
    let durationMinutes = data.durationMinutes;
    if (!durationMinutes && endTime) {
      const calculatedDuration = calculateDuration(startTime, endTime);
      durationMinutes = calculatedDuration ?? undefined;
    }

    // duration이 없으면 에러
    if (!durationMinutes) {
      throw new ValidationError("소요 시간을 입력하거나 종료 시간을 입력해야 합니다.");
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        entryDate,
        startTime,
        endTime,
        durationMinutes,
        description: data.description || null,
      },
    });

    return await prisma.timeEntry.findUnique({
      where: { id: timeEntry.id },
      include: {
        task: {
          select: {
            id: true,
            taskName: true,
          },
        },
      },
    });
  },

  /**
   * 시간 기록 수정
   */
  async updateTimeEntry(id: number, data: UpdateTimeEntryData) {
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundError("시간 기록을 찾을 수 없습니다.");
    }

    const startTime = data.startTime ? new Date(data.startTime) : existingEntry.startTime;
    const endTime = data.endTime !== undefined
      ? (data.endTime ? new Date(data.endTime) : null)
      : existingEntry.endTime;
    const entryDate = data.entryDate ? new Date(data.entryDate) : existingEntry.entryDate;

    // duration 계산
    let durationMinutes = data.durationMinutes;
    if (!durationMinutes && endTime) {
      const calculatedDuration = calculateDuration(startTime, endTime);
      durationMinutes = calculatedDuration ?? undefined;
    } else if (!durationMinutes) {
      durationMinutes = existingEntry.durationMinutes ?? undefined;
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        entryDate,
        startTime,
        endTime,
        durationMinutes,
        description: data.description,
      },
    });

    return await prisma.timeEntry.findUnique({
      where: { id: timeEntry.id },
      include: {
        task: {
          select: {
            id: true,
            taskName: true,
          },
        },
      },
    });
  },

  /**
   * 시간 기록 삭제
   */
  async deleteTimeEntry(id: number) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundError("시간 기록을 찾을 수 없습니다.");
    }

    return await prisma.timeEntry.delete({
      where: { id },
    });
  },

  /**
   * 작업별 총 시간 집계
   */
  async getTaskTimeSummary(taskId: number) {
    const task = await this.getTaskById(taskId);

    const timeEntries = await prisma.timeEntry.findMany({
      where: { taskId },
    });

    const totalMinutes = timeEntries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0);
    }, 0);

    return {
      taskId,
      taskName: task.taskName,
      totalEntries: timeEntries.length,
      totalMinutes,
      totalHours: Math.floor(totalMinutes / 60),
      totalDays: Math.floor(totalMinutes / (60 * 8)), // 8시간 기준 일수
    };
  },
};

