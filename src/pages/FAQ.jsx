import { Link } from 'react-router-dom';

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is Bolt Ads?',
        a: 'Bolt Ads is a streamlined tool for launching Meta (Facebook & Instagram) ads. Upload your creatives, configure your campaign settings, and launch ads in minutes — without navigating the complex Meta Ads Manager interface.',
      },
      {
        q: 'How do I connect my Facebook account?',
        a: 'Click "Login with Facebook" on the login page. You\'ll be asked to grant permissions for managing your ad accounts. After authorization, you\'ll go through a quick onboarding wizard to select your ad account, Facebook Page, and other settings.',
      },
      {
        q: 'Do I need a Facebook Business Manager?',
        a: 'Not necessarily. You need a Facebook ad account and at least one Facebook Page. Business Manager is recommended for managing multiple accounts, but Bolt Ads works with personal ad accounts too.',
      },
      {
        q: 'What permissions does Bolt Ads need?',
        a: 'We request ads_management (to create/manage campaigns), pages_read_engagement (to use your Pages), and business_management (to access Business Manager resources). We never post to your Page or modify anything outside of ad campaigns.',
      },
    ],
  },
  {
    title: 'Campaigns & Ads',
    items: [
      {
        q: 'What file formats are supported?',
        a: 'Images: JPG, PNG, WebP (up to 30MB). Videos: MP4, MOV (up to 4GB). You can also create carousel ads with multiple images.',
      },
      {
        q: 'Can I launch ads to multiple ad sets at once?',
        a: 'Yes! Bolt Ads supports multi-adset launching. You can create multiple ad sets with different targeting, budgets, and optimization goals, then assign creatives to all of them in one click.',
      },
      {
        q: 'What happens after I launch?',
        a: 'Your ads are created in your Meta ad account with the status you selected (usually PAUSED). You can review them in Meta Ads Manager or in Bolt Ads\' History page before activating them.',
      },
      {
        q: 'Can I track my ad performance?',
        a: 'Yes, the Metrics page shows key metrics like impressions, clicks, spend, CPC, CPM, and CTR. You can filter by date range and drill down to campaign, ad set, or ad level.',
      },
    ],
  },
  {
    title: 'Account & Security',
    items: [
      {
        q: 'Is my Facebook access token secure?',
        a: 'Yes. Your token is stored encrypted in our database and is never exposed to other users. We exchange your short-lived token for a long-lived one (60 days) server-side, so your app secret is never exposed to the browser.',
      },
      {
        q: 'Can I export or delete my data?',
        a: 'Absolutely. Go to Settings > Data & Privacy. You can export all your data as JSON or permanently delete your account and all associated data. We comply with GDPR requirements.',
      },
      {
        q: 'What happens when my token expires?',
        a: 'Facebook tokens last about 60 days. Bolt Ads will warn you when your token is about to expire. Simply click "Reconnect" in Settings to get a fresh token — no data is lost.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        q: 'My ad was rejected by Meta. What should I do?',
        a: 'Meta reviews all ads against their advertising policies. Common reasons for rejection include misleading content, prohibited products, or policy-violating images. Review Meta\'s Advertising Standards and edit your creative accordingly. You can check ad status in the History page.',
      },
      {
        q: 'I\'m getting a "rate limit" error. What does that mean?',
        a: 'Meta limits how many API calls you can make per minute. Bolt Ads automatically retries rate-limited requests, but if you\'re launching many ads quickly, try waiting a minute before retrying.',
      },
      {
        q: 'My ad account shows as "Disabled". Can Bolt Ads help?',
        a: 'No — ad account restrictions are managed by Meta directly. Visit Meta Business Help Center to appeal or resolve account issues. Bolt Ads simply reads your account status and cannot change it.',
      },
      {
        q: 'I don\'t see my Facebook Page in the page picker.',
        a: 'Make sure you have admin or editor access to the Page. If the Page belongs to a Business Manager, ensure it\'s shared with the ad account you selected. Try reconnecting your Facebook account to refresh permissions.',
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-sm text-gray-400 mb-10">Everything you need to know about Bolt Ads</p>

        <div className="space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details key={item.q} className="group border border-border rounded-lg glass-card rounded-xl">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                      {item.q}
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-4">
                      <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 text-center border-t border-border pt-8">
          <p className="text-sm text-gray-500">
            Still have questions?{' '}
            <a href="mailto:support@bolt-ads.com" className="text-accent hover:underline">Contact support</a>
          </p>
        </div>
      </main>
    </div>
  );
}
