import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useTranslation } from "react-i18next";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

interface PaymentListItem {
  id: number;
  student_name: string;
  group_name: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  days_remaining: number | null;
  status: string; // "Active" | "Expired" | etc
}

interface PaymentStats {
  active_payments: number;
  expired_payments: number;
  expiring_soon: number;
}

export function AdminPayments() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentListItem | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["adminPayments"],
    queryFn: async () => {
      const response = await api.get<PaymentListItem[]>("/admin/payments");
      return response.data;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminPaymentStats"],
    queryFn: async () => {
      const response = await api.get<PaymentStats>("/admin/payments/stats");
      return response.data;
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (payload: { id: number; start_date: string; end_date: string }) => {
      await api.put(`/admin/payments/${payload.id}`, {
        start_date: payload.start_date,
        end_date: payload.end_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPayments"] });
      queryClient.invalidateQueries({ queryKey: ["adminPaymentStats"] });
      toast({ title: t("common.success"), description: t("admin.payments.updateSuccess") });
      setIsUpdateOpen(false);
      setEditingPayment(null);
      setStartDate("");
      setEndDate("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.payments.updateError"),
      });
    },
  });

  const enrolledPayments = useMemo(() => payments ?? [], [payments]);

  const columns = [
    {
      key: 'avatar',
      header: '',
      render: (p: PaymentListItem) => (
        <Avatar className="w-10 h-10">
          <AvatarImage src={undefined} alt={p.student_name} />
          <AvatarFallback>{p.student_name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
      ),
      className: 'w-14',
    },
    {
      key: 'name',
      header: t("admin.payments.allStudents"),
      render: (p: PaymentListItem) => (
        <div>
          <span className="font-medium text-foreground">{p.student_name}</span>
          <p className="text-sm text-muted-foreground">{p.group_name || "-"}</p>
        </div>
      ),
    },
    {
      key: 'paymentPeriod',
      header: t("admin.payments.paymentPeriod"),
      render: (p: PaymentListItem) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>
            {p.start_date && p.end_date
              ? `${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}`
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'daysRemaining',
      header: t("admin.payments.daysRemaining"),
      render: (p: PaymentListItem) => {
        if (p.days_remaining === null || p.days_remaining === undefined) return <span>-</span>;
        if (p.days_remaining < 0) {
          return <span className="text-destructive font-medium">{t("admin.payments.overdue", { count: Math.abs(p.days_remaining) })}</span>;
        }
        if (p.days_remaining <= 7) {
          return <span className="text-warning font-medium">{t("admin.payments.daysLeft", { count: p.days_remaining })}</span>;
        }
        return <span className="text-success">{t("admin.payments.daysLeft", { count: p.days_remaining })}</span>;
      },
    },
    {
      key: 'status',
      header: t("common.status"),
      render: (p: PaymentListItem) => {
        const normalized = (p.status || "").toLowerCase();
        const isExpired = normalized === "expired" || normalized === "blocked";
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={p.status} />
            {isExpired && <span className="text-xs text-destructive">{t("admin.payments.contentBlocked")}</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (p: PaymentListItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingPayment(p);
            setStartDate(p.start_date || "");
            setEndDate(p.end_date || "");
            setIsUpdateOpen(true);
          }}
        >
          {t("admin.payments.updatePayment")}
        </Button>
      ),
    },
  ];

  const handleCloseUpdate = (open: boolean) => {
    setIsUpdateOpen(open);
    if (!open) {
      setEditingPayment(null);
      setStartDate("");
      setEndDate("");
    }
  };

  const handleSave = () => {
    if (!editingPayment) return;
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: t("admin.payments.validationError"),
        description: t("admin.payments.datesRequired"),
      });
      return;
    }
    updatePaymentMutation.mutate({
      id: editingPayment.id,
      start_date: startDate,
      end_date: endDate,
    });
  };

  if (paymentsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t("admin.payments.title")}</h1>
        <p className="page-subtitle">{t("admin.payments.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="content-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.payments.activePayments")}</p>
              <p className="text-2xl font-semibold text-foreground">{stats?.active_payments ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="content-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.payments.expiredBlocked")}</p>
              <p className="text-2xl font-semibold text-foreground">{stats?.expired_payments ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="content-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.payments.expiringSoon")}</p>
              <p className="text-2xl font-semibold text-foreground">
                {stats?.expiring_soon ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expired Students Alert */}
      {(stats?.expired_payments ?? 0) > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">
                {t("admin.payments.expiredAlert", { count: stats?.expired_payments ?? 0 })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.payments.expiredAlertDesc")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="content-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("admin.payments.allStudents")}</h2>
        <DataTable
          columns={columns}
          data={enrolledPayments}
          keyExtractor={(p) => p.id.toString()}
          emptyMessage={t("admin.payments.noStudents")}
        />
      </div>

      <Dialog open={isUpdateOpen} onOpenChange={handleCloseUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.payments.updatePeriod")}</DialogTitle>
          </DialogHeader>

          {editingPayment && (
            <div className="pt-4 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={undefined} alt={editingPayment.student_name} />
                  <AvatarFallback>{editingPayment.student_name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{editingPayment.student_name}</p>
                  <p className="text-sm text-muted-foreground">{editingPayment.group_name || "-"}</p>
                  <StatusBadge status={editingPayment.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.payments.startDate")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.payments.endDate")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleCloseUpdate(false)}
                  disabled={updatePaymentMutation.isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={updatePaymentMutation.isPending}>
                  {updatePaymentMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}