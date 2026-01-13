"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    businessNo: "",
    representative: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    commissionType: "RATE",
    defaultCommissionRate: "0.1",
    bankName: "",
    bankAccount: "",
    bankHolder: "",
    contractStart: "",
    contractEnd: "",
    memo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          defaultCommissionRate: formData.defaultCommissionRate
            ? parseFloat(formData.defaultCommissionRate)
            : null,
          businessNo: formData.businessNo || null,
          representative: formData.representative || null,
          contactName: formData.contactName || null,
          contactPhone: formData.contactPhone || null,
          contactEmail: formData.contactEmail || null,
          address: formData.address || null,
          bankName: formData.bankName || null,
          bankAccount: formData.bankAccount || null,
          bankHolder: formData.bankHolder || null,
          contractStart: formData.contractStart || null,
          contractEnd: formData.contractEnd || null,
          memo: formData.memo || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("파트너사가 등록되었습니다");
        router.push(`/tenants/${data.id}`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to create tenant:", error);
      toast.error("파트너사 등록에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">파트너사 등록</h2>
          <p className="text-muted-foreground">
            새로운 파트너사를 등록합니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">파트너사명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">코드 *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="예: PARTNER001"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessNo">사업자번호</Label>
                  <Input
                    id="businessNo"
                    value={formData.businessNo}
                    onChange={(e) =>
                      setFormData({ ...formData, businessNo: e.target.value })
                    }
                    placeholder="000-00-00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representative">대표자</Label>
                  <Input
                    id="representative"
                    value={formData.representative}
                    onChange={(e) =>
                      setFormData({ ...formData, representative: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>담당자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">담당자명</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">연락처</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">이메일</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정산 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionType">수수료 유형</Label>
                  <Select
                    value={formData.commissionType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, commissionType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RATE">비율 (%)</SelectItem>
                      <SelectItem value="FIXED">고정 금액</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCommissionRate">
                    {formData.commissionType === "RATE"
                      ? "수수료율 (0~1)"
                      : "수수료 금액"}
                  </Label>
                  <Input
                    id="defaultCommissionRate"
                    type="number"
                    step="0.01"
                    value={formData.defaultCommissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultCommissionRate: e.target.value,
                      })
                    }
                    placeholder={
                      formData.commissionType === "RATE" ? "0.1 = 10%" : "10000"
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">은행</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">계좌번호</Label>
                  <Input
                    id="bankAccount"
                    value={formData.bankAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankHolder">예금주</Label>
                  <Input
                    id="bankHolder"
                    value={formData.bankHolder}
                    onChange={(e) =>
                      setFormData({ ...formData, bankHolder: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계약 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractStart">계약 시작일</Label>
                  <Input
                    id="contractStart"
                    type="date"
                    value={formData.contractStart}
                    onChange={(e) =>
                      setFormData({ ...formData, contractStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractEnd">계약 종료일</Label>
                  <Input
                    id="contractEnd"
                    type="date"
                    value={formData.contractEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, contractEnd: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/tenants">취소</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            등록
          </Button>
        </div>
      </form>
    </div>
  );
}
