import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/axios";
import { useTranslation } from "react-i18next";

interface TeacherGroup {
  id: number;
  name: string;
  level: string;
  max_students: number;
  teacher_role: string;
  student_count: number;
}

interface GroupGradeSummary {
  id: number;
  name: string;
  avatar_url?: string;
  last_assignment_score: number;
  attendance_score: number;
  average_assignment: number;
}

export function TeacherGrades() {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const selectedGroupIdNum = Number(selectedGroupId);

  const { data: teacherGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ["teacherGroups"],
    queryFn: async () => {
      const response = await api.get<TeacherGroup[]>("/teacher/groups");
      return response.data;
    },
  });

  useEffect(() => {
    if (selectedGroupId) return;
    const first = teacherGroups?.[0];
    if (first) setSelectedGroupId(first.id.toString());
  }, [teacherGroups, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!teacherGroups || !selectedGroupId) return undefined;
    return teacherGroups.find((g) => g.id.toString() === selectedGroupId);
  }, [teacherGroups, selectedGroupId]);

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ["teacherGroupGrades", selectedGroupIdNum],
    queryFn: async () => {
      const response = await api.get<GroupGradeSummary[]>(`/teacher/groups/${selectedGroupIdNum}/grades`);
      return response.data;
    },
    enabled: Number.isFinite(selectedGroupIdNum) && !!selectedGroupId,
  });

  // Rank by average_assignment desc, then attendance_score desc
  const sorted = useMemo(() => {
    const list = [...(grades || [])];
    list.sort((a, b) => {
      if (b.average_assignment !== a.average_assignment) return b.average_assignment - a.average_assignment;
      return b.attendance_score - a.attendance_score;
    });
    return list;
  }, [grades]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('teacher.grades.title')}</h1>
        <p className="page-subtitle">{t('teacher.grades.subtitle')}</p>
      </div>

      {/* Controls */}
      <div className="content-card mb-6">
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {t('teacher.grades.selectGroup')}
          </label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={groupsLoading}>
            <SelectTrigger>
              <SelectValue placeholder={groupsLoading ? t('teacher.grades.loadingGroups') : t('teacher.grades.selectGroupPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {(teacherGroups || []).map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grades Table */}
      <div className="content-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {selectedGroup?.name || t('teacher.grades.pleaseSelectGroup')} - {t('teacher.grades.overviewTitle')}
        </h2>

        {gradesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (sorted?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {selectedGroupId ? t('teacher.grades.noStudentsInGroup') : t('teacher.grades.pleaseSelectGroup')}
          </div>
        ) : (
          <div className="data-table overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted/50">
                    {t('teacher.grades.rank')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted/50">
                    {t('teacher.grades.student')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted/50">
                    {t('teacher.grades.lastAssignment')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted/50">
                    {t('teacher.grades.attendanceScore')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted/50">
                    {t('teacher.grades.avgAssignment')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm border-t border-border">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={row.avatar_url} alt={row.name} />
                          <AvatarFallback>{row.name?.charAt(0) ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-border">
                      {row.last_assignment_score}
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-border">
                      {row.attendance_score}
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-border">
                      {row.average_assignment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
