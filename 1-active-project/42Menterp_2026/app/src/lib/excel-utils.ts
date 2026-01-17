import * as XLSX from 'xlsx';

export interface ExcelColumn<T = unknown> {
  header: string;
  key: string;
  width?: number;
  transform?: (value: T) => string | number;
}

/**
 * Excel 템플릿 다운로드
 * 빈 양식 파일을 생성하여 다운로드
 */
export async function downloadExcelTemplate(
  filename: string,
  columns: { header: string; key: string; example?: string }[]
): Promise<void> {
  // 헤더와 예시 데이터 행 생성
  const headers = columns.map(col => col.header);
  const examples = columns.map(col => col.example || '');

  const ws = XLSX.utils.aoa_to_sheet([headers, examples]);

  // 컬럼 너비 설정
  ws['!cols'] = columns.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  // 파일 다운로드
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Excel 데이터 다운로드
 * 현재 데이터를 Excel 파일로 다운로드
 */
export async function downloadExcelData<T extends Record<string, unknown>>(
  filename: string,
  data: T[],
  columns: ExcelColumn<T[keyof T]>[]
): Promise<void> {
  // 헤더 행
  const headers = columns.map(col => col.header);

  // 데이터 행
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      if (col.transform) {
        return col.transform(value as T[keyof T]);
      }
      if (value === null || value === undefined) {
        return '';
      }
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return value;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 컬럼 너비 설정
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // 파일 다운로드
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Excel 파일 파싱
 * 업로드된 Excel 파일을 파싱하여 객체 배열로 변환
 */
export async function parseExcelFile<T extends Record<string, unknown>>(
  file: File,
  columnMapping: Record<string, keyof T>
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 첫 번째 시트 사용
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // JSON으로 변환
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        // 컬럼 매핑 적용
        const mappedData = rawData.map(row => {
          const mappedRow: Record<string, unknown> = {};

          for (const [excelHeader, targetKey] of Object.entries(columnMapping)) {
            if (row[excelHeader] !== undefined) {
              mappedRow[targetKey as string] = row[excelHeader];
            }
          }

          return mappedRow as T;
        });

        resolve(mappedData);
      } catch (error) {
        reject(new Error(`Excel 파일 파싱 실패: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Excel 파일 검증
 * 필수 컬럼이 있는지 확인
 */
export async function validateExcelFile(
  file: File,
  requiredColumns: string[]
): Promise<{ valid: boolean; missingColumns: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 헤더 행만 읽기
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const headers: string[] = [];

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
          if (cell && cell.v) {
            headers.push(String(cell.v).trim());
          }
        }

        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        resolve({
          valid: missingColumns.length === 0,
          missingColumns
        });
      } catch (error) {
        reject(new Error(`Excel 파일 검증 실패: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsBinaryString(file);
  });
}
