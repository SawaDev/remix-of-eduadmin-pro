import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, ClipboardList, Calendar, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface TeacherGroup {
  id: number;
  name: string;
  level: string;
  max_students: number;
  teacher_role: string;
  student_count: number;
}

interface GroupStudent {
  id: number;
  avatar?: string;
  full_name: string;
  phone: string;
  attendance_rate: number;
  total_score: number;
}

interface TeacherAssignment {
  id: number;
  title: string;
  group_name: string;
  due_date: string; // YYYY-MM-DD
  submission_ratio: string; // "12/20"
  waiting_for_review?: number;
  status: string; // "pending" | "active" | ...
}

interface GroupGradeSummary {
  id: number;
  name: string;
  avatar_url?: string;
  last_assignment_score: number;
  attendance_score: number;
  average_assignment: number;
}

export function GroupDetail() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const groupIdNum = Number(groupId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    content: "",
    due_date: "",
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, Record<number, boolean>>>({});

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["teacherGroups"],
    queryFn: async () => {
      const response = await api.get<TeacherGroup[]>("/teacher/groups");
      return response.data;
    },
  });

  const group = useMemo(() => {
    if (!groups || !Number.isFinite(groupIdNum)) return null;
    return groups.find((g) => g.id === groupIdNum) || null;
  }, [groups, groupIdNum]);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["teacherGroupStudents", groupIdNum],
    queryFn: async () => {
      const response = await api.get<GroupStudent[]>(`/teacher/groups/${groupIdNum}/students`);
      return response.data;
    },
    enabled: Number.isFinite(groupIdNum),
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["teacherAssignments", groupIdNum],
    queryFn: async () => {
      const response = await api.get<TeacherAssignment[]>("/teacher/assignments", {
        params: { groupId: groupIdNum },
      });
      return response.data;
    },
    enabled: Number.isFinite(groupIdNum),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; group_id: number; due_date: string }) => {
      await api.post("/teacher/assignments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherAssignments", groupIdNum] });
      toast({ title: t('common.success'), description: t('teacher.assignments.createSuccess') });
      setIsCreateOpen(false);
      setNewAssignment({ title: "", content: "", due_date: "" });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('teacher.assignments.createError') });
    },
  });

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ["teacherGroupGrades", groupIdNum],
    queryFn: async () => {
      const response = await api.get<GroupGradeSummary[]>(`/teacher/groups/${groupIdNum}/grades`);
      return response.data;
    },
    enabled: Number.isFinite(groupIdNum),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (payload: { group_id: number; date: string; attendance: Array<{ student_id: number; is_present: boolean }> }) => {
      const response = await api.post<{ message: string }>("/teacher/attendance", payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast({ title: t('common.success'), description: data?.message || t('teacher.attendance.saveSuccess') });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('teacher.attendance.saveError') });
    },
  });

  // IMPORTANT: hooks must run in the same order on every render.
  // This effect must be declared before any early returns below.
  useEffect(() => {
    // Initialize attendance for the selected date once we have students.
    // Default: everyone present (teacher can mark absences).
    if (!students || students.length === 0) return;
    setAttendanceByDate((prev) => {
      if (prev[selectedDate]) return prev;
      const initial: Record<number, boolean> = {};
      for (const s of students) initial[s.id] = true;
      return { ...prev, [selectedDate]: initial };
    });
  }, [students, selectedDate]);

  if (!Number.isFinite(groupIdNum)) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">{t('common.invalidId')}</p>
        <Link to="/teacher/groups">
          <Button variant="outline" className="mt-4">{t('teacher.groups.backToGroups')}</Button>
        </Link>
      </div>
    );
  }

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">{t('teacher.groups.groupNotFound')}</p>
        <Link to="/teacher/groups">
          <Button variant="outline" className="mt-4">{t('teacher.groups.backToGroups')}</Button>
        </Link>
      </div>
    );
  }

  const studentColumns = [
    {
      key: 'avatar',
      header: '',
      render: (student: GroupStudent) => (
        <Avatar className="w-8 h-8">
          <AvatarImage src={student.avatar} alt={student.full_name} />
          <AvatarFallback>{student.full_name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
      ),
      className: 'w-12',
    },
    {
      key: 'name',
      header: t('admin.newStudents.fullName'),
      render: (student: GroupStudent) => (
        <span className="font-medium text-foreground">{student.full_name}</span>
      ),
    },
    {
      key: 'phone',
      header: t('common.phone'),
      render: (student: GroupStudent) => <span>{student.phone}</span>,
    },
    {
      key: 'attendance',
      header: t('teacher.groups.attendancePercent'), // Note: added this? No, common percent.
      render: (student: GroupStudent) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                student.attendance_rate >= 80
                  ? "bg-success"
                  : student.attendance_rate >= 60
                    ? "bg-warning"
                    : "bg-destructive"
              }`}
              style={{ width: `${student.attendance_rate}%` }}
            />
          </div>
          <span className="text-sm">{student.attendance_rate}%</span>
        </div>
      ),
    },
    {
      key: 'totalScore',
      header: t('admin.students.totalScore'),
      render: (student: GroupStudent) => (
        <span
          className={`font-medium ${
            student.total_score >= 80
              ? "text-success"
              : student.total_score >= 60
                ? "text-warning"
                : "text-destructive"
          }`}
        >
          {student.total_score}
        </span>
      ),
    },
  ];

  const assignmentColumns = [
    {
      key: 'title',
      header: t('teacher.assignments.titleLabel'),
      render: (assignment: TeacherAssignment) => (
        <span className="font-medium text-foreground">{assignment.title}</span>
      ),
    },
    {
      key: 'due_date',
      header: t('teacher.assignments.dueDate'),
      render: (assignment: TeacherAssignment) => (
        <span>{assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "-"}</span>
      ),
    },
    {
      key: 'submission_ratio',
      header: t('teacher.assignments.submissions'),
      render: (assignment: TeacherAssignment) => <span>{assignment.submission_ratio}</span>,
    },
    {
      key: "waiting_for_review",
      header: t('teacher.assignments.waiting'),
      render: (assignment: TeacherAssignment) => (
        <span className={assignment.waiting_for_review ? "text-warning font-medium" : "text-muted-foreground"}>
          {assignment.waiting_for_review ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (assignment: TeacherAssignment) => <StatusBadge status={assignment.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (assignment: TeacherAssignment) => (
        <Link to={`/teacher/assignments/${assignment.id}`}>
          <Button variant="outline" size="sm">{t('teacher.assignments.review')}</Button>
        </Link>
      ),
    },
  ];

  const gradeColumns = [
    {
      key: "avatar_url",
      header: "",
      className: "w-12",
      render: (row: GroupGradeSummary) => (
        <Avatar className="w-8 h-8">
          <AvatarImage src={row.avatar_url} alt={row.name} />
          <AvatarFallback>{row.name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: "name",
      header: t('teacher.grades.student'),
      render: (row: GroupGradeSummary) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "last_assignment_score",
      header: t('teacher.grades.lastAssignment'),
      render: (row: GroupGradeSummary) => <span>{row.last_assignment_score}</span>,
    },
    {
      key: "attendance_score",
      header: t('teacher.grades.attendanceScore'),
      render: (row: GroupGradeSummary) => <span>{row.attendance_score}</span>,
    },
    {
      key: "average_assignment",
      header: t('teacher.grades.avgAssignment'),
      render: (row: GroupGradeSummary) => <span>{row.average_assignment}</span>,
    },
  ];

  const attendanceForDate = attendanceByDate[selectedDate] || {};

  const setStudentPresence = (studentId: number, isPresent: boolean) => {
    setAttendanceByDate((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [studentId]: isPresent,
      },
    }));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/teacher/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{group.name}</h1>
            <LevelBadge level={group.level} />
          </div>
          <p className="page-subtitle">
            {group.teacher_role === "Main" ? t('teacher.groups.mainTeacher') : t('teacher.groups.assistant')} • {t('teacher.groups.studentsCount', { count: group.student_count, total: group.max_students })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" />
            {t('nav.students')}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            {t('nav.assignments')}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Calendar className="w-4 h-4" />
            {t('nav.attendance')}
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-2">
            <Award className="w-4 h-4" />
            {t('nav.grades')}
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students">
          <div className="content-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t('nav.students')} ({students?.length ?? 0}/{group.max_students})
              </h2>
            </div>
            <DataTable
              columns={studentColumns}
              data={students || []}
              keyExtractor={(student) => student.id.toString()}
              emptyMessage={t('teacher.groups.noStudents')}
            />
            {studentsLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <div className="content-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{t('nav.assignments')}</h2>
              <Button onClick={() => setIsCreateOpen(true)}>{t('teacher.assignments.create')}</Button>
            </div>
            <DataTable
              columns={assignmentColumns}
              data={assignments || []}
              keyExtractor={(assignment) => assignment.id.toString()}
              emptyMessage={t('teacher.assignments.noAssignments')}
            />
            {assignmentsLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="content-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">{t('teacher.attendance.title')}</h2>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>

            {studentsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (students?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">{t('teacher.attendance.noStudents')}</p>
            ) : (
              <div className="space-y-3">
                {(students || []).map((student) => {
                  const isPresent = attendanceForDate[student.id] ?? true;
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.avatar} alt={student.full_name} />
                          <AvatarFallback>{student.full_name?.charAt(0) ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.phone}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={isPresent ? "default" : "outline"}
                          size="sm"
                          className="w-24"
                          onClick={() => setStudentPresence(student.id, true)}
                        >
                          {t('teacher.attendance.present')}
                        </Button>
                        <Button
                          variant={!isPresent ? "destructive" : "outline"}
                          size="sm"
                          className="w-24"
                          onClick={() => setStudentPresence(student.id, false)}
                        >
                          {t('teacher.attendance.absent')}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      if (!students || students.length === 0) return;
                      const attendance = students.map((s) => ({
                        student_id: s.id,
                        is_present: (attendanceForDate[s.id] ?? true) === true,
                      }));
                      saveAttendanceMutation.mutate({
                        group_id: groupIdNum,
                        date: selectedDate,
                        attendance,
                      });
                    }}
                    disabled={saveAttendanceMutation.isPending}
                  >
                    {saveAttendanceMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <div className="content-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('teacher.grades.title')}</h2>
            <DataTable
              columns={gradeColumns}
              data={grades || []}
              keyExtractor={(row) => row.id.toString()}
              emptyMessage={t('teacher.grades.noGrades')}
            />
            {gradesLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t('teacher.assignments.create')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t('teacher.assignments.titleLabel')}</Label>
              <Input
                id="title"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('teacher.assignments.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">{t('teacher.assignments.contentLabel')}</Label>
              <Input
                id="content"
                value={newAssignment.content}
                onChange={(e) => setNewAssignment((p) => ({ ...p, content: e.target.value }))}
                placeholder={t('teacher.assignments.contentPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">{t('teacher.assignments.dueDate')}</Label>
              <Input
                id="due_date"
                type="date"
                value={newAssignment.due_date}
                onChange={(e) => setNewAssignment((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createAssignmentMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (!newAssignment.title || !newAssignment.content || !newAssignment.due_date) {
                    toast({
                      variant: "destructive",
                      title: t('admin.groups.validationError'),
                      description: t('teacher.assignments.createError'), // Updated later? No, fixed.
                    });
                    return;
                  }
                  createAssignmentMutation.mutate({
                    title: newAssignment.title,
                    content: newAssignment.content,
                    group_id: group.id,
                    due_date: newAssignment.due_date,
                  });
                }}
                disabled={createAssignmentMutation.isPending}
              >
                {createAssignmentMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}