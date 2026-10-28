import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { loadOrders } from "@/lib/orders";

/** Read-only: downloads merch orders saved in this browser before the move to Cloud. Never deletes them. */
export default function ExportOldOrders() {
  const orders = useMemo(() => loadOrders(), []);

  const download = () => {
    const device = navigator.userAgent.includes("Mobile") ? "phone" : "computer";
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), userAgent: navigator.userAgent, orders }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${device}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-foreground">
      <h1 className="mb-4 text-2xl font-bold">Export old orders</h1>
      <p className="mb-6 text-muted-foreground">
        This browser has <strong className="text-foreground">{orders.length}</strong> old merch order
        {orders.length === 1 ? "" : "s"} saved. Nothing is deleted.
      </p>
      <Button onClick={download} disabled={orders.length === 0}>
        Download orders file
      </Button>
    </main>
  );
}
