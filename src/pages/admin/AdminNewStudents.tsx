import { useMemo, useState } from "react";
import { UserPlus, Check, Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StudentDialog } from '@/components/admin/StudentDialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from "react-i18next";
import api from '@/lib/axios';
import { z } from "zod";

const activateSchema = z.object({
  studentId: z.number().positive("Student is required"),
  groupId: z.string().min(1, "Group is required"),
  level: z.string().min(1, "Level is required"),
});

interface NewStudent {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  avatar_url?: string;
}

interface NewStudentsResponse {
  new_students: NewStudent[];
  students_without_group: NewStudent[];
}

interface GroupListItem {
  id: number;
  name: string;
  level: string;
  student_count: string;
}

export function AdminNewStudents() {
  const { t } = useTranslation();
  const [selectedStudent, setSelectedStudent] = useState<NewStudent | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [activateTouched, setActivateTouched] = useState<{ group: boolean }>({ group: false });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['newStudents'],
    queryFn: async () => {
      const response = await api.get<NewStudentsResponse>('/admin/new-students');
      return response.data;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['adminGroups'],
    queryFn: async () => {
      const response = await api.get<GroupListItem[]>('/admin/groups');
      return response.data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ studentId, groupId, level }: { studentId: number; groupId: number; level: string }) => {
      await api.post('/admin/activate-student', {
        student_id: studentId,
        group_id: groupId,
        level: level,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminGroups'] });
      setIsActivateOpen(false);
      setSelectedStudent(null);
      setSelectedGroupId('');
      setSelectedLevel('');
      toast({
        title: t("admin.newStudents.activateSuccess"),
        description: t("admin.newStudents.activateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.newStudents.activateError"),
      });
    },
  });

  const activateValidation = useMemo(() => {
    return activateSchema.safeParse({
      studentId: selectedStudent?.id ?? 0,
      groupId: selectedGroupId,
      level: selectedLevel,
    });
  }, [selectedStudent, selectedGroupId, selectedLevel]);

  const activateErrors = useMemo(() => {
    if (activateValidation.success) return { group: "" };
    const groupMsg = activateValidation.error.issues.find((i) => i.path[0] === "groupId")?.message ?? "";
    return { group: groupMsg };
  }, [activateValidation]);

  const isActivateValid = activateValidation.success;
  const isActivating = activateMutation.isPending;
  const isActivateDisabled = !isActivateValid || isActivating;

  const handleActivate = () => {
    if (!isActivateValid) {
      setActivateTouched({ group: true });
      toast({
        variant: "destructive",
        title: t("admin.newStudents.validationError"),
        description: t("admin.newStudents.fixFields"),
      });
      return;
    }
    activateMutation.mutate({
      studentId: selectedStudent!.id,
      groupId: Number(selectedGroupId),
      level: selectedLevel,
    });
  };

  const handleGroupChange = (groupId: string) => {
    if (!activateTouched.group) setActivateTouched({ group: true });
    setSelectedGroupId(groupId);
    const selectedGroup = groups?.find(g => g.id.toString() === groupId);
    if (selectedGroup) {
      setSelectedLevel(selectedGroup.level);
    } else {
      setSelectedLevel('');
    }
  };

  const newStudents = studentsData?.new_students || [];

  const columns = [
    {
      key: 'avatar',
      header: '',
      render: (student: NewStudent) => (
        <Avatar className="w-10 h-10">
          <AvatarImage src={student.avatar_url} alt={student.full_name} />
          <AvatarFallback>{student.full_name?.charAt(0) || 'S'}</AvatarFallback>
        </Avatar>
      ),
      className: 'w-14',
    },
    {
      key: 'name',
      header: t("admin.newStudents.fullName"),
      render: (student: NewStudent) => (
        <div>
          <span className="font-medium text-foreground">{student.full_name}</span>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: t("common.phone"),
    },
    {
      key: 'created_at',
      header: t("admin.newStudents.registrationDate"),
      render: (student: NewStudent) => (
        <span>{new Date(student.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'status',
      header: t("common.status"),
      render: () => <StatusBadge status="NEW_STUDENT" />,
    },
    {
      key: 'actions',
      header: '',
      render: (student: NewStudent) => (
        <Button 
          className="gap-2" 
          size="sm"
          onClick={() => {
            setSelectedStudent(student);
            setIsActivateOpen(true);
            setSelectedGroupId("");
            setSelectedLevel("");
            setActivateTouched({ group: false });
          }}
        >
          <UserPlus className="w-4 h-4" />
          {t("admin.newStudents.activate")}
        </Button>
      ),
    },
  ];

  if (studentsLoading) {
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
          <h1 className="page-title">{t("admin.newStudents.title")}</h1>
          <p className="page-subtitle">{t("admin.newStudents.subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={() => setIsStudentDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("admin.newStudents.add")}
        </Button>
      </div>

      {/* Info Banner */}
      {newStudents.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t("admin.newStudents.waitingCount", { count: newStudents.length })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("admin.newStudents.bannerDesc")}
            </p>
          </div>
        </div>
      )}

      <div className="content-card">
        <DataTable
          columns={columns}
          data={newStudents}
          keyExtractor={(student) => student.id.toString()}
          emptyMessage={t("admin.newStudents.noNewStudents")}
        />
      </div>

      {/* Activate Dialog */}
      <Dialog open={isActivateOpen} onOpenChange={(open) => {
          if (isActivating) return;
          setIsActivateOpen(open);
          if (!open) {
              setSelectedGroupId('');
              setSelectedLevel('');
              setSelectedStudent(null);
              setActivateTouched({ group: false });
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.newStudents.activateStudent")}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedStudent.avatar_url} alt={selectedStudent.full_name} />
                  <AvatarFallback>{selectedStudent.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{selectedStudent.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("admin.newStudents.selectGroup")}
                  </label>
                  <Select
                    value={selectedGroupId}
                    onValueChange={handleGroupChange}
                    disabled={isActivating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.newStudents.chooseGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      {!groups || groups.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t("admin.newStudents.noGroupsAvailable")}
                        </div>
                      ) : (
                        groups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{group.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({group.level} • {group.student_count} {t("admin.groups.students").toLowerCase()})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {activateTouched.group && activateErrors.group && (
                    <p className="text-sm text-destructive">{activateErrors.group}</p>
                  )}
                </div>

                {selectedLevel && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {t("admin.newStudents.groupLevel")} <span className="font-semibold text-foreground">{selectedLevel}</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsActivateOpen(false)}
                    disabled={isActivating}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    onClick={handleActivate}
                    disabled={isActivateDisabled}
                    className="gap-2"
                  >
                    {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t("admin.newStudents.activateStudent")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StudentDialog
        isOpen={isStudentDialogOpen}
        onClose={() => setIsStudentDialogOpen(false)}
      />
    </div>
  );
}
