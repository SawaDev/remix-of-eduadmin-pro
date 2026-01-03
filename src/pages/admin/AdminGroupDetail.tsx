import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, UserMinus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddStudentsDialog } from "@/components/admin/AddStudentsDialog";
import api from "@/lib/axios";

function getApiErrorMessage(err: unknown, fallback: string) {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.response?.data?.error ||
    anyErr?.message ||
    fallback
  );
}

interface Teacher {
  id: number;
  name: string;
  avatar: string;
}

interface Student {
  id: number;
  name: string;
  avatar: string;
  phone: string;
  status: string;
  attendance_rate: number;
}

interface GroupDetail {
  id: number;
  name: string;
  level?: string;
  main_teacher: Teacher | null;
  assistant_teacher: Teacher | null;
  students: Student[];
}

interface TeacherOption {
  id: number;
  full_name: string;
}

interface TeacherResponse {
  teachers: TeacherOption[];
  assistants: TeacherOption[];
}

interface LevelOption {
  id: number;
  name: string;
  description?: string;
}

interface UpdateGroupData {
  name: string;
  level: string;
  main_teacher_id: string;
  assistant_teacher_id?: string;
}

export function AdminGroupDetail() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false);
  const [initialEditGroup, setInitialEditGroup] = useState<UpdateGroupData | null>(
    null
  );
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof UpdateGroupData | "form", string>>
  >({});
  const [editGroup, setEditGroup] = useState<UpdateGroupData>({
    name: "",
    level: "",
    main_teacher_id: "",
    assistant_teacher_id: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: group, isLoading } = useQuery({
    queryKey: ["adminGroupDetail", groupId],
    queryFn: async () => {
      const response = await api.get<GroupDetail>(`/admin/groups/${groupId}`);
      return response.data;
    },
    enabled: !!groupId,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["adminTeachers"],
    queryFn: async () => {
      const response = await api.get<TeacherResponse>(
        "/admin/teacher-and-assistants"
      );
      return response.data;
    },
    enabled: isEditOpen,
  });

  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ["adminLevels"],
    queryFn: async () => {
      const response = await api.get<LevelOption[]>("/admin/levels");
      return response.data;
    },
    enabled: isEditOpen,
  });

  useEffect(() => {
    if (group && isEditOpen) {
      const next = {
        name: group.name,
        level: group.level || "",
        main_teacher_id: group.main_teacher?.id.toString() || "",
        assistant_teacher_id: group.assistant_teacher?.id.toString() || "",
      };
      setEditGroup(next);
      setInitialEditGroup(next);
      setEditErrors({});
    }
  }, [group, isEditOpen]);

  const trimmedEditName = useMemo(() => editGroup.name.trim(), [editGroup.name]);

  const validateEditGroup = useMemo(() => {
    const errors: Partial<Record<keyof UpdateGroupData | "form", string>> = {};

    if (!trimmedEditName) errors.name = t("admin.groups.detail.nameRequired");
    else if (trimmedEditName.length < 2) errors.name = t("admin.groups.detail.nameTooShort");
    else if (trimmedEditName.length > 80)
      errors.name = t("admin.groups.detail.nameTooLong");

    if (!editGroup.level?.trim()) errors.level = t("admin.groups.detail.levelRequired");

    if (!editGroup.main_teacher_id)
      errors.main_teacher_id = t("admin.groups.detail.mainTeacherRequired");

    if (
      editGroup.assistant_teacher_id &&
      editGroup.assistant_teacher_id === editGroup.main_teacher_id
    ) {
      errors.assistant_teacher_id = t("admin.groups.detail.assistantDifferent");
    }

    return errors;
  }, [
    editGroup.assistant_teacher_id,
    editGroup.level,
    editGroup.main_teacher_id,
    trimmedEditName,
    t,
  ]);

  const isEditValid = Object.keys(validateEditGroup).length === 0;

  const isEditDirty = useMemo(() => {
    if (!initialEditGroup) return false;
    const normalize = (d: UpdateGroupData) => ({
      name: d.name.trim(),
      level: d.level.trim(),
      main_teacher_id: d.main_teacher_id,
      assistant_teacher_id: (d.assistant_teacher_id ?? "").toString(),
    });
    return JSON.stringify(normalize(editGroup)) !== JSON.stringify(normalize(initialEditGroup));
  }, [editGroup, initialEditGroup]);

  const updateGroupMutation = useMutation({
    mutationFn: async (data: UpdateGroupData) => {
      await api.put(`/admin/groups/${groupId}`, {
        ...data,
        name: data.name.trim(),
        level: data.level.trim(),
        main_teacher_id: Number(data.main_teacher_id),
        assistant_teacher_id: data.assistant_teacher_id
          ? Number(data.assistant_teacher_id)
          : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminGroupDetail", groupId],
      });
      setIsEditOpen(false);
      toast({
        title: t("common.success"),
        description: t("admin.groups.updateSuccess"),
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getApiErrorMessage(err, t("admin.groups.updateError")),
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await api.post("/admin/groups/remove-student", {
        group_id: Number(groupId),
        student_id: studentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminGroupDetail", groupId],
      });
      toast({
        title: t("common.success"),
        description: t("admin.groups.detail.removeSuccess"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.groups.detail.removeError"),
      });
    },
  });

  const handleUpdateGroup = () => {
    const errors = validateEditGroup;
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!isEditDirty) {
      toast({
        title: t("admin.groups.detail.noChanges"),
        description: t("admin.groups.detail.nothingToUpdate"),
      });
      return;
    }
    updateGroupMutation.mutate({
      ...editGroup,
      name: trimmedEditName,
      level: editGroup.level.trim(),
    });
  };

  const handleRemoveStudent = (studentId: number) => {
    if (confirm(t("admin.groups.detail.removeConfirm"))) {
      removeStudentMutation.mutate(studentId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">{t("admin.groups.detail.notFound")}</p>
        <Link to="/admin/groups">
          <Button variant="outline" className="mt-4">
            {t("admin.groups.detail.backToGroups")}
          </Button>
        </Link>
      </div>
    );
  }

  const studentColumns = [
    {
      key: "avatar",
      header: "",
      render: (student: Student) => (
        <Avatar className="w-8 h-8">
          <AvatarImage src={student.avatar} alt={student.name} />
          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
      ),
      className: "w-12",
    },
    {
      key: "name",
      header: t("common.name"),
      render: (student: Student) => (
        <span className="font-medium text-foreground">{student.name}</span>
      ),
    },
    {
      key: "phone",
      header: t("common.phone"),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (student: Student) => <StatusBadge status={student.status} />,
    },
    {
      key: "attendance_rate",
      header: t("admin.groups.detail.attendance"),
      render: (student: Student) => <span>{student.attendance_rate}%</span>,
    },
    {
      key: "actions",
      header: "",
      render: (student: Student) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => handleRemoveStudent(student.id)}
          disabled={removeStudentMutation.isPending}
        >
          <UserMinus className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{group.name}</h1>
          </div>
          <p className="page-subtitle">{t("admin.groups.detail.subtitle")}</p>
        </div>
        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (updateGroupMutation.isPending) return;
              setIsEditOpen(false);
              setEditErrors({});
              return;
            }
            setIsEditOpen(true);
          }}
        >
          <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="w-4 h-4" />
          {t("admin.groups.edit")}
        </Button>
          </DialogTrigger>
          <DialogContent
            onEscapeKeyDown={(e) => {
              if (updateGroupMutation.isPending) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (updateGroupMutation.isPending) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("admin.groups.edit")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateGroup();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.groups.name")} *</Label>
                <Input
                  id="name"
                  placeholder={t("admin.groups.placeholderName")}
                  value={editGroup.name}
                  onChange={(e) =>
                    setEditGroup({ ...editGroup, name: e.target.value })
                  }
                  aria-invalid={!!(editErrors.name || validateEditGroup.name)}
                  aria-describedby={editErrors.name ? "edit-group-name-error" : undefined}
                />
                {(editErrors.name || validateEditGroup.name) && (
                  <p
                    id="edit-group-name-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {editErrors.name || validateEditGroup.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">{t("admin.groups.level")} *</Label>
                <Select
                  value={editGroup.level}
                  onValueChange={(value) =>
                    setEditGroup({ ...editGroup, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.groups.selectLevel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {levelsLoading && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {t("admin.groups.loadingLevels")}
                      </div>
                    )}
                    {!levelsLoading && (levelsData?.length ?? 0) === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {t("admin.groups.noLevels")}
                      </div>
                    )}
                    {(levelsData || []).map((lvl) => (
                      <SelectItem key={lvl.id} value={lvl.name}>
                        {lvl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(editErrors.level || validateEditGroup.level) && (
                  <p className="text-sm text-destructive" role="alert">
                    {editErrors.level || validateEditGroup.level}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainTeacher">{t("admin.groups.mainTeacher")} *</Label>
                <Select
                  value={editGroup.main_teacher_id}
                  onValueChange={(value) =>
                    setEditGroup({ ...editGroup, main_teacher_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.groups.selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachersData?.teachers.map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={teacher.id.toString()}
                      >
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(editErrors.main_teacher_id || validateEditGroup.main_teacher_id) && (
                  <p className="text-sm text-destructive" role="alert">
                    {editErrors.main_teacher_id || validateEditGroup.main_teacher_id}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistantTeacher">
                  {t("admin.groups.assistantTeacher")}
                </Label>
                <Select
                  value={editGroup.assistant_teacher_id}
                  onValueChange={(value) =>
                    setEditGroup({
                      ...editGroup,
                      assistant_teacher_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.groups.selectAssistant")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.groups.none")}</SelectItem>
                    {teachersData?.assistants.map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={teacher.id.toString()}
                      >
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(editErrors.assistant_teacher_id || validateEditGroup.assistant_teacher_id) && (
                  <p className="text-sm text-destructive" role="alert">
                    {editErrors.assistant_teacher_id || validateEditGroup.assistant_teacher_id}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (updateGroupMutation.isPending) return;
                    setIsEditOpen(false);
                    setEditErrors({});
                  }}
                  disabled={updateGroupMutation.isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateGroupMutation.isPending ||
                    !isEditDirty ||
                    !isEditValid
                  }
                >
                  {updateGroupMutation.isPending ? t("common.updating") : t("admin.groups.update")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Capacity */}
        <div className="content-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t("admin.groups.detail.capacity")}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-semibold">
                  {group.students.length}
                </span>
                <span className="text-muted-foreground">{t("admin.groups.students")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Teacher */}
        <div className="content-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t("admin.groups.mainTeacher")}
          </h3>
          {group.main_teacher ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={group.main_teacher.avatar}
                  alt={group.main_teacher.name}
                />
                <AvatarFallback>
                  {group.main_teacher.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {group.main_teacher.name}
                </p>
                <RoleBadge role="main" />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("common.notAssigned")}</p>
          )}
        </div>

        {/* Assistant Teacher */}
        <div className="content-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t("admin.groups.detail.assistantTeacher")}
          </h3>
          {group.assistant_teacher ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={group.assistant_teacher.avatar}
                  alt={group.assistant_teacher.name}
                />
                <AvatarFallback>
                  {group.assistant_teacher.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {group.assistant_teacher.name}
                </p>
                <RoleBadge role="assistant" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{t("common.notAssigned")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Students */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("admin.groups.students")}</h2>
          <Button className="gap-2" onClick={() => setIsAddStudentsOpen(true)}>
            <UserPlus className="w-4 h-4" />
            {t("admin.groups.detail.addStudent")}
          </Button>
        </div>
        <DataTable
          columns={studentColumns}
          data={group.students}
          keyExtractor={(student) => student.id.toString()}
          emptyMessage={t("admin.groups.detail.noStudents")}
        />
      </div>

      {/* Add Students Dialog */}
      {groupId && (
        <AddStudentsDialog
          groupId={groupId}
          isOpen={isAddStudentsOpen}
          onClose={() => setIsAddStudentsOpen(false)}
        />
      )}
    </div>
  );
}
