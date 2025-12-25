"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, File as FileIcon } from "lucide-react";
import { validateFile, formatFileSize } from "@/lib/utils/file-validator";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile?: File | null;
  accept?: string;
  maxSize?: number;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // 파일 검증
    const validation = await validateFile(file);
    if (!validation.valid) {
      toast.error("파일 검증 실패", {
        description: validation.error,
      });
      return;
    }

    // 크기 검증
    if (file.size > maxSize) {
      toast.error("파일 크기 초과", {
        description: `파일 크기는 ${formatFileSize(maxSize)} 이하여야 합니다.`,
      });
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>파일</Label>
      {selectedFile ? (
        <div className="flex items-center gap-2 p-4 border rounded-md bg-gray-50">
          <FileIcon className="h-5 w-5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onFileRemove();
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-xs text-gray-500 mb-4">
            최대 {formatFileSize(maxSize)}까지 업로드 가능
          </p>
          <Button type="button" variant="outline" onClick={handleClick}>
            파일 선택
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept={accept}
          />
        </div>
      )}
    </div>
  );
}

