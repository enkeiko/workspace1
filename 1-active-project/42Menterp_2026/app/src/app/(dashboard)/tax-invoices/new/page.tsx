"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface TaxInvoiceItem {
  id: string;
  itemName: string;
  itemSpec: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
  note: string;
}

interface FormData {
  type: "SALES" | "PURCHASE";
  taxType: "TAX" | "ZERO" | "FREE";
  purposeType: "CHARGE" | "PROOF";
  issueDate: string;
  // 공급자
  supplierBusinessNo: string;
  supplierName: string;
  supplierCeoName: string;
  supplierAddr: string;
  supplierBizType: string;
  supplierBizClass: string;
  supplierEmail: string;
  // 공급받는자
  receiverBusinessNo: string;
  receiverName: string;
  receiverCeoName: string;
  receiverAddr: string;
  receiverBizType: string;
  receiverBizClass: string;
  receiverEmail: string;
  // 비고
  remark: string;
}

export default function NewTaxInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: "SALES",
    taxType: "TAX",
    purposeType: "CHARGE",
    issueDate: format(new Date(), "yyyy-MM-dd"),
    supplierBusinessNo: "",
    supplierName: "",
    supplierCeoName: "",
    supplierAddr: "",
    supplierBizType: "",
    supplierBizClass: "",
    supplierEmail: "",
    receiverBusinessNo: "",
    receiverName: "",
    receiverCeoName: "",
    receiverAddr: "",
    receiverBizType: "",
    receiverBizClass: "",
    receiverEmail: "",
    remark: "",
  });

  const [items, setItems] = useState<TaxInvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      itemName: "",
      itemSpec: "",
      quantity: 1,
      unitPrice: 0,
      supplyAmount: 0,
      taxAmount: 0,
      note: "",
    },
  ]);

  // 사업자번호 포맷팅
  const formatBusinessNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  // 품목 추가
  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        itemName: "",
        itemSpec: "",
        quantity: 1,
        unitPrice: 0,
        supplyAmount: 0,
        taxAmount: 0,
        note: "",
      },
    ]);
  };

  // 품목 삭제
  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  // 품목 수정
  const updateItem = (id: string, field: keyof TaxInvoiceItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // 자동 계산
        if (field === "quantity" || field === "unitPrice") {
          const qty = field === "quantity" ? Number(value) : item.quantity;
          const price = field === "unitPrice" ? Number(value) : item.unitPrice;
          updated.supplyAmount = qty * price;
          if (formData.taxType === "TAX") {
            updated.taxAmount = Math.round(updated.supplyAmount * 0.1);
          } else {
            updated.taxAmount = 0;
          }
        }

        return updated;
      })
    );
  };

  // 합계 계산
  const totalSupplyAmount = items.reduce((sum, item) => sum + item.supplyAmount, 0);
  const totalTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = totalSupplyAmount + totalTaxAmount;

  // 사업자 조회
  const checkBusinessNo = async (type: "supplier" | "receiver") => {
    const businessNo =
      type === "supplier" ? formData.supplierBusinessNo : formData.receiverBusinessNo;

    if (!businessNo) return;

    try {
      const res = await fetch("/api/barobill/corp-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessNo }),
      });

      const data = await res.json();

      if (res.ok && data.data.corpName) {
        if (type === "supplier") {
          setFormData((prev) => ({
            ...prev,
            supplierName: data.data.corpName,
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            receiverName: data.data.corpName,
          }));
        }
      }
    } catch (error) {
      console.error("사업자 조회 실패:", error);
    }
  };

  // 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          issueDate: new Date(formData.issueDate).toISOString(),
          supplyAmount: totalSupplyAmount,
          taxAmount: totalTaxAmount,
          totalAmount,
          items: items.map((item, index) => ({
            seq: index + 1,
            itemName: item.itemName,
            itemSpec: item.itemSpec,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            supplyAmount: item.supplyAmount,
            taxAmount: item.taxAmount,
            note: item.note,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다");
      }

      router.push("/tax-invoices");
    } catch (error) {
      console.error("저장 실패:", error);
      alert(error instanceof Error ? error.message : "저장에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tax-invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">세금계산서 등록</h2>
          <p className="text-muted-foreground">
            새로운 세금계산서를 등록합니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>유형</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v as "SALES" | "PURCHASE" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES">매출</SelectItem>
                  <SelectItem value="PURCHASE">매입</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>과세유형</Label>
              <Select
                value={formData.taxType}
                onValueChange={(v) =>
                  setFormData({ ...formData, taxType: v as "TAX" | "ZERO" | "FREE" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAX">과세</SelectItem>
                  <SelectItem value="ZERO">영세</SelectItem>
                  <SelectItem value="FREE">면세</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>영수/청구</Label>
              <Select
                value={formData.purposeType}
                onValueChange={(v) =>
                  setFormData({ ...formData, purposeType: v as "CHARGE" | "PROOF" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHARGE">청구</SelectItem>
                  <SelectItem value="PROOF">영수</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>작성일자</Label>
              <Input
                type="date"
                value={formData.issueDate}
                onChange={(e) =>
                  setFormData({ ...formData, issueDate: e.target.value })
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 공급자/공급받는자 정보 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 공급자 */}
          <Card>
            <CardHeader>
              <CardTitle>공급자</CardTitle>
              <CardDescription>세금계산서를 발행하는 사업자</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>사업자번호 *</Label>
                  <Input
                    placeholder="000-00-00000"
                    value={formData.supplierBusinessNo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        supplierBusinessNo: formatBusinessNo(e.target.value),
                      })
                    }
                    maxLength={12}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={() => checkBusinessNo("supplier")}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>상호 *</Label>
                <Input
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>대표자</Label>
                <Input
                  value={formData.supplierCeoName}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierCeoName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>주소</Label>
                <Input
                  value={formData.supplierAddr}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierAddr: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>업태</Label>
                  <Input
                    value={formData.supplierBizType}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierBizType: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>종목</Label>
                  <Input
                    value={formData.supplierBizClass}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierBizClass: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={formData.supplierEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierEmail: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 공급받는자 */}
          <Card>
            <CardHeader>
              <CardTitle>공급받는자</CardTitle>
              <CardDescription>세금계산서를 수신하는 사업자</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>사업자번호 *</Label>
                  <Input
                    placeholder="000-00-00000"
                    value={formData.receiverBusinessNo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receiverBusinessNo: formatBusinessNo(e.target.value),
                      })
                    }
                    maxLength={12}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={() => checkBusinessNo("receiver")}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>상호 *</Label>
                <Input
                  value={formData.receiverName}
                  onChange={(e) =>
                    setFormData({ ...formData, receiverName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>대표자</Label>
                <Input
                  value={formData.receiverCeoName}
                  onChange={(e) =>
                    setFormData({ ...formData, receiverCeoName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>주소</Label>
                <Input
                  value={formData.receiverAddr}
                  onChange={(e) =>
                    setFormData({ ...formData, receiverAddr: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>업태</Label>
                  <Input
                    value={formData.receiverBizType}
                    onChange={(e) =>
                      setFormData({ ...formData, receiverBizType: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>종목</Label>
                  <Input
                    value={formData.receiverBizClass}
                    onChange={(e) =>
                      setFormData({ ...formData, receiverBizClass: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={formData.receiverEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, receiverEmail: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 품목 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>품목</CardTitle>
              <CardDescription>공급 품목을 입력합니다.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              품목 추가
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">품명</TableHead>
                  <TableHead className="w-[100px]">규격</TableHead>
                  <TableHead className="w-[80px] text-right">수량</TableHead>
                  <TableHead className="w-[120px] text-right">단가</TableHead>
                  <TableHead className="w-[120px] text-right">공급가액</TableHead>
                  <TableHead className="w-[100px] text-right">세액</TableHead>
                  <TableHead className="w-[100px]">비고</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.itemName}
                        onChange={(e) =>
                          updateItem(item.id, "itemName", e.target.value)
                        }
                        placeholder="품명"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.itemSpec}
                        onChange={(e) =>
                          updateItem(item.id, "itemSpec", e.target.value)
                        }
                        placeholder="규격"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", parseInt(e.target.value) || 0)
                        }
                        className="text-right"
                        min={1}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, "unitPrice", parseInt(e.target.value) || 0)
                        }
                        className="text-right"
                        min={0}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.supplyAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.taxAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.note}
                        onChange={(e) =>
                          updateItem(item.id, "note", e.target.value)
                        }
                        placeholder="비고"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 합계 */}
            <div className="flex justify-end mt-4">
              <div className="w-[300px] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">공급가액</span>
                  <span>{totalSupplyAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">세액</span>
                  <span>{totalTaxAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>합계</span>
                  <span>{totalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비고 */}
        <Card>
          <CardHeader>
            <CardTitle>비고</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.remark}
              onChange={(e) =>
                setFormData({ ...formData, remark: e.target.value })
              }
              placeholder="추가 메모사항을 입력하세요"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/tax-invoices">취소</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}
