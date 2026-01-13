"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface Customer {
  id: string;
  name: string;
  businessName: string | null;
}

interface QuotationItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([
    { description: "", qty: 1, unitPrice: 0, amount: 0 },
  ]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?limit=1000");
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", qty: 1, unitPrice: 0, amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === "qty" || field === "unitPrice") {
      item.amount = item.qty * item.unitPrice;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error("최소 1개 이상의 항목이 필요합니다");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error("고객을 선택하세요");
      return;
    }

    const emptyItems = items.filter((item) => !item.description.trim());
    if (emptyItems.length > 0) {
      toast.error("모든 항목의 품목명을 입력하세요");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          validUntil,
          subject: subject || null,
          note: note || null,
          items: items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("견적서가 작성되었습니다");
        router.push(`/quotations/${data.id}`);
      } else {
        toast.error(data.error || "견적서 작성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create quotation:", error);
      toast.error("견적서 작성 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round(totalAmount * 0.1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            견적서 작성 <span className="text-sm font-normal text-muted-foreground">New Quotation</span>
          </h2>
          <p className="text-muted-foreground">새로운 견적서를 작성하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>고객 *</Label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">고객 선택</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.businessName || customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>유효기간 *</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="견적서 제목 (선택)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="견적서 비고 사항"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>견적 항목</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              항목 추가
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">품목명 *</TableHead>
                    <TableHead className="w-[100px]">수량</TableHead>
                    <TableHead className="w-[120px]">단가</TableHead>
                    <TableHead className="w-[120px] text-right">금액</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          placeholder="품목명 또는 서비스명"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, "qty", parseInt(e.target.value) || 1)
                          }
                          min={1}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, "unitPrice", parseInt(e.target.value) || 0)
                          }
                          min={0}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.amount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right space-y-1 w-64">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">공급가액</span>
                  <span>{totalAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">부가세 (10%)</span>
                  <span>{taxAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>합계</span>
                  <span>{(totalAmount + taxAmount).toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/quotations">취소</Link>
          </Button>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                작성 중...
              </>
            ) : (
              "견적서 작성"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
