"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { parseBusinessLicense, preprocessImage } from "@/lib/utils/ocr-parser";
import { callClovaOcr } from "@/lib/utils/clova-ocr";
import { validateBusinessNumber, validatePhoneNumber } from "@/lib/utils/validation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    businessNumber: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    tags: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    toast.info("문자 인식 중...", { description: "Clova OCR로 사업자등록증을 분석합니다." });

    try {
      // 1. 먼저 Clova OCR 시도 (정확도 높음)
      let parsedData: any = null;
      let ocrSource = "Clova OCR";
      
      try {
        const clovaResult = await callClovaOcr(file);
        console.log("Clova OCR 결과:", clovaResult);
        
        if (clovaResult.businessNumber || clovaResult.companyName) {
          parsedData = {
            businessNumber: clovaResult.businessNumber,
            name: clovaResult.companyName,
            contactPerson: clovaResult.representativeName,
            address: clovaResult.address,
            phone: clovaResult.phone,
          };
        }
      } catch (clovaError: any) {
        console.warn("Clova OCR 실패, Tesseract로 대체:", clovaError.message);
        ocrSource = "Tesseract (로컬)";
        
        // 2. Clova 실패 시 Tesseract로 폴백
        toast.info("로컬 OCR로 재시도 중...", { description: "Clova API 연결 실패" });
        
        let imageSource: string | File = file;
        try {
          imageSource = await preprocessImage(file);
        } catch (preprocessError) {
          console.warn("이미지 전처리 실패:", preprocessError);
        }

        const result = await Tesseract.recognize(imageSource, "kor+eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR 진행률: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        const text = result.data.text;
        console.log("Tesseract OCR 원본:", text);
        parsedData = parseBusinessLicense(text);
        parsedData.rawText = text;
      }

      console.log("최종 파싱 데이터:", parsedData);

      // 추출된 데이터가 있는지 확인
      const hasData = parsedData && Object.values(parsedData).some(v => v);
      
      if (parsedData) {
        setFormData((prev) => ({
          ...prev,
          name: parsedData.name || prev.name,
          businessNumber: parsedData.businessNumber || prev.businessNumber,
          contactPerson: parsedData.contactPerson || prev.contactPerson,
          address: parsedData.address || prev.address,
          phone: parsedData.phone || prev.phone,
          email: parsedData.email || prev.email,
          notes: parsedData.rawText 
            ? prev.notes + (prev.notes ? "\n" : "") + `[${ocrSource} 추출]\n` + parsedData.rawText.slice(0, 200) + "..."
            : prev.notes,
        }));
      }

      if (hasData) {
        toast.success("인식 완료", { 
          description: `${ocrSource}로 정보가 추출되었습니다. 확인 후 수정해주세요.` 
        });
      } else {
        toast.warning("인식 결과 부족", { 
          description: "이미지에서 정보를 추출하지 못했습니다. 직접 입력해주세요." 
        });
      }
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("인식 실패", { description: "이미지 인식 중 오류가 발생했습니다." });
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 데이터 무결성 검증
    if (formData.businessNumber && !validateBusinessNumber(formData.businessNumber)) {
      toast.error("유효하지 않은 사업자번호", { description: "사업자번호 형식을 확인해주세요 (000-00-00000)." });
      return;
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      toast.error("유효하지 않은 전화번호", { description: "전화번호 형식을 확인해주세요." });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
      };

      if (formData.businessNumber) payload.businessNumber = formData.businessNumber;
      if (formData.contactPerson) payload.contactPerson = formData.contactPerson;
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.address) payload.address = formData.address;
      if (formData.notes) payload.notes = formData.notes;
      if (formData.tags) {
        payload.tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("생성 완료", {
          description: "고객이 생성되었습니다.",
        });
        router.push(`/customers/${result.data.id}`);
      } else {
        throw new Error(result.error?.message || "고객 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("고객 생성 실패:", error);
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
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/customers">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">고객 추가</h1>
              <p className="text-gray-500">새로운 고객을 등록합니다.</p>
            </div>
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
            >
              {ocrLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              사업자등록증/명함 인식
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
            <CardDescription>고객의 기본 정보를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    고객명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    placeholder="회사명 또는 개인명"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="businessNumber">사업자번호</Label>
                  <Input
                    id="businessNumber"
                    value={formData.businessNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, businessNumber: e.target.value }))
                    }
                    placeholder="000-00-00000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">담당자</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    placeholder="담당자명"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="010-0000-0000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="example@email.com"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="주소를 입력하세요"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="tags">태그 (쉼표로 구분)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="예: VIP, 정기고객, 신규"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="추가 정보나 메모를 입력하세요"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/customers">
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
      </div>
    </MainLayout>
  );
}

