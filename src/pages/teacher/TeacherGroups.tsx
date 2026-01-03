import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { LevelBadge } from "@/components/ui/level-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { useTranslation } from "react-i18next";

interface TeacherGroup {
  id: number;
  name: string;
  level: string;
  max_students: number;
  teacher_role: string; // "Main" | "Assistant"
  student_count: number;
}

export function TeacherGroups() {
  const { t } = useTranslation();
  const { data: teacherGroups, isLoading } = useQuery({
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-foreground">{group.name}</span>
        </div>
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
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (group.student_count / Math.max(1, group.max_students)) * 100
                )}%`,
              }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {group.student_count}/{group.max_students}
          </span>
        </div>
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
          <Button variant="outline" size="sm">{t('teacher.groups.openGroup')}</Button>
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('teacher.groups.title')}</h1>
        <p className="page-subtitle">{t('teacher.groups.subtitle')}</p>
      </div>

      <div className="content-card">
        <DataTable
          columns={columns}
          data={teacherGroups || []}
          keyExtractor={(group) => group.id.toString()}
          emptyMessage={t('teacher.groups.noGroups') || t('teacher.dashboard.noGroups')}
        />
      </div>
    </div>
  );
}