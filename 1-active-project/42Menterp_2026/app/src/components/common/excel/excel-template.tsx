"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTemplate } from "./utils/generator";
import type { ExcelTemplateProps } from "./types";

export function ExcelTemplate({
  resource,
  fields,
  filename,
  children,
}: ExcelTemplateProps) {
  const handleDownload = () => {
    const name = filename || `${resource}_template`;
    generateTemplate(fields, name);
  };

  if (children) {
    return <div onClick={handleDownload}>{children}</div>;
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="mr-1 h-4 w-4" />
      양식 다운로드
    </Button>
  );
}
