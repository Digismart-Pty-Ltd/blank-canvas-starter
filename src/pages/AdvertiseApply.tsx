import { Link } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Check, Loader2, ArrowUpRight, ShieldCheck } from "lucide-react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { BANK_DETAILS, ADMIN_EMAIL } from "@/lib/demo-data";
import {
  calculateAdvertExpiry,
  createAdvertisement,
  uploadAdvertLogo,
  generateAdOrderNumber,
  type AdvertType,
} from "@/lib/advertService";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDateInput(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdvertiseApply() {
  useEffect(() => {
    document.title = "Advertise — Waven Harper Fitness";
  }, []);

  const { currentMember, state } = useStore();
  const { user } = useAuth();

  const authEmail = user?.email ?? undefined;
  const authMember = authEmail
    ? state.members.find((m) => m.email.toLowerCase() === authEmail.toLowerCase())
    : null;
  const effectiveMember = currentMember ?? authMember;
  const isLoggedIn = Boolean(user || currentMember);
  const [memberAnswer, setMemberAnswer] = useState<"yes" | "no" | "">(isLoggedIn ? "yes" : "");
  const [adType, setAdType] = useState<AdvertType>("banner");
  const [activationDate, setActivationDate] = useState(new Date().toISOString().slice(0, 10));
  const [months, setMonths] = useState("1");
  const [dimensions, setDimensions] = useState("1200 x 300 px");
  const price = memberAnswer === "yes" ? 250 : 500;
  const expiryDate = calculateAdvertExpiry(activationDate, Number(months) || 1);

  useEffect(() => {
    if (isLoggedIn) setMemberAnswer("yes");
  }, [isLoggedIn]);

  const [businessName, setBusinessName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("https://");
  const [contactName, setContactName] = useState(effectiveMember?.name ?? "");
  const [contactEmail, setContactEmail] = useState(effectiveMember?.email ?? authEmail ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
    if (file.size > 50 * 1024 * 1024) {
      return toast.error("Please choose an image under 50 MB so it can be compressed safely.");
    }

    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadAdvertLogo(file, setUploadPct);
      setLogoUrl(url);
      toast.success("Logo uploaded.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed. Try a different image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return toast.error("Please enter your business name.");
    if (!websiteUrl.trim()) return toast.error("Please enter a website or social media page link.");
    if (!logoUrl) return toast.error("Please upload your logo.");
    if (!memberAnswer) return toast.error("Please tell us whether you are a member.");
    if (adType === "banner" && !dimensions.trim()) {
      return toast.error("Please enter the banner dimensions.");
    }
    if (!contactName.trim()) return toast.error("Please enter a contact name.");
    if (!contactEmail.trim()) return toast.error("Please enter a contact email.");
    if (!contactPhone.trim()) return toast.error("Please enter a contact phone number.");

    setSubmitting(true);
    const newOrderNumber = generateAdOrderNumber();

    try {
      await createAdvertisement({
        orderNumber: newOrderNumber,
        businessName,
        slogan,
        websiteUrl,
        logoUrl,
        contactName,
        contactEmail,
        contactPhone,
        isMember: memberAnswer === "yes",
        price,
        adType,
        imageUrl: logoUrl,
        dimensions: adType === "logo" ? "Logo" : dimensions,
        activationDate,
        months: Math.max(1, Number(months) || 1),
        expiryDate,
      });

      await addDoc(collection(db, "mail"), {
        to: [ADMIN_EMAIL],
        message: {
          subject: `New advert application ${newOrderNumber} — payment verification required`,
          text: `A new advertising application has been submitted and is pending payment verification.\n\nOrder reference: ${newOrderNumber}\nBusiness: ${businessName}\nSlogan: ${slogan || "—"}\nWebsite or social media page: ${websiteUrl}\nContact: ${contactName}\nEmail: ${contactEmail}\nPhone: ${contactPhone}\nMember: ${memberAnswer === "yes" ? "Yes" : "No"}\nAdvert type: ${adType}\nDimensions: ${adType === "logo" ? "Logo" : dimensions}\nActivation: ${activationDate}\nExpiry: ${expiryDate}\nTerm: ${months} month(s)\nPrice: R${price}/month\n\nNext steps:\n1. Verify that payment has cleared and matches order reference ${newOrderNumber}. Check the proof of payment sent to ${ADMIN_EMAIL}.\n2. Do not approve the application until payment is verified.\n3. In Admin, open Adverts, find order ${newOrderNumber}, and click Accept. The advert will remain unpublished until approved.`,
        },
      });

      setOrderNumber(newOrderNumber);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = uploading || submitting;

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md md:max-w-3xl px-5 md:px-8 pt-16 pb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Advertise with us</div>
        <h1 className="mt-3 display text-4xl md:text-6xl">Get in front of our community.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
          Your logo and optional slogan featured on our homepage, linking to your website or
          social media page. Apply below — spots are reviewed and confirmed manually.
        </p>
      </section>

      <section className="mx-auto max-w-md md:max-w-3xl px-5 md:px-8 pb-24">
        {submitted ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check size={28} />
            </div>
            <div className="display text-3xl">Application received!</div>

            <div className="mt-5 inline-block rounded-2xl border border-primary/30 bg-primary/5 px-6 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Your reference
              </div>
              <div className="display text-2xl text-primary mt-1">{orderNumber}</div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground max-w-sm mx-auto">
              Your rate is <span className="text-foreground font-medium">R{price}/month</span>.
              Please pay using the details below and use your reference as the payment reference
              so we can match your payment. Once you've paid, send proof of payment to{" "}
              {ADMIN_EMAIL}.
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
              Once we confirm payment, we'll enable your advert on the homepage and let you know
              via email.
            </p>

            <Link
              to="/"
              className="mt-8 inline-flex rounded-full border border-border px-7 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-5"
          >
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary shrink-0" />
              <span>
                {isLoggedIn ? (
                  <>Member rate: <strong>R250/month</strong>.</>
                ) : (
                  <>Guest rate: <strong>R500/month</strong>.</>
                )}
              </span>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Are you a member? *
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((answer) => (
                  <label
                    key={answer}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize ${
                      memberAnswer === answer ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="member"
                      value={answer}
                      checked={memberAnswer === answer}
                      onChange={() => setMemberAnswer(answer)}
                      required
                    />
                    {answer}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Advert format *
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(["logo", "banner"] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize ${
                      adType === type ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="adType"
                      value={type}
                      checked={adType === type}
                      onChange={() => setAdType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Business name" value={businessName} onChange={setBusinessName} required />
            <Field label="Slogan / tagline (optional)" value={slogan} onChange={setSlogan} />
            <Field
              label="Website or social media page link"
              value={websiteUrl}
              onChange={setWebsiteUrl}
              type="url"
              required
            />

            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {adType === "banner" ? "Banner image *" : "Logo *"}
              </span>
              <LogoUploader
                logoUrl={logoUrl}
                label={adType === "banner" ? "Upload banner" : "Upload logo"}
                uploading={uploading}
                uploadPct={uploadPct}
                onFileChange={handleFileChange}
                onClear={() => setLogoUrl("")}
              />
            </div>

            {adType === "banner" && (
              <Field
                label="Banner dimensions"
                value={dimensions}
                onChange={setDimensions}
                required
              />
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="block">
                <label
                  htmlFor="activation-date"
                  className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Activation date *
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="activation-date"
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    value={activationDate}
                    onChange={(event) => setActivationDate(event.target.value)}
                    required
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Choose activation date"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <CalendarDays size={16} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseDateInput(activationDate)}
                        onSelect={(date) => {
                          if (date) setActivationDate(formatDateInput(date));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Field label="Number of months" value={months} onChange={setMonths} type="number" required />
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Calculated expiry
                </span>
                <div className="mt-1 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm">
                  {expiryDate}
                </div>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Contact name" value={contactName} onChange={setContactName} required />
              <Field
                label="Contact phone"
                value={contactPhone}
                onChange={setContactPhone}
                type="tel"
                required
              />
            </div>
            <Field
              label="Contact email"
              value={contactEmail}
              onChange={setContactEmail}
              type="email"
              required
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit application <ArrowUpRight size={14} />
                </>
              )}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Payment details are shared after you submit. Your advert goes live once we confirm
              payment and approve it.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

function LogoUploader({
  logoUrl,
  label,
  uploading,
  uploadPct,
  onFileChange,
  onClear,
}: {
  logoUrl: string;
  label: string;
  uploading: boolean;
  uploadPct: number;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary cursor-pointer active:scale-95 transition-all">
          <ImagePlus size={13} />
          {uploading ? `Uploading ${uploadPct}%…` : logoUrl ? `Replace ${label.toLowerCase()}` : label}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
        {logoUrl && !uploading && (
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
            <Check size={12} /> Uploaded
          </span>
        )}
      </div>
      {uploading && (
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
        </div>
      )}
      {logoUrl && !uploading && (
        <>
          <div className="rounded-xl overflow-hidden bg-white border border-border h-24 flex items-center justify-center p-3">
            <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
          >
            Remove logo
          </button>
        </>
      )}
    </div>
  );
}

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
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
        {required && " *"}
      </span>
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