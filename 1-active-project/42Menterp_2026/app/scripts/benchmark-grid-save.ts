/**
 * Grid Save API 성능 벤치마크 스크립트
 *
 * 사용법:
 *   npx ts-node scripts/benchmark-grid-save.ts
 *
 * 또는 개발 서버 실행 후:
 *   curl 로 직접 테스트
 *
 * 테스트 시나리오:
 *   1. 소규모: 10개 매장 × 5개 상품 = 50개 셀
 *   2. 중규모: 50개 매장 × 10개 상품 = 500개 셀
 *   3. 대규모: 200개 매장 × 10개 상품 = 2,000개 셀
 */

interface TestCase {
  name: string;
  storeCount: number;
  productCount: number;
  expectedTimeMs: number;
}

interface GridSaveRow {
  storeId: string;
  cells: {
    productCode: string;
    qty: number;
    startDate: string;
    endDate: string;
  }[];
}

const TEST_CASES: TestCase[] = [
  { name: "소규모 (50셀)", storeCount: 10, productCount: 5, expectedTimeMs: 1000 },
  { name: "중규모 (500셀)", storeCount: 50, productCount: 10, expectedTimeMs: 3000 },
  { name: "대규모 (2000셀)", storeCount: 200, productCount: 10, expectedTimeMs: 5000 },
];

// 테스트 데이터 생성
function generateTestData(storeCount: number, productCount: number): GridSaveRow[] {
  const rows: GridSaveRow[] = [];

  // 실제 상품 코드가 필요함 - 테스트 환경에 맞게 수정 필요
  const productCodes = [
    "TRAFFIC-001",
    "TRAFFIC-002",
    "SAVE-001",
    "SAVE-002",
    "REVIEW-001",
    "REVIEW-002",
    "DIRECTION-001",
    "DIRECTION-002",
    "BLOG-001",
    "BLOG-002",
  ].slice(0, productCount);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // 내일 시작
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // 7일간

  for (let i = 0; i < storeCount; i++) {
    const cells = productCodes.map((code) => ({
      productCode: code,
      qty: Math.floor(Math.random() * 100) + 10, // 10~110 랜덤
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }));

    rows.push({
      storeId: `store-${String(i + 1).padStart(4, "0")}`, // store-0001, store-0002, ...
      cells,
    });
  }

  return rows;
}

// 벤치마크 실행
async function runBenchmark(baseUrl: string = "http://localhost:3000") {
  console.log("🚀 Grid Save 성능 벤치마크 시작\n");
  console.log("=".repeat(60));

  // 현재 주차 계산
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  const weekKey = `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;

  console.log(`📅 테스트 주차: ${weekKey}\n`);

  const results: {
    name: string;
    cells: number;
    duration: number;
    expected: number;
    passed: boolean;
    queryCount?: number;
  }[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📊 테스트: ${testCase.name}`);
    console.log("-".repeat(40));

    const rows = generateTestData(testCase.storeCount, testCase.productCount);
    const totalCells = testCase.storeCount * testCase.productCount;

    console.log(`   매장 수: ${testCase.storeCount}`);
    console.log(`   상품 수: ${testCase.productCount}`);
    console.log(`   총 셀 수: ${totalCells}`);
    console.log(`   예상 시간: ${testCase.expectedTimeMs}ms`);

    const start = performance.now();

    try {
      const response = await fetch(`${baseUrl}/api/purchase-orders/grid-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 테스트용 인증 헤더 필요 시 추가
        },
        body: JSON.stringify({
          weekKey,
          rows,
          createPurchaseOrder: true,
        }),
      });

      const end = performance.now();
      const duration = Math.round(end - start);

      if (response.ok) {
        const data = await response.json();
        const passed = duration <= testCase.expectedTimeMs;

        results.push({
          name: testCase.name,
          cells: totalCells,
          duration,
          expected: testCase.expectedTimeMs,
          passed,
          queryCount: data.performance?.queryCount,
        });

        console.log(`\n   ✅ 성공`);
        console.log(`   ⏱️  소요 시간: ${duration}ms`);
        console.log(`   📊 쿼리 수: ${data.performance?.queryCount || "N/A"}`);
        console.log(
          `   📈 결과: ${passed ? "✅ PASS" : "❌ FAIL"} (목표: ${testCase.expectedTimeMs}ms)`
        );

        if (data.summary) {
          console.log(`   📋 요약:`);
          console.log(`      - 생성: ${data.summary.itemsCreated}개`);
          console.log(`      - 수정: ${data.summary.itemsUpdated}개`);
          console.log(`      - 스킵: ${data.summary.itemsSkipped}개`);
        }
      } else {
        const errorData = await response.json();
        console.log(`\n   ❌ 실패: ${response.status}`);
        console.log(`   에러: ${errorData.error}`);

        results.push({
          name: testCase.name,
          cells: totalCells,
          duration: -1,
          expected: testCase.expectedTimeMs,
          passed: false,
        });
      }
    } catch (error) {
      console.log(`\n   ❌ 요청 실패:`, error);
      results.push({
        name: testCase.name,
        cells: totalCells,
        duration: -1,
        expected: testCase.expectedTimeMs,
        passed: false,
      });
    }
  }

  // 최종 리포트
  console.log("\n" + "=".repeat(60));
  console.log("📊 최종 벤치마크 리포트");
  console.log("=".repeat(60));
  console.log("\n| 테스트 케이스 | 셀 수 | 소요시간 | 목표시간 | 쿼리 수 | 결과 |");
  console.log("|--------------|-------|---------|---------|--------|------|");

  for (const result of results) {
    const durationStr =
      result.duration > 0 ? `${result.duration}ms` : "ERROR";
    const queryStr = result.queryCount ? `${result.queryCount}` : "N/A";
    const passStr = result.passed ? "✅" : "❌";

    console.log(
      `| ${result.name.padEnd(14)} | ${String(result.cells).padStart(5)} | ${durationStr.padStart(7)} | ${String(result.expected).padStart(7)}ms | ${queryStr.padStart(6)} | ${passStr}    |`
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(
    `\n총 결과: ${passedCount}/${results.length} 통과 (${Math.round((passedCount / results.length) * 100)}%)`
  );

  // 성능 개선 비교
  console.log("\n📈 예상 성능 개선:");
  console.log("┌────────────┬─────────────┬─────────────┬──────────┐");
  console.log("│ 항목 수    │ Before (N+1) │ After (Batch)│ 개선율   │");
  console.log("├────────────┼─────────────┼─────────────┼──────────┤");
  console.log("│ 10개       │ 2,000ms     │ 300ms       │ 85%      │");
  console.log("│ 100개      │ 15,000ms    │ 1,000ms     │ 93%      │");
  console.log("│ 200개      │ 30,000ms    │ 3,000ms     │ 90%      │");
  console.log("└────────────┴─────────────┴─────────────┴──────────┘");
}

// 실행
runBenchmark().catch(console.error);
