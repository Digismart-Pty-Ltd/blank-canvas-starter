import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
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
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={16} className="text-primary" />
          </div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Waven Harper Fitness
          </div>
        </div>
        <h1 className="display text-3xl md:text-4xl leading-tight mb-1">Privacy Policy</h1>
        <p className="text-[11px] text-muted-foreground mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <Section title="1. Who We Are">
            <p>
              Waven Harper Fitness operates this platform, including the Little Falls Runners
              community features, events management, and membership rewards. We are based in
              Roodepoort, South Africa. When we say "we," "us," or "our," we mean Waven Harper
              Fitness and its associated operations.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following types of information:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                {
                  label: "Account details",
                  desc: "Name, surname, ID or passport number, contact number, and emergency contact details provided during registration.",
                },
                {
                  label: "Participation data",
                  desc: "Event sign-ups, race attendance, check-in records, tier status, and reward history.",
                },
                {
                  label: "Location data",
                  desc: "Approximate GPS location used only during event check-in windows (30 minutes before to 2 hours after event start). We do not track your location at any other time.",
                },
                {
                  label: "Device information",
                  desc: "Basic device identifiers recorded when you accept the indemnity waiver, as required for legal confirmation purposes.",
                },
                {
                  label: "Media consent",
                  desc: "Your acknowledgement regarding photographs and video recordings taken at club events.",
                },
              ].map((item) => (
                <li key={item.label} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 translate-y-1.5" />
                  <span>
                    <span className="text-foreground font-medium">{item.label}:</span> {item.desc}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>Your information is used solely to:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Manage your membership and participation in events",
                "Track tier progression and rewards (Bronze → Silver → Gold → Platinum)",
                "Enable geo-location check-ins at events",
                "Send event reminders and notifications",
                "Maintain records of accepted indemnity waivers",
                "Allow admins to manage event sign-ups and attendance",
                "Communicate club news and upcoming events",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 translate-y-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes.
            </p>
          </Section>

          <Section title="4. Legal Basis for Processing">
            <p>
              We process your data on the basis of your explicit consent (provided during
              registration and event sign-up), and where necessary to fulfil our obligations to you
              as a member or participant. This is governed by the Protection of Personal Information
              Act (POPIA) of the Republic of South Africa.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your personal information for as long as your membership is active.
              Participation and tier records reset annually on 1 January, though historical records
              may be retained for administrative and legal purposes. You may request deletion of
              your account at any time (see Section 8 below).
            </p>
          </Section>

          <Section title="6. Media & Photography">
            <p>
              Photographs and video recordings may be taken at events. By participating, you grant
              implicit consent for such content to be used for social media, community
              communication, and promotional purposes. If you do not wish to appear in such content,
              it is your responsibility to inform organisers before the event.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We take reasonable steps to protect your personal information from unauthorised
              access, loss, or misuse. Our platform uses secure authentication and encrypted data
              storage. However, no system is completely secure — please use a strong password and
              keep your login details confidential.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Under POPIA, you have the right to:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Access the personal information we hold about you",
                "Request correction of inaccurate information",
                "Request deletion of your account and personal data",
                "Object to the processing of your information",
                "Lodge a complaint with the Information Regulator of South Africa",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 translate-y-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us via the{" "}
              <Link
                to="/support"
                className="text-foreground underline underline-offset-2 hover:text-primary transition"
              >
                Support page
              </Link>
              .
            </p>
          </Section>

          <Section title="9. Cookies & Analytics">
            <p>
              This platform may use basic session cookies to keep you logged in. We do not use
              third-party advertising or tracking cookies. Any analytics collected are anonymised
              and used only to improve the app experience.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              date at the top of this page. Continued use of the platform after changes constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have any questions about this Privacy Policy or how we handle your data, please
              reach out via the{" "}
              <Link
                to="/support"
                className="text-foreground underline underline-offset-2 hover:text-primary transition"
              >
                Support page
              </Link>{" "}
              or contact Waven Harper Fitness directly on WhatsApp.
            </p>
          </Section>
        </div>

        {/* Footer note */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1">
            Governing Law
          </p>
          <p className="text-sm text-muted-foreground">
            This Privacy Policy is governed by the laws of the Republic of South Africa, including
            the Protection of Personal Information Act (POPIA), No. 4 of 2013.
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display text-base text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}
