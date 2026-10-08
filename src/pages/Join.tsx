import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

import { registerMember, upgradeToMember } from "@/services/authService";

// Replace the waiverPoints array at the top of the file
const waiverPoints = [
  [
    "Acknowledgement of Risk",
    "I acknowledge that participation in activities organised by Little Falls Runners NPC (in formation), including running, walking, training sessions, and related community activities, involves inherent risks — including personal injury, illness, or death, falls, collisions, environmental hazards, road and traffic-related incidents, and risks associated with group activities in public spaces. I voluntarily choose to participate and assume all associated risks.",
  ],
  [
    "Medical Fitness Declaration",
    "I confirm that I am physically and medically fit to participate, have not been advised otherwise by a qualified medical professional, and will take full responsibility for monitoring my health during participation.",
  ],
  [
    "Indemnity & Release of Liability",
    "I hereby indemnify and hold harmless Little Falls Runners NPC (in formation), its directors, organisers, volunteers, representatives, associated partners, service providers, and any connected third parties from any and all claims, liabilities, damages, losses, or expenses (including legal costs) arising directly or indirectly from my participation — including injury or death, loss or damage to personal property, and any incident occurring before, during, or after participation.",
  ],
  [
    "Personal Responsibility",
    "I agree to follow all safety instructions and guidelines, obey all road and public safety rules, run or walk within my personal limits, and take responsibility for my own safety at all times.",
  ],
  [
    "Voluntary Participation",
    "I understand that participation is entirely voluntary, I may withdraw at any time, and I participate at my own risk.",
  ],
  [
    "Media & Image Use",
    "Photographs and video recordings may be taken during activities. By participating, I grant implicit consent for such content to be used for social media, community communication, and promotional purposes. If I do not wish to appear in such content, it is my responsibility to inform organisers in advance.",
  ],
  [
    "Contributions",
    "Any financial contributions are voluntary and support the sustainability of the running group. Participation is not dependent on payment.",
  ],
  [
    "Legal Understanding",
    "I confirm that I have read and understood this waiver, agree to its terms voluntarily, and that this agreement is binding on me, my dependents, and my estate.",
  ],
  ["Governing Law", "This agreement is governed by the laws of the Republic of South Africa."],
] as const;

export default function Join() {
  const nav = useNavigate();
  const { user, isMember } = useAuth();

  const isOpenRunner = user && !isMember;

  const [tab, setTab] = useState<"member">("member");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");

  const [id, setId] = useState("");
  const [contact, setContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");

  const [checks, setChecks] = useState<boolean[]>(Array(waiverPoints.length).fill(false));
  const [submitting, setSubmitting] = useState(false);

  const allChecked = checks.every(Boolean);

  useEffect(() => {
    document.title = "Join — Waven Harper Fitness";
  }, []);

  useEffect(() => {
    const el = tabRefs.current[tab];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - parentRect.left,
      width: elRect.width,
    });
  }, [tab]);

  function setAll(value: boolean) {
    setChecks(Array(waiverPoints.length).fill(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Upgrading open runners are already authenticated — skip the password check
    if (!isOpenRunner && (!name || !email || !password)) {
      return toast.error("Please complete all required fields.");
    }

    setSubmitting(true);

    try {
      if (tab === "member" || isOpenRunner) {
        if (!allChecked) {
          setSubmitting(false);
          return toast.error("Please accept the full waiver to become a member.");
        }

        if (isOpenRunner) {
          await upgradeToMember({
            idNumber: id,
            contact,
            emergency: `${emergencyName} — ${emergencyNumber}`,
          });
        } else {
          await registerMember({
            name,
            email,
            password,
            idNumber: id,
            contact,
            emergency: `${emergencyName} — ${emergencyNumber}`,
          });
        }

        toast.success(`Welcome, ${name.split(" ")[0]}! Your membership account has been created.`);
        nav("/membership");
      } else {
      }
    } catch (error: any) {
      console.error(error);
      setSubmitting(false);

      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("An account already exists with this email.");
          break;
        case "auth/weak-password":
          toast.error("Password should be at least 6 characters.");
          break;
        case "auth/invalid-email":
          toast.error("Please enter a valid email address.");
          break;
        default:
          toast.error("Registration failed. Please try again.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-5 pt-14 pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Get on the start line</div>

        <h1 className="mt-3 display text-3xl">Join.</h1>

        {isOpenRunner ? (
          <p className="mt-4 text-muted-foreground">
            You&apos;re signed in as an Open Runner.{" "}
            <span className="text-foreground font-medium">Upgrade to a Club Member below.</span>
          </p>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="text-primary underline">
              Log in
            </Link>
            .
          </p>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-5">
        <form
          onSubmit={submit}
          className="mt-6 rounded-3xl border border-border bg-card p-6 space-y-4"
        >
          <div className="grid gap-4">
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              required
              disabled={!!isOpenRunner}
            />

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              disabled={!!isOpenRunner}
            />

            {!isOpenRunner && (
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                required
              />
            )}

            {(true || isOpenRunner) && (
              <>
                <Field
                  label="ID / Passport"
                  value={id}
                  onChange={setId}
                  required
                  pattern="^\d{13}$|^[A-Za-z0-9]{6,20}$"
                  title="Enter a 13-digit South African ID number, or a valid passport number (6–20 letters/numbers)."
                />
                <Field label="Contact number" value={contact} onChange={setContact} />
                <Field
                  label="Emergency contact name"
                  value={emergencyName}
                  onChange={setEmergencyName}
                />
                <Field
                  label="Emergency contact number"
                  type="tel"
                  value={emergencyNumber}
                  onChange={setEmergencyNumber}
                />
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                <ShieldCheck size={14} />
                Indemnity & Liability Waiver
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => setAll(e.target.checked)}
                  className="accent-primary"
                />
                Accept all
              </label>
            </div>

            <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              "No one is chasing us." — Little Falls Runners NPC
            </p>

            <ul className="mt-4 space-y-2">
              {waiverPoints.map(([title, body], i) => (
                <li key={title}>
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={(e) =>
                        setChecks((current) =>
                          current.map((value, idx) => (idx === i ? e.target.checked : value)),
                        )
                      }
                      className="accent-primary mt-0.5"
                    />
                    <span>
                      <strong className="text-foreground">{title}.</strong>{" "}
                      <span className="text-muted-foreground">{body}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          >
            <Check size={14} />
            {submitting
              ? "Please wait…"
              : isOpenRunner
                ? "Upgrade to Club Member"
                : "Become a Member"}
          </button>

          {!allChecked && (
            <p className="text-center text-[11px] text-muted-foreground">
              Tick every box to confirm you accept the full waiver.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  pattern,
  title,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  pattern?: string;
  title?: string;
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
        disabled={disabled}
        pattern={pattern}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </label>
  );
}
