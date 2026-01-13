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

export default function NewStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mid: "",
    placeUrl: "",
    businessNo: "",
    representative: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    category: "",
    status: "ACTIVE",
    memo: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          placeUrl: formData.placeUrl || null,
          businessNo: formData.businessNo || null,
          representative: formData.representative || null,
          contactName: formData.contactName || null,
          contactPhone: formData.contactPhone || null,
          contactEmail: formData.contactEmail || null,
          address: formData.address || null,
          category: formData.category || null,
          memo: formData.memo || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("매장이 등록되었습니다");
        router.push("/stores");
      } else {
        toast.error(data.error || "매장 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create store:", error);
      toast.error("매장 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/stores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">매장 등록</h2>
          <p className="text-muted-foreground">새로운 매장 정보를 입력하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">매장명 *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mid">MID *</Label>
                <Input
                  id="mid"
                  name="mid"
                  value={formData.mid}
                  onChange={handleChange}
                  required
                  placeholder="네이버 플레이스 MID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeUrl">Place URL</Label>
                <Input
                  id="placeUrl"
                  name="placeUrl"
                  type="url"
                  value={formData.placeUrl}
                  onChange={handleChange}
                  placeholder="https://naver.me/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">업종</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="음식점, 미용실, 병원 등"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">활성</SelectItem>
                    <SelectItem value="PAUSED">일시정지</SelectItem>
                    <SelectItem value="TERMINATED">종료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>사업자 / 담당자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessNo">사업자번호</Label>
                <Input
                  id="businessNo"
                  name="businessNo"
                  value={formData.businessNo}
                  onChange={handleChange}
                  placeholder="000-00-00000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="representative">대표자</Label>
                <Input
                  id="representative"
                  name="representative"
                  value={formData.representative}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">담당자명</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">연락처</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">이메일</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/stores">취소</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                등록 중...
              </>
            ) : (
              "등록"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
