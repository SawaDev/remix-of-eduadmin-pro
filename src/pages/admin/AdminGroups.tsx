import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Eye, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { z } from "zod";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  level: z.string().trim().min(1, "Level is required"),
  main_teacher_id: z.string().trim().min(1, "Main teacher is required"),
  assistant_teacher_id: z.string().optional(),
});

interface GroupListItem {
  id: number;
  name: string;
  main_teacher: string;
  assistant_teacher: string;
  student_count: string;
}

interface Teacher {
  id: number;
  full_name: string;
}

interface TeacherResponse {
  teachers: Teacher[];
  assistants: Teacher[];
}

interface LevelOption {
  id: number;
  name: string;
  description?: string;
}

interface GroupFormData {
  name: string;
  level: string;
  main_teacher_id: string;
  assistant_teacher_id: string;
}

interface GroupDetail {
  id: number;
  name: string;
  level?: string;
  main_teacher: { id: number; name: string; avatar: string } | null;
  assistant_teacher: { id: number; name: string; avatar: string } | null;
  students: any[];
}

export function AdminGroups() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormData>({
    name: "",
    level: "",
    main_teacher_id: "",
    assistant_teacher_id: "",
  });
  const [touched, setTouched] = useState<{
    name: boolean;
    level: boolean;
    main_teacher_id: boolean;
    assistant_teacher_id: boolean;
  }>({
    name: false,
    level: false,
    main_teacher_id: false,
    assistant_teacher_id: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["adminGroups"],
    queryFn: async () => {
      const response = await api.get<GroupListItem[]>("/admin/groups");
      return response.data;
    },
  });

  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ["adminLevels"],
    queryFn: async () => {
      const response = await api.get<LevelOption[]>("/admin/levels");
      return response.data;
    },
    enabled: isDialogOpen, // fetch when dialog is open (create/edit)
  });

  const { data: teachersData } = useQuery({
    queryKey: ["adminTeachers"],
    queryFn: async () => {
      const response = await api.get<TeacherResponse>(
        "/admin/teacher-and-assistants"
      );
      return response.data;
    },
    enabled: isDialogOpen, // Fetch only when dialog is open
  });

  // Fetch group details when editing
  const { data: groupDetail } = useQuery({
    queryKey: ["adminGroupDetail", editingGroupId],
    queryFn: async () => {
      const response = await api.get<GroupDetail>(
        `/admin/groups/${editingGroupId}`
      );
      return response.data;
    },
    enabled: !!editingGroupId && isDialogOpen,
  });

  useEffect(() => {
    if (editingGroupId && groupDetail) {
      setGroupForm({
        name: groupDetail.name,
        level: groupDetail.level || "",
        main_teacher_id: groupDetail.main_teacher?.id.toString() || "",
        assistant_teacher_id:
          groupDetail.assistant_teacher?.id.toString() || "",
      });
      setTouched({
        name: false,
        level: false,
        main_teacher_id: false,
        assistant_teacher_id: false,
      });
    } else if (!editingGroupId) {
      // Reset form when creating new
      setGroupForm({
        name: "",
        level: "",
        main_teacher_id: "",
        assistant_teacher_id: "",
      });
      setTouched({
        name: false,
        level: false,
        main_teacher_id: false,
        assistant_teacher_id: false,
      });
    }
  }, [editingGroupId, groupDetail, isDialogOpen]);

  const validation = useMemo(
    () => groupSchema.safeParse(groupForm),
    [groupForm]
  );
  const fieldErrors = useMemo(() => {
    if (validation.success) {
      return {
        name: "",
        level: "",
        main_teacher_id: "",
        assistant_teacher_id: "",
      };
    }
    const msg = (field: keyof GroupFormData) =>
      validation.error.issues.find((i) => i.path[0] === field)?.message ?? "";
    return {
      name: msg("name"),
      level: msg("level"),
      main_teacher_id: msg("main_teacher_id"),
      assistant_teacher_id: msg("assistant_teacher_id"),
    };
  }, [validation]);

  const isFormValid = validation.success;

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      await api.post("/admin/groups", {
        ...data,
        main_teacher_id: Number(data.main_teacher_id),
        assistant_teacher_id: data.assistant_teacher_id
          ? Number(data.assistant_teacher_id)
          : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGroups"] });
      closeDialog();
      toast({ title: t("common.success"), description: t("admin.groups.createSuccess") });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.groups.createError"),
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      await api.put(`/admin/groups/${editingGroupId}`, {
        ...data,
        main_teacher_id: Number(data.main_teacher_id),
        assistant_teacher_id: data.assistant_teacher_id
          ? Number(data.assistant_teacher_id)
          : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGroups"] });
      queryClient.invalidateQueries({
        queryKey: ["adminGroupDetail", editingGroupId],
      });
      closeDialog();
      toast({ title: t("common.success"), description: t("admin.groups.updateSuccess") });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.groups.updateError"),
      });
    },
  });

  const isSaving =
    createGroupMutation.isPending || updateGroupMutation.isPending;
  const isSubmitDisabled = !isFormValid || isSaving;

  const handleSubmit = () => {
    if (!isFormValid) {
      setTouched({
        name: true,
        level: true,
        main_teacher_id: true,
        assistant_teacher_id: true,
      });
      toast({
        variant: "destructive",
        title: t("admin.groups.validationError"),
        description: t("admin.groups.fixFields"),
      });
      return;
    }

    if (editingGroupId) {
      updateGroupMutation.mutate(groupForm);
    } else {
      createGroupMutation.mutate(groupForm);
    }
  };

  const openCreateDialog = () => {
    setEditingGroupId(null);
    setGroupForm({
      name: "",
      level: "",
      main_teacher_id: "",
      assistant_teacher_id: "",
    });
    setTouched({
      name: false,
      level: false,
      main_teacher_id: false,
      assistant_teacher_id: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    setEditingGroupId(id);
    // Form will be populated by useEffect when data is fetched
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingGroupId(null);
  };

  const columns = [
    {
      key: "name",
      header: t("admin.groups.name"),
      render: (group: GroupListItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-foreground">{group.name}</span>
        </div>
      ),
    },
    {
      key: "students",
      header: t("admin.groups.students"),
      render: (group: GroupListItem) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{group.student_count}</span>
        </div>
      ),
    },
    {
      key: "main_teacher",
      header: t("admin.groups.mainTeacher"),
      render: (group: GroupListItem) => (
        <span>{group.main_teacher || "-"}</span>
      ),
    },
    {
      key: "assistant_teacher",
      header: t("admin.groups.assistant"),
      render: (group: GroupListItem) => (
        <span className="text-muted-foreground">
          {group.assistant_teacher || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (group: GroupListItem) => (
        <div className="flex gap-2">
          <Link to={`/admin/groups/${group.id}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="w-4 h-4" />
              {t("common.view")}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => openEditDialog(group.id)}
          >
            <Pencil className="w-4 h-4" />
            {t("common.edit")}
          </Button>
        </div>
      ),
    },
  ];

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("admin.groups.title")}</h1>
          <p className="page-subtitle">{t("admin.groups.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
              {t("admin.groups.create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroupId ? t("admin.groups.edit") : t("admin.groups.new")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.groups.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("admin.groups.placeholderName")}
                  value={groupForm.name}
                  onChange={(e) => {
                    if (!touched.name)
                      setTouched((t) => ({ ...t, name: true }));
                    setGroupForm({ ...groupForm, name: e.target.value });
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  aria-invalid={touched.name && !!fieldErrors.name}
                  disabled={!!isSaving}
                />
                {touched.name && fieldErrors.name && (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">{t("admin.groups.level")}</Label>
                <Select
                  value={groupForm.level}
                  onValueChange={(value) => {
                    if (!touched.level)
                      setTouched((t) => ({ ...t, level: true }));
                    setGroupForm({ ...groupForm, level: value });
                  }}
                  disabled={!!isSaving}
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
                {touched.level && fieldErrors.level && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.level}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainTeacher">{t("admin.groups.mainTeacher")}</Label>
                <Select
                  value={groupForm.main_teacher_id}
                  onValueChange={(value) => {
                    if (!touched.main_teacher_id)
                      setTouched((t) => ({ ...t, main_teacher_id: true }));
                    setGroupForm({ ...groupForm, main_teacher_id: value });
                  }}
                  disabled={!!isSaving}
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
                {touched.main_teacher_id && fieldErrors.main_teacher_id && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.main_teacher_id}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistantTeacher">
                  {t("admin.groups.assistantTeacher")}
                </Label>
                <Select
                  value={groupForm.assistant_teacher_id}
                  onValueChange={(value) =>
                    setGroupForm({
                      ...groupForm,
                      assistant_teacher_id: value === "none" ? "" : value,
                    })
                  }
                  disabled={!!isSaving}
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
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  disabled={!!isSaving}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                  {isSaving
                    ? editingGroupId
                      ? t("admin.groups.updating")
                      : t("admin.groups.creating")
                    : editingGroupId
                    ? t("admin.groups.update")
                    : t("admin.groups.create")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="content-card">
        <DataTable
          columns={columns}
          data={groups || []}
          keyExtractor={(group) => group.id.toString()}
          emptyMessage={t("admin.groups.noGroups")}
        />
      </div>
    </div>
  );
}
