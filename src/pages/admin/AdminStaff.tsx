import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Mail,
  Clock,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAdmin, type AdminStaff, type AdminPermission } from '@/contexts/AdminContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from '@/hooks/use-toast';

const roleConfig = {
  super_admin: { label: 'Super Admin', icon: ShieldAlert, color: 'bg-foreground/10 text-foreground' },
  manager: { label: 'Manager', icon: ShieldCheck, color: 'bg-muted text-muted-foreground' },
  editor: { label: 'Editor', icon: Shield, color: 'bg-muted text-muted-foreground' },
  support: { label: 'Support', icon: ShieldX, color: 'bg-muted text-muted-foreground' },
};

const allPermissions: { id: AdminPermission['id']; label: string }[] = [
  { id: 'manage_products', label: 'Manage Products' },
  { id: 'manage_orders', label: 'Manage Orders' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_staff', label: 'Manage Staff' },
  { id: 'view_reports', label: 'View Reports' },
  { id: 'manage_settings', label: 'Manage Settings' },
  { id: 'manage_cms', label: 'Manage CMS' },
  { id: 'manage_marketing', label: 'Manage Marketing' },
];

const AdminStaffPage = () => {
  const { staffMembers, removeStaffMember, updateStaffMember, addStaffMember } = useAdmin();
  const { isDemoMode, simulateAction, blockAction } = useDemoMode();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'editor' as AdminStaff['role'] });

  const roleIcon = (role: AdminStaff['role']) => {
    const config = roleConfig[role];
    const Icon = config.icon;
    return (
      <div className={`p-1.5 rounded-lg ${config.color}`}>
        <Icon size={14} />
      </div>
    );
  };

  const handleTogglePermission = (staffId: string, permissionId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;
    const updatedPermissions = staff.permissions.map(p =>
      p.id === permissionId ? { ...p, granted: !p.granted } : p
    );
    if (isDemoMode) {
      simulateAction('updatePermission', 300, () => {
        updateStaffMember(staffId, { permissions: updatedPermissions });
        toast({ title: 'Permission Updated', description: 'Demo Mode: Local state updated.' });
      });
      return;
    }
    updateStaffMember(staffId, { permissions: updatedPermissions });
  };

  const handleAddStaff = () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    
    const staffPayload = {
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role as AdminStaff['role'],
      lastActive: new Date().toISOString(),
      permissions: allPermissions.map(p => ({
        id: p.id,
        label: p.label,
        granted: newStaff.role === 'super_admin' || ['editor', 'support'].includes(newStaff.role) ? p.id === 'manage_products' || p.id === 'view_reports' : true,
      })),
    };

    if (isDemoMode) {
      simulateAction('addStaff', 500, () => {
        addStaffMember(staffPayload);
        setNewStaff({ name: '', email: '', role: 'editor' });
        setShowAddForm(false);
        toast({ title: 'Staff Added (Simulated)', description: 'Demo Mode: Staff added to local state.' });
      });
      return;
    }

    addStaffMember(staffPayload);
    setNewStaff({ name: '', email: '', role: 'editor' });
    setShowAddForm(false);
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage team members and their permissions</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Add Staff
          </motion.button>
        </motion.div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staffMembers.map((staff, i) => {
            const grantedCount = staff.permissions.filter(p => p.granted).length;
            const RoleIcon = roleConfig[staff.role].icon;
            return (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                layout
                className="bg-card border border-border rounded-xl overflow-hidden group"
              >
                <div className="p-5 border-b border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{staff.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail size={10} />
                          {staff.email}
                        </p>
                      </div>
                    </div>
                    <div className={`p-1.5 rounded-lg ${roleConfig[staff.role].color}`}>
                      <RoleIcon size={14} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      {roleConfig[staff.role].label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      {grantedCount}/{allPermissions.length} permissions
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  {allPermissions.map((perm) => {
                    const staffPerm = staff.permissions.find(p => p.id === perm.id);
                    const granted = staffPerm?.granted ?? false;
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-xs text-muted-foreground">{perm.label}</span>
                        <button
                          onClick={() => handleTogglePermission(staff.id, perm.id)}
                          className={`transition-all ${
                            granted ? 'text-foreground' : 'text-muted-foreground/30'
                          }`}
                        >
                          {granted ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {staff.lastActive ? new Date(staff.lastActive).toLocaleDateString() : 'Never'}
                  </span>
                  <button
                    onClick={() => {
                      if (isDemoMode) {
                        blockAction('deleteStaff');
                      } else {
                        removeStaffMember(staff.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add Staff Modal */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
              onClick={() => setShowAddForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Add Staff Member</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
                    <input
                      type="text"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    >
                      <option value="editor">Editor</option>
                      <option value="manager">Manager</option>
                      <option value="support">Support</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddStaff}
                      className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                    >
                      Add Member
                    </motion.button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 h-10 bg-muted text-muted-foreground rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffPage;
