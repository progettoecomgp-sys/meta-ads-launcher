import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Bolt Ads</span>
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">Log in</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using Bolt Ads ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              Bolt Ads is a tool for bulk launching and managing advertising campaigns on the Meta (Facebook/Instagram) platform.
              The Service connects to Meta's Marketing API on your behalf to create and manage ad campaigns, ad sets, and ads.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Account Requirements</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>You must have a valid Meta Business account and ad account to use the Service</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 18 years old to use the Service</li>
              <li>You are responsible for all activity that occurs under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Violate Meta's Advertising Policies or Community Standards</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Reverse-engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to send spam or misleading advertisements</li>
              <li>Share your account credentials with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Meta Platform Compliance</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service operates through Meta's Marketing API. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Meta's terms of service and advertising policies apply to all campaigns created through the Service</li>
              <li>We are not responsible for Meta's platform availability, policy changes, or account restrictions</li>
              <li>Ad spend is charged directly by Meta to your ad account — we do not process ad spend payments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              You retain ownership of all creative assets (images, videos, copy) you upload to the Service.
              We do not claim any rights to your content. You grant us a limited license to process your content
              solely for the purpose of delivering the Service (uploading to Meta's platform on your behalf).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We are not liable for:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Ad performance, ad spend, or campaign results</li>
              <li>Meta platform downtime or API changes</li>
              <li>Loss of data due to circumstances beyond our reasonable control</li>
              <li>Any indirect, incidental, or consequential damages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Account Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              You may delete your account at any time from the Settings page. Upon deletion, all your personal data
              will be permanently removed within 30 days. We reserve the right to suspend or terminate accounts
              that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the new terms. We will notify users of material changes via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms, contact us at: <a href="mailto:legal@bolt-ads.com" className="text-indigo-600 hover:underline">legal@bolt-ads.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
