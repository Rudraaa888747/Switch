import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  Calendar,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';


interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  orderCount?: number;
  reviewCount?: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase.rpc('get_admin_user_stats');

      if (error) throw error;

      const parsedUsers = typeof usersData === 'string' ? JSON.parse(usersData) : usersData;
      
      setUsers(parsedUsers || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const searchValue = searchQuery.toLowerCase();
    const displayName = (user.display_name || 'Anonymous User').toLowerCase();
    const userId = (user.user_id || '').toLowerCase();
    return displayName.includes(searchValue) || userId.includes(searchValue);
  });

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-1">Users</h1>
          <p className="text-muted-foreground">View and manage registered users</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">
              {users.filter(u => u.orderCount && u.orderCount > 0).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Customers</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">
              {users.filter(u => {
                const created = new Date(u.created_at);
                const now = new Date();
                const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">New This Week</p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="input-premium pl-11 w-full"
            />
          </div>
        </motion.div>

        {/* Users Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="admin-glass-card rounded-3xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {user.display_name || 'Anonymous User'}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                  <div className="text-center">
                    <p className="font-bold">{user.orderCount}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{user.reviewCount}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
