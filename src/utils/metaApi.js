import { META_API_BASE } from './constants';

function getHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function actId(accountId) {
  const id = String(accountId).replace(/^act_/, '');
  return `act_${id}`;
}

function extractError(err) {
  if (!err?.error) return 'Unknown error';
  const e = err.error;
  if (e.error_user_msg) return e.error_user_msg;
  if (e.message) return e.message;
  return `Error ${e.code || ''}`;
}

// ---- In-app error/API log ----
const _apiLog = [];
let _apiLogListener = null;
export function getApiLog() { return _apiLog; }
export function onApiLogChange(fn) { _apiLogListener = fn; }

function pushLog(entry) {
  _apiLog.push({ ts: new Date().toLocaleTimeString(), ...entry });
  if (_apiLog.length > 200) _apiLog.shift();
  _apiLogListener?.();
}

// Centralized API logger — logs every request and error with full context
function logApi(method, endpoint, params, response) {
  const ts = new Date().toLocaleTimeString();
  pushLog({ type: response.ok ? 'ok' : 'error', method, endpoint, status: response.status, params });
  if (response.ok) {
    console.log(`%c[API] ${ts} ${method} ${endpoint} → ${response.status}`, 'color: #22c55e', params);
  } else {
    console.error(`%c[API] ${ts} ${method} ${endpoint} → ${response.status}`, 'color: #ef4444; font-weight: bold', params);
  }
}

function logApiError(method, endpoint, rawError, params) {
  const ts = new Date().toLocaleTimeString();
  const msg = rawError?.error?.error_user_msg || rawError?.error?.message || JSON.stringify(rawError);
  pushLog({ type: 'error', method, endpoint, params, errorMsg: msg, raw: rawError });
  console.error(
    `%c[API ERROR] ${ts} ${method} ${endpoint}`,
    'color: #ef4444; font-weight: bold',
    '\n→ Error:', rawError,
    '\n→ Params:', params,
  );
}

// Wrapper: fetch + auto-log
async function apiFetch(url, options, label) {
  const method = options.method || 'GET';
  let bodyForLog;
  if (options.body instanceof URLSearchParams) {
    bodyForLog = Object.fromEntries(options.body.entries());
    // Parse JSON fields for readable logs
    for (const k of ['object_story_spec', 'degrees_of_freedom_spec']) {
      if (bodyForLog[k]) try { bodyForLog[k] = JSON.parse(bodyForLog[k]); } catch {}
    }
  } else if (options.body instanceof FormData) {
    bodyForLog = '(FormData)';
  }

  const res = await fetch(url, options);
  logApi(method, label || url, bodyForLog, res);

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: { message: `HTTP ${res.status} ${res.statusText}` } }; }
    logApiError(method, label || url, err, bodyForLog);
    throw new Error(extractError(err));
  }
  return res;
}

// Retry wrapper for rate limits (HTTP 429, error code 17/32)
async function apiFetchRetry(url, options, label, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiFetch(url, options, label);
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      const isRateLimit = msg.includes('rate limit') || msg.includes('too many calls') || msg.includes('limit reached') || msg.includes('(#17)') || msg.includes('(#32)');
      if (attempt < retries && isRateLimit) {
        const wait = Math.pow(2, attempt) * 2000;
        pushLog({ type: 'warn', method: 'RETRY', endpoint: label || url, errorMsg: `Rate limited, retry ${attempt + 1}/${retries} in ${wait / 1000}s` });
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

// Test connection
export async function testConnection(token, accountId) {
  const res = await apiFetch(
    `${META_API_BASE}/${actId(accountId)}?fields=name,account_status`,
    { headers: getHeaders(token) },
    'testConnection'
  );
  return res.json();
}

// Get ad accounts accessible by this token
export async function getAdAccounts(token) {
  const res = await apiFetch(
    `${META_API_BASE}/me/adaccounts?fields=name,account_status,id&limit=100`,
    { headers: getHeaders(token) },
    'getAdAccounts'
  );
  const data = await res.json();
  return data.data || [];
}

// Get Facebook Pages accessible by this token (personal + BM + ad account)
export async function getPages(token, accountId) {
  const results = [];
  const seen = new Set();

  const addPages = (source, pages) => {
    let added = 0;
    for (const p of pages) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        results.push(p);
        added++;
      }
    }
    console.log(`[Pages] ${source}: found ${pages.length}, added ${added} new`);
  };

  // 1. Personal pages (me/accounts)
  try {
    const res = await fetch(
      `${META_API_BASE}/me/accounts?fields=name,id,access_token,picture{url}&limit=100`,
      { headers: getHeaders(token) }
    );
    if (res.ok) {
      const data = await res.json();
      addPages('me/accounts', data.data || []);
    } else {
      const err = await res.json();
      console.warn('[Pages] me/accounts failed:', err.error?.message);
    }
  } catch (e) { console.warn('[Pages] me/accounts error:', e); }

  // 2. Pages available for this ad account (promote_pages)
  if (accountId) {
    try {
      const res = await fetch(
        `${META_API_BASE}/${actId(accountId)}/promote_pages?fields=name,id,picture{url}&limit=100`,
        { headers: getHeaders(token) }
      );
      if (res.ok) {
        const data = await res.json();
        addPages('promote_pages', data.data || []);
      } else {
        const err = await res.json();
        console.warn('[Pages] promote_pages failed:', err.error?.message);
      }
    } catch (e) { console.warn('[Pages] promote_pages error:', e); }
  }

  // 3. BM owned + client pages
  try {
    const bizRes = await fetch(
      `${META_API_BASE}/me/businesses?fields=id,name&limit=10`,
      { headers: getHeaders(token) }
    );
    if (bizRes.ok) {
      const bizData = await bizRes.json();
      console.log(`[Pages] Found ${(bizData.data || []).length} businesses`);
      for (const biz of (bizData.data || [])) {
        // owned_pages
        try {
          const pRes = await fetch(
            `${META_API_BASE}/${biz.id}/owned_pages?fields=name,id,picture{url}&limit=100`,
            { headers: getHeaders(token) }
          );
          if (pRes.ok) {
            const pData = await pRes.json();
            addPages(`BM ${biz.name || biz.id}/owned_pages`, pData.data || []);
          } else {
            const err = await pRes.json();
            console.warn(`[Pages] BM ${biz.id}/owned_pages failed:`, err.error?.message);
          }
        } catch {}
        // client_pages
        try {
          const cRes = await fetch(
            `${META_API_BASE}/${biz.id}/client_pages?fields=name,id,picture{url}&limit=100`,
            { headers: getHeaders(token) }
          );
          if (cRes.ok) {
            const cData = await cRes.json();
            addPages(`BM ${biz.name || biz.id}/client_pages`, cData.data || []);
          } else {
            const err = await cRes.json();
            console.warn(`[Pages] BM ${biz.id}/client_pages failed:`, err.error?.message);
          }
        } catch {}
      }
    } else {
      const err = await bizRes.json();
      console.warn('[Pages] me/businesses failed:', err.error?.message);
    }
  } catch (e) { console.warn('[Pages] businesses error:', e); }

  console.log(`[Pages] Total: ${results.length} pages`, results.map((p) => `${p.name} (${p.id})`));
  return results;
}

// Get Instagram accounts linked to a page
// Returns: [{ id, username, name, profile_picture_url, pageBacked }]
// pageBacked = true → auto-generated shadow account (NOT valid as instagram_actor_id)
export async function getInstagramAccounts(token, pageId, { pageToken, accountId } = {}) {
  const results = [];
  const seen = new Set();
  const add = (ig, source) => {
    if (!seen.has(ig.id)) {
      seen.add(ig.id);
      ig._source = source;
      results.push(ig);
    }
  };
  let tokenForPage = pageToken || token;
  let hasPageToken = !!pageToken;

  const safeFetch = async (label, url, tok) => {
    try {
      const res = await fetch(url, { headers: getHeaders(tok) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `HTTP ${res.status}`;
        pushLog({ type: 'error', method: 'GET', endpoint: `IG/${label}`, status: res.status, errorMsg: msg });
        console.warn(`[IG] ${label}: ${res.status}`, msg);
        return null;
      }
      const data = await res.json();
      pushLog({ type: 'ok', method: 'GET', endpoint: `IG/${label}`, status: res.status });
      console.log(`[IG] ${label}: OK`, data);
      return data;
    } catch (e) {
      pushLog({ type: 'error', method: 'GET', endpoint: `IG/${label}`, errorMsg: e.message });
      console.warn(`[IG] ${label}: network error`, e.message);
      return null;
    }
  };

  console.log(`[IG] Fetching for page ${pageId}, hasPageToken=${hasPageToken}, accountId=${accountId || 'none'}`);

  // If we don't have a page token, try to get one — many IG endpoints require it
  if (!hasPageToken) {
    const ptRes = await safeFetch('get_page_token', `${META_API_BASE}/${pageId}?fields=access_token`, token);
    if (ptRes?.access_token) {
      tokenForPage = ptRes.access_token;
      hasPageToken = true;
      console.log(`[IG] Got page token for ${pageId}`);
    }
  }

  // Run all approaches in parallel — try with BOTH page token and user token for business_account
  const [r1, r1b, r2, r3, r4] = await Promise.all([
    // 1a. instagram_business_account with page token
    safeFetch('business_account(pageToken)', `${META_API_BASE}/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}`, tokenForPage),
    // 1b. instagram_business_account with user token (sometimes page token lacks permission)
    hasPageToken ? safeFetch('business_account(userToken)', `${META_API_BASE}/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}`, token) : null,
    // 2. page instagram_accounts edge
    safeFetch('page/instagram_accounts', `${META_API_BASE}/${pageId}/instagram_accounts?fields=id,username,profile_pic`, tokenForPage),
    // 3. page_backed_instagram_accounts
    safeFetch('page_backed', `${META_API_BASE}/${pageId}/page_backed_instagram_accounts?fields=id,name,profile_picture_url`, tokenForPage),
    // 4. ad account level
    accountId ? safeFetch('ad_account', `${META_API_BASE}/${actId(accountId)}/instagram_accounts?fields=id,username,profile_picture_url`, token) : null,
  ]);

  // Collect — order matters: business_account first (has username), then others
  if (r1?.instagram_business_account) add(r1.instagram_business_account, 'business');
  if (r1b?.instagram_business_account) add(r1b.instagram_business_account, 'business');
  if (r2?.data) r2.data.forEach((ig) => add(ig, 'page_edge'));
  if (r4?.data) r4.data.forEach((ig) => add(ig, 'ad_account'));
  // page_backed last — only adds accounts not already found via real endpoints
  if (r3?.data) r3.data.forEach((ig) => add(ig, 'page_backed'));

  // Enrich ALL accounts that are missing username
  await Promise.all(results.map(async (ig) => {
    if (ig.username) return;
    // Try with page token first, then user token
    let detail = await safeFetch(`enrich/${ig.id}(pageToken)`, `${META_API_BASE}/${ig.id}?fields=username,name,profile_picture_url`, tokenForPage);
    if (!detail?.username && hasPageToken) {
      detail = await safeFetch(`enrich/${ig.id}(userToken)`, `${META_API_BASE}/${ig.id}?fields=username,name,profile_picture_url`, token);
    }
    if (detail?.username) ig.username = detail.username;
    if (detail?.name && !ig.name) ig.name = detail.name;
    if (detail?.profile_picture_url && !ig.profile_picture_url) ig.profile_picture_url = detail.profile_picture_url;
  }));

  // Mark: has username → real, otherwise → pageBacked
  // Exception: if found via business_account or ad_account endpoint, it's real even without username
  for (const ig of results) {
    ig.pageBacked = !ig.username && ig._source === 'page_backed';
  }

  // Sort: real accounts first
  results.sort((a, b) => (a.pageBacked ? 1 : 0) - (b.pageBacked ? 1 : 0));

  const realCount = results.filter((r) => !r.pageBacked).length;
  const pbCount = results.filter((r) => r.pageBacked).length;
  pushLog({ type: 'ok', method: 'GET', endpoint: `IG/summary: ${realCount} real, ${pbCount} page-backed`, params: results.map((r) => `${r.username || r.name || r.id} [${r._source}]${r.pageBacked ? ' (PB)' : ''}`) });
  console.log(`[IG] Page ${pageId}: ${realCount} real, ${pbCount} page-backed`, results.map((r) => `${r.username || r.name || r.id} [${r._source}]${r.pageBacked ? ' (PB)' : ''}`));
  return results;
}

// Get pixels (datasets)
export async function getPixels(token, accountId) {
  const res = await apiFetch(
    `${META_API_BASE}/${actId(accountId)}/adspixels?fields=name,id`,
    { headers: getHeaders(token) },
    'getPixels'
  );
  const data = await res.json();
  return data.data || [];
}

// Get campaigns
export async function getCampaigns(token, accountId) {
  const res = await apiFetch(
    `${META_API_BASE}/${actId(accountId)}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,bid_strategy&limit=100`,
    { headers: getHeaders(token) },
    'getCampaigns'
  );
  const data = await res.json();
  return data.data || [];
}

// Get ad sets for a campaign
export async function getAdSets(token, campaignId) {
  const res = await apiFetch(
    `${META_API_BASE}/${campaignId}/adsets?fields=name,status,daily_budget,optimization_goal,promoted_object,attribution_spec,bid_amount,targeting`,
    { headers: getHeaders(token) },
    'getAdSets'
  );
  const data = await res.json();
  return data.data || [];
}

// Create campaign
// budgetType: 'CBO' = budget on campaign, 'ABO' = budget on adset
export async function createCampaign(token, accountId, { name, objective, status, budgetType, dailyBudget, bidStrategy, budgetSharing }) {
  const params = new URLSearchParams({
    name,
    objective,
    status: status || 'PAUSED',
    special_ad_categories: '[]',
  });
  // bid_strategy on campaign: always for CBO, and for ABO when budget sharing is enabled
  if (bidStrategy && (budgetType === 'CBO' || budgetSharing)) {
    params.append('bid_strategy', bidStrategy);
  }
  if (budgetType === 'CBO' && dailyBudget) {
    params.append('daily_budget', String(dailyBudget));
  }
  // ABO: must specify budget sharing on campaign level
  if (budgetType !== 'CBO') {
    params.append('is_adset_budget_sharing_enabled', budgetSharing ? 'true' : 'false');
  }

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/campaigns`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createCampaign'
  );
  return res.json();
}

// Create ad set
export async function createAdSet(token, accountId, {
  name, campaignId, dailyBudget, optimizationGoal, billingEvent,
  countries, excludedCountries, excludedRegions, ageMin, ageMax, gender, status, startTime, budgetType, pixelId,
  conversionEvent, bidAmount, bidStrategy, budgetSharing, attributionSetting, dailyMinSpend, dailySpendCap,
  dsaBeneficiary, dsaPayor,
}) {
  const targeting = {
    geo_locations: { countries: countries || ['IT'] },
    age_min: Number(ageMin) || 18,
    age_max: Number(ageMax) || 65,
  };
  if (excludedCountries && excludedCountries.length > 0) {
    targeting.excluded_geo_locations = { countries: excludedCountries };
  }
  if (excludedRegions && excludedRegions.length > 0) {
    if (!targeting.excluded_geo_locations) targeting.excluded_geo_locations = {};
    targeting.excluded_geo_locations.regions = excludedRegions.map((r) => ({ key: r.key }));
  }
  if (gender && gender !== 'all') {
    targeting.genders = gender === 'male' ? [1] : [2];
  }

  const params = new URLSearchParams({
    name,
    campaign_id: campaignId,
    optimization_goal: optimizationGoal || 'LINK_CLICKS',
    billing_event: billingEvent || 'IMPRESSIONS',
    targeting: JSON.stringify(targeting),
    status: status || 'PAUSED',
    is_dynamic_creative: 'false',
    start_time: startTime || new Date().toISOString(),
  });

  // For ABO, bid_strategy goes on the adset
  if (bidStrategy && budgetType !== 'CBO') {
    params.append('bid_strategy', bidStrategy);
  }
  // ABO: budget on adset. CBO: no budget on adset (it's on the campaign)
  if (budgetType !== 'CBO' && dailyBudget) {
    params.append('daily_budget', String(dailyBudget));
  }
  // Pixel / dataset + conversion event for conversion tracking
  if (pixelId) {
    const promotedObject = { pixel_id: pixelId };
    if (conversionEvent) {
      promotedObject.custom_event_type = conversionEvent;
    }
    params.append('promoted_object', JSON.stringify(promotedObject));
  }
  // Bid amount (for Bid Cap / Cost Cap strategies) — in cents
  if (bidAmount && Number(bidAmount) > 0) {
    params.append('bid_amount', String(bidAmount));
  }
  // Attribution setting — only when using pixel/conversions
  if (attributionSetting && pixelId) {
    let spec;
    switch (attributionSetting) {
      case '7d_click_1d_view': spec = [{ event_type: 'CLICK_THROUGH', window_days: 7 }, { event_type: 'VIEW_THROUGH', window_days: 1 }]; break;
      case '1d_click': spec = [{ event_type: 'CLICK_THROUGH', window_days: 1 }]; break;
      case '7d_click': spec = [{ event_type: 'CLICK_THROUGH', window_days: 7 }]; break;
      case '1d_click_1d_view': spec = [{ event_type: 'CLICK_THROUGH', window_days: 1 }, { event_type: 'VIEW_THROUGH', window_days: 1 }]; break;
      default: break; // don't send anything for unknown values
    }
    if (spec) params.append('attribution_spec', JSON.stringify(spec));
  }
  // DSA (EU Digital Services Act) — beneficiary and payor
  if (dsaBeneficiary) {
    params.append('dsa_beneficiary', dsaBeneficiary);
  }
  if (dsaPayor) {
    params.append('dsa_payor', dsaPayor);
  }
  // Ad set spend limits — only if a value > 0 is provided
  if (dailyMinSpend && Number(dailyMinSpend) > 0) {
    params.append('daily_min_spend_target', String(dailyMinSpend));
  }
  if (dailySpendCap && Number(dailySpendCap) > 0) {
    params.append('daily_spend_cap', String(dailySpendCap));
  }

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/adsets`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createAdSet'
  );
  return res.json();
}

// Upload image
export async function uploadImage(token, accountId, file) {
  const formData = new FormData();
  formData.append('filename', file);

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/adimages`,
    { method: 'POST', headers: getHeaders(token), body: formData },
    `uploadImage(${file.name})`
  );
  const data = await res.json();
  const images = data.images;
  if (!images || Object.keys(images).length === 0) throw new Error(`Image upload failed: no hash returned for ${file.name}`);
  const key = Object.keys(images)[0];
  return { hash: images[key].hash, url: images[key].url };
}

// Upload video — uses XMLHttpRequest for upload progress tracking
export async function uploadVideo(token, accountId, file, onProgress) {
  const formData = new FormData();
  formData.append('source', file);
  formData.append('title', file.name);

  const label = `uploadVideo(${file.name}, ${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
  const ts = () => new Date().toLocaleTimeString();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutMs = Math.max(5 * 60 * 1000, (file.size / (1024 * 1024)) * 2000); // min 5min, or 2s per MB
    const timer = setTimeout(() => { xhr.abort(); reject(new Error(`Video upload timed out: ${file.name}`)); }, timeoutMs);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };

    xhr.onload = () => {
      clearTimeout(timer);
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
      if (xhr.status >= 200 && xhr.status < 300) {
        pushLog({ type: 'ok', method: 'POST', endpoint: label, status: xhr.status });
        console.log(`%c[API] ${ts()} POST ${label} → ${xhr.status}`, 'color: #22c55e');
        resolve({ id: data.id });
      } else {
        const msg = extractError(data);
        pushLog({ type: 'error', method: 'POST', endpoint: label, status: xhr.status, errorMsg: msg, raw: data });
        console.error(`%c[API ERROR] ${ts()} POST ${label} → ${xhr.status}`, 'color: #ef4444; font-weight: bold', data);
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => { clearTimeout(timer); pushLog({ type: 'error', method: 'POST', endpoint: label, errorMsg: 'Network error' }); reject(new Error(`Network error uploading ${file.name}`)); };
    xhr.onabort = () => { clearTimeout(timer); pushLog({ type: 'error', method: 'POST', endpoint: label, errorMsg: 'Timeout (5 min)' }); reject(new Error(`Video upload timed out (5 min): ${file.name}`)); };

    xhr.open('POST', `${META_API_BASE}/${actId(accountId)}/advideos`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

// Fetch video thumbnail with retry — Meta needs time to process the video
export async function getVideoThumbnail(token, videoId) {
  const maxAttempts = 10;
  const delay = 3000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      // Try both picture field and thumbnails edge
      const res = await fetch(
        `${META_API_BASE}/${videoId}?fields=picture,thumbnails{uri}`,
        { headers: getHeaders(token) }
      );
      if (res.ok) {
        const data = await res.json();
        // Prefer thumbnails edge (higher quality), fall back to picture field
        const thumbUri = data.thumbnails?.data?.[0]?.uri;
        if (thumbUri) {
          console.log(`[Video] Thumbnail found for ${videoId} (attempt ${attempt + 1}): thumbnails edge`);
          return thumbUri;
        }
        if (data.picture) {
          console.log(`[Video] Thumbnail found for ${videoId} (attempt ${attempt + 1}): picture field`);
          return data.picture;
        }
      }
    } catch {}
  }
  console.warn(`[Video] No thumbnail found for ${videoId} after ${maxAttempts} attempts`);
  return null;
}

// Create ad creative (image)
export async function createImageCreative(token, accountId, {
  name, pageId, imageHash, message, headline, description, linkUrl, cta, instagramAccountId, degreesOfFreedomSpec, urlTags,
}) {
  const linkData = {
    image_hash: imageHash,
    link: linkUrl,
    message: message || '',
    name: headline || '',
    description: description || '',
  };
  if (cta && cta !== 'NO_BUTTON') {
    linkData.call_to_action = { type: cta, value: { link: linkUrl } };
  }

  const objectStorySpec = {
    page_id: pageId,
    link_data: linkData,
  };
  if (instagramAccountId) {
    objectStorySpec.instagram_actor_id = instagramAccountId;
  }

  const params = new URLSearchParams({
    name: name || 'Ad Creative',
    object_story_spec: JSON.stringify(objectStorySpec),
    degrees_of_freedom_spec: JSON.stringify(degreesOfFreedomSpec),
  });
  if (urlTags) params.set('url_tags', urlTags);

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createImageCreative'
  );
  return res.json();
}

// Create ad creative (video)
export async function createVideoCreative(token, accountId, {
  name, pageId, videoId, message, headline, description, linkUrl, cta, imageHash, imageUrl, instagramAccountId, degreesOfFreedomSpec, urlTags,
}) {
  const videoData = {
    video_id: videoId,
    link_description: description || '',
    message: message || '',
    title: headline || '',
    ...(cta && cta !== 'NO_BUTTON' ? { call_to_action: { type: cta, value: { link: linkUrl } } } : { call_to_action: { type: 'LEARN_MORE', value: { link: linkUrl } } }),
  };
  if (imageHash) {
    videoData.image_hash = imageHash;
  } else if (imageUrl) {
    videoData.image_url = imageUrl;
  }

  const objectStorySpec = {
    page_id: pageId,
    video_data: videoData,
  };
  if (instagramAccountId) {
    objectStorySpec.instagram_actor_id = instagramAccountId;
  }

  const params = new URLSearchParams({
    name: name || 'Video Ad Creative',
    object_story_spec: JSON.stringify(objectStorySpec),
    degrees_of_freedom_spec: JSON.stringify(degreesOfFreedomSpec),
  });
  if (urlTags) params.set('url_tags', urlTags);

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createVideoCreative'
  );
  return res.json();
}

// Create carousel ad creative
export async function createCarouselCreative(token, accountId, {
  name, pageId, cards, message, linkUrl, cta, instagramAccountId, degreesOfFreedomSpec, urlTags,
}) {
  // cards = [{ imageHash, headline, description, linkUrl, cta }]
  const childAttachments = cards.map((card) => {
    const attachment = {
      image_hash: card.imageHash,
      link: card.linkUrl || linkUrl,
      name: card.headline || '',
      description: card.description || '',
    };
    if (card.cta && card.cta !== 'NO_BUTTON') {
      attachment.call_to_action = { type: card.cta, value: { link: card.linkUrl || linkUrl } };
    }
    return attachment;
  });

  const linkData = {
    message: message || '',
    link: linkUrl,
    child_attachments: childAttachments,
    multi_share_end_card: false,
    multi_share_optimized: false,
  };
  if (cta && cta !== 'NO_BUTTON') {
    linkData.call_to_action = { type: cta, value: { link: linkUrl } };
  }

  const objectStorySpec = {
    page_id: pageId,
    link_data: linkData,
  };
  if (instagramAccountId) {
    objectStorySpec.instagram_actor_id = instagramAccountId;
  }

  const params = new URLSearchParams({
    name: name || 'Carousel Creative',
    object_story_spec: JSON.stringify(objectStorySpec),
    degrees_of_freedom_spec: JSON.stringify(degreesOfFreedomSpec),
  });
  if (urlTags) params.set('url_tags', urlTags);

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createCarouselCreative'
  );
  return res.json();
}

// Create ad
export async function createAd(token, accountId, { name, adSetId, creativeId, status }) {
  const params = new URLSearchParams({
    name: name || 'Ad',
    adset_id: adSetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: status || 'PAUSED',
  });

  const res = await apiFetchRetry(
    `${META_API_BASE}/${actId(accountId)}/ads`,
    { method: 'POST', headers: getHeaders(token), body: params },
    'createAd'
  );
  return res.json();
}

// Get insights
export async function getInsights(token, accountId, { datePreset, level }) {
  const fields = [
    'campaign_name', 'adset_name', 'ad_name',
    'impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr',
    'actions', 'reach', 'frequency',
  ].join(',');

  const params = new URLSearchParams({
    fields,
    date_preset: datePreset || 'last_7d',
    level: level || 'campaign',
    limit: '500',
  });

  const res = await apiFetch(
    `${META_API_BASE}/${actId(accountId)}/insights?${params}`,
    { headers: getHeaders(token) },
    'getInsights'
  );
  const data = await res.json();
  return data.data || [];
}

// Get account ad creatives
export async function getAdCreatives(token, accountId) {
  const res = await apiFetch(
    `${META_API_BASE}/${actId(accountId)}/adcreatives?fields=name,thumbnail_url,status,object_story_spec&limit=50`,
    { headers: getHeaders(token) },
    'getAdCreatives'
  );
  const data = await res.json();
  return data.data || [];
}

// Search regions for geo targeting
export async function searchRegions(token, query) {
  const res = await apiFetch(
    `${META_API_BASE}/search?type=adgeolocation&q=${encodeURIComponent(query)}&location_types=region`,
    { headers: getHeaders(token) },
    'searchRegions'
  );
  const data = await res.json();
  return data.data || [];
}
