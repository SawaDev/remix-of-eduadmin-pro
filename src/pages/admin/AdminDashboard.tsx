import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserX,
  Plus,
  UserPlus,
  Eye,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/axios";

interface AdminStats {
  total_students: number;
  student_growth_rate: number;
  active_groups: number;
  total_teachers: number;
  blocked_users: number;
}

interface NewStudent {
  id: number;
  full_name: string;
  phone: string;
  status: string;
  created_at: string;
  avatar?: string;
}

interface NewStudentsResponse {
  new_students: NewStudent[];
  students_without_group: NewStudent[];
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const response = await api.get<AdminStats>("/admin/stats");
      return response.data;
    },
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["newStudents"],
    queryFn: async () => {
      const response = await api.get<NewStudentsResponse>("/admin/new-students");
      return response.data;
    },
  });

  const newStudents = studentsData?.new_students || [];

  const newStudentColumns = [
    {
      key: "avatar",
      header: "",
      render: (student: NewStudent) => (
        <Avatar className="w-8 h-8">
          <AvatarImage src={student.avatar} alt={student.full_name} />
          <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
        </Avatar>
      ),
      className: "w-12",
    },
    {
      key: "full_name",
      header: t("common.name"),
      render: (student: NewStudent) => (
        <span className="font-medium text-foreground">{student.full_name}</span>
      ),
    },
    {
      key: "phone",
      header: t("common.phone"),
    },
    {
      key: "created_at",
      header: t("common.registered"),
      render: (student: NewStudent) => (
        <span>{new Date(student.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: () => <StatusBadge status="NEW_STUDENT" />,
    },
  ];

  if (statsLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t("admin.dashboard.title")}</h1>
        <p className="page-subtitle">{t("admin.dashboard.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t("admin.dashboard.totalStudents")}
          value={stats?.total_students || 0}
          icon={GraduationCap}
          trend={{
            value: stats?.student_growth_rate || 0,
            positive: (stats?.student_growth_rate || 0) >= 0,
          }}
        />
        <StatCard
          title={t("admin.dashboard.activeGroups")}
          value={stats?.active_groups || 0}
          icon={Users}
        />
        <StatCard
          title={t("admin.dashboard.teachers")}
          value={stats?.total_teachers || 0}
          icon={BookOpen}
        />
        <StatCard
          title={t("admin.dashboard.blockedExpired")}
          value={stats?.blocked_users || 0}
          icon={UserX}
          iconClassName="bg-destructive/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/groups"
          className="content-card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("admin.dashboard.createGroup")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.dashboard.createGroupDesc")}
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/teachers"
          className="content-card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("admin.dashboard.assignTeacher")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.dashboard.assignTeacherDesc")}
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/new-students"
          className="content-card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
              <UserPlus className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("admin.dashboard.newStudents")}</h3>
              <p className="text-sm text-muted-foreground">
                {newStudents?.length || 0} {t("admin.dashboard.newStudentsDesc")}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* New Students Table */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.dashboard.recentRegistrations")}
            {newStudents && newStudents.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {t("admin.dashboard.newCount", { count: newStudents.length })}
              </span>
            )}
          </h2>
          <Link to="/admin/new-students">
            <Button variant="ghost" size="sm" className="gap-2">
              <Eye className="w-4 h-4" />
              {t("common.viewAll")}
            </Button>
          </Link>
        </div>
        <DataTable
          columns={newStudentColumns}
          data={newStudents.slice(0, 5)}
          keyExtractor={(student) => student.id.toString()}
          emptyMessage={t("admin.dashboard.noNewRegistrations")}
        />
      </div>
    </div>
  );
}
