"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, Loader2, FileSpreadsheet } from "lucide-react";
import { ChannelDialog } from "@/components/channels/channel-dialog";

interface ChannelSheet {
  id: string;
  sheetType: "ORDER" | "RECEIPT";
  sheetName: string;
}

interface Channel {
  id: string;
  name: string;
  code: string;
  type: "REVIEW" | "SAVE" | "DIRECTION" | "TRAFFIC";
  baseUnitPrice: number;
  status: "ACTIVE" | "INACTIVE";
  sheets: ChannelSheet[];
}

const typeMap = {
  REVIEW: { label: "리뷰", color: "bg-blue-100 text-blue-800" },
  SAVE: { label: "저장", color: "bg-green-100 text-green-800" },
  DIRECTION: { label: "길찾기", color: "bg-purple-100 text-purple-800" },
  TRAFFIC: { label: "트래픽", color: "bg-orange-100 text-orange-800" },
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels?includeSheets=true");
      const data = await res.json();
      if (res.ok) {
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">채널 관리</h2>
          <p className="text-muted-foreground">
            발주 채널을 관리하고 시트를 설정하세요.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          채널 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>채널 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 채널이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>채널명</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">기본 단가</TableHead>
                  <TableHead>시트 설정</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[80px]">설정</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => {
                  const orderSheet = channel.sheets?.find(
                    (s) => s.sheetType === "ORDER"
                  );
                  const receiptSheet = channel.sheets?.find(
                    (s) => s.sheetType === "RECEIPT"
                  );

                  return (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">
                        {channel.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {channel.code}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${typeMap[channel.type].color}`}
                        >
                          {typeMap[channel.type].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {channel.baseUnitPrice.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {orderSheet ? (
                            <Badge variant="outline" className="text-xs">
                              <FileSpreadsheet className="h-3 w-3 mr-1" />
                              발주
                            </Badge>
                          ) : null}
                          {receiptSheet ? (
                            <Badge variant="outline" className="text-xs">
                              <FileSpreadsheet className="h-3 w-3 mr-1" />
                              수주
                            </Badge>
                          ) : null}
                          {!orderSheet && !receiptSheet && (
                            <span className="text-xs text-muted-foreground">
                              미설정
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            channel.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {channel.status === "ACTIVE" ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/channels/${channel.id}`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchChannels}
      />
    </div>
  );
}
