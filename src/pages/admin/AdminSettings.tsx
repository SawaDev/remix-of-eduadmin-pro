import { Settings, Bell, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';

export function AdminSettings() {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('admin.settings.title')}</h1>
        <p className="page-subtitle">{t('admin.settings.subtitle')}</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* General Settings */}
        <div className="content-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('admin.settings.general')}</h2>
              <p className="text-sm text-muted-foreground">{t('admin.settings.generalDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">{t('admin.settings.platformName')}</Label>
              <Input id="platformName" defaultValue="English Learning Platform" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxGroupSize">{t('admin.settings.maxGroupSize')}</Label>
              <Input id="maxGroupSize" type="number" defaultValue="20" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="content-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('admin.settings.notifications')}</h2>
              <p className="text-sm text-muted-foreground">{t('admin.settings.notificationsDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('admin.settings.newRegistration')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.settings.newRegistrationDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('admin.settings.paymentExpiry')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.settings.paymentExpiryDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('admin.settings.lowAttendance')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.settings.lowAttendanceDesc')}</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="content-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('admin.settings.security')}</h2>
              <p className="text-sm text-muted-foreground">{t('admin.settings.securityDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('admin.settings.autoBlock')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.settings.autoBlockDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('admin.settings.twoFactor')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.settings.twoFactorDesc')}</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="content-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('admin.settings.data')}</h2>
              <p className="text-sm text-muted-foreground">{t('admin.settings.dataDesc')}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">{t('admin.settings.exportStudents')}</Button>
            <Button variant="outline">{t('admin.settings.exportGroups')}</Button>
            <Button variant="outline">{t('admin.settings.exportAttendance')}</Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button>{t('common.save')}</Button>
        </div>
      </div>
    </div>
  );
}
