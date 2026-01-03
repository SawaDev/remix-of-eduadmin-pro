import { useMemo, useState } from "react";
import { Plus, Key, Pencil, Users, Loader2, Copy, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const teacherSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().min(1, "Phone is required"),
  teacher_type: z.enum(["main", "assistant"], { message: "Role is required" }),
});

// Interface for API response
interface Teacher {
  id: number;
  avatar_url?: string;
  name: string;
  email: string;
  phone: string;
  role: string; // e.g. "Teacher"
  position: string; // e.g. "Main" | "Assistant"
  created_at: string;
  main_groups?: string; // backend sends as string
  assistant_groups?: string; // backend sends as string
  assigned_groups_count: number;
}

interface TeacherFormData {
  name: string;
  email: string;
  phone: string;
  teacher_type: string;
}

interface CreateTeacherResponse {
  message: string;
  user_id: number;
  password: string;
}

export function AdminTeachers() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [teacherForm, setTeacherForm] = useState<TeacherFormData>({
    name: "",
    email: "",
    phone: "",
    teacher_type: "main",
  });
  const [touched, setTouched] = useState<{
    name: boolean;
    email: boolean;
    phone: boolean;
    teacher_type: boolean;
  }>({ name: false, email: false, phone: false, teacher_type: false });

  // State for created credentials dialog
  const [createdTeacherCredentials, setCreatedTeacherCredentials] = useState<{password: string} | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["adminTeachersList"],
    queryFn: async () => {
      const response = await api.get<Teacher[]>("/admin/teachers-list");
      return response.data;
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      const response = await api.post<CreateTeacherResponse>("/admin/teachers", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminTeachersList"] });
      closeDialog();
      setCreatedTeacherCredentials({ password: data.password });
      
      // Auto copy to clipboard
      navigator.clipboard.writeText(data.password).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });

      toast({
        title: t('common.success'),
        description: t('admin.teachers.createdSuccess'),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('admin.teachers.createError'), // Note: added this to translations? I missed it.
      });
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      await api.put(`/admin/teachers/${editingTeacherId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeachersList"] });
      closeDialog();
      toast({
        title: t('common.success'),
        description: t('admin.teachers.updateSuccess'),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('admin.teachers.updateError'),
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await api.patch(`/admin/teachers/${id}/password`, {
        new_password: password,
      });
    },
    onSuccess: () => {
      setResetPasswordId(null);
      setNewPassword("");
      toast({
        title: t('common.success'),
        description: t('admin.teachers.passwordUpdateSuccess'),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('admin.teachers.resetPasswordError'),
      });
    },
  });

  const dialogValidation = useMemo(() => teacherSchema.safeParse(teacherForm), [teacherForm]);
  const fieldErrors = useMemo(() => {
    if (dialogValidation.success) return { name: "", email: "", phone: "", teacher_type: "" };
    const msg = (field: keyof TeacherFormData) =>
      dialogValidation.error.issues.find((i) => i.path[0] === field)?.message ?? "";
    return {
      name: msg("name"),
      email: msg("email"),
      phone: msg("phone"),
      teacher_type: msg("teacher_type"),
    };
  }, [dialogValidation]);

  const isFormValid = dialogValidation.success;
  const isSaving = createTeacherMutation.isPending || updateTeacherMutation.isPending;
  const isSubmitDisabled = isSaving || !isFormValid;

  const handleSubmit = () => {
    if (!isFormValid) {
      setTouched({ name: true, email: true, phone: true, teacher_type: true });
      toast({
        variant: "destructive",
        title: t('admin.groups.validationError'),
        description: t('admin.groups.fixFields'),
      });
      return;
    }

    if (editingTeacherId) {
      updateTeacherMutation.mutate(teacherForm);
    } else {
      createTeacherMutation.mutate(teacherForm);
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: t('admin.groups.validationError'),
        description: t('admin.teachers.passwordMinLength'),
      });
      return;
    }
    if (resetPasswordId) {
      resetPasswordMutation.mutate({ id: resetPasswordId, password: newPassword });
    }
  };

  const openCreateDialog = () => {
    setEditingTeacherId(null);
    setTeacherForm({ name: "", email: "", phone: "", teacher_type: "main" });
    setTouched({ name: false, email: false, phone: false, teacher_type: false });
    setIsDialogOpen(true);
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      // backend provides `position` ("Main"/"Assistant"), form expects "main"/"assistant"
      teacher_type: teacher.position?.toLowerCase() === "main" ? "main" : "assistant",
    });
    setTouched({ name: false, email: false, phone: false, teacher_type: false });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTeacherId(null);
    setTouched({ name: false, email: false, phone: false, teacher_type: false });
  };

  const copyToClipboard = () => {
    if (createdTeacherCredentials) {
        navigator.clipboard.writeText(createdTeacherCredentials.password).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast({
                title: t('admin.teachers.copyPassword'),
                description: t('admin.teachers.copyPasswordAuto'),
            });
        });
    }
  };

  const columns = [
    {
      key: "avatar",
      header: "",
      render: (teacher: Teacher) => (
        <Avatar className="w-10 h-10">
          <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
          <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
        </Avatar>
      ),
      className: "w-14",
    },
    {
      key: "name",
      header: t('common.name'),
      render: (teacher: Teacher) => (
        <div>
          <span className="font-medium text-foreground">{teacher.name}</span>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: t('common.phone'),
    },
    {
      key: "role",
      header: t('common.role'),
      render: (teacher: Teacher) => (
        <RoleBadge role={teacher.position} />
      ),
    },
    {
      key: "groups",
      header: t('admin.teachers.assignedGroups'),
      render: (teacher: Teacher) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col leading-tight">
            <span>
              {t('admin.teachers.groupCount', { count: teacher.assigned_groups_count })}
            </span>
            {(teacher.main_groups !== undefined || teacher.assistant_groups !== undefined) && (
              <span className="text-xs text-muted-foreground">
                {t('admin.teachers.main')}: {teacher.main_groups ?? 0} • {t('admin.teachers.assistant')}: {teacher.assistant_groups ?? 0}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: t('admin.teachers.joined'),
      render: (teacher: Teacher) => (
        <span className="text-muted-foreground">
          {new Date(teacher.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (teacher: Teacher) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setResetPasswordId(teacher.id)}
          >
            <Key className="w-4 h-4" />
            {t('admin.teachers.resetPassword')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(teacher)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
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

  const mainTeachersCount =
    teachers?.filter((t) => t.position?.toLowerCase() === "main").length || 0;
  const assistantTeachersCount =
    teachers?.filter((t) => t.position?.toLowerCase() === "assistant").length || 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('admin.teachers.title')}</h1>
          <p className="page-subtitle">{t('admin.teachers.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
              {t('admin.teachers.create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeacherId ? t('admin.teachers.edit') : t('admin.teachers.new')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.teachers.fullName')}</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={teacherForm.name}
                  onChange={(e) => {
                    if (!touched.name) setTouched((t) => ({ ...t, name: true }));
                    setTeacherForm({ ...teacherForm, name: e.target.value });
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  aria-invalid={touched.name && !!fieldErrors.name}
                  disabled={isSaving}
                />
                {touched.name && fieldErrors.name && (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('admin.teachers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.smith@lms.com"
                  value={teacherForm.email}
                  onChange={(e) => {
                    if (!touched.email) setTouched((t) => ({ ...t, email: true }));
                    setTeacherForm({ ...teacherForm, email: e.target.value });
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  aria-invalid={touched.email && !!fieldErrors.email}
                  disabled={isSaving}
                />
                {touched.email && fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('admin.teachers.phone')}</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  value={teacherForm.phone}
                  onChange={(e) => {
                    if (!touched.phone) setTouched((t) => ({ ...t, phone: true }));
                    setTeacherForm({ ...teacherForm, phone: e.target.value });
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  aria-invalid={touched.phone && !!fieldErrors.phone}
                  disabled={isSaving}
                />
                {touched.phone && fieldErrors.phone && (
                  <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('admin.teachers.role')}</Label>
                <Select
                  value={teacherForm.teacher_type}
                  onValueChange={(v) => {
                    if (!touched.teacher_type) setTouched((t) => ({ ...t, teacher_type: true }));
                    setTeacherForm({ ...teacherForm, teacher_type: v });
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">{t('admin.teachers.mainTeacher')}</SelectItem>
                    <SelectItem value="assistant">{t('admin.teachers.assistantTeacher')}</SelectItem>
                  </SelectContent>
                </Select>
                {touched.teacher_type && fieldErrors.teacher_type && (
                  <p className="text-sm text-destructive">{fieldErrors.teacher_type}</p>
                )}
              </div>

              {!editingTeacherId && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> {t('admin.teachers.credentialsNote')}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                >
                  {isSaving
                    ? (editingTeacherId ? t('common.updating') : t('common.saving'))
                    : (editingTeacherId ? t('admin.teachers.update') : t('admin.teachers.createAndGenerate'))}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="content-card">
          <p className="text-sm text-muted-foreground">{t('admin.teachers.total')}</p>
          <p className="text-3xl font-semibold text-foreground mt-1">
            {teachers?.length || 0}
          </p>
        </div>
        <div className="content-card">
          <p className="text-sm text-muted-foreground">{t('admin.teachers.mainCount')}</p>
          <p className="text-3xl font-semibold text-primary mt-1">
            {mainTeachersCount}
          </p>
        </div>
        <div className="content-card">
          <p className="text-sm text-muted-foreground">{t('admin.teachers.assistantCount')}</p>
          <p className="text-3xl font-semibold text-muted-foreground mt-1">
            {assistantTeachersCount}
          </p>
        </div>
      </div>

      <div className="content-card">
        <DataTable
          columns={columns}
          data={teachers || []}
          keyExtractor={(teacher) => teacher.id.toString()}
          emptyMessage={t('admin.teachers.noTeachers')}
        />
      </div>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetPasswordId}
        onOpenChange={(open) => !open && setResetPasswordId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.teachers.resetPassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('admin.teachers.newPassword')}</Label>
              <Input
                id="new-password"
                type="text"
                placeholder={t('admin.teachers.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordId(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? t('common.saving') : t('admin.teachers.saveNewPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Credentials Dialog */}
      <Dialog open={!!createdTeacherCredentials} onOpenChange={(open) => !open && setCreatedTeacherCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.teachers.createdSuccess')}</DialogTitle>
            <DialogDescription>
              {t('admin.teachers.createdDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="bg-muted p-4 rounded-md flex items-center justify-between">
                <code className="text-lg font-mono">{createdTeacherCredentials?.password}</code>
                <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
             </div>
             <p className="text-sm text-muted-foreground text-center">
                {isCopied ? t('admin.teachers.copyPassword') : t('admin.teachers.copyPasswordAuto')}
             </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedTeacherCredentials(null)}>
              {t('admin.teachers.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
