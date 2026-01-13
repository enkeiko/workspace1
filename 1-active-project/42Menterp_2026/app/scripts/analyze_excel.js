
const XLSX = require('xlsx');
const path = require('path');

const files = [
  '../Data/251226_12월 4주_접수시트.xlsx'
];

files.forEach(file => {
  try {
    const workbook = XLSX.readFile(path.join(process.cwd(), file));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Inspect first 5 rows to find the real header
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const data = [];
    for (let r = 0; r <= 5; r++) {
       const row = [];
       for (let c = 0; c <= range.e.c; c++) {
           const cell = sheet[XLSX.utils.encode_cell({c, r})];
           row.push(cell ? cell.v : null);
       }
       data.push(row);
    }
    
    console.log(`\n=== File: ${file} ===`);
    console.log('First 5 Rows:', JSON.stringify(data, null, 2));
    
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});
