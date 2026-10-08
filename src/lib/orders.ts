const ORDERS_KEY = "whf:orders:v1";
export const BATCH_SIZE = 10;
export const BATCH_EMAILS = ["wavenharper@gmail.com"];

export type MerchOrder = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lines: { product: string; colour: string; size: string; qty: number }[];
  notes: string;
  createdAt: string;
  batched: boolean;
};

export function loadOrders(): MerchOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function saveOrders(orders: MerchOrder[]) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {}
}
export function addOrder(order: Omit<MerchOrder, "id" | "createdAt" | "batched">): {
  orders: MerchOrder[];
  shouldEmail: boolean;
} {
  const orders = loadOrders();
  const newOrder: MerchOrder = {
    ...order,
    id: `ord-${Date.now()}`,
    createdAt: new Date().toISOString(),
    batched: false,
  };
  const updated = [...orders, newOrder];
  saveOrders(updated);
  const unbatched = updated.filter((o) => !o.batched);
  return { orders: updated, shouldEmail: unbatched.length >= BATCH_SIZE };
}
export function markBatched(ids: string[]) {
  const orders = loadOrders();
  saveOrders(orders.map((o) => (ids.includes(o.id) ? { ...o, batched: true } : o)));
}
