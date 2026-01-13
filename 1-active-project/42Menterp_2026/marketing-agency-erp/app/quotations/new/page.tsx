"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  category?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalAmount: number;
}

interface QuotationItem {
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  description?: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    quotationDate: new Date().toISOString().split("T")[0],
    validUntil: "",
    notes: "",
  });
  const [items, setItems] = useState<QuotationItem[]>([
    {
      productId: undefined,
      productName: "",
      quantity: 1,
      unitPrice: 0,
      description: "",
    },
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
      fetchOrders(Number(formData.customerId));
    } else {
      setStores([]);
      setOrders([]);
      setFormData((prev) => ({ ...prev, storeId: "" }));
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setError(null);
      const response = await fetch("/api/customers?limit=100");

      if (!response.ok) {
        throw new Error("고객 목록을 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setCustomers(result.data.customers || []);
      } else {
        throw new Error(result.error?.message || "고객 목록을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("고객 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("데이터 로딩 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setCustomersLoading(false);
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
        description: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const fetchOrders = async (customerId: number) => {
    try {
      setOrdersLoading(true);
      const response = await fetch(`/api/orders?customerId=${customerId}&limit=100`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data.orders || []);
      }
    } catch (error) {
      console.error("주문 목록 조회 실패:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadOrderItems = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (result.success) {
        const order = result.data;
        // 주문의 항목들을 견적서 항목으로 변환
        const orderItems: QuotationItem[] = order.items.map((item: any) => ({
          productId: item.productId || undefined,
          productName: item.productName || item.product?.name || "",
          productDescription: item.productDescription || "",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          description: item.notes || "",
        }));

        // 기존 항목에 추가
        setItems((prevItems) => [...prevItems, ...orderItems]);
        toast.success("주문 항목 추가 완료", {
          description: `${order.orderNumber}의 항목 ${orderItems.length}개가 추가되었습니다.`,
        });
      }
    } catch (error) {
      console.error("주문 정보 조회 실패:", error);
      toast.error("주문 항목 추가 실패", {
        description: "주문 정보를 불러올 수 없습니다.",
      });
    }
  };

  const loadMultipleOrderItems = async () => {
    if (selectedOrderIds.size === 0) {
      toast.error("주문 선택 필요", {
        description: "견적서에 포함할 주문을 선택하세요.",
      });
      return;
    }

    try {
      // 선택한 모든 주문의 항목을 가져오기
      const orderPromises = Array.from(selectedOrderIds).map((orderId) =>
        fetch(`/api/orders/${orderId}`).then((res) => res.json())
      );

      const results = await Promise.all(orderPromises);

      // 모든 주문의 항목을 합치기
      const allOrderItems: QuotationItem[] = [];
      const loadedOrderNumbers: string[] = [];

      results.forEach((result) => {
        if (result.success) {
          const order = result.data;
          loadedOrderNumbers.push(order.orderNumber);
          const orderItems: QuotationItem[] = order.items.map((item: any) => ({
            productId: item.productId || undefined,
            productName: item.productName || item.product?.name || "",
            productDescription: item.productDescription || "",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            description: item.notes || "",
          }));
          allOrderItems.push(...orderItems);
        }
      });

      // 기존 항목에 추가
      setItems((prevItems) => [...prevItems, ...allOrderItems]);
      toast.success("주문 항목 추가 완료", {
        description: `${loadedOrderNumbers.length}개 주문의 항목 ${allOrderItems.length}개가 추가되었습니다.`,
      });

      // 선택 초기화
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error("주문 정보 조회 실패:", error);
      toast.error("주문 항목 추가 실패", {
        description: "주문 정보를 불러올 수 없습니다.",
      });
    }
  };

  const toggleOrderSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
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
      // 항목 검증
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

      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: Number(formData.customerId),
          storeId: Number(formData.storeId),
          quotationDate: formData.quotationDate,
          validUntil: formData.validUntil || undefined,
          items: validItems.map((item) => ({
            productId: item.productId || undefined,
            productName: item.productName || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            description: item.description || undefined,
          })),
          notes: formData.notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("견적서 생성 완료", {
          description: `${result.data.quotationNumber} 견적서가 성공적으로 생성되었습니다.`,
        });
        router.push(`/quotations/${result.data.id}`);
      } else {
        toast.error("견적서 생성 실패", {
          description: result.error?.message || "견적서 생성에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("견적서 생성 실패:", error);
      toast.error("견적서 생성 실패", {
        description: "견적서 생성 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="데이터 로딩 실패"
            description={error}
            onRetry={fetchCustomers}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">견적서 추가</h1>
            <p className="text-gray-500">새 견적서를 작성합니다.</p>
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
                    disabled={customersLoading}
                    required
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder={customersLoading ? "로딩 중..." : "고객사를 선택하세요"} />
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
                  <Label htmlFor="quotationDate">
                    견적일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quotationDate"
                    type="date"
                    value={formData.quotationDate}
                    onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validUntil">유효기간</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
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
                    <CardTitle>견적서 항목</CardTitle>
                    <CardDescription>상품을 선택하거나 주문에서 항목을 가져오세요.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {formData.customerId && (
                      <Select
                        onValueChange={(value) => {
                          if (value) {
                            loadOrderItems(Number(value));
                          }
                        }}
                        disabled={ordersLoading || orders.length === 0}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue 
                            placeholder={
                              ordersLoading 
                                ? "로딩 중..." 
                                : orders.length === 0 
                                ? "주문이 없습니다" 
                                : "주문에서 가져오기"
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {orders.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              주문이 없습니다
                            </div>
                          ) : (
                            orders.map((order) => (
                              <SelectItem key={order.id} value={order.id.toString()}>
                                {order.orderNumber} ({new Date(order.orderDate).toLocaleDateString("ko-KR")})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button type="button" onClick={addItem} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      항목 추가
                    </Button>
                  </div>
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
                      <Label>설명</Label>
                      <Input
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="항목 설명 (선택)"
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
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link href="/quotations">
              <Button type="button" variant="outline" disabled={loading}>
                취소
              </Button>
            </Link>
            <Button type="submit" disabled={loading || customersLoading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}


