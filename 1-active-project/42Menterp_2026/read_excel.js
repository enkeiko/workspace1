const XLSX = require('xlsx');

const workbook = XLSX.readFile('c:\\Users\\enkei\\workspace\\3-OPS\\2026\\26_01_01w\\erp.xlsx');

console.log('=== 시트 목록 ===');
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log('\n' + '='.repeat(60));
    console.log(`=== ${sheetName} ===`);
    console.log('='.repeat(60));

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log(`컬럼: ${JSON.stringify(data[0])}`);
        console.log(`총 행 수: ${data.length}`);
        console.log('\n--- 데이터 미리보기 (최대 25행) ---');

        // 각 행을 출력
        data.slice(0, 60).forEach((row, idx) => {
            console.log(`[${idx}] ${JSON.stringify(row)}`);
        });
    } else {
        console.log('(빈 시트)');
    }
});
