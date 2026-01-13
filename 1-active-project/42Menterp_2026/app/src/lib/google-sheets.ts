import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function getGoogleAuth() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google 서비스 계정 설정이 필요합니다");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

export async function getSheets() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}

export async function appendRows(
  spreadsheetId: string,
  sheetTabName: string | null,
  rows: string[][]
) {
  const sheets = await getSheets();
  const range = sheetTabName ? `${sheetTabName}!A:Z` : "A:Z";

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  return response.data;
}

export async function getSheetData(
  spreadsheetId: string,
  sheetTabName: string | null,
  range?: string
) {
  const sheets = await getSheets();
  const fullRange = sheetTabName
    ? `${sheetTabName}!${range || "A:Z"}`
    : range || "A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });

  return response.data.values || [];
}

export async function clearSheet(
  spreadsheetId: string,
  sheetTabName: string | null,
  range?: string
) {
  const sheets = await getSheets();
  const fullRange = sheetTabName
    ? `${sheetTabName}!${range || "A:Z"}`
    : range || "A:Z";

  const response = await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: fullRange,
  });

  return response.data;
}

export interface OrderExportData {
  storeName: string;
  mid: string;
  placeUrl: string;
  keyword: string;
  dailyQty: number;
  startDate: string;
  endDate: string;
  workDays: number;
  totalQty: number;
  unitPrice: number;
  amount: number;
  note: string;
}

export function formatOrderDataForSheet(
  items: OrderExportData[],
  channelCode?: string
): string[][] {
  const header = [
    "매장명",
    "MID",
    "Place URL",
    "키워드",
    "일수량",
    "시작일",
    "종료일",
    "일수",
    "총수량",
    "단가",
    "금액",
    "비고",
  ];

  const rows = items.map((item) => [
    item.storeName,
    item.mid,
    item.placeUrl,
    item.keyword,
    item.dailyQty.toString(),
    item.startDate,
    item.endDate,
    item.workDays.toString(),
    item.totalQty.toString(),
    item.unitPrice.toString(),
    item.amount.toString(),
    item.note || "",
  ]);

  return [header, ...rows];
}
