"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const STORAGE_KEY_EMAIL = "42ment_saved_email";
const STORAGE_KEY_REMEMBER = "42ment_remember_me";
const STORAGE_KEY_KEEP_LOGIN = "42ment_keep_login";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  // 저장된 로그인 정보 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
    const savedRemember = localStorage.getItem(STORAGE_KEY_REMEMBER);
    const savedKeepLogin = localStorage.getItem(STORAGE_KEY_KEEP_LOGIN);
    
    if (savedRemember === "true" && savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
    if (savedKeepLogin === "true") {
      setKeepLoggedIn(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 이메일 저장 처리
    if (rememberEmail) {
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
      localStorage.setItem(STORAGE_KEY_REMEMBER, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY_EMAIL);
      localStorage.setItem(STORAGE_KEY_REMEMBER, "false");
    }

    // 로그인 상태 유지 설정 저장
    localStorage.setItem(STORAGE_KEY_KEEP_LOGIN, keepLoggedIn ? "true" : "false");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        keepLoggedIn: keepLoggedIn ? "true" : "false",
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">42ment ERP</CardTitle>
          <CardDescription>
            네이버 플레이스 마케팅 관리 시스템
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {/* 로그인 정보 저장 옵션 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberEmail"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="rememberEmail" className="text-sm font-normal cursor-pointer">
                  이메일 저장
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="keepLoggedIn"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="keepLoggedIn" className="text-sm font-normal cursor-pointer">
                  로그인 상태 유지 (7일)
                </Label>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
