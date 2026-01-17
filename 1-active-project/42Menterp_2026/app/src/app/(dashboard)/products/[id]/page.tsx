"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
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
    const fetchData = async () => {
      try {
        const [channelsRes, productRes] = await Promise.all([
          fetch("/api/channels"),
          fetch(`/api/products/${id}`)
        ]);

        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(channelsData.channels || []);
        }

        if (productRes.ok) {
          const productData = await productRes.json();
          setFormData({
            code: productData.code,
            name: productData.name,
            type: productData.type,
            description: productData.description || "",
            saleUnitPrice: productData.saleUnitPrice.toString(),
            costUnitPrice: productData.costUnitPrice.toString(),
            channelId: productData.channelId || "",
            isActive: productData.isActive,
          });
        } else {
          toast.error("상품 정보를 불러올 수 없습니다");
          router.push("/products");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("데이터 로딩 중 오류가 발생했습니다");
      } finally {
        setFetching(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

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
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
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
        toast.success("상품 정보가 수정되었습니다");
        setIsEditing(false);
      } else {
        toast.error(data.error || "상품 수정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update product:", error);
      toast.error("상품 수정 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("상품이 삭제되었습니다");
        router.push("/products");
      } else {
        const data = await res.json();
        toast.error(data.error || "상품 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("상품 삭제 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">상품 상세</h2>
            <p className="text-muted-foreground">상품 정보를 확인하고 수정합니다.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 상품을 삭제하면 관련된 주문 데이터에 영향을 줄 수 있습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                수정
              </Button>
            </>
          )}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costUnitPrice">매입 단가 (원)</Label>
                <Input
                  id="costUnitPrice"
                  name="costUnitPrice"
                  type="number"
                  value={formData.costUnitPrice}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelId">연결 채널</Label>
                <Select
                  value={formData.channelId || "NONE"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, channelId: value === "NONE" ? "" : value }))
                  }
                  disabled={!isEditing}
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

        {isEditing && (
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
