import Link from "next/link";
import { BellRing } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using PayRemind ("the Service"), you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            PayRemind is a SaaS platform that helps freelancers and independent consultants manage
            unpaid invoices and send automated payment reminder emails to their clients.
          </p>
        </Section>

        <Section title="3. User Accounts">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your password.</li>
            <li>You must be at least 18 years old to use the Service.</li>
            <li>One person may not maintain more than one free account.</li>
          </ul>
        </Section>

        <Section title="4. Subscription and Payments">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>PayRemind offers a Free plan and a Pro plan at $12/month.</li>
            <li>Subscriptions are billed monthly and renew automatically.</li>
            <li>All payments are processed securely by Lemon Squeezy.</li>
            <li>Prices may change with 30 days prior notice.</li>
          </ul>
        </Section>

        <Section title="5. Refund Policy">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>We offer a 7-day money-back guarantee on the Pro plan.</li>
            <li>
              To request a refund, contact us at{" "}
              <a href="mailto:support@revoluciona.online" className="text-indigo-600 hover:underline">
                support@revoluciona.online
              </a>{" "}
              within 7 days of your purchase.
            </li>
            <li>Refunds are processed within 5–10 business days.</li>
            <li>After 7 days, no refunds will be issued for the current billing period.</li>
          </ul>
        </Section>

        <Section title="6. Acceptable Use">
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Use the Service for spam or unsolicited emails.</li>
            <li>Attempt to gain unauthorized access to the Service.</li>
            <li>Use the Service for any illegal purpose.</li>
            <li>Resell or sublicense the Service.</li>
          </ul>
        </Section>

        <Section title="7. Data and Privacy">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>We collect only the data necessary to provide the Service.</li>
            <li>We do not sell your personal data to third parties.</li>
            <li>Client email addresses you add are used solely to send reminders on your behalf.</li>
            <li>
              We use OpenAI to generate email content. No sensitive data is shared beyond what is
              necessary for generation.
            </li>
          </ul>
        </Section>

        <Section title="8. Service Availability">
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>We strive for 99% uptime but do not guarantee uninterrupted service.</li>
            <li>
              We reserve the right to modify or discontinue the Service with 30 days notice.
            </li>
          </ul>
        </Section>

        <Section title="9. Limitation of Liability">
          <p className="mb-3">PayRemind is not liable for:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Emails that are not delivered or marked as spam.</li>
            <li>Any indirect or consequential damages arising from use of the Service.</li>
            <li>Actions taken by your clients in response to reminder emails.</li>
          </ul>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These Terms are governed by the laws of Colombia. Any disputes will be resolved in the
            courts of Bogotá, Colombia.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For questions about these Terms, contact us at:{" "}
            <a href="mailto:support@revoluciona.online" className="text-indigo-600 hover:underline">
              support@revoluciona.online
            </a>
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
