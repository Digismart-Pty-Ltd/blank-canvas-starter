import { Link } from "react-router-dom";
import lfr from "@/assets/lfr-logo-clean.png";
import community from "@/assets/community.jpg";
import { useEffect, useState, type FormEvent } from "react";
import { ShoppingBag, X, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import tshirt1 from "@/assets/Tshirt-1.jpeg";
import tshirt2 from "@/assets/Tshirt-2.jpeg";
import socks from "@/assets/socks.jpeg";
import vestBlack from "@/assets/vest-black.jpeg";
import vestWhite from "@/assets/vest-white.jpeg";
import { db } from "@/lib/firebase";
import { BANK_DETAILS, ADMIN_EMAIL } from "@/lib/demo-data";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// ─── Firebase / notification config ────────────────────────────────────────────
// Requires the "Trigger Email from Firestore" extension installed, watching the
// "mail" collection below. Also requires Firestore security rules that allow
// client writes to "orders" and "mail" (typically scoped/validated via rules).

const BATCH_SIZE = 10;

// ─── Order number generator ─────────────────────────────────────────────────
function generateOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LFR-${rand}`;
}
// ─── product catalogue ────────────────────────────────────────────────────────

const TSHIRT_SIZES = ["S", "M", "L", "XL"] as const;
const SOCK_SIZES = [
  { label: "Kids (5–8 yrs)", desc: "Crew only" },
  { label: "Small", desc: "UK 12–3 / EU 32–38" },
  { label: "Medium", desc: "UK 4–7 / EU 38–42" },
  { label: "Large", desc: "UK 8–12 / EU 42–47" },
  { label: "XL", desc: "UK 13+ / EU 47+" },
] as const;

type Product = {
  id: string;
  name: string;
  price: number;
  type: "tshirt" | "socks";
  colours: string[];
  description: string;
};

const PRODUCTS: Product[] = [
  {
    id: "tshirt-mens",
    name: "Men's Tee",
    price: 230,
    type: "tshirt",
    colours: ["White", "Black"],
    description: '"No One Is Chasing Us" — LFR logo front, Little Falls Runners back. Sizes S–XL.',
  },
  {
    id: "tshirt-womens",
    name: "Women's Tee",
    price: 230,
    type: "tshirt",
    colours: ["White", "Black"],
    description: '"No One Is Chasing Us" — LFR logo front, Little Falls Runners back. Sizes S–XL.',
  },
  {
    id: "vest-mens",
    name: "Men's Vest",
    price: 210,
    type: "tshirt",
    colours: ["White", "Black"],
    description: '"No One Is Chasing Us" — LFR logo front, Little Falls Runners back. Sizes S–XL.',
  },
  {
    id: "vest-womens",
    name: "Women's Vest",
    price: 210,
    type: "tshirt",
    colours: ["White", "Black"],
    description: '"No One Is Chasing Us" — LFR logo front, Little Falls Runners back. Sizes S–XL.',
  },
  {
    id: "socks",
    name: "LFR Socks",
    price: 150,
    type: "socks",
    colours: ["Pink", "White"],
    description: "LFR logo or 'No One Is Chasing Us' text. Available in 5 sizes.",
  },
];

// ─── types ────────────────────────────────────────────────────────────────────

type OrderLine = {
  product: string;
  colour: string;
  size: string;
  qty: number;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  lines: OrderLine[];
  notes: string;
};

type StoredOrder = {
  id: string;
  orderNumber: string;
  createdAt?: Timestamp;
  name: string;
  email: string;
  phone: string;
  lines: OrderLine[];
  notes: string;
  batched: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function sizesFor(type: "tshirt" | "socks") {
  if (type === "tshirt") return TSHIRT_SIZES as unknown as string[];
  return SOCK_SIZES.map((s) => s.label);
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function RunningClub() {
  useEffect(() => {
    document.title = "Little Falls Runners — Waven Harper Fitness";
  }, []);
  const [orderOpen, setOrderOpen] = useState(false);

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={community} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        </div>
        <div className="relative mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-20 pb-20 grid md:grid-cols-[auto,1fr] gap-10 items-center">
          <div className="mb-4 h-28 w-28 md:h-36 md:w-36 overflow-hidden rounded-full ring-2 ring-primary shadow-glow bg-transparent">
            <img src={lfr} alt="LFR" className="h-full w-full object-cover scale-110" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-primary">Community Club</div>
            <h1 className="mt-3 display text-4xl md:text-8xl leading-[0.9]">
              Little Falls
              <br />
              Runners.
            </h1>
            <p className="marker mt-4 text-primary text-3xl md:text-5xl">No one is chasing us.</p>
          </div>
        </div>
      </section>

      {!user ? (
        <section className="mx-auto max-w-4xl px-5 mt-6 pb-16 text-center">
          <h2 className="display text-3xl">Join the club.</h2>
          <p className="mt-2 text-muted-foreground">
            Membership is currently free. Join us, meet the community, and enjoy every run.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/join"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow"
            >
              Join the club
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] hover:border-primary"
            >
              See events
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl px-5 mt-6 pb-16 text-center">
          <h2 className="display text-3xl">See the next runs.</h2>
          <p className="mt-2 text-muted-foreground">
            You're already part of the club. Check out upcoming events and stay active.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] hover:border-primary"
            >
              See events
            </Link>
          </div>
        </section>
      )}

      {/* ── About ── */}
      <section className="mx-auto max-w-5xl px-5 md:px-8 mt-10">
        <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed">
          We meet at sunrise, after work, on Saturdays — basically whenever someone's keen. LFR is a
          no-pressure, all-paces community of runners and walkers based in Little Falls, Roodepoort.
          You don't need to be fast. You just need to show up.
        </p>
      </section>

      {/* ── Stats ── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-16 grid gap-4 md:grid-cols-3">
        {[
          { k: "150+", v: "Active members" },
          { k: "4×", v: "Group runs / week" },
          { k: "0", v: "People chasing us" },
        ].map((s) => (
          <div key={s.v} className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="display text-4xl md:text-6xl text-primary">{s.k}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {s.v}
            </div>
          </div>
        ))}
      </section>

      {/* ── Merch ── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-primary">Represent</div>
            <h2 className="mt-2 display text-4xl md:text-6xl">Club merch.</h2>
          </div>
          <button
            onClick={() => setOrderOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow w-fit"
          >
            <ShoppingBag size={14} /> Place an order
          </button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <MerchCard
            label="White / Pink"
            tag="Tee — Unisex cut"
            price="R230"
            sizes="S · M · L · XL"
            imgSrc={tshirt1}
            imgAlt="White LFR tee"
          />
          <MerchCard
            label="Black / White"
            tag="Tee — Unisex cut"
            price="R230"
            sizes="S · M · L · XL"
            imgSrc={tshirt2}
            imgAlt="Black LFR tee"
          />
          <MerchCard
            label="Black Vest"
            tag="Vest — Unisex cut"
            price="R210"
            sizes="S · M · L · XL"
            imgSrc={vestBlack}
            imgAlt="Black LFR vest"
          />
          <MerchCard
            label="White Vest"
            tag="Vest — Unisex cut"
            price="R210"
            sizes="S · M · L · XL"
            imgSrc={vestWhite}
            imgAlt="White LFR vest"
          />
          <MerchCard
            label="Pink & White"
            tag="LFR Socks"
            price="R150"
            sizes="Kids · S · M · L · XL"
            imgSrc={socks}
            imgAlt="LFR socks"
          />
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          * All orders processed manually — we'll confirm stock and payment details via WhatsApp or
          email.
        </p>
      </section>

      {/* ── Order Modal ── */}
      {orderOpen && <OrderModal onClose={() => setOrderOpen(false)} />}
    </div>
  );
}

// ─── merch card ───────────────────────────────────────────────────────────────

function MerchCard({
  label,
  tag,
  price,
  sizes,
  imgSrc,
  imgAlt,
  isPlaceholder,
  placeholderColour,
  placeholderText,
  lightText,
}: {
  label: string;
  tag: string;
  price: string;
  sizes: string;
  imgSrc?: string;
  imgAlt: string;
  isPlaceholder?: boolean;
  placeholderColour?: string;
  placeholderText?: string;
  lightText?: boolean;
}) {
  return (
    <div className="group rounded-3xl border border-border bg-card overflow-hidden">
      <div
        className="aspect-[3/4] overflow-hidden flex items-center justify-center"
        style={
          isPlaceholder ? { backgroundColor: placeholderColour } : { backgroundColor: "#ffffff" }
        }
      >
        {isPlaceholder ? (
          <span
            className="display text-3xl font-black tracking-widest select-none opacity-20"
            style={{ color: lightText ? "#fff" : "#000" }}
          >
            {placeholderText}
          </span>
        ) : (
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-contain transition duration-700 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">{tag}</div>
        <div className="mt-1 display text-2xl">{label}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{sizes}</span>
          <span className="text-sm font-bold text-foreground">{price}</span>
        </div>
      </div>
    </div>
  );
}


// ─── order modal ──────────────────────────────────────────────────────────────

function OrderModal({ onClose }: { onClose: () => void }) {
  const blank = (): OrderLine => ({
    product: PRODUCTS[0].id,
    colour: PRODUCTS[0].colours[0],
    size: sizesFor(PRODUCTS[0].type)[0],
    qty: 1,
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    notes: "",
    lines: [blank()],
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sockGuideOpen, setSockGuideOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  function updateLine(i: number, patch: Partial<OrderLine>) {
    const lines = form.lines.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, ...patch };
      if (patch.product) {
        const prod = PRODUCTS.find((p) => p.id === patch.product)!;
        updated.colour = prod.colours[0];
        updated.size = sizesFor(prod.type)[0];
      }
      return updated;
    });
    setForm({ ...form, lines });
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, blank()] });
  }
  function removeLine(i: number) {
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const newOrderNumber = generateOrderNumber(); // ← add

    const orderItems = form.lines
      .map((l) => `${l.qty}x ${l.product} — ${l.colour}, ${l.size}`)
      .join("\n");

    try {
      await addDoc(collection(db, "orders"), {
        orderNumber: newOrderNumber, // ← add
        name: form.name,
        email: form.email,
        phone: form.phone,
        lines: form.lines,
        notes: form.notes,
        batched: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "mail"), {
        to: [ADMIN_EMAIL],
        message: {
          subject: `New LFR order ${newOrderNumber} from ${form.name}`, // ← updated
          text: `Order #: ${newOrderNumber}\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nItems:\n${orderItems}\n\nNotes: ${form.notes || "—"}`, // ← updated
        },
      });

      const unbatchedSnap = await getDocs(
        query(collection(db, "orders"), where("batched", "==", false)),
      );

      if (unbatchedSnap.size >= BATCH_SIZE) {
        const unbatchedOrders: StoredOrder[] = unbatchedSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StoredOrder, "id">),
        }));

        const orderDetails = unbatchedOrders
          .map((o, i) => {
            const dateStr = o.createdAt ? o.createdAt.toDate().toISOString().slice(0, 10) : "—";
            const itemsStr = o.lines
              .map((l) => `${l.qty}x ${l.product} (${l.colour}, ${l.size})`)
              .join(", ");
            return `ORDER ${i + 1} — ${o.orderNumber ?? "—"} — ${dateStr}\nName: ${o.name}\nEmail: ${o.email}\nPhone: ${o.phone}\nItems: ${itemsStr}\nNotes: ${o.notes || "—"}`; // ← updated
          })
          .join("\n\n---\n\n");

        await addDoc(collection(db, "mail"), {
          to: [ADMIN_EMAIL],
          message: {
            subject: `LFR order batch summary (${unbatchedOrders.length} orders)`,
            text: orderDetails,
          },
        });

        const batch = writeBatch(db);
        unbatchedOrders.forEach((o) => {
          batch.update(doc(db, "orders", o.id), { batched: true });
        });
        await batch.commit();

        toast.info(`Batch of ${unbatchedOrders.length} orders sent to admin automatically.`);
      }

      setOrderNumber(newOrderNumber); // ← add
      setSubmitted(true);
    } catch (err) {
      toast.error("Something went wrong — please try WhatsApp instead.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-6 md:p-8 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check size={28} />
            </div>
            <div className="display text-3xl">Order received!</div>

            <div className="mt-5 inline-block rounded-2xl border border-primary/30 bg-primary/5 px-6 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Your order reference
              </div>
              <div className="display text-2xl text-primary mt-1">{orderNumber}</div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground max-w-sm mx-auto">
              Please pay using the details below and use your order reference as the payment
              reference so we can match your payment. Once you've paid, please send proof of
              payment to {ADMIN_EMAIL} so we can confirm and process your order.
            </p>

            <div className="mt-5 rounded-2xl border border-border bg-background/40 p-5 text-left max-w-sm mx-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account name</span>
                <span className="font-medium text-foreground">{BANK_DETAILS.accountName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium text-foreground">{BANK_DETAILS.bank}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account number</span>
                <span className="font-medium text-foreground">{BANK_DETAILS.accountNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account type</span>
                <span className="font-medium text-foreground">{BANK_DETAILS.accountType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Branch code</span>
                <span className="font-medium text-foreground">{BANK_DETAILS.branchCode}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-semibold text-primary">{orderNumber}</span>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground max-w-xs mx-auto">
              Once we receive your payment, we'll be in touch via WhatsApp or email to confirm.
            </p>

            <button
              onClick={onClose}
              className="mt-8 inline-flex rounded-full border border-border px-7 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="display text-3xl">Place an order</div>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details and we'll be in touch to confirm.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* contact */}
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Full name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  required
                />
                <Field
                  label="Phone / WhatsApp"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  required
                />
              </div>
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                type="email"
                required
              />

              {/* order lines */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  Items
                </div>
                <div className="space-y-3">
                  {form.lines.map((line, i) => {
                    const prod = PRODUCTS.find((p) => p.id === line.product)!;
                    return (
                      <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.15em]">
                            Item {i + 1}
                          </span>
                          {form.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <SelectField
                          label="Product"
                          value={line.product}
                          onChange={(v) => updateLine(i, { product: v })}
                          options={PRODUCTS.map((p) => ({
                            value: p.id,
                            label: `${p.name} — ${p.price ? `R${p.price}` : "POA"}`,
                          }))}
                        />

                        <div className="grid gap-3 grid-cols-3">
                          <SelectField
                            label="Colour"
                            value={line.colour}
                            onChange={(v) => updateLine(i, { colour: v })}
                            options={prod.colours.map((c) => ({ value: c, label: c }))}
                          />
                          <SelectField
                            label="Size"
                            value={line.size}
                            onChange={(v) => updateLine(i, { size: v })}
                            options={sizesFor(prod.type).map((s) => ({ value: s, label: s }))}
                          />
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              Qty
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={line.qty}
                              onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="mt-3 text-xs text-primary underline underline-offset-2"
                >
                  + Add another item
                </button>
              </div>

              {/* sock size guide */}
              <div className="rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSockGuideOpen(!sockGuideOpen)}
                  className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Sock size guide
                  <ChevronDown
                    size={14}
                    className={`transition ${sockGuideOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {sockGuideOpen && (
                  <div className="px-4 pb-4">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          <th className="py-1.5 pr-4">Size</th>
                          <th className="py-1.5">Fits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {SOCK_SIZES.map((s) => (
                          <tr key={s.label}>
                            <td className="py-2 pr-4 font-semibold">{s.label}</td>
                            <td className="py-2 text-muted-foreground">{s.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* notes */}
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Notes (optional)
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Any special requests or questions…"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending…" : "Submit order"}
              </button>

              <p className="text-[11px] text-muted-foreground text-center">
                Payment details will be shared once we confirm your order via WhatsApp or email.
              </p>
           </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── form helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
