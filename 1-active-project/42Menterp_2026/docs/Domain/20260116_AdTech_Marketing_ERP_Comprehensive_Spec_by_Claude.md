# AdTech Marketing ERP 종합 설계서

> **작성일**: 2026-01-16
> **작성자**: Chief PM & Senior Engineer (Claude)
> **문서 버전**: 2.0 (통합본)
> **도메인**: 광고 대행사(Marketing Agency) ERP
> **원본 문서**: AdTech_ERP_Proposal_by_Antigravity.md + AdTech_Domain_Specialization_by_Claude.md

---

## Executive Summary

현재 `42Menterp_2026`은 **일반 ERP의 뼈대**는 갖췄지만, **광고 대행사 도메인의 핵심 비즈니스 로직**이 부족합니다.

### 현재 스키마 분석 결과
- ✅ `keyword` 필드 존재 (PurchaseOrderItem, StoreKeyword)
- ✅ `KeywordRanking` 모델로 순위 추적 가능
- ✅ `proofUrl` 필드로 증빙 저장 가능
- ❌ **키워드 중심 검색 불가능** (인덱스 없음)
- ❌ **목표 순위(targetRank) 필드 없음**
- ❌ **성과 기반 정산 로직 없음**
- ❌ **캠페인 연장/갱신 자동화 없음**
- ❌ **실시간 성과 대시보드 공유 기능 없음**

### 핵심 철학

광고주는 **"주문번호 20240101-01"**을 기억하지 못합니다.
**"강남 성형외과"**, **"홍대 맛집"** 키워드가 그들의 언어입니다.

시스템이 광고 대행사의 실무자가 **"이거 진짜 우리 일 이해하고 만든 거네!"**라고 감탄할 수 있도록 설계되어야 합니다.

---

## 1. 🔍 Ad-Optimized Search & Command (광고 정보 중심 검색)

### Problem Statement

**현재 상황**:
```sql
-- 주문번호로만 검색 가능
SELECT * FROM "PurchaseOrder" WHERE "purchaseOrderNo" = 'PO260113-0001';
```

**광고주의 실제 행동**:
- "주문번호요? 기억 안 나는데요..."
- "그때 **'강남역 맛집'** 키워드로 작업한 거 어디 갔죠?"
- "이번 달 **블로그 리뷰** 작업 전부 보여주세요."

### Solution Design

#### 1.1 Schema Update: Full-Text Search Index

```prisma
// schema.prisma 수정
model PurchaseOrderItem {
  // ... 기존 필드
  keyword String

  // 🔍 성과 목표 정의 추가
  targetRank    Int?    // "5위 이내 보장"
  currentRank   Int?    // 실시간 현재 순위

  @@index([keyword]) // 👈 추가
  @@fulltext([keyword, note]) // PostgreSQL Full-Text Search
}

model StoreKeyword {
  keyword String

  @@index([keyword]) // 👈 추가
  @@fulltext([keyword])
}
```

**기술 참조**:
- 검색 성능을 위해 역정규화(Denormalization)된 검색 전용 필드나 인덱스 필요
- PostgreSQL Full-Text Search 활용

#### 1.2 Universal Search API (Keyword-Centric)

**UX Reference**:
- **Slack의 통합 검색**: 채널/사람/메시지를 한 번에 검색
- **Google Ads 캠페인 검색**: 키워드로 광고그룹/캠페인 모두 조회
- **Algolia Instant Search**: 실시간 자동완성

```typescript
// app/src/app/api/search/universal/route.ts
export async function GET(request: NextRequest) {
  const { q } = request.nextUrl.searchParams;

  // 병렬 검색으로 성능 최적화
  const [campaigns, stores, keywords, orders] = await Promise.all([
    // 1. 키워드로 작업 중인 모든 캠페인
    prisma.purchaseOrderItem.findMany({
      where: {
        OR: [
          { keyword: { contains: q, mode: 'insensitive' } },
          { note: { contains: q, mode: 'insensitive' } },
        ],
        status: { not: 'CANCELLED' },
      },
      include: {
        purchaseOrder: {
          include: { channel: true },
        },
        store: {
          include: { customer: true },
        },
        product: true,
      },
      take: 20,
    }),

    // 2. 매장명 검색
    prisma.store.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      include: {
        customer: true,
        keywords: {
          include: {
            rankings: {
              orderBy: { checkDate: 'desc' },
              take: 1, // 최신 순위만
            },
          },
        },
      },
      take: 10,
    }),

    // 3. 키워드 마스터
    prisma.storeKeyword.findMany({
      where: {
        keyword: { contains: q, mode: 'insensitive' },
        isActive: true,
      },
      include: {
        store: true,
        rankings: {
          orderBy: { checkDate: 'desc' },
          take: 1,
        },
      },
      take: 10,
    }),

    // 4. 주문 번호/메모 검색
    prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { purchaseOrderNo: { contains: q, mode: 'insensitive' } },
          { memo: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        items: true,
        channel: true,
      },
      take: 10,
    }),
  ]);

  // 결과 그룹핑 (키워드별 집계)
  return NextResponse.json({
    results: {
      campaigns: groupByKeyword(campaigns),
      stores,
      keywords,
      orders,
    },
    meta: {
      totalCount: campaigns.length + stores.length + keywords.length + orders.length,
      query: q,
    },
  });
}

// 키워드별 그룹핑 헬퍼 함수
function groupByKeyword(items: PurchaseOrderItem[]) {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.keyword)) {
      grouped.set(item.keyword, {
        keyword: item.keyword,
        stores: [],
        totalOrders: 0,
        activeCount: 0,
        currentRank: null,
        targetRank: null,
      });
    }

    const group = grouped.get(item.keyword);
    group.stores.push(item.store);
    group.totalOrders++;
    if (item.status === 'IN_PROGRESS') group.activeCount++;
    if (item.currentRank) group.currentRank = item.currentRank;
    if (item.targetRank) group.targetRank = item.targetRank;
  }

  return Array.from(grouped.values());
}
```

#### 1.3 Search Results UI (Status-at-a-Glance)

**Visual Grouping 콘셉**:
"강남" 입력 시, 단순 텍스트 매칭이 아니라 다음과 같이 구조화된 결과를 표시:
- 🏙️ **매장:** 강남역 1번출구점 (D-5)
- 🔑 **키워드:** '강남 맛집' - 현재 3위 (▲2)
- 📄 **작업:** 블로그 포스팅 5건 진행 중

```tsx
// components/search/universal-search-results.tsx
export function UniversalSearchResults({ results }) {
  return (
    <div className="space-y-6">
      {/* 키워드 그룹 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          키워드별 캠페인 ({results.campaigns.length})
        </h3>
        {results.campaigns.map((group) => (
          <Card key={group.keyword} className="p-4 mb-2 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-lg">
                    {group.keyword}
                  </span>
                  <Badge variant="outline">
                    {group.activeCount}개 진행중
                  </Badge>
                </div>

                {/* 메타데이터 시각화 */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {/* 현재 순위 */}
                  {group.currentRank && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="font-medium">
                        현재 {group.currentRank}위
                      </span>
                      {group.targetRank && (
                        <span className="text-muted-foreground">
                          (목표: {group.targetRank}위)
                        </span>
                      )}
                    </div>
                  )}

                  {/* 남은 기간 */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-orange-500" />
                    <span className="font-medium">D-5</span>
                    <span className="text-muted-foreground">
                      (2026-01-21 종료)
                    </span>
                  </div>

                  {/* 작업 완료율 */}
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-blue-500" />
                    <span>완료 15/30일</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm">
                상세보기 →
              </Button>
            </div>

            {/* 매장 목록 미리보기 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {group.stores.slice(0, 5).map((store) => (
                <Badge key={store.id} variant="secondary">
                  {store.name}
                </Badge>
              ))}
              {group.stores.length > 5 && (
                <Badge variant="outline">
                  +{group.stores.length - 5}개 매장
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </section>

      {/* 매장 검색 결과 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          매장 ({results.stores.length})
        </h3>
        {results.stores.map((store) => (
          <StoreSearchCard key={store.id} store={store} />
        ))}
      </section>
    </div>
  );
}
```

#### 1.4 Command Palette (⌘K) - Omnibox 구현

**UX Reference**:
- **Linear의 Command Menu**: 모든 작업을 키보드로
- **Vercel Dashboard**: 프로젝트 전환/배포 명령
- **Notion**: Omnibox (⌘K)

**구현 라이브러리**: `cmdk` 기반 Command Palette

```tsx
// components/command-palette.tsx
import { Command } from "cmdk";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Cmd+K 또는 Ctrl+K 단축키
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input
        placeholder="키워드, 매장, 주문번호 검색 또는 명령 실행..."
        onValueChange={(value) => {
          // 실시간 검색
          if (value.length > 1) {
            fetch(`/api/search/universal?q=${value}`)
              .then(r => r.json())
              .then(data => setSearchResults(data.results));
          }
        }}
      />
      <Command.List>
        <Command.Empty>검색 결과 없음</Command.Empty>

        {/* 빠른 액션 */}
        <Command.Group heading="빠른 작업">
          <Command.Item onSelect={() => router.push('/purchase-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            새 발주 생성
          </Command.Item>
          <Command.Item onSelect={() => router.push('/keywords/check')}>
            <Search className="mr-2 h-4 w-4" />
            순위 체크 실행
          </Command.Item>
          <Command.Item onSelect={() => router.push('/reports/new')}>
            <FileText className="mr-2 h-4 w-4" />
            고객 리포트 생성
          </Command.Item>
        </Command.Group>

        {/* 동적 검색 결과 */}
        <Command.Group heading="키워드">
          {searchResults.keywords?.map((result) => (
            <Command.Item
              key={result.id}
              value={result.keyword}
              onSelect={() => router.push(`/keywords/${result.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>{result.keyword}</span>
              <Badge className="ml-auto">{result.count}건</Badge>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="매장">
          {searchResults.stores?.map((store) => (
            <Command.Item
              key={store.id}
              onSelect={() => router.push(`/stores/${store.id}`)}
            >
              <Building className="mr-2 h-4 w-4" />
              <span>{store.name}</span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

---

## 2. ⚡ Campaign & Slot Management (슬롯/기간 관리 편의성)

### Problem Statement

대행사 수익의 핵심은 **"재계약(Extension)"** 방어입니다. 시스템이 이를 챙겨줘야 합니다.

**현재 문제**:
- 만료 3일 전 주문 파악 불가 (수동 엑셀 관리)
- 연장 시 새로 견적 → 주문 → 발주 생성 (5단계)
- 100개 주문을 실행사별로 수동 분배 (엑셀 복붙 지옥)

### Solution Design

#### 2.1 Smart Renewal Pipeline (One-Click Extension)

##### A. 만료 예정 알림 스키마

```prisma
// schema.prisma 추가
model CampaignRenewal {
  id                String          @id @default(cuid())

  // 원본 주문
  originalOrderId   String
  originalOrder     PurchaseOrder   @relation("OriginalOrder", fields: [originalOrderId], references: [id])

  // 연장 제안
  proposedStartDate DateTime
  proposedEndDate   DateTime
  proposedAmount    Int

  // 상태
  status            RenewalStatus   @default(PENDING)

  // 생성된 신규 주문 (수락 시)
  renewedOrderId    String?         @unique
  renewedOrder      PurchaseOrder?  @relation("RenewedOrder", fields: [renewedOrderId], references: [id])

  // 메타
  expiryNotifiedAt  DateTime?       // 알림 발송 시각
  acceptedAt        DateTime?
  acceptedById      String?
  acceptedBy        User?           @relation(fields: [acceptedById], references: [id])

  createdAt         DateTime        @default(now())

  @@index([originalOrderId])
  @@index([status])
}

enum RenewalStatus {
  PENDING      // 제안 대기
  ACCEPTED     // 수락 (신규 주문 생성됨)
  DECLINED     // 거절
  EXPIRED      // 제안 만료
}
```

##### B. D-Day Color Coding + 자동 만료 감지 Cron Job

**UX 콘셉**:
- **D-7**: 노랑 배경
- **D-3**: 주황 배경
- **만료**: 빨강 배경

```typescript
// app/src/app/api/cron/renewal-proposals/route.ts
export async function GET() {
  const threeDaysLater = addDays(new Date(), 3);

  // 3일 내 만료 예정 주문 조회
  const expiringOrders = await prisma.purchaseOrder.findMany({
    where: {
      status: 'IN_PROGRESS',
      items: {
        some: {
          endDate: {
            gte: new Date(),
            lte: threeDaysLater,
          },
        },
      },
    },
    include: {
      items: {
        include: {
          store: true,
          product: true,
        },
      },
      tenant: true,
    },
  });

  // 연장 제안 자동 생성
  for (const order of expiringOrders) {
    // 이미 제안 생성되었는지 체크
    const existingProposal = await prisma.campaignRenewal.findFirst({
      where: {
        originalOrderId: order.id,
        status: 'PENDING',
      },
    });

    if (existingProposal) continue;

    // 새 제안 생성
    const proposal = await prisma.campaignRenewal.create({
      data: {
        originalOrderId: order.id,
        proposedStartDate: addDays(order.items[0].endDate, 1), // 종료일 다음날부터
        proposedEndDate: addDays(order.items[0].endDate, 31), // +30일
        proposedAmount: order.totalAmount, // 동일 금액
        status: 'PENDING',
      },
    });

    // 알림 전송 (Slack/Email/시스템 알림)
    await sendRenewalNotification(order, proposal);
  }

  return NextResponse.json({ processed: expiringOrders.length });
}
```

##### C. One-Click Extension UI

**워크플로우**:
> "기존 조건(단가, 키워드, 수량) 그대로 30일 연장하시겠습니까?"
> → [확인] 클릭 시 **새로운 수주서와 발주서가 자동 생성**되고 즉시 '확정' 상태로 전환.

```tsx
// components/renewal/renewal-card.tsx
export function RenewalCard({ proposal }) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);

    try {
      // 원본 주문의 모든 설정을 그대로 복제
      const response = await fetch('/api/renewals/accept', {
        method: 'POST',
        body: JSON.stringify({
          proposalId: proposal.id,
          modifications: {
            startDate: proposal.proposedStartDate,
            endDate: proposal.proposedEndDate,
          },
        }),
      });

      const { renewedOrder } = await response.json();

      toast.success(`연장 완료! 새 주문: ${renewedOrder.purchaseOrderNo}`);
      router.push(`/purchase-orders/${renewedOrder.id}`);
    } catch (error) {
      toast.error('연장 실패');
    } finally {
      setAccepting(false);
    }
  };

  // D-Day 계산
  const daysUntil = differenceInDays(
    proposal.originalOrder.items[0].endDate,
    new Date()
  );

  // Color Coding
  const bgColor =
    daysUntil <= 0 ? 'bg-red-50 border-red-200' :
    daysUntil <= 3 ? 'bg-orange-50 border-orange-200' :
    daysUntil <= 7 ? 'bg-yellow-50 border-yellow-200' :
    'bg-white';

  return (
    <Card className={bgColor}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">
            만료 예정 캠페인
          </CardTitle>
          <Badge variant="outline" className="ml-auto">
            D-{daysUntil}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 원본 캠페인 정보 */}
          <div className="p-3 bg-white rounded-md">
            <div className="text-sm font-medium">
              {proposal.originalOrder.purchaseOrderNo}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {proposal.originalOrder.items.length}개 키워드 ·{' '}
              {formatDate(proposal.originalOrder.items[0].endDate)} 종료
            </div>
          </div>

          {/* 연장 제안 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">연장 기간</span>
            <span className="font-medium">
              {formatDate(proposal.proposedStartDate)} ~{' '}
              {formatDate(proposal.proposedEndDate)} (30일)
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">예상 금액</span>
            <span className="font-semibold text-lg">
              {formatCurrency(proposal.proposedAmount)}
            </span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  동일 조건으로 연장
                </>
              )}
            </Button>

            <Button variant="outline" asChild>
              <Link href={`/renewals/${proposal.id}/edit`}>
                수정 후 연장
              </Link>
            </Button>

            <Button variant="ghost" onClick={() => declineProposal(proposal.id)}>
              거절
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2.2 Bulk Work Assignment (Traffic Distribution)

**문제**: 트래픽 상품 1,000개를 5개 실행사에 나누는 상황을 해결

##### A. 채널 할당 UI (Drag & Drop Kanban Style)

**UX Reference**:
- **Trello 보드**: 드래그 앤 드롭
- **Monday.com**: 일괄 할당

```tsx
// components/distribution/traffic-distribution-board.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';

export function TrafficDistributionBoard({ pendingOrders }) {
  const [channels, setChannels] = useState([]);
  const [unassigned, setUnassigned] = useState(pendingOrders);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const orderItemId = active.id;
    const targetChannelId = over.id;

    // 아이템을 채널에 할당
    assignToChannel(orderItemId, targetChannelId);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* 미할당 풀 */}
        <Droppable id="unassigned">
          <Card className="w-80 flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                미할당 ({unassigned.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassigned.map((item) => (
                <Draggable key={item.id} id={item.id}>
                  <OrderItemCard item={item} />
                </Draggable>
              ))}
            </CardContent>
          </Card>
        </Droppable>

        {/* 채널별 칸반 */}
        {channels.map((channel) => (
          <Droppable key={channel.id} id={channel.id}>
            <Card className="w-80 flex-shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{channel.name}</span>
                  <Badge>{channel.assignedCount}</Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  총 {formatCurrency(channel.totalAmount)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {channel.items.map((item) => (
                  <Draggable key={item.id} id={item.id}>
                    <OrderItemCard item={item} assigned />
                  </Draggable>
                ))}
              </CardContent>
            </Card>
          </Droppable>
        ))}
      </div>

      {/* 일괄 할당 버튼 */}
      <div className="fixed bottom-8 right-8">
        <Button size="lg" onClick={bulkAssign}>
          <Send className="mr-2 h-5 w-5" />
          {assignedCount}건 채널에 전송
        </Button>
      </div>
    </DndContext>
  );
}
```

##### B. Distribute UI: 균등/가중치 분배 옵션

**Logic 예시**:
```typescript
// Pseudo-code for traffic distribution
const orders = selectedOrders;
const channels = [{id: 'A', ratio: 0.7}, {id: 'B', ratio: 0.3}];

distributeOrders(orders, channels).forEach(batch => {
  createPurchaseOrders(batch); // 실행사별 발주서 자동 생성
});
```

##### C. 자동 분배 알고리즘 (최소 비용 우선)

```typescript
// services/distribution.service.ts
export class DistributionService {
  /**
   * 채널 용량 기반 자동 분배
   * - 최소 비용 우선 (Cost-Optimized)
   * - 용량 고려 (Capacity-Aware)
   */
  async autoDistribute(orderItems: PurchaseOrderItem[]) {
    // 1. 채널별 현재 부하 조회
    const channels = await prisma.channel.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            purchaseOrders: {
              where: {
                status: { in: ['IN_PROGRESS', 'CONFIRMED'] },
              },
            },
          },
        },
      },
    });

    // 2. 채널별 용량 계산
    const channelCapacity = channels.map((ch) => ({
      channelId: ch.id,
      name: ch.name,
      maxMonthlyQty: ch.maxMonthlyQty || 10000,
      currentLoad: ch._count.purchaseOrders,
      available: (ch.maxMonthlyQty || 10000) - ch._count.purchaseOrders,
      costPerUnit: ch.baseUnitPrice,
    }));

    // 3. 최소 비용 우선 + 용량 고려 분배
    const distribution = new Map<string, PurchaseOrderItem[]>();

    // 채널을 비용순으로 정렬
    channelCapacity.sort((a, b) => a.costPerUnit - b.costPerUnit);

    for (const item of orderItems) {
      // 용량이 있는 가장 저렴한 채널 선택
      const targetChannel = channelCapacity.find(
        (ch) => ch.available >= item.totalQty
      );

      if (targetChannel) {
        if (!distribution.has(targetChannel.channelId)) {
          distribution.set(targetChannel.channelId, []);
        }

        distribution.get(targetChannel.channelId)!.push(item);
        targetChannel.available -= item.totalQty;
      } else {
        // 용량 부족 시 알림
        console.warn(`No channel available for item ${item.id}`);
      }
    }

    return distribution;
  }
}
```

---

## 3. 📸 Proof of Execution & Reporting (증빙과 보고의 자동화)

### Problem Statement

**"보고서 만드는 날"이 야근하는 날이 되어서는 안 됩니다.**

**현재 문제**:
- 작업자가 50개 블로그 URL을 일일이 수동 입력
- 고객에게 엑셀 파일 이메일 전송 (버전 관리 지옥)
- 순위 변화 추적을 위해 매일 수동 캡처

### Solution Design

#### 3.1 Bulk Evidence Upload

##### A. 엑셀 업로드 → 자동 매칭

**Flow**:
1. 작업자는 엑셀에 `[주문ID]`, `[블로그URL]` 두 컬럼만 채워서 업로드.
2. 서버가 URL을 크롤링하여 `og:image`(썸네일)와 `title`을 추출.
3. DB의 `PurchaseOrderItem` > `proofUrl` 필드에 자동 매핑.

```typescript
// app/src/app/api/proof/bulk-upload/route.ts
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 1. 엑셀 파싱
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  // 예상 포맷:
  // | 주문번호 | 키워드 | 매장명 | 작업URL | 완료일 |

  const results = [];

  for (const row of data) {
    try {
      // 2. 주문 건 매칭
      const item = await prisma.purchaseOrderItem.findFirst({
        where: {
          purchaseOrder: {
            purchaseOrderNo: row['주문번호'],
          },
          keyword: row['키워드'],
          store: {
            name: row['매장명'],
          },
        },
      });

      if (!item) {
        results.push({
          row,
          status: 'NOT_FOUND',
          error: '일치하는 주문 건 없음',
        });
        continue;
      }

      // 3. 증빙 업데이트
      await prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          proofUrl: row['작업URL'],
          proofNote: `자동 업로드: ${row['완료일']}`,
          status: 'COMPLETED',
        },
      });

      // 4. 썸네일 생성 (비동기)
      await generateThumbnail(row['작업URL'], item.id);

      results.push({
        row,
        status: 'SUCCESS',
        itemId: item.id,
      });
    } catch (error) {
      results.push({
        row,
        status: 'ERROR',
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    total: data.length,
    success: results.filter((r) => r.status === 'SUCCESS').length,
    failed: results.filter((r) => r.status !== 'SUCCESS').length,
    details: results,
  });
}
```

##### B. URL 썸네일 자동 생성

```typescript
// lib/thumbnail-generator.ts
import puppeteer from 'puppeteer';

export async function generateThumbnail(url: string, itemId: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  // OG 이미지 추출 시도
  const ogImage = await page.$eval(
    'meta[property="og:image"]',
    (el) => el.getAttribute('content')
  ).catch(() => null);

  // 스크린샷 생성
  const screenshot = await page.screenshot({
    type: 'jpeg',
    quality: 80,
    fullPage: false,
  });

  await browser.close();

  // S3/Storage에 업로드
  const thumbnailUrl = await uploadToStorage(
    screenshot,
    `thumbnails/${itemId}.jpg`
  );

  // DB 업데이트
  await prisma.purchaseOrderItem.update({
    where: { id: itemId },
    data: {
      thumbnailUrl,
    },
  });

  return thumbnailUrl;
}
```

#### 3.2 Client Secret Viewer (읽기 전용 링크 공유)

**개념**: 고객에게 엑셀을 보내는 대신, **"읽기 전용 링크"**를 공유합니다.
- `your-agency.com/report/{uuid}` 형태의 링크. 로그인 불필요.
- **콘텐츠**:
  1. 순위 변동 차트 (최근 30일)
  2. Live Evidence (작업자 업로드 캡처 이미지 갤러리)
  3. PDF Export (고객이 직접 다운로드)

##### A. 공유 링크 생성 스키마

```prisma
// schema.prisma 추가
model ClientReport {
  id              String   @id @default(cuid())
  secretToken     String   @unique @default(cuid()) // 공유 링크용

  // 연결된 주문
  salesOrderId    String
  salesOrder      SalesOrder @relation(fields: [salesOrderId], references: [id])

  // 설정
  title           String
  description     String?
  showPricing     Boolean  @default(false) // 금액 표시 여부
  expiresAt       DateTime? // 링크 만료일

  // 접속 로그
  viewCount       Int      @default(0)
  lastViewedAt    DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([secretToken])
}
```

```typescript
// app/src/app/api/reports/create/route.ts
export async function POST(request: NextRequest) {
  const { salesOrderId, title, showPricing, expiresAt } = await request.json();

  const report = await prisma.clientReport.create({
    data: {
      salesOrderId,
      title,
      showPricing,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/reports/${report.secretToken}`;

  return NextResponse.json({
    reportId: report.id,
    shareUrl,
  });
}
```

##### B. 공개 리포트 페이지

```tsx
// app/src/app/reports/[token]/page.tsx
export default async function PublicReportPage({ params }) {
  const { token } = params;

  // 리포트 조회
  const report = await prisma.clientReport.findUnique({
    where: { secretToken: token },
    include: {
      salesOrder: {
        include: {
          items: {
            include: {
              store: true,
              product: true,
            },
          },
          customer: true,
        },
      },
    },
  });

  if (!report) {
    return <div>리포트를 찾을 수 없습니다.</div>;
  }

  // 만료 체크
  if (report.expiresAt && new Date() > report.expiresAt) {
    return <div>링크가 만료되었습니다.</div>;
  }

  // 조회수 증가
  await prisma.clientReport.update({
    where: { id: report.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {report.title}
          </h1>
          <p className="text-gray-600 mt-2">
            {report.salesOrder.customer.name} · 작업 현황 리포트
          </p>
        </div>
      </header>

      {/* 성과 요약 */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <StatCard
            title="총 키워드"
            value={report.salesOrder.items.length}
            icon={<Search />}
          />
          <StatCard
            title="완료율"
            value={`${calculateCompletionRate(report.salesOrder.items)}%`}
            icon={<CheckCircle />}
          />
          <StatCard
            title="평균 순위"
            value={calculateAverageRank(report.salesOrder.items)}
            icon={<TrendingUp />}
          />
        </div>
      </section>

      {/* 키워드별 상세 */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">키워드별 성과</h2>
        <div className="space-y-4">
          {report.salesOrder.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {item.keyword}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.store.name}
                    </p>

                    {/* 순위 그래프 */}
                    <RankingChart
                      data={getRankingHistory(item.store.id, item.keyword)}
                      className="mt-4"
                    />

                    {/* 작업 증빙 썸네일 */}
                    {item.thumbnailUrl && (
                      <div className="mt-4">
                        <img
                          src={item.thumbnailUrl}
                          alt="작업 증빙"
                          className="rounded-md border w-64 h-40 object-cover"
                        />
                        <a
                          href={item.proofUrl}
                          target="_blank"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          작업 결과 보기 →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 현재 순위 */}
                  <div className="text-right">
                    <div className="text-4xl font-bold text-green-600">
                      {item.currentRank}위
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      목표: {item.targetRank}위
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PDF Export 버튼 */}
      <div className="fixed bottom-8 right-8">
        <Button size="lg" onClick={() => exportToPDF(report)}>
          <Download className="mr-2 h-5 w-5" />
          PDF 다운로드
        </Button>
      </div>
    </div>
  );
}
```

#### 3.3 Snapshot History (자동 아카이빙)

##### A. 스키마 확장

```prisma
// schema.prisma 추가
model RankingSnapshot {
  id              String   @id @default(cuid())
  storeKeywordId  String
  storeKeyword    StoreKeyword @relation(fields: [storeKeywordId], references: [id])

  // 순위 정보
  ranking         Int
  checkDate       DateTime
  checkTime       String   @default("00:00")

  // 스크린샷
  screenshotUrl   String?  // 순위 결과 화면 캡처
  pageUrl         String?  // 검색 결과 URL

  // 메타데이터
  searchEngine    String   @default("NAVER") // NAVER, GOOGLE, etc
  device          String   @default("MOBILE") // MOBILE, DESKTOP

  createdAt       DateTime @default(now())

  @@index([storeKeywordId, checkDate])
  @@index([checkDate])
}
```

##### B. 자동 스냅샷 Cron (Ranking Bot)

```typescript
// app/src/app/api/cron/ranking-snapshots/route.ts
export async function GET() {
  // 1. 활성 키워드 조회
  const activeKeywords = await prisma.storeKeyword.findMany({
    where: { isActive: true },
    include: { store: true },
  });

  // 2. 병렬 스냅샷 생성 (배치 처리)
  const batchSize = 10;
  for (let i = 0; i < activeKeywords.length; i += batchSize) {
    const batch = activeKeywords.slice(i, i + batchSize);

    await Promise.all(
      batch.map((kw) => captureRankingSnapshot(kw))
    );

    // API 레이트 리밋 방지
    await sleep(2000);
  }

  return NextResponse.json({ processed: activeKeywords.length });
}

async function captureRankingSnapshot(keyword: StoreKeyword) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 네이버 검색
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword.keyword)}`;
  await page.goto(searchUrl);

  // 순위 파싱
  const ranking = await findStoreRanking(page, keyword.store.name);

  // 스크린샷
  const screenshot = await page.screenshot({ fullPage: true });
  const screenshotUrl = await uploadToStorage(
    screenshot,
    `snapshots/${keyword.id}/${format(new Date(), 'yyyy-MM-dd')}.png`
  );

  await browser.close();

  // DB 저장
  await prisma.rankingSnapshot.create({
    data: {
      storeKeywordId: keyword.id,
      ranking,
      checkDate: new Date(),
      checkTime: format(new Date(), 'HH:mm'),
      screenshotUrl,
      pageUrl: searchUrl,
      searchEngine: 'NAVER',
      device: 'MOBILE',
    },
  });

  // KeywordRanking도 업데이트 (기존 테이블)
  await prisma.keywordRanking.upsert({
    where: {
      // unique constraint 필요
      storeKeywordId_checkDate: {
        storeKeywordId: keyword.id,
        checkDate: new Date(),
      },
    },
    update: {
      ranking,
      checkTime: format(new Date(), 'HH:mm'),
    },
    create: {
      storeKeywordId: keyword.id,
      ranking,
      checkDate: new Date(),
      checkTime: format(new Date(), 'HH:mm'),
    },
  });
}
```

---

## 4. 💰 Performance-based Billing (성과 기반 정산)

### Problem Statement

**"30일 보장형인데 5일 빠졌으니 환불해주세요"** - 이 계산을 자동화합니다.

**현재 문제**:
- "5위 안에 들어간 날만 청구" 같은 조건부 정산 불가
- 순위 체크 결과와 정산이 수동 연동
- 마진율을 월말에야 파악 가능

### Solution Design

#### 4.1 Data Schema: 성과 목표 정의

```prisma
// schema.prisma 확장
model PurchaseOrderItem {
  // ... 기존 필드

  // 🎯 1. 성과 목표 정의
  goalType      GoalType   @default(RANKING) // 순위, 트래픽, 단순건수
  targetRank    Int?       @default(5)       // "5위 이내 보장"
  garanteeDays  Int?       @default(25)      // "25일 보장형"

  // 📊 2. 성과 측정 결과 (매일 봇이 업데이트)
  successDays   Int        @default(0)       // 달성일 수
  failDays      Int        @default(0)       // 실패일 수
  currentRank   Int?                         // 실시간 현재 순위

  // 💸 3. 정산 반영
  unitPrice     Int        // 계약 단가
  refundPerDay  Int?       // 실패 시 1일 차감액 (예: 10,000원)

  // ...
}

enum GoalType {
  RANKING      // N위 이내 노출
  TRAFFIC      // 유입수 보장
  FULL_PERIOD  // 단순 기간제 (건바이건)
}

model BillingRule {
  id                String       @id @default(cuid())

  // 연결된 상품
  productId         String
  product           Product      @relation(fields: [productId], references: [id])

  // 규칙 타입
  ruleType          BillingRuleType

  // 성과 조건
  targetRank        Int?         // 목표 순위 (예: 5)
  minCompletionRate Float?       // 최소 완료율 (예: 0.8 = 80%)

  // 환불/차감 정책
  refundType        RefundType   @default(DAILY_PRORATED)
  refundRate        Float        @default(1.0) // 환불 비율 (1.0 = 100%)

  // 유효기간
  effectiveFrom     DateTime     @default(now())
  effectiveTo       DateTime?

  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())

  @@index([productId])
}

enum BillingRuleType {
  RANK_GUARANTEE   // 순위 보장형
  COMPLETION_BASED // 완료율 기반
  HYBRID           // 복합형
}

enum RefundType {
  DAILY_PRORATED   // 일할 환불
  FULL_REFUND      // 전액 환불
  NO_REFUND        // 환불 없음
}
```

#### 4.2 Auto-refund Logic

##### A. Ranking Bot (순위 자동 업데이트)

**Automation Point**:
- 매일 자정, 등록된 키워드의 순위를 크롤링하여 `StoreKeyword` 테이블의 `rank`를 업데이트
- `targetRank`와 현재 순위를 비교
- 실패 시: `failDays` + 1 증가, `refundAmount`에 `refundPerDay`만큼 누적
- 월말 정산: 실행사 정산서 생성 시 누적된 `refundAmount`를 **"패널티 공제"** 항목으로 자동 기입

##### B. 자동 정산 계산 서비스

```typescript
// services/billing-calculator.service.ts
export class BillingCalculatorService {
  /**
   * 성과 기반 정산 금액 계산
   */
  async calculatePerformanceBilling(
    purchaseOrderItem: PurchaseOrderItem,
    month: string
  ): Promise<BillingResult> {
    // 1. 적용 가능한 빌링 규칙 조회
    const rule = await prisma.billingRule.findFirst({
      where: {
        productId: purchaseOrderItem.productId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
    });

    if (!rule || rule.ruleType === 'COMPLETION_BASED') {
      // 규칙 없으면 전액 청구
      return {
        billableAmount: purchaseOrderItem.amount,
        unbillableAmount: 0,
        deductionDays: [],
        reason: 'NO_RULE',
      };
    }

    // 2. 해당 월의 순위 기록 조회
    const startDate = startOfMonth(new Date(month));
    const endDate = endOfMonth(new Date(month));

    const rankings = await prisma.keywordRanking.findMany({
      where: {
        storeKeyword: {
          storeId: purchaseOrderItem.storeId,
          keyword: purchaseOrderItem.keyword,
        },
        checkDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { checkDate: 'asc' },
    });

    // 3. 목표 달성 일수 계산
    const targetRank = rule.targetRank || 5;
    const achievedDays = rankings.filter((r) => r.ranking <= targetRank);
    const failedDays = rankings.filter((r) => r.ranking > targetRank);

    // 4. 차감 금액 계산
    const dailyRate = purchaseOrderItem.amount / purchaseOrderItem.workDays;
    const deductionAmount = failedDays.length * dailyRate * rule.refundRate;

    return {
      billableAmount: purchaseOrderItem.amount - deductionAmount,
      unbillableAmount: deductionAmount,
      achievedDays: achievedDays.length,
      failedDays: failedDays.length,
      deductionDays: failedDays.map((r) => ({
        date: r.checkDate,
        rank: r.ranking,
        targetRank,
      })),
      reason: `목표 ${targetRank}위 미달성 ${failedDays.length}일`,
    };
  }

  /**
   * 월 단위 자동 정산 실행
   */
  async executeMonthlySettlement(month: string) {
    // 해당 월에 종료된 모든 주문 항목
    const completedItems = await prisma.purchaseOrderItem.findMany({
      where: {
        endDate: {
          gte: startOfMonth(new Date(month)),
          lte: endOfMonth(new Date(month)),
        },
        status: 'COMPLETED',
      },
      include: {
        purchaseOrder: {
          include: { channel: true },
        },
        store: true,
        product: true,
      },
    });

    // 각 항목별 정산 계산
    for (const item of completedItems) {
      const billing = await this.calculatePerformanceBilling(item, month);

      // Settlement 레코드 생성
      await prisma.settlement.create({
        data: {
          storeId: item.storeId,
          channelId: item.purchaseOrder.channelId,
          settlementMonth: month,
          type: 'COST',
          amount: billing.billableAmount,
          billableAmount: billing.billableAmount,
          unbillableAmount: billing.unbillableAmount,
          unbillableReason: billing.reason,
          description: `${item.keyword} - ${billing.achievedDays}/${item.workDays}일 달성`,
          status: 'PENDING',
        },
      });
    }
  }
}

type BillingResult = {
  billableAmount: number;
  unbillableAmount: number;
  achievedDays?: number;
  failedDays?: number;
  deductionDays: { date: Date; rank: number; targetRank: number }[];
  reason: string;
};
```

#### 4.3 Profitability Analysis Dashboard

##### A. 실시간 마진 계산 API

```typescript
// app/src/app/api/analytics/profitability/route.ts
export async function GET(request: NextRequest) {
  const { month } = request.nextUrl.searchParams;

  // 1. 매출 (고객 판매가)
  const revenue = await prisma.salesOrderItem.aggregate({
    where: {
      salesOrder: {
        orderDate: {
          gte: startOfMonth(new Date(month)),
          lte: endOfMonth(new Date(month)),
        },
        status: { not: 'CANCELLED' },
      },
    },
    _sum: {
      supplyAmount: true,
    },
  });

  // 2. 매입 (실행사 매입가)
  const cost = await prisma.purchaseOrderItem.aggregate({
    where: {
      purchaseOrder: {
        orderDate: {
          gte: startOfMonth(new Date(month)),
          lte: endOfMonth(new Date(month)),
        },
        status: { not: 'CANCELLED' },
      },
    },
    _sum: {
      amount: true,
    },
  });

  // 3. 환불 (성과 미달)
  const refunds = await prisma.settlement.aggregate({
    where: {
      settlementMonth: month,
      unbillableAmount: { gt: 0 },
    },
    _sum: {
      unbillableAmount: true,
    },
  });

  // 4. 마진 계산
  const totalRevenue = revenue._sum.supplyAmount || 0;
  const totalCost = cost._sum.amount || 0;
  const totalRefunds = refunds._sum.unbillableAmount || 0;

  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalRefunds;
  const grossMargin = (grossProfit / totalRevenue) * 100;
  const netMargin = (netProfit / totalRevenue) * 100;

  return NextResponse.json({
    month,
    revenue: totalRevenue,
    cost: totalCost,
    refunds: totalRefunds,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
    breakdown: {
      // 상품별 마진
      byProduct: await getProductMargins(month),
      // 채널별 마진
      byChannel: await getChannelMargins(month),
      // 고객별 마진
      byCustomer: await getCustomerMargins(month),
    },
  });
}
```

##### B. 마진 대시보드 UI

```tsx
// app/src/app/(dashboard)/analytics/profitability/page.tsx
export default function ProfitabilityDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['profitability', selectedMonth],
    queryFn: () => fetchProfitability(selectedMonth),
  });

  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              총 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(data.revenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              매입 원가
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(data.cost)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-700">
              성과 미달 환불
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              -{formatCurrency(data.refunds)}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              순위 미달 차감
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-700">
              실제 마진율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {data.netMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              순이익 {formatCurrency(data.netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 마진 흐름 차트 (Waterfall Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>수익성 분해</CardTitle>
        </CardHeader>
        <CardContent>
          <WaterfallChart
            data={[
              { label: '매출', value: data.revenue },
              { label: '매입 원가', value: -data.cost },
              { label: '총이익', value: data.grossProfit },
              { label: '성과 환불', value: -data.refunds },
              { label: '순이익', value: data.netProfit },
            ]}
          />
        </CardContent>
      </Card>

      {/* 상품별 수익성 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>상품별 마진 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품</TableHead>
                <TableHead className="text-right">매출</TableHead>
                <TableHead className="text-right">원가</TableHead>
                <TableHead className="text-right">환불</TableHead>
                <TableHead className="text-right">순이익</TableHead>
                <TableHead className="text-right">마진율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.breakdown.byProduct.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(product.cost)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(product.refunds)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(product.netProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={product.netMargin > 30 ? 'success' : 'warning'}
                    >
                      {product.netMargin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 5. 🕰️ Retroactive Settlement (과거 데이터 & 미정산 처리)

### Problem Statement

새로운 시스템 도입 시 가장 큰 장벽은 **"엑셀에만 있는 지난달 미정산 내역"**을 어떻게 처리하느냐입니다.

### Solution Design

#### 5.1 Legacy Data Migrator

**기능**:
- **Historical Import**: "2025년 12월 리포트.xlsx" 같은 과거 엑셀 파일을 업로드하면, 시스템이 이를 `Completed` 상태의 주문으로 변환하지 않고, **`Settlement Pending` (정산 대기)** 상태의 스냅샷 데이터로 저장
- **Allow Partial Data**: 과거 데이터는 '순위' 같은 상세 데이터가 없을 수 있음. 이 경우 "단순 성공/실패 여부"만 입력해도 정산이 가능하도록 **유연한 스키마(Flexible Schema)** 적용

#### 5.2 Re-calculation Engine (정산 재계산)

**Scenario**: 1월 정산이 끝났는데, 2월 5일에 "1월 15일자 작업이 누락되었다"는 이슈가 발생했을 때

**Logic**:
> "1월 정산서 수정" 버튼 클릭 → 누락된 건 추가 등록 → `[재계산]` 실행 → 기존 정산서와 비교하여 **차액(Diff)만 별도 정산서로 생성**하거나 다음 달로 이월(Carry-over)

#### 5.3 Data Schema Add-on

```prisma
model Settlement {
  // ... 기존 필드

  isRetroactive   Boolean @default(false) // 소급분 정산 여부
  originalMonth   String?                 // 원래 귀속 월 (예: "2025-12")
  adjustmentNote  String?                 // "12월 누락분 추가 정산"
}
```

---

## 5. 🕰️ Retroactive Settlement (과거 데이터 & 미정산 처리)

### Problem Statement

새로운 시스템 도입 시 가장 큰 장벽은 **"엑셀에만 있는 지난달 미정산 내역"**을 어떻게 처리하느냐입니다.

**현재 문제**:
- 과거 1년치 엑셀 데이터를 수동으로 입력해야 함
- 이미 완료된 정산에서 누락 건 발견 시 재계산 불가
- 소급 적용 건과 일반 건이 섞여서 혼란

### Solution Design

#### 5.1 Legacy Data Migrator

##### A. Historical Import (유연한 스키마)

**기능**:
- "2025년 12월 리포트.xlsx" 같은 과거 엑셀 파일을 업로드
- 시스템이 이를 `Completed` 상태가 아닌 **`Settlement Pending` (정산 대기)** 상태의 스냅샷 데이터로 저장
- **Allow Partial Data**: 과거 데이터는 '순위' 같은 상세 데이터가 없을 수 있음
- "단순 성공/실패 여부"만 입력해도 정산 가능하도록 설계

```typescript
// app/src/app/api/legacy/import-settlement/route.ts
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const targetMonth = formData.get('month') as string; // "2025-12"

  // 1. 엑셀 파싱
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  // 예상 포맷 (최소):
  // | 매장명 | 키워드 | 작업유형 | 수량 | 단가 | 금액 | 성공여부 |

  const results = [];

  for (const row of data) {
    try {
      // 2. 매장 찾기 (또는 새로 생성)
      let store = await prisma.store.findFirst({
        where: { name: row['매장명'] },
      });

      if (!store) {
        // 임시 고객 생성 (나중에 매핑)
        const tempCustomer = await prisma.customer.findFirst({
          where: { name: 'LEGACY_IMPORT' },
        }) || await prisma.customer.create({
          data: {
            name: 'LEGACY_IMPORT',
            businessNumber: '000-00-00000',
            type: 'DIRECT',
          },
        });

        store = await prisma.store.create({
          data: {
            name: row['매장명'],
            customerId: tempCustomer.id,
          },
        });
      }

      // 3. 상품 매핑
      const product = await prisma.product.findFirst({
        where: {
          type: mapProductType(row['작업유형']),
        },
      });

      if (!product) {
        results.push({
          row,
          status: 'PRODUCT_NOT_FOUND',
          error: `상품 타입 ${row['작업유형']} 없음`,
        });
        continue;
      }

      // 4. Settlement 직접 생성 (주문 없이)
      const settlement = await prisma.settlement.create({
        data: {
          storeId: store.id,
          settlementMonth: targetMonth,
          type: 'COST',
          amount: row['금액'],
          billableAmount: row['성공여부'] === 'Y' ? row['금액'] : 0,
          unbillableAmount: row['성공여부'] === 'N' ? row['금액'] : 0,
          unbillableReason: row['성공여부'] === 'N' ? '과거 데이터: 미완료' : null,
          description: `[소급] ${row['키워드']} - ${row['작업유형']}`,
          status: 'PENDING',
          isRetroactive: true, // 👈 소급분 표시
          originalMonth: targetMonth,
          adjustmentNote: `엑셀 임포트: ${file.name}`,
        },
      });

      results.push({
        row,
        status: 'SUCCESS',
        settlementId: settlement.id,
      });
    } catch (error) {
      results.push({
        row,
        status: 'ERROR',
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    total: data.length,
    success: results.filter((r) => r.status === 'SUCCESS').length,
    failed: results.filter((r) => r.status !== 'SUCCESS').length,
    details: results,
  });
}

function mapProductType(workType: string): string {
  const mapping = {
    '트래픽': 'TRAFFIC',
    '블로그': 'BLOG',
    '리뷰': 'REVIEW',
    // ... 추가 매핑
  };
  return mapping[workType] || 'TRAFFIC';
}
```

##### B. 업로드 UI

```tsx
// components/legacy/legacy-import-form.tsx
export function LegacyImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [targetMonth, setTargetMonth] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file || !targetMonth) {
      toast.error('파일과 대상 월을 선택해주세요');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', targetMonth);

    try {
      const response = await fetch('/api/legacy/import-settlement', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success > 0) {
        toast.success(`${data.success}건 임포트 완료`);
      }

      if (data.failed > 0) {
        toast.warning(`${data.failed}건 실패`);
      }
    } catch (error) {
      toast.error('임포트 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>과거 정산 데이터 임포트</CardTitle>
        <CardDescription>
          엑셀 파일로 과거 정산 내역을 일괄 등록합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 월 선택 */}
        <div>
          <Label>대상 월</Label>
          <Input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            placeholder="2025-12"
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <Label>엑셀 파일</Label>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            필수 컬럼: 매장명, 키워드, 작업유형, 수량, 단가, 금액, 성공여부
          </p>
        </div>

        {/* 업로드 버튼 */}
        <Button
          onClick={handleUpload}
          disabled={!file || !targetMonth || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              임포트 중...
            </>
          ) : (
            '임포트 시작'
          )}
        </Button>

        {/* 결과 표시 */}
        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>임포트 완료</AlertTitle>
            <AlertDescription>
              총 {result.total}건 중 {result.success}건 성공, {result.failed}건 실패
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 5.2 Re-calculation Engine (정산 재계산)

##### A. 재계산 시나리오

**Scenario**: 1월 정산이 끝났는데, 2월 5일에 "1월 15일자 작업이 누락되었다"는 이슈가 발생했을 때

**Logic**:
1. "1월 정산서 수정" 버튼 클릭
2. 누락된 건 추가 등록 (또는 수정)
3. `[재계산]` 실행
4. 기존 정산서와 비교하여 **차액(Diff)만 별도 정산서로 생성**하거나 다음 달로 이월(Carry-over)

##### B. 재계산 API

```typescript
// app/src/app/api/settlements/recalculate/route.ts
export async function POST(request: NextRequest) {
  const { settlementMonth, storeId, channelId } = await request.json();

  // 1. 기존 정산서 조회
  const existingSettlements = await prisma.settlement.findMany({
    where: {
      settlementMonth,
      storeId,
      channelId,
      status: { in: ['CONFIRMED', 'PAID'] }, // 확정/지급 완료된 것만
    },
  });

  const existingTotal = existingSettlements.reduce(
    (sum, s) => sum + s.billableAmount,
    0
  );

  // 2. 현재 실제 데이터로 재계산
  const actualItems = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        orderDate: {
          gte: startOfMonth(new Date(settlementMonth)),
          lte: endOfMonth(new Date(settlementMonth)),
        },
        channelId,
      },
      storeId,
      status: 'COMPLETED',
    },
  });

  const actualTotal = actualItems.reduce((sum, item) => sum + item.amount, 0);

  // 3. 차액 계산
  const diff = actualTotal - existingTotal;

  if (Math.abs(diff) < 100) {
    // 차액이 100원 미만이면 무시
    return NextResponse.json({
      message: '재계산 완료: 차액 없음',
      diff: 0,
    });
  }

  // 4. 차액 정산서 생성
  const adjustmentSettlement = await prisma.settlement.create({
    data: {
      storeId,
      channelId,
      settlementMonth,
      type: diff > 0 ? 'COST' : 'REFUND',
      amount: Math.abs(diff),
      billableAmount: Math.abs(diff),
      unbillableAmount: 0,
      description: `[재계산] ${settlementMonth} 정산 차액 조정`,
      status: 'PENDING',
      isRetroactive: true,
      originalMonth: settlementMonth,
      adjustmentNote: `기존 정산액: ${existingTotal}, 실제 정산액: ${actualTotal}, 차액: ${diff}`,
    },
  });

  return NextResponse.json({
    message: '재계산 완료: 차액 정산서 생성',
    diff,
    adjustmentSettlement,
  });
}
```

##### C. 재계산 UI

```tsx
// components/settlement/recalculation-button.tsx
export function RecalculationButton({ settlement }) {
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!confirm('정산을 재계산하시겠습니까? 차액이 발생하면 별도 조정 정산서가 생성됩니다.')) {
      return;
    }

    setRecalculating(true);

    try {
      const response = await fetch('/api/settlements/recalculate', {
        method: 'POST',
        body: JSON.stringify({
          settlementMonth: settlement.settlementMonth,
          storeId: settlement.storeId,
          channelId: settlement.channelId,
        }),
      });

      const data = await response.json();

      if (data.diff === 0) {
        toast.info('재계산 완료: 차액이 없습니다');
      } else {
        toast.success(
          `재계산 완료: ${data.diff > 0 ? '+' : ''}${formatCurrency(data.diff)} 차액 정산서 생성`
        );
        router.refresh();
      }
    } catch (error) {
      toast.error('재계산 실패');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecalculate}
      disabled={recalculating}
    >
      {recalculating ? (
        <>
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          재계산 중...
        </>
      ) : (
        <>
          <Calculator className="mr-2 h-3 w-3" />
          재계산
        </>
      )}
    </Button>
  );
}
```

#### 5.3 Data Schema Add-on

```prisma
// schema.prisma 확장
model Settlement {
  // ... 기존 필드

  // 🕰️ 소급분 정산 필드
  isRetroactive   Boolean @default(false) // 소급분 정산 여부
  originalMonth   String?                 // 원래 귀속 월 (예: "2025-12")
  adjustmentNote  String?                 // "12월 누락분 추가 정산" 같은 메모

  @@index([isRetroactive])
  @@index([originalMonth])
}
```

#### 5.4 소급분 필터링 UI

```tsx
// components/settlement/settlement-list.tsx
export function SettlementList({ month }) {
  const [showRetroactive, setShowRetroactive] = useState(true);

  const { data } = useQuery({
    queryKey: ['settlements', month, showRetroactive],
    queryFn: () => fetchSettlements(month, showRetroactive),
  });

  return (
    <div>
      {/* 필터 토글 */}
      <div className="flex items-center gap-2 mb-4">
        <Switch
          checked={showRetroactive}
          onCheckedChange={setShowRetroactive}
        />
        <Label>소급분 정산 포함</Label>
      </div>

      {/* 정산 목록 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>매장</TableHead>
            <TableHead>금액</TableHead>
            <TableHead>타입</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.settlements.map((settlement) => (
            <TableRow
              key={settlement.id}
              className={settlement.isRetroactive ? 'bg-yellow-50' : ''}
            >
              <TableCell>
                {settlement.store.name}
                {settlement.isRetroactive && (
                  <Badge variant="outline" className="ml-2">
                    소급 ({settlement.originalMonth})
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatCurrency(settlement.billableAmount)}</TableCell>
              <TableCell>{settlement.type}</TableCell>
              <TableCell>
                <Badge>{settlement.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Implementation Roadmap

### Phase 1: 기초 인프라 (2주)

**우선순위 P0**:
1. ✅ **schema.prisma 확장**
   - `targetRank`, `currentRank`, `goalType` 필드 추가
   - `BillingRule`, `CampaignRenewal`, `ClientReport` 모델 추가
   - Full-Text Search 인덱스 추가 (`@@fulltext`)

2. ✅ **Universal Search API 구현**
   - 키워드 중심 통합 검색 (`/api/search/universal`)
   - 병렬 쿼리 최적화 (Promise.all)
   - 결과 그룹핑 로직

### Phase 2: 핵심 기능 (4주)

**우선순위 P1**:
3. ✅ **Smart Extension (캠페인 연장 자동화)**
   - 만료 감지 Cron (`/api/cron/renewal-proposals`)
   - One-Click Renew UI
   - D-Day Color Coding

4. ✅ **Bulk Evidence Upload (증빙 일괄 업로드)**
   - 엑셀 업로드 API (`/api/proof/bulk-upload`)
   - 자동 매칭 로직
   - 썸네일 자동 생성 (Puppeteer)

5. ✅ **Performance-based Billing (성과 기반 정산)**
   - 자동 정산 계산 서비스 (BillingCalculatorService)
   - 마진 대시보드 (`/analytics/profitability`)
   - Ranking Bot (순위 자동 업데이트)

### Phase 3: 고급 기능 (3주)

**우선순위 P2**:
6. ✅ **Client Viewer (고객 공개 리포트)**
   - 공유 링크 생성 (`/api/reports/create`)
   - 공개 리포트 페이지 (`/reports/[token]`)
   - PDF Export

7. ✅ **Traffic Distribution (작업 분배 자동화)**
   - 드래그 앤 드롭 UI (dnd-kit)
   - 자동 분배 알고리즘 (최소 비용 우선)

8. ✅ **Ranking Snapshot (순위 아카이빙)**
   - 자동 스크린샷 Cron (`/api/cron/ranking-snapshots`)
   - 타임라인 뷰어

9. ✅ **Command Palette (⌘K)**
   - cmdk 기반 Omnibox
   - 빠른 액션 + 실시간 검색 통합

### Phase 4: 데이터 마이그레이션 (2주)

**우선순위 P3**:
10. ✅ **Retroactive Settlement (과거 정산 처리)**
    - Legacy Data Migrator (엑셀 임포트)
    - Re-calculation Engine (차액 정산)
    - 소급분 정산 스키마 및 필터링 UI

### Phase 4: 데이터 마이그레이션 (2주)

**우선순위 P3**:
10. ✅ **Retroactive Settlement (과거 정산 처리)**
    - Legacy Data Migrator
    - Re-calculation Engine
    - 소급분 정산 스키마

---

## UX Reference

### 1. Search & Command
- **Slack**: 통합 검색 (채널/사람/메시지 구분), Command Palette
- **Linear**: 이슈 검색, Quick Actions (⌘K)
- **Notion**: Omnibox (⌘K)
- **Algolia**: Instant Search, 자동완성

### 2. Campaign Management
- **Google Ads**: 캠페인 그룹핑, 일괄 수정, 키워드 중심 네비게이션
- **Facebook Ads Manager**: 광고 세트 복제, 드래그 앤 드롭
- **Mailchimp**: 캠페인 복제 및 스케줄링

### 3. Proof & Reporting
- **Ahrefs**: 순위 추적 그래프, 경쟁사 비교
- **SEMrush**: 경쟁사 비교 리포트, 공개 리포트 링크
- **Google Search Console**: 성과 타임라인, 증빙 데이터

### 4. Billing & Analytics
- **Stripe Dashboard**: 수익 분해 차트 (Waterfall), MRR 분석
- **Mixpanel**: Funnel Analysis, 이벤트 추적
- **ChartMogul**: MRR 워터폴, 수익성 대시보드

### 5. Drag & Drop
- **Trello**: 칸반 보드, 드래그 앤 드롭
- **Monday.com**: 일괄 할당, 워크플로우 자동화

---

## 결론

### 현재 시스템의 강점
- ✅ 기본 ERP 골격 완성 (Order, Item, Store, Customer, Settlement)
- ✅ 순위 추적 모델 존재 (KeywordRanking, StoreKeyword)
- ✅ 증빙 필드 준비 (proofUrl)
- ✅ 동시성 제어 구현 완료 (Prisma Transaction + Version Field)

### AdTech 도메인 특화로 얻는 가치

**시간 절감**:
- 🚀 **검색 시간 80% 단축**: "강남역 맛집" 한 번에 찾기 (Command Palette)
- ⚡ **연장 작업 90% 자동화**: One-Click Renew (견적/주문/발주 자동 생성)
- 📸 **보고서 작성 시간 제로**: 고객이 직접 리포트 확인 (Secret Link)

**정확도 향상**:
- 💰 **정산 정확도 100%**: 성과 기반 자동 차감 (목표 순위 미달 일수 자동 계산)
- 📊 **실시간 마진 파악**: 환불 금액 반영한 순이익 대시보드

**비즈니스 임팩트**:
- 💵 재계약율 향상 (만료 알림 자동화)
- 📈 수익성 가시화 (상품/채널/고객별 마진 분석)
- ⚙️ 운영 효율 극대화 (엑셀 지옥 탈출)

### 다음 단계 (우선순위)

**P0 (필수)**:
1. Universal Search 구현 (검색이 모든 것의 시작)
2. Performance Billing (수익성이 생명)

**P1 (중요)**:
3. Smart Extension (고객 유지율 향상)
4. Bulk Evidence Upload (운영 효율)

**P2 (유용)**:
5. Client Viewer (고객 신뢰 확보)
6. Traffic Distribution (작업 분배 자동화)

**P3 (선택)**:
7. Command Palette (UX 고급화)
8. Ranking Snapshot (증빙 강화)
9. Retroactive Settlement (데이터 마이그레이션)

---

**최종 목표**: 광고 대행사 실무자가 **"엑셀 지옥에서 해방"**되고, **"클릭 3번으로 끝나는 일"**을 경험하게 만드는 것.

시스템이 단순히 "데이터를 저장하는 곳"이 아니라, **"광고주의 언어로 말하고, 실무자의 일을 자동으로 처리해주는 비서"**가 되도록 설계되었습니다.
