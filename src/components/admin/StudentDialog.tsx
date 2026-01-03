import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

const studentSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().regex(/^\d{12}$/, "Phone number must be exactly 12 digits"),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email("Invalid email").optional()
  ),
  payment_expiry: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
      .optional()
  ),
  avatar_url: z.string().optional(),
  status: z.string().optional(),
});

interface StudentFormData {
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  payment_expiry?: string;
  status?: string;
}

interface CreateStudentResponse {
  message: string;
  student: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    status: string;
    payment_expiry?: string;
  };
  password: string;
}

interface StudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: any | null; // Pass student object if editing
}

export function StudentDialog({
  isOpen,
  onClose,
  studentToEdit,
}: StudentDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    payment_expiry: "",
    status: "NEW_STUDENT",
  });
  
  const [createdCredentials, setCreatedCredentials] = useState<{password: string} | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [touched, setTouched] = useState<{
    name: boolean;
    phone: boolean;
    email: boolean;
    payment_expiry: boolean;
    status: boolean;
  }>({
    name: false,
    phone: false,
    email: false,
    payment_expiry: false,
    status: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        name: studentToEdit.name || studentToEdit.full_name,
        email: studentToEdit.email,
        phone: studentToEdit.phone,
        avatar_url: studentToEdit.avatar_url || studentToEdit.avatar || "",
        payment_expiry: studentToEdit.payment_expiry ? new Date(studentToEdit.payment_expiry).toISOString().split('T')[0] : "",
        status: studentToEdit.status,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        avatar_url: "",
        payment_expiry: "",
        status: "NEW_STUDENT",
      });
    }
    setTouched({
      name: false,
      phone: false,
      email: false,
      payment_expiry: false,
      status: false,
    });
  }, [studentToEdit, isOpen]);

  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const response = await api.post<CreateStudentResponse>("/admin/students", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["newStudents"] }); // Refresh new students list too
      
      setCreatedCredentials({ password: data.password });
      
      navigator.clipboard.writeText(data.password).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: t('common.success'),
          description: t('admin.students.createSuccess'),
        });
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('admin.students.createError'),
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      await api.put(`/admin/students/${studentToEdit.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["newStudents"] });
      handleClose();
      toast({
        title: t('common.success'),
        description: t('admin.students.updateSuccess'),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('admin.students.updateError'),
      });
    },
  });

  const validation = useMemo(() => studentSchema.safeParse(formData), [formData]);
  const fieldErrors = useMemo(() => {
    if (validation.success) {
      return { name: "", phone: "", email: "", payment_expiry: "", status: "" };
    }
    const msg = (field: string) => validation.error.issues.find((i) => i.path[0] === field)?.message ?? "";
    return {
      name: msg("name"),
      phone: msg("phone"),
      email: msg("email"),
      payment_expiry: msg("payment_expiry"),
      status: msg("status"),
    };
  }, [validation]);

  const isFormValid = validation.success;
  const isSaving = createStudentMutation.isPending || updateStudentMutation.isPending;
  const isSubmitDisabled = isSaving || !isFormValid;

  const handleSubmit = () => {
    if (!isFormValid) {
      setTouched({
        name: true,
        phone: true,
        email: true,
        payment_expiry: true,
        status: true,
      });
      toast({
        variant: "destructive",
        title: t('admin.groups.validationError'),
        description: t('admin.groups.fixFields'),
      });
      return;
    }

    if (studentToEdit) {
      updateStudentMutation.mutate(formData);
    } else {
      createStudentMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    setCreatedCredentials(null);
    onClose();
  };

  const copyToClipboard = () => {
    if (createdCredentials) {
        navigator.clipboard.writeText(createdCredentials.password).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast({
                title: t('admin.students.copyPassword'),
                description: t('admin.students.copyPasswordAuto'),
            });
        });
    }
  };

  if (createdCredentials) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.students.createdSuccess')}</DialogTitle>
            <DialogDescription>
              {t('admin.students.createdDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="bg-muted p-4 rounded-md flex items-center justify-between">
                <code className="text-lg font-mono">{createdCredentials.password}</code>
                <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
             </div>
             <p className="text-sm text-muted-foreground text-center">
                {isCopied ? t('admin.students.copyPassword') : t('admin.students.copyPasswordAuto')}
             </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>
              {t('common.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{studentToEdit ? t('admin.students.edit') : t('admin.students.new')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('admin.newStudents.fullName')}</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => {
                if (!touched.name) setTouched((t) => ({ ...t, name: true }));
                setFormData({ ...formData, name: e.target.value });
              }}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={touched.name && !!fieldErrors.name}
              disabled={isSaving}
            />
            {touched.name && fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input
                id="phone"
                placeholder="998901234567"
                inputMode="numeric"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => {
                  if (!touched.phone) setTouched((t) => ({ ...t, phone: true }));
                  setFormData({ ...formData, phone: e.target.value });
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
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => {
                  if (!touched.email) setTouched((t) => ({ ...t, email: true }));
                  setFormData({ ...formData, email: e.target.value });
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={touched.email && !!fieldErrors.email}
                disabled={isSaving}
              />
              {touched.email && fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_expiry">{t('admin.students.paymentExpiryOptional')}</Label>
            <Input
              id="payment_expiry"
              type="date"
              value={formData.payment_expiry}
              onChange={(e) => {
                if (!touched.payment_expiry) setTouched((t) => ({ ...t, payment_expiry: true }));
                setFormData({ ...formData, payment_expiry: e.target.value });
              }}
              onBlur={() => setTouched((t) => ({ ...t, payment_expiry: true }))}
              aria-invalid={touched.payment_expiry && !!fieldErrors.payment_expiry}
              disabled={isSaving}
            />
            {touched.payment_expiry && fieldErrors.payment_expiry && (
              <p className="text-sm text-destructive">{fieldErrors.payment_expiry}</p>
            )}
          </div>
          
          {studentToEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">{t('common.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  if (!touched.status) setTouched((t) => ({ ...t, status: true }));
                  setFormData({ ...formData, status: value });
                }}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.students.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_STUDENT">New Student</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitDisabled}
          >
            {isSaving ? t('common.saving') : (studentToEdit ? t('common.save') : t('common.save'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

