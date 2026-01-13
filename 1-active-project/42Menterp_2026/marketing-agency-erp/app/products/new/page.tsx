"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    unitPrice: "",
    unit: "",
    isActive: true,
  });

  useEffect(() => {
    fetchCategoriesAndUnits();
  }, []);

  const fetchCategoriesAndUnits = async () => {
    try {
      const [categoriesRes, unitsRes] = await Promise.all([
        fetch("/api/products?listType=categories"),
        fetch("/api/products?listType=units"),
      ]);

      const categoriesData = await categoriesRes.json();
      const unitsData = await unitsRes.json();

      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
      if (unitsData.success) {
        setUnits(unitsData.data);
      }
    } catch (error) {
      console.error("카테고리/단위 목록 조회 실패:", error);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory("");
      setCategoryDialogOpen(false);
      toast.success("카테고리가 추가되었습니다.");
    } else if (categories.includes(newCategory.trim())) {
      toast.error("이미 존재하는 카테고리입니다.");
    }
  };

  const handleAddUnit = () => {
    if (newUnit.trim() && !units.includes(newUnit.trim())) {
      setUnits([...units, newUnit.trim()]);
      setFormData({ ...formData, unit: newUnit.trim() });
      setNewUnit("");
      setUnitDialogOpen(false);
      toast.success("단위가 추가되었습니다.");
    } else if (units.includes(newUnit.trim())) {
      toast.error("이미 존재하는 단위입니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        unitPrice: Number(formData.unitPrice),
        isActive: formData.isActive,
      };

      if (formData.category) payload.category = formData.category;
      if (formData.description) payload.description = formData.description;
      if (formData.unit) payload.unit = formData.unit;

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("생성 완료", {
          description: "상품이 생성되었습니다.",
        });
        router.push(`/products/${result.data.id}`);
      } else {
        throw new Error(result.error?.message || "상품 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("상품 생성 실패:", error);
      toast.error("생성 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">상품 추가</h1>
            <p className="text-gray-500">새로운 상품을 등록합니다.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>상품 정보</CardTitle>
            <CardDescription>상품의 기본 정보를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    상품명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    placeholder="상품명"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">카테고리</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.category || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger id="category" className="flex-1">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setCategoryDialogOpen(true)}
                      title="새 카테고리 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unitPrice">
                    단가 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, unitPrice: e.target.value }))
                    }
                    required
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unit">단위</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.unit || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, unit: value }))
                      }
                    >
                      <SelectTrigger id="unit" className="flex-1">
                        <SelectValue placeholder="단위 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setUnitDialogOpen(true)}
                      title="새 단위 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="상품에 대한 설명을 입력하세요"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/products">
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 카테고리 추가 다이얼로그 */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 카테고리 추가</DialogTitle>
              <DialogDescription>새로운 카테고리 이름을 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="예: 마케팅, 디자인, 개발"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 단위 추가 다이얼로그 */}
        <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 단위 추가</DialogTitle>
              <DialogDescription>새로운 단위 이름을 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="예: 건, 시간, 월"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUnit();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddUnit} disabled={!newUnit.trim()}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

