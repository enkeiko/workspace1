"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
  customerId: number;
}

interface Product {
  id: number;
  name: string;
  unitPrice: number;
  unit?: string;
}

interface OrderItem {
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    orderDate: "",
    dueDate: "",
    paidAmount: "",
    notes: "",
  });
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=100");
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error("고객 목록 조회 실패:", error);
    }
  };

  const fetchStores = async (customerId: number) => {
    try {
      const response = await fetch(`/api/stores?customerId=${customerId}&limit=100`);
      const result = await response.json();
      if (result.success) {
        setStores(result.data.stores || []);
      }
    } catch (error) {
      console.error("매장 목록 조회 실패:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?isActive=true&limit=100");
      const result = await response.json();
      if (result.success) {
        setProducts(result.data.products || []);
      }
    } catch (error) {
      console.error("상품 목록 조회 실패:", error);
    }
  };

  const fetchOrder = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const response = await fetch(`/api/orders/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        const order = result.data;
        setFormData({
          customerId: order.customerId.toString(),
          storeId: order.storeId.toString(),
          orderDate: new Date(order.orderDate).toISOString().split("T")[0],
          dueDate: order.dueDate
            ? new Date(order.dueDate).toISOString().split("T")[0]
            : "",
          paidAmount: order.paidAmount?.toString() || "",
          notes: order.notes || "",
        });
        setItems(
          order.items.map((item: any) => ({
            productId: item.productId || undefined,
            productName: item.productName || item.product?.name || "",
            productDescription: item.productDescription || "",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            notes: item.notes || "",
          }))
        );
      } else {
        throw new Error(result.error?.message || "주문 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("주문 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "주문 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === Number(productId));
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: product ? product.id : undefined,
      productName: product ? product.name : "",
      unitPrice: product ? Number(product.unitPrice) : newItems[index].unitPrice,
    };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: undefined,
        productName: "",
        quantity: 1,
        unitPrice: 0,
        notes: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validItems = items.filter(
        (item) => item.quantity > 0 && item.unitPrice > 0 && (item.productId || item.productName)
      );

      if (validItems.length === 0) {
        toast.error("항목 오류", {
          description: "최소 1개 이상의 유효한 항목이 필요합니다.",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: Number(formData.customerId),
          storeId: Number(formData.storeId),
          orderDate: formData.orderDate,
          dueDate: formData.dueDate || undefined,
          paidAmount: formData.paidAmount ? Number(formData.paidAmount) : undefined,
          items: validItems.map((item) => ({
            productId: item.productId || undefined,
            productName: item.productName || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes || undefined,
          })),
          notes: formData.notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("수정 완료", {
          description: "주문 정보가 성공적으로 수정되었습니다.",
        });
        router.push(`/orders/${params.id}`);
      } else {
        toast.error("수정 실패", {
          description: result.error?.message || "주문 정보 수정에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("주문 정보 수정 실패:", error);
      toast.error("수정 실패", {
        description: "주문 정보 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  if (initialLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="주문 정보를 불러올 수 없습니다"
            description={error}
            onRetry={fetchOrder}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/orders/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">주문 정보 수정</h1>
            <p className="text-gray-500">주문 정보를 수정합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>고객 및 매장 정보를 선택하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId">
                    고객사 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value, storeId: "" })
                    }
                    required
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder="고객사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeId">
                    매장 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                    disabled={!formData.customerId || stores.length === 0}
                    required
                  >
                    <SelectTrigger id="storeId">
                      <SelectValue placeholder={!formData.customerId ? "고객사를 먼저 선택하세요" : stores.length === 0 ? "매장이 없습니다" : "매장을 선택하세요"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderDate">
                    주문일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">납기일</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidAmount">선금</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">메모</Label>
                  <textarea
                    id="notes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>주문 항목</CardTitle>
                    <CardDescription>상품을 선택하거나 커스텀 항목을 추가하세요.</CardDescription>
                  </div>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">항목 {index + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>상품</Label>
                      <Select
                        value={item.productId?.toString() || "custom"}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            updateItem(index, "productId", undefined);
                            updateItem(index, "productName", "");
                          } else {
                            handleProductChange(index, value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="상품 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">커스텀 상품</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} ({formatPrice(Number(product.unitPrice))}원)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!item.productId && (
                      <div className="space-y-2">
                        <Label>상품명</Label>
                        <Input
                          value={item.productName || ""}
                          onChange={(e) => updateItem(index, "productName", e.target.value)}
                          placeholder="상품명 입력"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>수량</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>단가</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>메모</Label>
                      <Input
                        value={item.notes || ""}
                        onChange={(e) => updateItem(index, "notes", e.target.value)}
                        placeholder="항목 메모 (선택)"
                      />
                    </div>

                    <div className="text-right text-sm font-semibold">
                      소계: {formatPrice(Number(item.unitPrice) * item.quantity)}원
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>총 금액</span>
                    <span>{formatPrice(calculateTotal())}원</span>
                  </div>
                  {formData.paidAmount && (
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                      <span>선금</span>
                      <span>{formatPrice(Number(formData.paidAmount))}원</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link href={`/orders/${params.id}`}>
              <Button type="button" variant="outline" disabled={loading}>
                취소
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}


