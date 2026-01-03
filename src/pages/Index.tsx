import { Link, Navigate } from "react-router-dom";
import { GraduationCap, Users, BookOpen, Shield, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();

  if (user) {
    return (
      <Navigate to={user.role === "Admin" ? "/admin" : "/teacher"} replace />
    );
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">
              LMS Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-muted-foreground" />
              <Select
                value={i18n.language}
                onValueChange={changeLanguage}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                  <SelectItem value="uz">🇺🇿 O'zbekcha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!user && (
              <Link to="/login">
                <Button>{t("index.login")}</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t("index.title")}
            <span className="block text-primary mt-2">{t("index.subtitle")}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t("index.description")}
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="content-card text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t("index.features.groupManagement.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("index.features.groupManagement.description")}
            </p>
          </div>
          <div className="content-card text-center">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-success" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t("index.features.teacherRoles.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("index.features.teacherRoles.description")}
            </p>
          </div>
          <div className="content-card text-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-warning" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t("index.features.paymentTracking.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("index.features.paymentTracking.description")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
