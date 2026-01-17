"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  code: string;
}

const productTypes = [
  { value: "TRAFFIC", label: "트래픽", description: "네이버 플레이스 방문 트래픽 상품" },
  { value: "DIRECTION", label: "길찾기", description: "네이버 지도 길찾기 요청 상품" },
  { value: "REVIEW", label: "리뷰", description: "리뷰 작성 마케팅 상품" },
  { value: "BLOG", label: "블로그", description: "블로그 포스팅 마케팅 상품" },
  { value: "SAVE", label: "저장", description: "플레이스 저장 마케팅 상품" },
  { value: "RECEIPT", label: "영수증", description: "영수증 리뷰 마케팅 상품" },
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "",
    description: "",
    saleUnitPrice: "",
    costUnitPrice: "",
    channelId: "",
    isActive: true,
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (res.ok) {
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

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
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          saleUnitPrice: formData.saleUnitPrice ? parseInt(formData.saleUnitPrice) : 0,
          costUnitPrice: formData.costUnitPrice ? parseInt(formData.costUnitPrice) : 0,
          channelId: formData.channelId || null,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("상품이 등록되었습니다");
        router.push("/products");
      } else {
        toast.error(data.error || "상품 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create product:", error);
      toast.error("상품 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">상품 등록</h2>
          <p className="text-muted-foreground">새로운 마케팅 상품(서비스) 정보를 입력하세요.</p>
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
                <Label htmlFor="code">상품 코드 *</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  placeholder="예: TRAFFIC-01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">상품 유형 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상품 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="상품에 대한 설명을 입력하세요"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">활성 상태</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>가격 / 채널 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saleUnitPrice">판매 단가 (원)</Label>
                <Input
                  id="saleUnitPrice"
                  name="saleUnitPrice"
                  type="number"
                  value={formData.saleUnitPrice}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  고객에게 판매하는 가격
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costUnitPrice">매입 단가 (원)</Label>
                <Input
                  id="costUnitPrice"
                  name="costUnitPrice"
                  type="number"
                  value={formData.costUnitPrice}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  채널에 지불하는 비용
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelId">연결 채널</Label>
                <Select
                  value={formData.channelId || "NONE"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, channelId: value === "NONE" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="채널을 선택하세요 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">없음</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name} ({channel.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  이 상품을 공급하는 채널(공급업체)
                </p>
              </div>

              {formData.saleUnitPrice && formData.costUnitPrice && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">예상 마진</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(
                      parseInt(formData.saleUnitPrice) - parseInt(formData.costUnitPrice)
                    ).toLocaleString()}
                    원
                  </p>
                  <p className="text-xs text-muted-foreground">
                    마진율:{" "}
                    {(
                      ((parseInt(formData.saleUnitPrice) - parseInt(formData.costUnitPrice)) /
                        parseInt(formData.saleUnitPrice)) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/products">취소</Link>
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
