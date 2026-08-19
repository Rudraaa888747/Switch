type AnyOrderRecord = Record<string, unknown>;

export type OrderSchemaVersion = 'legacy' | 'modern';

export interface NormalizedOrderRecord {
  id: string;
  source_id: string;
  schema_version: OrderSchemaVersion;
  order_id: string | null;
  user_id: string | null;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  total_price: number;
  unit_price: number;
  size: string | null;
  color: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_pincode: string | null;
  payment_method: string | null;
  discount_applied: number;
  tax: number;
  shipping_cost: number;
  subtotal: number;
  grand_total: number | null;
  order_date: string | null;
  status: string;
  estimated_delivery_date: string | null;
  cancelled_at: string | null;
  created_at: string | null;
}

export interface OrderGroupItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  total_price: number;
  unit_price: number;
  size: string | null;
  color: string | null;
}

export interface OrderGroup {
  id: string;
  source_id: string;
  schema_version: OrderSchemaVersion;
  order_id: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_pincode: string | null;
  payment_method: string | null;
  discount_applied: number;
  tax: number;
  shipping_cost: number;
  subtotal: number;
  grand_total: number;
  total_quantity: number;
  order_date: string | null;
  status: string;
  estimated_delivery_date: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  items: OrderGroupItem[];
}

export interface OrderListFilters {
  search?: string | null;
  status?: string | null;
  userId?: string | null;
}

export const ORDER_LIST_SELECT_COLUMNS = '*';

interface LegacyOrderItem {
  name?: string;
  product_id?: string;
  product_name?: string;
  product_image?: string;
  image?: string;
  quantity?: number;
  price?: number;
  total_price?: number;
}

const LEGACY_STATUS_MAP: Record<string, string> = {
  pending: 'Order Placed',
  'order placed': 'Order Placed',
  processing: 'Processing',
  confirmed: 'Order Placed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const DISPLAY_TO_DB_STATUS: Record<string, string> = {
  'Order Placed': 'pending',
  Processing: 'processing',
  Shipped: 'shipped',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const toRecord = (value: unknown) => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getAddressField = (address: unknown, field: string) => {
  const addressRecord = toRecord(address);
  if (!addressRecord) return null;
  return toOptionalString(addressRecord[field]);
};

const parseLegacyItems = (value: unknown): LegacyOrderItem[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is LegacyOrderItem => typeof item === 'object' && item !== null);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseLegacyItems(parsed);
    } catch {
      return [];
    }
  }

  return [];
};

export const normalizeOrderStatus = (status: unknown) => {
  const value = typeof status === 'string' ? status.trim() : '';
  if (!value) {
    return 'Order Placed';
  }

  return LEGACY_STATUS_MAP[value] || value;
};

export const toDatabaseOrderStatus = (status: string) => {
  return DISPLAY_TO_DB_STATUS[status] || status.toLowerCase().replace(/\s+/g, '_');
};

export const isLegacyOrdersSchemaError = (error: { code?: string; message?: string } | null | undefined) => {
  return error?.code === 'PGRST204' && error.message?.includes("of 'orders' in the schema cache");
};

export const isOrdersSchemaMismatchError = isLegacyOrdersSchemaError;

export const detectOrderSchema = (record: AnyOrderRecord): OrderSchemaVersion => {
  // If it has order_number, it's definitely the new modern schema
  if ('order_number' in record && record.order_number) {
    return 'modern';
  }

  if ('items' in record || 'subtotal' in record || 'total' in record || 'estimated_delivery' in record) {
    return 'legacy';
  }

  return 'modern';
};

const normalizeModernOrder = (record: AnyOrderRecord): NormalizedOrderRecord[] => {
  const sourceId = String(record.id ?? record.order_id ?? crypto.randomUUID());
  const totalPrice = toNumber(record.total_price);
  const grandTotal =
    toNullableNumber(record.grand_total) ??
    toNullableNumber(record.total) ??
    (totalPrice > 0 ? totalPrice : null);

  const items = Array.isArray(record.items) && record.items.length > 0 
    ? record.items 
    : [record];

  return items.map((item, index) => ({
    id: item.id ? String(item.id) : `${sourceId}-${index}`,
    source_id: sourceId,
    schema_version: 'modern',
    order_id: toOptionalString(record.order_id) || toOptionalString(record.order_number),
    user_id: toOptionalString(record.user_id),
    product_id: String(item.product_id ?? sourceId),
    product_name: toOptionalString(item.product_name) || toOptionalString(item.name) || toOptionalString(record.product_name) || 'Order item',
    product_image: toOptionalString(item.product_image) || toOptionalString(item.image_url) || toOptionalString(record.product_image),
    quantity: Math.max(1, toNumber(item.quantity) || toNumber(record.quantity) || 1),
    total_price: toNumber(item.total_price) || toNumber(item.price) || (index === 0 ? totalPrice : 0),
    unit_price: toNumber(item.unit_price) || toNumber(item.price) || 0,
    size: toOptionalString(item.size),
    color: toOptionalString(item.color),
    customer_name: toOptionalString(record.customer_name),
    customer_phone: toOptionalString(record.customer_phone),
    shipping_address: toOptionalString(record.shipping_address) || getAddressField(record.shipping_address, 'line1'),
    shipping_city: toOptionalString(record.shipping_city) || getAddressField(record.shipping_address, 'city'),
    shipping_state: toOptionalString(record.shipping_state) || getAddressField(record.shipping_address, 'state'),
    shipping_pincode:
      toOptionalString(record.shipping_pincode) || getAddressField(record.shipping_address, 'postal_code'),
    payment_method: toOptionalString(record.payment_method),
    discount_applied: toNumber(record.discount_applied),
    tax: toNumber(record.tax),
    shipping_cost: toNumber(record.shipping_cost ?? record.shipping),
    subtotal: toNumber(record.subtotal_amount) || toNumber(record.subtotal) || 0,
    grand_total: grandTotal,
    order_date: toOptionalString(record.order_date) || toOptionalString(record.created_at),
    status: normalizeOrderStatus(record.delivery_status || record.status),
    estimated_delivery_date:
      toOptionalString(record.estimated_delivery_date) || toOptionalString(record.estimated_delivery_at) || toOptionalString(record.estimated_delivery),
    cancelled_at: toOptionalString(record.cancelled_at),
    created_at: toOptionalString(record.created_at),
  }));
};

const normalizeLegacyOrder = (record: AnyOrderRecord): NormalizedOrderRecord[] => {
  const sourceId = String(record.id ?? record.order_id ?? crypto.randomUUID());
  const parsedItems = parseLegacyItems(record.items);
  const fallbackTotal = toNullableNumber(record.total) ?? 0;
  const grandTotal = toNullableNumber(record.total);
  const items = parsedItems.length > 0 ? parsedItems : [{ name: 'Order item', quantity: 1, price: fallbackTotal }];

  return items.map((item, index) => {
    const quantity = Math.max(1, toNumber(item.quantity) || 1);
    const lineTotal =
      toNumber(item.total_price) ||
      toNumber(item.price) ||
      (index === 0 ? fallbackTotal : 0);

    return {
      id: `${sourceId}-${index}`,
      source_id: sourceId,
      schema_version: 'legacy',
      order_id: toOptionalString(record.order_id),
      user_id: toOptionalString(record.user_id),
      product_id: String(item.product_id ?? `${sourceId}-${index}`),
      product_name: toOptionalString(item.product_name) || toOptionalString(item.name) || 'Order item',
      product_image: toOptionalString(item.product_image) || toOptionalString(item.image),
      quantity,
      total_price: lineTotal,
      unit_price: toNumber(item.price) || lineTotal / quantity,
      size: toOptionalString(item.size),
      color: toOptionalString(item.color),
      customer_name: toOptionalString(record.customer_name),
      customer_phone: toOptionalString(record.customer_phone),
      shipping_address: toOptionalString(record.shipping_address),
      shipping_city: toOptionalString(record.shipping_city),
      shipping_state: toOptionalString(record.shipping_state),
      shipping_pincode: toOptionalString(record.shipping_pincode),
      payment_method: toOptionalString(record.payment_method),
      discount_applied: 0,
      tax: toNumber(record.tax),
      shipping_cost: toNumber(record.shipping),
      subtotal: toNumber(record.subtotal) || fallbackTotal,
      grand_total: grandTotal,
      order_date: toOptionalString(record.created_at),
      status: normalizeOrderStatus(record.status),
      estimated_delivery_date: toOptionalString(record.estimated_delivery_date) || toOptionalString(record.estimated_delivery),
      cancelled_at: toOptionalString(record.cancelled_at),
      created_at: toOptionalString(record.created_at),
    };
  });
};

export const normalizeOrders = (records: AnyOrderRecord[] | null | undefined): NormalizedOrderRecord[] => {
  if (!records?.length) {
    return [];
  }

  return records.flatMap((record) => {
    if (detectOrderSchema(record) === 'legacy') {
      return normalizeLegacyOrder(record);
    }

    return normalizeModernOrder(record);
  });
};

export const getOrderRevenue = (record: AnyOrderRecord) => {
  return (
    toNullableNumber(record.grand_total) ??
    toNullableNumber(record.total) ??
    toNullableNumber(record.total_price) ??
    0
  );
};

const sortByNewest = <T extends { order_date: string | null; created_at: string | null }>(orders: T[]) => {
  return [...orders].sort((a, b) => {
    const aDate = new Date(a.order_date || a.created_at || 0).getTime();
    const bDate = new Date(b.order_date || b.created_at || 0).getTime();
    return bDate - aDate;
  });
};

const getOrderSearchHaystack = (order: OrderGroup) => {
  return [
    order.id,
    order.order_id,
    order.customer_name,
    ...order.items.map((item) => item.product_name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export const matchesOrderFilters = (order: OrderGroup, filters: OrderListFilters = {}) => {
  const normalizedStatus = filters.status && filters.status !== 'all' ? filters.status : null;
  const normalizedSearch = filters.search?.trim().toLowerCase();

  if (filters.userId && order.user_id !== filters.userId) {
    return false;
  }

  if (normalizedStatus && order.status !== normalizedStatus) {
    return false;
  }

  if (normalizedSearch && !getOrderSearchHaystack(order).includes(normalizedSearch)) {
    return false;
  }

  return true;
};

const isSameOrderGroup = (left: OrderGroup, right: OrderGroup) => {
  return (
    left.id === right.id ||
    left.source_id === right.source_id ||
    (!!left.order_id && left.order_id === right.order_id)
  );
};

const toGroupedOrder = (record: AnyOrderRecord | null | undefined) => {
  if (!record) return null;
  const groupedOrders = groupOrders(normalizeOrders([record]));
  return groupedOrders[0] ?? null;
};

export const upsertOrderGroup = (
  existingOrders: OrderGroup[],
  incomingOrder: OrderGroup,
  filters: OrderListFilters = {}
) => {
  const remainingOrders = existingOrders.filter((order) => !isSameOrderGroup(order, incomingOrder));

  if (!matchesOrderFilters(incomingOrder, filters)) {
    return sortByNewest(remainingOrders);
  }

  return sortByNewest([incomingOrder, ...remainingOrders]);
};

export const removeOrderGroup = (existingOrders: OrderGroup[], record: AnyOrderRecord | null | undefined) => {
  const groupedOrder = toGroupedOrder(record);
  if (!groupedOrder) {
    return existingOrders;
  }

  return existingOrders.filter((order) => !isSameOrderGroup(order, groupedOrder));
};

export const applyRealtimeOrderChange = (
  existingOrders: OrderGroup[],
  payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: AnyOrderRecord; old?: AnyOrderRecord },
  filters: OrderListFilters = {}
) => {
  if (payload.eventType === 'DELETE') {
    return removeOrderGroup(existingOrders, payload.old);
  }

  const groupedOrder = toGroupedOrder(payload.new);
  if (!groupedOrder) {
    return existingOrders;
  }

  return upsertOrderGroup(existingOrders, groupedOrder, filters);
};

export const groupOrders = (records: NormalizedOrderRecord[]): OrderGroup[] => {
  const groups = new Map<string, OrderGroup>();

  records.forEach((record) => {
    const key = record.order_id || record.source_id;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        id: key,
        source_id: record.source_id,
        schema_version: record.schema_version,
        order_id: record.order_id,
        user_id: record.user_id,
        customer_name: record.customer_name,
        customer_phone: record.customer_phone,
        shipping_address: record.shipping_address,
        shipping_city: record.shipping_city,
        shipping_state: record.shipping_state,
        shipping_pincode: record.shipping_pincode,
        payment_method: record.payment_method,
        discount_applied: record.discount_applied,
        tax: record.tax,
        shipping_cost: record.shipping_cost,
        subtotal: record.subtotal,
        grand_total: record.grand_total ?? record.total_price,
        total_quantity: record.quantity,
        order_date: record.order_date,
        status: record.status,
        estimated_delivery_date: record.estimated_delivery_date,
        cancelled_at: record.cancelled_at,
        created_at: record.created_at,
        items: [
          {
            id: record.id,
            product_id: record.product_id,
            product_name: record.product_name,
            product_image: record.product_image,
            quantity: record.quantity,
            total_price: record.total_price,
            unit_price: record.unit_price,
            size: record.size,
            color: record.color,
          },
        ],
      });
      return;
    }

    existing.total_quantity += record.quantity;
    existing.discount_applied = Math.max(existing.discount_applied, record.discount_applied);
    existing.tax = Math.max(existing.tax, record.tax);
    existing.shipping_cost = Math.max(existing.shipping_cost, record.shipping_cost);
    existing.subtotal = Math.max(existing.subtotal, record.subtotal);
    existing.grand_total = Math.max(existing.grand_total, record.grand_total ?? 0, existing.grand_total);
    existing.order_date = existing.order_date || record.order_date;
    existing.created_at = existing.created_at || record.created_at;
    existing.estimated_delivery_date = existing.estimated_delivery_date || record.estimated_delivery_date;
    existing.cancelled_at = existing.cancelled_at || record.cancelled_at;
    existing.items.push({
      id: record.id,
      product_id: record.product_id,
      product_name: record.product_name,
      product_image: record.product_image,
      quantity: record.quantity,
      total_price: record.total_price,
      unit_price: record.unit_price,
      size: record.size,
      color: record.color,
    });
  });

  return sortByNewest(Array.from(groups.values())).map((group) => ({
    ...group,
    grand_total:
      group.grand_total ||
      group.items.reduce((sum, item) => sum + item.total_price, 0) + group.tax + group.shipping_cost,
  }));
};

export const countDistinctOrders = (records: NormalizedOrderRecord[] | OrderGroup[]) => {
  return new Set(records.map((record) => record.order_id || record.source_id)).size;
};

interface OptimisticOrderInput {
  schemaVersion: OrderSchemaVersion;
  sourceId: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  paymentMethod: string;
  discountApplied: number;
  tax: number;
  shippingCost: number;
  grandTotal: number;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    totalPrice: number;
  }>;
}

export const buildOptimisticOrderGroups = ({
  schemaVersion,
  sourceId,
  orderId,
  userId,
  customerName,
  customerPhone,
  shippingAddress,
  shippingCity,
  shippingState,
  shippingPincode,
  paymentMethod,
  discountApplied,
  tax,
  shippingCost,
  grandTotal,
  estimatedDeliveryDate,
  createdAt,
  items,
}: OptimisticOrderInput): OrderGroup[] => {
  const normalizedRecords: NormalizedOrderRecord[] = items.map((item, index) => ({
    id: `${sourceId}-${index}`,
    source_id: sourceId,
    schema_version: schemaVersion,
    order_id: orderId,
    user_id: userId,
    product_id: item.productId,
    product_name: item.productName,
    product_image: item.productImage,
    quantity: item.quantity,
    total_price: item.totalPrice,
    customer_name: customerName,
    customer_phone: customerPhone,
    shipping_address: shippingAddress,
    shipping_city: shippingCity,
    shipping_state: shippingState,
    shipping_pincode: shippingPincode,
    payment_method: paymentMethod,
    discount_applied: discountApplied,
    tax,
    shipping_cost: shippingCost,
    grand_total: grandTotal,
    order_date: createdAt,
    status: 'Order Placed',
    estimated_delivery_date: estimatedDeliveryDate,
    cancelled_at: null,
    created_at: createdAt,
  }));

  return groupOrders(normalizedRecords);
};
