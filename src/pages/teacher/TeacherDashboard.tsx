import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, ClipboardList, Award, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { LevelBadge } from "@/components/ui/level-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axios";
import { useTranslation } from "react-i18next";

interface TeacherStats {
  groups_count: number;
  total_students: number;
  active_assignments: number;
  pending_reviews: number;
}

interface TeacherGroup {
  id: number;
  name: string;
  level: string;
  max_students: number;
  teacher_role: string; // "Main" | "Assistant"
  student_count: number;
}

export function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["teacherStats"],
    queryFn: async () => {
      const response = await api.get<TeacherStats>("/teacher/stats");
      return response.data;
    },
  });

  const { data: teacherGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ["teacherGroups"],
    queryFn: async () => {
      const response = await api.get<TeacherGroup[]>("/teacher/groups");
      return response.data;
    },
  });

  const columns = [
    {
      key: 'name',
      header: t('teacher.dashboard.table.groupName'),
      render: (group: TeacherGroup) => (
        <span className="font-medium text-foreground">{group.name}</span>
      ),
    },
    {
      key: 'level',
      header: t('teacher.dashboard.table.level'),
      render: (group: TeacherGroup) => <LevelBadge level={group.level} />,
    },
    {
      key: 'students',
      header: t('teacher.dashboard.table.students'),
      render: (group: TeacherGroup) => (
        <span>{group.student_count}/{group.max_students}</span>
      ),
    },
    {
      key: 'role',
      header: t('teacher.dashboard.table.yourRole'),
      render: (group: TeacherGroup) => <RoleBadge role={group.teacher_role} />,
    },
    {
      key: 'actions',
      header: '',
      render: (group: TeacherGroup) => (
        <Link to={`/teacher/groups/${group.id}`}>
          <Button variant="outline" size="sm">{t('teacher.dashboard.openGroup')}</Button>
        </Link>
      ),
    },
  ];

  if (statsLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">
          {t('teacher.dashboard.welcomeBack')}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="page-subtitle">{t('teacher.dashboard.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t('teacher.dashboard.stats.myGroups')}
          value={stats?.groups_count ?? 0}
          icon={Users}
        />
        <StatCard
          title={t('teacher.dashboard.stats.totalStudents')}
          value={stats?.total_students ?? 0}
          icon={Users}
        />
        <StatCard
          title={t('teacher.dashboard.stats.activeAssignments')}
          value={stats?.active_assignments ?? 0}
          icon={ClipboardList}
        />
        <StatCard
          title={t('teacher.dashboard.stats.pendingReviews')}
          value={stats?.pending_reviews ?? 0}
          icon={Award}
          iconClassName={(stats?.pending_reviews ?? 0) > 0 ? 'bg-warning/10' : undefined}
        />
      </div>

      {/* Groups Table */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('teacher.dashboard.stats.myGroups')}</h2>
          <Link to="/teacher/groups">
            <Button variant="ghost" size="sm">{t('common.viewAll')}</Button>
          </Link>
        </div>
        <DataTable
          columns={columns}
          data={teacherGroups || []}
          keyExtractor={(group) => group.id.toString()}
          emptyMessage={t('teacher.dashboard.noGroups')}
        />
      </div>
    </div>
  );
}