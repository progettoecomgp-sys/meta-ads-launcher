import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    title: 'Bulk Upload',
    desc: 'Upload 100+ creatives at once. Drag & drop videos and images, we handle the rest.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'One-Click Launch',
    desc: 'Select your ad sets, pick your creatives, and launch everything in one click.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: 'Multi Ad Set',
    desc: 'Launch across 20+ ad sets simultaneously. No more repetitive manual work.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Real-Time Metrics',
    desc: 'Track spend, CPM, CPC, CTR across all your campaigns in one dashboard.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Launch History',
    desc: 'Full audit trail of every launch. See what was created, when, and by whom.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure & Private',
    desc: 'Your Meta API token stays encrypted. We never store your ad account credentials.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Connect your Meta account',
    desc: 'Log in with Facebook or enter your API token manually. We connect to your ad accounts securely.',
  },
  {
    num: '02',
    title: 'Upload your creatives',
    desc: 'Drag and drop 100+ images and videos at once. We validate formats and sizes automatically.',
  },
  {
    num: '03',
    title: 'Select ad sets & launch',
    desc: 'Pick your existing ad sets, assign creatives, and launch everything in a single click.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Marco R.',
    role: 'Performance Marketer',
    text: 'Bolt Ads cut my ad launching time from 3 hours to 10 minutes. I can test 50+ creatives per day now.',
    initials: 'MR',
  },
  {
    name: 'Sophie L.',
    role: 'Media Buyer, Agency',
    text: 'Managing 15 ad accounts used to be a nightmare. Now I launch across all of them in one session.',
    initials: 'SL',
  },
  {
    name: 'James K.',
    role: 'E-commerce Owner',
    text: 'The bulk upload feature alone is worth it. No more clicking through Facebook Ads Manager for hours.',
    initials: 'JK',
  },
];

const FAQS = [
  {
    q: 'Do I need a Meta Business account?',
    a: 'Yes. Bolt Ads connects to your existing Meta (Facebook) ad accounts via the official API. You need at least one active ad account.',
  },
  {
    q: 'Is my access token safe?',
    a: 'Absolutely. Your token is stored encrypted in our database and is never shared. We use Supabase with Row Level Security — only you can access your data.',
  },
  {
    q: 'What ad formats are supported?',
    a: 'Images (JPG, PNG, WebP) and videos (MP4, MOV). We validate file sizes and formats before upload to ensure compatibility with Meta\'s requirements.',
  },
  {
    q: 'Can I use multiple ad accounts?',
    a: 'Yes! Switch between unlimited ad accounts from the sidebar. Each account gets its own set of campaigns, ad sets, and creatives.',
  },
  {
    q: 'Is there a limit on creatives?',
    a: 'No artificial limits. Upload as many creatives as you want. We batch API calls to respect Meta\'s rate limits automatically.',
  },
  {
    q: 'How is this different from Ads Manager?',
    a: 'Bolt Ads is built for speed. Instead of clicking through Meta\'s interface to add one creative at a time, you upload 100+ and launch them across multiple ad sets in seconds.',
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#7C5CFC] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Bolt Ads</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors hidden sm:block">
              Log in
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 bg-[#7C5CFC] hover:bg-[#6B4DE6] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#7C5CFC]/[0.08] border border-[#7C5CFC]/20 rounded-full text-xs font-medium text-[#7C5CFC] mb-8">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            The fastest way to launch Meta ads
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
            Launch 100+ ad creatives
            <br />
            <span className="bg-gradient-to-r from-[#7C5CFC] to-[#6366f1] bg-clip-text text-transparent">
              in seconds, not hours
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop wasting time in Ads Manager. Upload your creatives in bulk, select your ad sets,
            and launch everything across multiple campaigns with one click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/login"
              className="px-8 py-4 bg-[#7C5CFC] hover:bg-[#6B4DE6] text-white text-base font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#7C5CFC]/20 flex items-center gap-2 btn-glow"
            >
              Start Launching Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-base font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex -space-x-2">
              {['MR', 'SL', 'JK', 'AL'].map((init, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#6366f1] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                >
                  {init}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <StarRating />
              <span>Trusted by media buyers worldwide</span>
            </div>
          </div>
        </div>

        {/* Hero visual — App preview mockup */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/50 bg-gradient-to-b from-gray-50 to-white p-1">
            <div className="rounded-xl overflow-hidden bg-white border border-gray-100">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300" />
                  <div className="w-3 h-3 rounded-full bg-green-300" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-white rounded-md text-xs text-gray-400 border border-gray-100">
                    bolt-ads.com
                  </div>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="p-6 md:p-8">
                <div className="flex gap-6">
                  {/* Mini sidebar */}
                  <div className="hidden md:block w-44 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-7 h-7 bg-[#7C5CFC] rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-gray-900">Bolt Ads</span>
                    </div>
                    {['Dashboard', 'Upload', 'History', 'Metrics', 'Settings'].map((item, i) => (
                      <div
                        key={item}
                        className={`px-3 py-2 rounded-lg text-xs mb-1 ${
                          i === 1 ? 'bg-[#7C5CFC]/[0.08] text-[#7C5CFC] font-medium' : 'text-gray-400'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* Main content area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900">Upload Creatives</h3>
                      <div className="px-3 py-1 bg-[#7C5CFC] rounded-lg text-[10px] text-white font-medium">Launch All</div>
                    </div>
                    {/* Upload zone */}
                    <div className="border-2 border-dashed border-[#7C5CFC]/20 rounded-xl p-6 text-center mb-4 bg-[#7C5CFC]/[0.03]">
                      <svg className="w-8 h-8 text-[#7C5CFC]/30 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-xs text-gray-400">Drop creatives here</p>
                    </div>
                    {/* Creative grid preview */}
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="py-12 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '100+', label: 'Creatives per launch' },
            { value: '88%', label: 'Faster than Ads Manager' },
            { value: '20+', label: 'Ad sets at once' },
            { value: '0', label: 'Learning curve' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-[#7C5CFC] to-[#6366f1] bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#7C5CFC]/[0.08] text-[#7C5CFC] text-xs font-semibold rounded-full mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to launch ads fast
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Built for media buyers who need to test creatives at scale without the tedious manual work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#7C5CFC]/20 hover:shadow-lg hover:shadow-[#7C5CFC]/10 transition-all glass-card rounded-xl"
              >
                <div className="w-12 h-12 bg-[#7C5CFC]/[0.08] group-hover:bg-[#7C5CFC]/[0.15] rounded-xl flex items-center justify-center text-[#7C5CFC] mb-4 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#7C5CFC]/[0.08] text-[#7C5CFC] text-xs font-semibold rounded-full mb-4">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              3 steps to launch your ads
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              No complicated setup. Connect, upload, and launch in under 60 seconds.
            </p>
          </div>

          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 bg-[#7C5CFC] rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  {s.num}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#7C5CFC] hover:bg-[#6B4DE6] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#7C5CFC]/20"
            >
              Try it now — it's free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#7C5CFC]/[0.08] text-[#7C5CFC] text-xs font-semibold rounded-full mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by media buyers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 glass-card rounded-xl">
                <StarRating />
                <p className="text-gray-600 mt-4 mb-6 leading-relaxed text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#6366f1] flex items-center justify-center text-xs font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#7C5CFC]/[0.08] text-[#7C5CFC] text-xs font-semibold rounded-full mb-4">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-2xl border border-gray-200 glass-card rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Free</h3>
              <p className="text-sm text-gray-400 mb-6">Perfect to get started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['1 ad account', 'Up to 10 creatives/launch', 'Basic metrics', 'Email support'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="p-8 rounded-2xl border-2 border-[#7C5CFC] glass-card rounded-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#7C5CFC] text-white text-xs font-semibold rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>
              <p className="text-sm text-gray-400 mb-6">For serious media buyers</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$49</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited ad accounts',
                  'Unlimited creatives/launch',
                  'Multi ad set launching',
                  'Advanced metrics & history',
                  'Priority support',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-[#7C5CFC] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="block w-full py-3 text-center bg-[#7C5CFC] hover:bg-[#6B4DE6] text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Agency */}
            <div className="p-8 rounded-2xl border border-gray-200 glass-card rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Agency</h3>
              <p className="text-sm text-gray-400 mb-6">For teams managing clients</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$149</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pro',
                  'Team access (5 seats)',
                  'Client-level organization',
                  'Custom branding',
                  'Dedicated account manager',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#7C5CFC]/[0.08] text-[#7C5CFC] text-xs font-semibold rounded-full mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-gray-100 glass-card rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-left">
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </summary>
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-[#7C5CFC] to-[#6366f1] rounded-3xl p-12 md:p-16 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to launch ads 10x faster?
            </h2>
            <p className="text-white/70 max-w-xl mx-auto mb-8">
              Join media buyers who save hours every day with Bolt Ads.
              Start for free — no credit card required.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-[#7C5CFC] font-bold rounded-xl transition-all hover:shadow-lg text-base"
            >
              Get Started Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#7C5CFC] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900">Bolt Ads</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#features" className="hover:text-gray-600 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-gray-600 transition-colors">Pricing</a>
              <Link to="/faq" className="hover:text-gray-600 transition-colors">FAQ</Link>
              <Link to="/status" className="hover:text-gray-600 transition-colors">Status</Link>
              <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
              <Link to="/login" className="hover:text-gray-600 transition-colors">Log in</Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Bolt Ads. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
