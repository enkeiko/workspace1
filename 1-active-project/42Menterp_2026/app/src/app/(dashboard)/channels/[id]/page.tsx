"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Loader2,
  Trash2,
  ExternalLink,
  Plus,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { SheetSettingDialog } from "@/components/channels/sheet-setting-dialog";

interface ChannelSheet {
  id: string;
  sheetType: "ORDER" | "RECEIPT";
  sheetName: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetTabName: string | null;
  columnMapping: Record<string, string> | null;
  isActive: boolean;
}

interface Channel {
  id: string;
  name: string;
  code: string;
  type: "REVIEW" | "SAVE" | "DIRECTION" | "TRAFFIC";
  baseUnitPrice: number;
  minQty: number | null;
  minDays: number | null;
  maxDays: number | null;
  sameDayDeadline: string | null;
  nextDayDeadline: string | null;
  weekendAvailable: boolean;
  status: "ACTIVE" | "INACTIVE";
  sheets: ChannelSheet[];
}

const typeOptions = [
  { value: "TRAFFIC", label: "트래픽" },
  { value: "REVIEW", label: "리뷰" },
  { value: "SAVE", label: "저장" },
  { value: "DIRECTION", label: "길찾기" },
];

export default function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"ORDER" | "RECEIPT">("ORDER");
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    type: Channel["type"];
    baseUnitPrice: number;
    minQty: string;
    minDays: string;
    maxDays: string;
    sameDayDeadline: string;
    nextDayDeadline: string;
    weekendAvailable: boolean;
    status: Channel["status"];
  }>({
    name: "",
    code: "",
    type: "TRAFFIC",
    baseUnitPrice: 0,
    minQty: "",
    minDays: "",
    maxDays: "",
    sameDayDeadline: "",
    nextDayDeadline: "",
    weekendAvailable: false,
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchChannel();
  }, [id]);

  const fetchChannel = async () => {
    try {
      const res = await fetch(`/api/channels/${id}`);
      const data = await res.json();

      if (res.ok) {
        setChannel(data);
        setFormData({
          name: data.name,
          code: data.code,
          type: data.type,
          baseUnitPrice: data.baseUnitPrice,
          minQty: data.minQty?.toString() || "",
          minDays: data.minDays?.toString() || "",
          maxDays: data.maxDays?.toString() || "",
          sameDayDeadline: data.sameDayDeadline || "",
          nextDayDeadline: data.nextDayDeadline || "",
          weekendAvailable: data.weekendAvailable,
          status: data.status,
        });
      } else {
        toast.error(data.error);
        router.push("/channels");
      }
    } catch (error) {
      console.error("Failed to fetch channel:", error);
      toast.error("채널 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          minQty: formData.minQty ? parseInt(formData.minQty) : null,
          minDays: formData.minDays ? parseInt(formData.minDays) : null,
          maxDays: formData.maxDays ? parseInt(formData.maxDays) : null,
          sameDayDeadline: formData.sameDayDeadline || null,
          nextDayDeadline: formData.nextDayDeadline || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("채널이 수정되었습니다");
        setChannel(data);
        setEditMode(false);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to update channel:", error);
      toast.error("채널 수정에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("채널이 삭제되었습니다");
        router.push("/channels");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
      toast.error("채널 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSheet = async (sheetId: string) => {
    try {
      const res = await fetch(`/api/channels/${id}/sheets?sheetId=${sheetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("시트가 삭제되었습니다");
        fetchChannel();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete sheet:", error);
      toast.error("시트 삭제에 실패했습니다");
    }
  };

  const openSheetDialog = (type: "ORDER" | "RECEIPT") => {
    setSheetType(type);
    setSheetDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!channel) return null;

  const orderSheet = channel.sheets.find((s) => s.sheetType === "ORDER");
  const receiptSheet = channel.sheets.find((s) => s.sheetType === "RECEIPT");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/channels">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{channel.name}</h2>
              <Badge
                variant={channel.status === "ACTIVE" ? "default" : "secondary"}
              >
                {channel.status === "ACTIVE" ? "활성" : "비활성"}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{channel.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                저장
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>채널을 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? "삭제 중..." : "삭제"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setEditMode(true)}>수정</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>채널명</Label>
                {editMode ? (
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                ) : (
                  <p className="py-2">{channel.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>코드</Label>
                {editMode ? (
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                ) : (
                  <p className="py-2 font-mono">{channel.code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                {editMode ? (
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, type: v as Channel["type"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="py-2">
                    {typeOptions.find((o) => o.value === channel.type)?.label}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>기본 단가</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={formData.baseUnitPrice}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        baseUnitPrice: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                ) : (
                  <p className="py-2">{channel.baseUnitPrice.toLocaleString()}원</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              {editMode ? (
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      status: v as "ACTIVE" | "INACTIVE",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">활성</SelectItem>
                    <SelectItem value="INACTIVE">비활성</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant={channel.status === "ACTIVE" ? "default" : "secondary"}
                >
                  {channel.status === "ACTIVE" ? "활성" : "비활성"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>발주 조건</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>최소 수량</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={formData.minQty}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, minQty: e.target.value }))
                    }
                    placeholder="-"
                  />
                ) : (
                  <p className="py-2">{channel.minQty || "-"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>최소 일수</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={formData.minDays}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, minDays: e.target.value }))
                    }
                    placeholder="-"
                  />
                ) : (
                  <p className="py-2">{channel.minDays || "-"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>최대 일수</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={formData.maxDays}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, maxDays: e.target.value }))
                    }
                    placeholder="-"
                  />
                ) : (
                  <p className="py-2">{channel.maxDays || "-"}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>당일 마감</Label>
                {editMode ? (
                  <Input
                    value={formData.sameDayDeadline}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        sameDayDeadline: e.target.value,
                      }))
                    }
                    placeholder="14:00"
                  />
                ) : (
                  <p className="py-2">{channel.sameDayDeadline || "-"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>익일 마감</Label>
                {editMode ? (
                  <Input
                    value={formData.nextDayDeadline}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        nextDayDeadline: e.target.value,
                      }))
                    }
                    placeholder="18:00"
                  />
                ) : (
                  <p className="py-2">{channel.nextDayDeadline || "-"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Google Sheets 연동</CardTitle>
          <CardDescription>
            발주서와 수주서를 위한 Google Sheets를 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">발주 시트 (ORDER)</span>
                </div>
                {orderSheet ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>시트를 삭제하시겠습니까?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSheet(orderSheet.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
              {orderSheet ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{orderSheet.sheetName}</p>
                  <a
                    href={orderSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    시트 열기 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openSheetDialog("ORDER")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  발주 시트 설정
                </Button>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">수주 시트 (RECEIPT)</span>
                </div>
                {receiptSheet ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>시트를 삭제하시겠습니까?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSheet(receiptSheet.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
              {receiptSheet ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{receiptSheet.sheetName}</p>
                  <a
                    href={receiptSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    시트 열기 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openSheetDialog("RECEIPT")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  수주 시트 설정
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SheetSettingDialog
        open={sheetDialogOpen}
        onOpenChange={setSheetDialogOpen}
        channelId={id}
        sheetType={sheetType}
        onSuccess={fetchChannel}
      />
    </div>
  );
}
