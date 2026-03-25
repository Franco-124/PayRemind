import Link from "next/link";
import { BellRing } from "lucide-react";

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">PayRemind</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 2026</p>

        <Section title="1. Our Commitment">
          <p>
            At PayRemind, we want you to be completely satisfied with your purchase. If you are not
            happy with the Pro plan, we offer a straightforward refund policy.
          </p>
        </Section>

        <Section title="2. 7-Day Money-Back Guarantee">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>You may request a full refund within 7 days of your initial Pro plan purchase.</li>
            <li>This guarantee applies to first-time upgrades only.</li>
            <li>Renewals are not eligible for refunds.</li>
          </ul>
        </Section>

        <Section title="3. How to Request a Refund">
          <p className="mb-3">To request a refund:</p>
          <ol className="list-decimal pl-5 space-y-1 text-gray-600">
            <li>
              Email us at{" "}
              <a href="mailto:support@revoluciona.online" className="text-indigo-600 hover:underline">
                support@revoluciona.online
              </a>
            </li>
            <li>Use subject line: "Refund Request — [your email]"</li>
            <li>Include the reason for your refund request</li>
            <li>We will process your refund within 5–10 business days</li>
          </ol>
        </Section>

        <Section title="4. Cancellation">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>
              You can cancel your Pro subscription at any time from Settings → Subscription.
            </li>
            <li>
              After cancellation, you will retain Pro access until the end of your current billing
              period.
            </li>
            <li>Your data will be preserved for 30 days after cancellation.</li>
          </ul>
        </Section>

        <Section title="5. Non-Refundable Cases">
          <p className="mb-3">Refunds will not be issued for:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Requests made after 7 days of purchase.</li>
            <li>Subscription renewals.</li>
            <li>Accounts suspended for Terms of Service violations.</li>
          </ul>
        </Section>

        <Section title="6. Contact">
          <p>
            For refund requests or questions:
            <br />
            Email:{" "}
            <a href="mailto:support@revoluciona.online" className="text-indigo-600 hover:underline">
              support@revoluciona.online
            </a>
            <br />
            We respond within 24 business hours.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <p className="text-center text-sm text-gray-500">
          © 2026 PayRemind · support@revoluciona.online
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}
