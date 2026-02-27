export const META_API_BASE = 'https://graph.facebook.com/v21.0';

export const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_SALES', label: 'Sales' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
];

export const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'VALUE', label: 'Value (ROAS)' },
];

export const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost (automatic)' },
  { value: 'COST_CAP', label: 'Cost Cap' },
  { value: 'BID_CAP', label: 'Bid Cap' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'Minimum ROAS' },
];

export const CONVERSION_EVENTS = [
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'ADD_TO_CART', label: 'Add to Cart' },
  { value: 'INITIATE_CHECKOUT', label: 'Initiate Checkout' },
  { value: 'ADD_PAYMENT_INFO', label: 'Add Payment Info' },
  { value: 'COMPLETE_REGISTRATION', label: 'Complete Registration' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'VIEW_CONTENT', label: 'View Content' },
  { value: 'SEARCH', label: 'Search' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'START_TRIAL', label: 'Start Trial' },
  { value: 'SUBMIT_APPLICATION', label: 'Submit Application' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'OTHER', label: 'Other' },
];

export const ATTRIBUTION_SETTINGS = [
  { value: '7d_click_1d_view', label: 'Standard (7-day click, 1-day view)' },
  { value: '1d_click', label: '1-day click' },
  { value: '7d_click', label: '7-day click' },
  { value: '1d_click_1d_view', label: '1-day click, 1-day view' },
];

export const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'WHATSAPP_MESSAGE', label: 'WhatsApp Message' },
  { value: 'NO_BUTTON', label: 'No Button' },
];

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

// Advantage+ enhancement configs per creative type
export const ENHANCEMENT_CONFIGS = {
  image: [
    { key: 'advantage_plus_creative', label: 'Advantage+ creative' },
    { key: 'relevant_comments', label: 'Relevant comments' },
    { key: 'visual_touchups', label: 'Visual touch-ups' },
    { key: 'text_improvements', label: 'Text improvements' },
    { key: 'add_overlays', label: 'Add overlays' },
    { key: 'brightness_contrast', label: 'Adjust brightness & contrast' },
    { key: 'music_overlay', label: 'Music overlay' },
    { key: 'image_animation', label: 'Image animation' },
    { key: 'generate_backgrounds', label: 'Generate backgrounds' },
    { key: 'expand_image', label: 'Expand image' },
    { key: 'enhance_cta', label: 'Enhance CTA' },
    { key: 'translate_text', label: 'Translate text' },
    { key: 'adapt_to_placement', label: 'Adapt to placement' },
    { key: 'add_catalog_items', label: 'Add catalog items' },
  ],
  video: [
    { key: 'advantage_plus_creative', label: 'Advantage+ creative' },
    { key: 'relevant_comments', label: 'Relevant comments' },
    { key: 'visual_touchups', label: 'Visual touch-ups' },
    { key: 'text_improvements', label: 'Text improvements' },
    { key: 'enhance_cta', label: 'Enhance CTA' },
    { key: 'translate_text', label: 'Translate text' },
    { key: 'dynamic_media', label: 'Dynamic media' },
    { key: 'add_catalog_items', label: 'Add catalog items' },
    { key: 'add_site_links', label: 'Add site links' },
  ],
  carousel: [
    { key: 'advantage_plus_creative', label: 'Advantage+ creative' },
    { key: 'relevant_comments', label: 'Relevant comments' },
    { key: 'visual_touchups', label: 'Visual touch-ups' },
    { key: 'text_improvements', label: 'Text improvements' },
    { key: 'profile_end_card', label: 'Profile end card' },
    { key: 'dynamic_description', label: 'Dynamic description' },
    { key: 'enhance_cta', label: 'Enhance CTA' },
    { key: 'translate_text', label: 'Translate text' },
    { key: 'dynamic_media', label: 'Dynamic media' },
    { key: 'add_catalog_items', label: 'Add catalog items' },
    { key: 'add_site_links', label: 'Add site links' },
  ],
};

// Map UI toggle keys to Meta API creative_features_spec keys
const ENHANCEMENT_API_MAP = {
  advantage_plus_creative: 'standard_enhancements_catalog',
  relevant_comments: 'standard_enhancements_catalog',
  visual_touchups: 'standard_enhancements_catalog',
  text_improvements: 'standard_enhancements_catalog',
  add_overlays: 'standard_enhancements_catalog',
  brightness_contrast: 'standard_enhancements_catalog',
  music_overlay: 'standard_enhancements_catalog',
  image_animation: 'standard_enhancements_catalog',
  generate_backgrounds: 'standard_enhancements_catalog',
  expand_image: 'standard_enhancements_catalog',
  enhance_cta: 'standard_enhancements_catalog',
  adapt_to_placement: 'standard_enhancements_catalog',
  dynamic_media: 'standard_enhancements_catalog',
  add_site_links: 'standard_enhancements_catalog',
  translate_text: 'text_overlay_translation',
  add_catalog_items: 'product_metadata_automation',
  dynamic_description: 'product_metadata_automation',
  profile_end_card: 'profile_card',
};

// Build degrees_of_freedom_spec from enhancement settings
// creativeType: 'image' | 'video' | 'carousel'
export function buildDegreesOfFreedomSpec(enhancements, creativeType) {
  const config = ENHANCEMENT_CONFIGS[creativeType] || ENHANCEMENT_CONFIGS.image;
  const typeSettings = enhancements?.[creativeType] || {};

  // Determine OPT_IN / OPT_OUT per API key
  const apiStates = {};
  for (const item of config) {
    const apiKey = ENHANCEMENT_API_MAP[item.key];
    if (!apiKey) continue;
    if (typeSettings[item.key]) {
      apiStates[apiKey] = 'OPT_IN';
    } else if (!apiStates[apiKey]) {
      apiStates[apiKey] = 'OPT_OUT';
    }
  }

  // Always include all 5 valid API keys
  const ALL_API_KEYS = [
    'standard_enhancements_catalog',
    'ig_video_native_subtitle',
    'product_metadata_automation',
    'profile_card',
    'text_overlay_translation',
  ];
  const creative_features_spec = {};
  for (const k of ALL_API_KEYS) {
    creative_features_spec[k] = { enroll_status: apiStates[k] || 'OPT_OUT' };
  }
  return { creative_features_spec };
}

// EU/EEA countries that require DSA beneficiary/payor fields
export const DSA_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO',
]);

export const COUNTRIES = [
  { code: 'IT', name: 'Italy' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'RO', name: 'Romania' },
  { code: 'HU', name: 'Hungary' },
  { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'IS', name: 'Iceland' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IL', name: 'Israel' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PE', name: 'Peru' },
];

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
export const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
