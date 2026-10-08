import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  MessageCircle,
  Mail,
  Instagram,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { WHATSAPP_NUMBER, BANK_DETAILS, ADMIN_EMAIL } from "@/lib/demo-data";
import { useState } from "react";

const faqs = [
  {
    q: "How do I join the Little Falls Runners club?",
    a: "Head to the LFR Club page and tap 'Join the Club'. You'll complete a quick registration and accept the indemnity waiver. Once done, you're in — no fees required to start running with us.",
  },
  {
    q: "What's the difference between a Member and an Open Runner?",
    a: "Open Runners can join most runs for free with no obligation. Members get access to the full platform: rewards, tier progression, members-only events, and race check-in. Membership is open to anyone who wants to commit to the community.",
  },
  {
    q: "How does the tier system work?",
    a: "Tiers are based on races attended per calendar year: Bronze (start), Silver (12 races), Gold (24 races), Platinum (36 races). Tiers reset on 1 January each year. Platinum is retained if you attend at least 12 races in the first 6 months of the year — otherwise you drop one level.",
  },
  {
    q: "How do I check in at an event?",
    a: "The check-in button activates 30 minutes before the event start time and stays open for 2 hours after. You need to be at the location so that they can give you a QR-code for you to scan . Make sure camera permissions are enabled in your browser.",
  },
  {
    q: "The app is asking for camera or notification permissions — should I accept?",
    a: "Yes, we recommend accepting both. Camera access is needed to scan the QR code at check-in and when redeeming rewards, and notification access lets us alert you about event updates and reward unlocks. If you accidentally decline, you can re-enable permissions in your browser or phone settings — look for 'Site settings' or 'App permissions' and allow Camera and Notifications for this site.",
  },
  {
    q: "I signed up for an event but can't make it — what do I do?",
    a: "No problem — Just remove the sign up by pressing the revome button but if not just don't check-in . There's no penalty for missing a run.",
  },
  {
    q: "How do I redeem my tier rewards?",
    a: "When a reward is available for your tier, you'll see it on your Rewards page. You have 1 month to redeem it. Go to the selected store and they will show you a QR-code to scan by clicking the reedem button.",
  },
  {
    q: "I forgot my password / can't log in.",
    a: "Use the 'Forgot password' option on the login screen.",
  },
  {
    q: "Can I participate if I'm not a runner — e.g. walking only?",
    a: "Absolutely. The club welcomes walkers, joggers, and runners of all paces. Our motto is 'No one is chasing us.'",
  },
  {
    q: "How do I update my emergency contact details?",
    a: "Go to your Profile page and edit your details there. Keeping emergency contacts up to date is important — please do this promptly if anything changes.",
  },
  {
    q: "What are the bank details for paying for merch orders?",
    a: `Account name: ${BANK_DETAILS.accountName}. Bank: ${BANK_DETAILS.bank}. Account number: ${BANK_DETAILS.accountNumber}. Account type: ${BANK_DETAILS.accountType}. Branch code: ${BANK_DETAILS.branchCode}. Always use your order reference number (shown after you submit your order, e.g. LFR-XXXXX) as the payment reference so we can match your payment quickly. Once you've paid, please send proof of payment to ${ADMIN_EMAIL} so we can confirm and process your order.`,
  },
] as const;

export default function Support() {
  const waSupport = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Waven, I need some help with the app.")}`;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md md:max-w-2xl px-5 md:px-8 pt-6 pb-16">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        {/* Header */}
        <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-2">
          Waven Harper Fitness
        </div>
        <h1 className="display text-3xl md:text-4xl leading-tight mb-2">Support</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Need help? Check the FAQs below or reach out to us directly — we're a small team and we
          respond fast.
        </p>

        {/* Contact cards */}
        <div className="mb-12">
          <a
            href="mailto:wavenharper@gmail.com?subject=Support%20Request&body=Hi%20Waven%2C%20I%20need%20help%20with..."
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-foreground/40 transition"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </div>
              <div className="display text-sm truncate">wavenharper@gmail.com</div>
            </div>
            <ArrowUpRight
              size={13}
              className="text-muted-foreground group-hover:text-foreground transition shrink-0"
            />
          </a>
        </div>

        {/* FAQs */}
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-4">
          Frequently Asked Questions
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <button
                key={i}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full text-left rounded-2xl border border-border bg-card px-5 py-4 hover:border-foreground/30 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-foreground font-medium leading-snug">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
                {isOpen && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
