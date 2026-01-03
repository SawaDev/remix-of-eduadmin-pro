import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  Calendar, 
  Award,
  UserPlus,
  CreditCard,
  Settings,
  LogOut,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface NavItem {
  label: string;
  translationKey: string;
  path: string;
  icon: React.ElementType;
}

const teacherNavItems: NavItem[] = [
  { label: 'Dashboard', translationKey: 'nav.dashboard', path: '/teacher', icon: LayoutDashboard },
  { label: 'My Groups', translationKey: 'nav.myGroups', path: '/teacher/groups', icon: Users },
  { label: 'Assignments', translationKey: 'nav.assignments', path: '/teacher/assignments', icon: ClipboardList },
  { label: 'Attendance', translationKey: 'nav.attendance', path: '/teacher/attendance', icon: Calendar },
  { label: 'Grades', translationKey: 'nav.grades', path: '/teacher/grades', icon: Award },
];

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', translationKey: 'nav.dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Groups', translationKey: 'nav.groups', path: '/admin/groups', icon: Users },
  { label: 'New Students', translationKey: 'nav.newStudents', path: '/admin/new-students', icon: UserPlus },
  { label: 'Students', translationKey: 'nav.students', path: '/admin/students', icon: GraduationCap },
  { label: 'Teachers', translationKey: 'nav.teachers', path: '/admin/teachers', icon: BookOpen },
  { label: 'Payments', translationKey: 'nav.payments', path: '/admin/payments', icon: CreditCard },
  // { label: 'Settings', translationKey: 'nav.settings', path: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  
  const navItems = user?.role === 'Admin' ? adminNavItems : teacherNavItems;
  const basePath = user?.role === 'Admin' ? '/admin' : '/teacher';
  const panelTitle = user?.role === 'Admin' ? t('nav.adminPanel') : t('nav.teacherPanel');

  const isActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">LMS Admin</h1>
            <p className="text-xs text-muted-foreground capitalize">{panelTitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'nav-item',
              isActive(item.path) && 'nav-item-active'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{t(item.translationKey)}</span>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
