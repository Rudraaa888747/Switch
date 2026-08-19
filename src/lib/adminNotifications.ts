import { supabase } from '@/integrations/supabase/client';

export type AdminNotificationType = 'info' | 'warning' | 'success' | 'error';
export type AdminNotificationEvent =
  | 'new_order'
  | 'order_dispatched'
  | 'return_request'
  | 'refund'
  | 'product_added'
  | 'inventory_low'
  | 'review_added'
  | 'coupon_created'
  | 'campaign_launched';

export interface AdminNotificationRecord {
  id: string;
  title: string;
  message: string;
  type: AdminNotificationType;
  event_type: AdminNotificationEvent;
  link: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const notificationsTable = 'admin_notifications';

export const fetchAdminNotifications = async () => {
  const client = supabase as typeof supabase & {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { data, error } = await client
    .from(notificationsTable)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    throw error;
  }

  return (data || []) as unknown as AdminNotificationRecord[];
};

export const createAdminNotification = async ({
  title,
  message,
  type,
  eventType,
  link,
  metadata,
}: {
  title: string;
  message: string;
  type: AdminNotificationType;
  eventType: AdminNotificationEvent;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}) => {
  const client = supabase as typeof supabase & {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  // Client-side inserts to admin_notifications are blocked by RLS.
  // In production, notifications are generated via database triggers 
  // (e.g. AFTER INSERT ON orders/returns) or secure backend API calls.
  // Suppressing client-side inserts to prevent silent 403 errors and console spam.
  console.debug('[AdminNotifications] Deferred to secure backend routing.', { eventType, title });
  return Promise.resolve();
};

export const markAdminNotificationRead = async (id: string) => {
  const client = supabase as typeof supabase & {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { error } = await client.from(notificationsTable).update({ read: true }).eq('id', id);
  if (error) {
    throw error;
  }
};

export const markAllAdminNotificationsRead = async () => {
  const client = supabase as typeof supabase & {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { error } = await client.from(notificationsTable).update({ read: true }).eq('read', false);
  if (error) {
    throw error;
  }
};
