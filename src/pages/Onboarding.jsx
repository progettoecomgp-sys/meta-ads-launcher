import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { facebookLogin, exchangeForLongLivedToken, initFacebookSDK } from '../utils/facebookAuth';
import { getAdAccounts, getPages, getInstagramAccounts, getPixels } from '../utils/metaApi';

const STEPS = [
  { key: 'welcome', label: 'Welcome', description: 'Choose your ad account', icon: '👋' },
  { key: 'connect', label: 'Connect', description: 'Connect your pages', icon: '📄' },
  { key: 'track', label: 'Track', description: 'Select your pixel', icon: '🎯' },
  { key: 'website', label: 'Website', description: 'Add your website', icon: '🌐' },
  { key: 'complete', label: 'Complete', description: "You're all set!", icon: '🚀' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, setSettings } = useApp();
  const [step, setStep] = useState(0);

  // Step 1: Ad accounts
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(settings.adAccountId || '');
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Step 2: Pages
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(settings.facebookPageId || '');
  const [selectedPageName, setSelectedPageName] = useState(settings.facebookPageName || '');
  const [igAccounts, setIgAccounts] = useState([]);
  const [selectedIg, setSelectedIg] = useState(settings.instagramAccountId || '');
  const [selectedIgName, setSelectedIgName] = useState(settings.instagramAccountName || '');
  const [euAdvertising, setEuAdvertising] = useState(settings.euAdvertising || false);
  const [loadingPages, setLoadingPages] = useState(false);

  // Step 3: Pixel
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(settings.pixelId || '');
  const [selectedPixelName, setSelectedPixelName] = useState(settings.pixelName || '');
  const [loadingPixels, setLoadingPixels] = useState(false);

  // Step 4: Website
  const [websiteUrl, setWebsiteUrl] = useState(settings.websiteUrl || '');

  // Track what was skipped
  const [skipped, setSkipped] = useState({ connect: false, track: false, website: false });

  // Facebook connect state
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  const hasToken = !!settings.accessToken;

  // Preload Facebook SDK
  useEffect(() => { initFacebookSDK().catch(() => {}); }, []);

  // Load ad accounts when token is available
  useEffect(() => {
    if (!hasToken) return;
    setLoadingAccounts(true);
    getAdAccounts(settings.accessToken)
      .then(setAdAccounts)
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, [hasToken, settings.accessToken]);

  // Load pages when entering step 2
  useEffect(() => {
    if (step !== 1 || !hasToken) return;
    setLoadingPages(true);
    getPages(settings.accessToken, selectedAccount)
      .then(setPages)
      .catch(() => {})
      .finally(() => setLoadingPages(false));
  }, [step, hasToken, settings.accessToken, selectedAccount]);

  // Load IG accounts when page changes
  useEffect(() => {
    if (!selectedPage || !hasToken) { setIgAccounts([]); return; }
    const pageObj = pages.find((p) => p.id === selectedPage);
    getInstagramAccounts(settings.accessToken, selectedPage, {
      pageToken: pageObj?.access_token,
      accountId: selectedAccount,
    })
      .then(setIgAccounts)
      .catch(() => setIgAccounts([]));
  }, [selectedPage, hasToken, settings.accessToken, pages, selectedAccount]);

  // Load pixels when entering step 3
  useEffect(() => {
    if (step !== 2 || !hasToken || !selectedAccount) return;
    setLoadingPixels(true);
    getPixels(settings.accessToken, selectedAccount)
      .then(setPixels)
      .catch(() => {})
      .finally(() => setLoadingPixels(false));
  }, [step, hasToken, settings.accessToken, selectedAccount]);

  const handleConnectFacebook = async () => {
    setConnecting(true);
    setConnectError('');
    try {
      const { accessToken: shortToken } = await facebookLogin();
      const { accessToken, expiresIn, userName } = await exchangeForLongLivedToken(shortToken);
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      setSettings({ accessToken, facebookUserName: userName, tokenExpiresAt: expiresAt });
    } catch (err) {
      setConnectError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const canContinue = () => {
    if (step === 0) return hasToken && selectedAccount;
    return true;
  };

  const handleContinue = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleSkip = () => {
    setSkipped((prev) => ({ ...prev, [STEPS[step].key]: true }));
    handleContinue();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = () => {
    setSettings({
      adAccountId: selectedAccount,
      facebookPageId: selectedPage,
      facebookPageName: selectedPageName,
      instagramAccountId: selectedIg,
      instagramAccountName: selectedIgName,
      pixelId: selectedPixel,
      pixelName: selectedPixelName,
      websiteUrl,
      euAdvertising,
      onboardingCompleted: true,
    });
    navigate('/dashboard', { replace: true });
  };

  const handleStepClick = (i) => {
    if (i < step) setStep(i);
  };

  const inputCls = "w-full border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent bg-white";

  // Completeness for summary
  const completedCount = [
    !!selectedAccount,
    !!selectedPage && !skipped.connect,
    !!selectedIg && !skipped.connect,
    !!selectedPixel && !skipped.track,
    !!websiteUrl && !skipped.website,
  ].filter(Boolean).length;

  const summary = [
    { label: 'Ad account connected', done: !!selectedAccount },
    { label: 'Facebook page linked', done: !!selectedPage && !skipped.connect },
    { label: 'Instagram page linked', done: !!selectedIg && !skipped.connect, skipped: skipped.connect || !selectedIg },
    { label: 'Facebook pixel set', done: !!selectedPixel && !skipped.track, skipped: skipped.track },
    { label: 'Website URL added', done: !!websiteUrl && !skipped.website, skipped: skipped.website },
  ];

  // Step icons for the stepper
  const stepIcons = [
    <svg key="s0" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    <svg key="s1" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    <svg key="s2" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    <svg key="s3" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    <svg key="s4" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-[420px] flex-shrink-0 bg-gradient-to-b from-[#7C5CFC] via-[#6B4DE6] to-[#5B3FD0] text-white flex flex-col">
        {/* Logo */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base font-bold">BoltAds</span>
          </div>
        </div>

        {/* Sidebar content changes based on step */}
        <div className="flex-1 px-8">
          {step === 0 ? (
            /* Step 1: Motivational text instead of stepper */
            <div className="mt-8">
              <h2 className="text-[28px] font-bold leading-tight mb-4">
                You're just a few clicks away from launching ads
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                Save 100's of hours every month for higher ROI tasks that actually drive revenue
              </p>
              <div className="mt-12 w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          ) : (
            /* Steps 2-5: Quick Setup stepper */
            <div>
              <h2 className="text-xl font-bold mb-1">Quick Setup</h2>
              <p className="text-sm text-white/50 mb-8">Get ready to launch ads in minutes</p>

              {/* Stepper */}
              <div className="relative">
                {STEPS.map((s, i) => {
                  const isCurrent = i === step;
                  const isDone = i < step;
                  const isFuture = i > step;
                  return (
                    <div key={s.key} className="relative flex items-start gap-4 mb-1">
                      {/* Vertical line */}
                      {i < STEPS.length - 1 && (
                        <div
                          className={`absolute left-[22px] top-[44px] w-[2px] h-[28px] ${
                            i < step ? 'bg-white/40' : 'bg-white/10'
                          }`}
                        />
                      )}
                      {/* Circle */}
                      <button
                        onClick={() => handleStepClick(i)}
                        disabled={isFuture}
                        className={`w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isDone
                            ? 'bg-white/20 cursor-pointer hover:bg-white/30'
                            : isCurrent
                            ? 'bg-white text-[#7C5CFC] shadow-lg shadow-white/20'
                            : 'bg-white/10 cursor-default'
                        }`}
                      >
                        {isDone ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className={isCurrent ? 'text-[#7C5CFC]' : 'text-white/40'}>{stepIcons[i]}</span>
                        )}
                      </button>
                      {/* Label */}
                      <div className="pt-2">
                        <p className={`text-sm font-semibold ${isFuture ? 'text-white/40' : 'text-white'}`}>{s.label}</p>
                        <p className={`text-xs ${isFuture ? 'text-white/20' : 'text-white/50'}`}>{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-8 pb-4">
          <div className="border-t border-white/10 pt-4">
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>Progress</span>
              <span>{step + 1} of {STEPS.length}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-white/30 mt-4">Setup takes 60 seconds, change these settings anytime</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#FCFCFD] flex flex-col min-h-screen">
        <div className="flex-1 flex items-start justify-center px-12 pt-16 pb-8 overflow-y-auto">
          <div className="w-full max-w-[560px]">

            {/* Step 0: Welcome / Ad Account */}
            {step === 0 && (
              <div>
                <h2 className="text-[32px] font-bold mb-2">{STEPS[0].icon} Welcome to BoltAds</h2>
                <p className="text-text-secondary text-[15px] mb-10">Let's get you set up to launch your first ads in under 60 seconds.</p>

                {!hasToken ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-[#1877f2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-lg mb-2">Connect with Facebook</h3>
                    <p className="text-sm text-text-secondary mb-6">Sign in with your Facebook account to manage your ads</p>
                    {connectError && <p className="text-sm text-danger mb-3">{connectError}</p>}
                    <button
                      onClick={handleConnectFacebook}
                      disabled={connecting}
                      className="px-8 py-3 bg-[#1877f2] text-white rounded-xl text-sm font-semibold hover:bg-[#166fe5] transition-colors inline-flex items-center gap-2.5 disabled:opacity-60"
                    >
                      {connecting ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connecting...</>
                      ) : (
                        <><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> Continue with Facebook</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-bold mb-1">Select your main ad account</h3>
                    <p className="text-sm text-text-secondary mb-5">Choose the ad account you use the most, you can change this anytime.</p>

                    {loadingAccounts ? (
                      <div className="flex items-center gap-2 py-3">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-text-secondary">Loading ad accounts...</span>
                      </div>
                    ) : adAccounts.length > 0 ? (
                      <select
                        value={selectedAccount ? `act_${selectedAccount}` : ''}
                        onChange={(e) => setSelectedAccount(e.target.value.replace('act_', ''))}
                        className={`${inputCls} py-3`}
                      >
                        <option value="">Select an ad account...</option>
                        {adAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <p className="text-xs text-text-secondary mb-2">No ad accounts found. Enter manually:</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-secondary">act_</span>
                          <input type="text" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value.replace(/\D/g, ''))} className={`flex-1 ${inputCls}`} placeholder="123456789" />
                        </div>
                      </div>
                    )}

                    {selectedAccount && (
                      <div className="mt-4 bg-success/10 border border-success/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <span className="text-sm font-medium text-success">Ad account connected</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Connect Pages */}
            {step === 1 && (
              <div>
                <h2 className="text-[32px] font-bold mb-2">{STEPS[1].icon} Select your pages</h2>
                <p className="text-text-secondary text-[15px] mb-10">Your Facebook and Instagram pages will be the identity behind your ads.</p>

                <div className="glass-card rounded-2xl p-6 mb-4">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Facebook Page */}
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Facebook page <span className="text-danger font-normal text-xs">Required</span>
                      </label>
                      {loadingPages ? (
                        <div className="flex items-center gap-2 py-3">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-text-secondary">Loading...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedPage}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedPage(id);
                            const page = pages.find((p) => p.id === id);
                            setSelectedPageName(page?.name || '');
                            setSelectedIg('');
                            setSelectedIgName('');
                          }}
                          className={inputCls}
                        >
                          <option value="">Select Facebook Page</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Instagram Page */}
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Instagram page <span className="text-text-secondary font-normal text-xs">Optional</span>
                      </label>
                      {igAccounts.length > 0 ? (
                        <select
                          value={selectedIg}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedIg(id);
                            const ig = igAccounts.find((a) => a.id === id);
                            setSelectedIgName(ig?.username ? `@${ig.username}` : ig?.name || '');
                          }}
                          className={inputCls}
                        >
                          <option value="">Select Instagram Page</option>
                          {igAccounts.map((ig) => (
                            <option key={ig.id} value={ig.id}>
                              {ig.username ? `@${ig.username}` : ig.name || ig.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select disabled className={`${inputCls} opacity-50`}>
                          <option>Select Instagram Page</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-3">Can't find your page? Skip for now and add it manually with Page ID in Settings</p>
                </div>

                {/* EU Advertising */}
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg">
                      &euro;
                    </div>
                    <div>
                      <p className="text-sm font-bold">EU advertising</p>
                      <p className="text-xs text-text-secondary">Will you advertise to EU audiences?</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={euAdvertising}
                    onClick={() => setEuAdvertising(!euAdvertising)}
                    className={`relative inline-flex items-center flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${euAdvertising ? 'bg-accent' : 'bg-gray-200'}`}
                  >
                    <span className="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200" style={{ transform: euAdvertising ? 'translateX(24px)' : 'translateX(3px)' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Pixel */}
            {step === 2 && (
              <div>
                <h2 className="text-[32px] font-bold mb-2">{STEPS[2].icon} Select your pixel</h2>
                <p className="text-text-secondary text-[15px] mb-10">Your Facebook pixel will track your ad performance and conversions.</p>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-base font-bold mb-1">Select your main facebook pixel</h3>
                  <p className="text-sm text-text-secondary mb-5">Choose the facebook pixel you use the most, you can change this anytime.</p>

                  {loadingPixels ? (
                    <div className="flex items-center gap-2 py-3">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-text-secondary">Loading pixels...</span>
                    </div>
                  ) : pixels.length > 0 ? (
                    <select
                      value={selectedPixel}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedPixel(id);
                        const px = pixels.find((p) => p.id === id);
                        setSelectedPixelName(px?.name || '');
                      }}
                      className={`${inputCls} py-3`}
                    >
                      <option value="">Select a pixel...</option>
                      {pixels.map((px) => (
                        <option key={px.id} value={px.id}>{px.name} ({px.id})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-text-secondary py-2">No pixels found for this ad account.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Website */}
            {step === 3 && (
              <div>
                <h2 className="text-[32px] font-bold mb-2">{STEPS[3].icon} Add your website</h2>
                <p className="text-text-secondary text-[15px] mb-10">Enter the destination URL traffic will land on after clicking your ad.</p>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-base font-bold mb-1">Enter your website URL</h3>
                  <p className="text-sm text-text-secondary mb-5">Enter the website you will send traffic too, you can change this anytime.</p>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className={`${inputCls} py-3`}
                    placeholder="example.com"
                  />
                  <p className="text-xs text-text-secondary mt-2">We'll automatically add https:// if needed</p>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div>
                <h2 className="text-[32px] font-bold mb-2">You're all set! </h2>
                <p className="text-text-secondary text-[15px] mb-10">Your BoltAds account is ready, time to launch some ads!</p>

                {/* Setup summary */}
                <div className="glass-card rounded-2xl p-6 mb-4">
                  <h3 className="text-base font-bold mb-4">Setup summary ({completedCount} of 5 completed)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {summary.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.done ? (
                          <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          </div>
                        )}
                        <span className={`text-sm ${item.done ? 'text-text font-medium' : 'text-text-secondary'}`}>
                          {item.label} {item.skipped && !item.done ? <span className="text-xs text-text-secondary">(skipped)</span> : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-4">Don't worry! You can complete the skipped steps anytime in Settings.</p>
                </div>

                {/* What's next */}
                <div className="glass-card rounded-2xl p-6 mb-4">
                  <h3 className="text-base font-bold mb-4">So what's next?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Start launching creatives</p>
                        <p className="text-xs text-text-secondary">Head to the Upload page to start launching creatives right away</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Customize advanced settings</p>
                        <p className="text-xs text-text-secondary">Head to the Settings page to edit advantage+ enhancements, default ad copy etc.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation bar */}
        <div className="border-t border-border bg-white px-12 py-5 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text border border-border rounded-lg hover:bg-bg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && step < 4 && (
              <button
                onClick={handleSkip}
                className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text border border-border rounded-lg hover:bg-bg transition-colors"
              >
                Skip for now
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
