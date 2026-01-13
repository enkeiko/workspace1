"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store } from "lucide-react";
import { format } from "date-fns";
import { CustomerTaxStatus } from "./customer-tax-status";

export interface CustomerRow {
  id: string;
  name: string;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
  _count: {
    stores: number;
  };
  createdAt: string;
}

interface CustomerTableProps {
  customers: CustomerRow[];
  selectedIds: string[];
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}

const statusMap = {
  ACTIVE: { label: "활성", variant: "default" as const },
  PAUSED: { label: "일시정지", variant: "secondary" as const },
  TERMINATED: { label: "종료", variant: "destructive" as const },
};

export function CustomerTable({
  customers,
  selectedIds,
  onToggleAll,
  onToggleOne,
}: CustomerTableProps) {
  const allSelected =
    customers.length > 0 && customers.every((customer) => selectedIds.includes(customer.id));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[44px]">
            <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
          </TableHead>
          <TableHead>고객명</TableHead>
          <TableHead>사업자번호</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>계약기간</TableHead>
          <TableHead>매장수</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>세금계산서</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>
              <Checkbox
                checked={selectedIds.includes(customer.id)}
                onCheckedChange={() => onToggleOne(customer.id)}
              />
            </TableCell>
            <TableCell>
              <Link
                href={/customers/}
                className="font-medium hover:underline"
              >
                {customer.name}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {customer.businessNo || "-"}
            </TableCell>
            <TableCell>{customer.contactName || "-"}</TableCell>
            <TableCell>{customer.contactPhone || "-"}</TableCell>
            <TableCell className="text-sm">
              {customer.contractStart && customer.contractEnd
                ? ${format(new Date(customer.contractStart), "yy.MM.dd")} ~ 
                : "-"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span>{customer._count.stores}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={statusMap[customer.status].variant}>
                {statusMap[customer.status].label}
              </Badge>
            </TableCell>
            <TableCell>
              <CustomerTaxStatus
                businessNo={customer.businessNo}
                representative={customer.representative}
                address={customer.address}
                contactEmail={customer.contactEmail}
                compact
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
