import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().regex(/^\d{12}$/, "Phone number must be exactly 12 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<{ phone: boolean; password: boolean }>({
    phone: false,
    password: false,
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validation = useMemo(() => {
    return loginSchema.safeParse({ phone, password });
  }, [phone, password]);

  const fieldErrors = useMemo(() => {
    if (validation.success) return { phone: "", password: "" };
    const phoneMsg =
      validation.error.issues.find((i) => i.path[0] === "phone")?.message ?? "";
    const passwordMsg =
      validation.error.issues.find((i) => i.path[0] === "password")?.message ??
      "";
    return { phone: phoneMsg, password: passwordMsg };
  }, [validation]);

  const isFormValid = validation.success;
  const isSubmitDisabled = isLoading || !isFormValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      // Show validation errors after first submit attempt
      setTouched({ phone: true, password: true });
      return;
    }
    setIsLoading(true);

    try {
      await login(phone, password);

      toast({
        title: t("login.successTitle"),
        description: t("login.successDescription"),
      });

      const user = useAuthStore.getState().user;
      if (user) {
        if (user.role === "Admin") navigate("/admin");
        else if (user.role === "Teacher") navigate("/teacher");
        else navigate("/");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("login.errorTitle"),
        description: t("login.errorDescription"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              < GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("login.welcomeBack")}</CardTitle>
          <CardDescription>
            {t("login.description")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("login.phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="998901234567"
                value={phone}
                onChange={(e) => {
                  if (!touched.phone) setTouched((t) => ({ ...t, phone: true }));
                  // Keep only digits, limit to 12 chars as per requirement.
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setPhone(digits);
                }}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                aria-invalid={touched.phone && !!fieldErrors.phone}
              />
              {touched.phone && fieldErrors.phone && (
                <p className="text-sm text-destructive">{fieldErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  if (!touched.password) setTouched((t) => ({ ...t, password: true }));
                  setPassword(e.target.value);
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={touched.password && !!fieldErrors.password}
              />
              {touched.password && fieldErrors.password && (
                <p className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitDisabled}
            >
              {isLoading ? t("login.loggingIn") : t("login.submit")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
