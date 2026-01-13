"use client";

import { Badge } from "@/components/ui/badge";

type TaxStatusProps = {
  businessNo?: string | null;
  representative?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  compact?: boolean;
};

const REQUIRED_FIELDS = [
  { key: "businessNo", label: "사업자번호" },
  { key: "representative", label: "대표자" },
  { key: "address", label: "주소" },
  { key: "contactEmail", label: "이메일" },
] as const;

export function CustomerTaxStatus({
  businessNo,
  representative,
  address,
  contactEmail,
  compact = false,
}: TaxStatusProps) {
  const values = { businessNo, representative, address, contactEmail };
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = values[field.key];
    return !value || String(value).trim() === "";
  }).map((field) => field.label);

  const ready = missing.length === 0;

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-1"}>
      <Badge variant={ready ? "default" : "secondary"}>
        {ready ? "준비 완료" : 미완료 ()}
      </Badge>
      {!ready && !compact && (
        <span className="text-xs text-muted-foreground">
          {missing.join(", ")} 누락
        </span>
      )}
    </div>
  );
}
