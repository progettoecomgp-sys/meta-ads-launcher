import { META_API_BASE } from './constants';

function getHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function actId(accountId) {
  return `act_${accountId}`;
}

function extractError(err) {
  if (!err?.error) return 'Unknown error';
  const e = err.error;
  // Show the most detailed message available
  if (e.error_user_msg) return e.error_user_msg;
  if (e.message) return e.message;
  return `Error ${e.code || ''}`;
}

// Test connection
export async function testConnection(token, accountId) {
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}?fields=name,account_status`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Connection failed');
  }
  return res.json();
}

// Get ad accounts accessible by this token
export async function getAdAccounts(token) {
  const res = await fetch(
    `${META_API_BASE}/me/adaccounts?fields=name,account_status,id&limit=100`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch ad accounts');
  }
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
export async function getInstagramAccounts(token, pageId) {
  const results = [];

  // Try instagram_business_account (IG business/creator linked to page)
  try {
    const res = await fetch(
      `${META_API_BASE}/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}`,
      { headers: getHeaders(token) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.instagram_business_account) {
        results.push(data.instagram_business_account);
      }
    }
  } catch {}

  // Also try instagram_accounts endpoint (connected IG accounts)
  try {
    const res = await fetch(
      `${META_API_BASE}/${pageId}/instagram_accounts?fields=id,username,profile_pic`,
      { headers: getHeaders(token) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        for (const ig of data.data) {
          if (!results.find((r) => r.id === ig.id)) results.push(ig);
        }
      }
    }
  } catch {}

  return results;
}

// Get pixels (datasets)
export async function getPixels(token, accountId) {
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adspixels?fields=name,id`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch pixels');
  }
  const data = await res.json();
  return data.data || [];
}

// Get campaigns
export async function getCampaigns(token, accountId) {
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/campaigns?fields=name,status,objective&limit=100`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch campaigns');
  }
  const data = await res.json();
  return data.data || [];
}

// Get ad sets for a campaign
export async function getAdSets(token, campaignId) {
  const res = await fetch(
    `${META_API_BASE}/${campaignId}/adsets?fields=name,status,daily_budget,optimization_goal`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch ad sets');
  }
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

  console.log('[Meta API] createCampaign params:', Object.fromEntries(params));
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/campaigns`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('[Meta API] createCampaign error:', err);
    throw new Error(extractError(err));
  }
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

  console.log('[Meta API] createAdSet params:', Object.fromEntries(params));
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adsets`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('[Meta API] createAdSet error:', err);
    throw new Error(extractError(err));
  }
  return res.json();
}

// Upload image
export async function uploadImage(token, accountId, file) {
  const formData = new FormData();
  formData.append('filename', file);

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adimages`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
  const data = await res.json();
  const images = data.images;
  const key = Object.keys(images)[0];
  return { hash: images[key].hash, url: images[key].url };
}

// Upload video
export async function uploadVideo(token, accountId, file) {
  const formData = new FormData();
  formData.append('source', file);
  formData.append('title', file.name);

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/advideos`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
  return res.json();
}

// Create ad creative (image)
export async function createImageCreative(token, accountId, {
  name, pageId, imageHash, message, headline, description, linkUrl, cta, instagramAccountId, degreesOfFreedomSpec,
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

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
  return res.json();
}

// Create ad creative (video)
export async function createVideoCreative(token, accountId, {
  name, pageId, videoId, message, headline, description, linkUrl, cta, imageHash, instagramAccountId, degreesOfFreedomSpec,
}) {
  const videoData = {
    video_id: videoId,
    link_description: description || '',
    message: message || '',
    title: headline || '',
    call_to_action: { type: cta || 'LEARN_MORE', value: { link: linkUrl } },
  };
  if (imageHash) {
    videoData.image_hash = imageHash;
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

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
  return res.json();
}

// Create carousel ad creative
export async function createCarouselCreative(token, accountId, {
  name, pageId, cards, message, linkUrl, instagramAccountId, degreesOfFreedomSpec,
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
  };

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

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adcreatives`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
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

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/ads`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: params,
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractError(err));
  }
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

  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/insights?${params}`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch insights');
  }
  const data = await res.json();
  return data.data || [];
}

// Get account ad creatives
export async function getAdCreatives(token, accountId) {
  const res = await fetch(
    `${META_API_BASE}/${actId(accountId)}/adcreatives?fields=name,thumbnail_url,status,object_story_spec&limit=50`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch creatives');
  }
  const data = await res.json();
  return data.data || [];
}

// Search regions for geo targeting
export async function searchRegions(token, query) {
  const res = await fetch(
    `${META_API_BASE}/search?type=adgeolocation&q=${encodeURIComponent(query)}&location_types=region`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to search regions');
  }
  const data = await res.json();
  return data.data || [];
}
