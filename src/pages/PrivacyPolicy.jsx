import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Data We Collect</h2>
            <p className="text-gray-600 leading-relaxed">When you use Bolt Ads, we collect:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li><strong>Account data:</strong> Email address, name (from Facebook Login or manual registration)</li>
              <li><strong>Meta API token:</strong> Your Facebook access token, stored securely to make API calls on your behalf</li>
              <li><strong>Usage data:</strong> Campaign launches, ad creatives metadata (file names, sizes), settings preferences</li>
              <li><strong>Audit logs:</strong> Actions you take within the app (logins, launches, setting changes) with timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>To provide and operate the Bolt Ads service</li>
              <li>To authenticate you with Meta's advertising platform</li>
              <li>To launch and manage your ad campaigns via the Meta Marketing API</li>
              <li>To display your campaign history and performance metrics</li>
              <li>To improve the service and troubleshoot issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Data Storage & Security</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is stored in Supabase (PostgreSQL) with Row Level Security enabled — each user can only access their own data.
              All connections use HTTPS/TLS encryption in transit. Access tokens are stored server-side and never exposed to other users.
              We use security headers (CSP, HSTS, X-Frame-Options) to protect against common web vulnerabilities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Third-Party Services</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li><strong>Meta (Facebook):</strong> We connect to Meta's API to manage your ad campaigns. Meta's privacy policy applies to data processed by their platform.</li>
              <li><strong>Supabase:</strong> Database and authentication provider. Data stored in their cloud infrastructure.</li>
              <li><strong>Fly.io:</strong> Application hosting provider.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Your Rights (GDPR)</h2>
            <p className="text-gray-600 leading-relaxed">If you are in the EU/EEA, you have the right to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li><strong>Access:</strong> Request a copy of all your personal data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format (JSON)</li>
              <li><strong>Erasure:</strong> Request permanent deletion of your account and all associated data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              You can exercise these rights from the <strong>Settings</strong> page within the app, or by contacting us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active. When you delete your account,
              all personal data is permanently removed within 30 days. Audit logs are retained for 90 days for security purposes,
              then automatically purged.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Bolt Ads uses essential cookies only (authentication session). We do not use tracking cookies,
              analytics cookies, or third-party advertising cookies. The Facebook SDK may set its own cookies
              when you use Facebook Login.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related inquiries, contact us at: <a href="mailto:privacy@bolt-ads.com" className="text-indigo-600 hover:underline">privacy@bolt-ads.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
