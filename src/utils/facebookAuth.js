const META_APP_ID = import.meta.env.VITE_META_APP_ID;

const SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_read_engagement',
].join(',');

let sdkReady = false;
let sdkPromise = null;

/**
 * Load the Facebook JS SDK asynchronously.
 */
export function initFacebookSDK() {
  if (sdkReady) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    window.fbAsyncInit = function () {
      FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v21.0',
      });
      sdkReady = true;
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Open Facebook Login popup via FB.login().
 * Returns { accessToken, userID, expiresIn } on success.
 */
export async function facebookLogin() {
  await initFacebookSDK();

  return new Promise((resolve, reject) => {
    FB.login(
      (response) => {
        if (response.status === 'connected' && response.authResponse) {
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            expiresIn: response.authResponse.expiresIn,
          });
        } else {
          console.error('FB.login response:', JSON.stringify(response));
          const status = response?.status || 'unknown';
          reject(new Error(`Facebook login failed (status: ${status}). Make sure popups are allowed and try again.`));
        }
      },
      { scope: SCOPES },
    );
  });
}

/**
 * Exchange short-lived token for long-lived token + auth credentials.
 * Returns { accessToken, expiresIn, userName, email, authPassword }.
 */
export async function exchangeForLongLivedToken(shortLivedToken) {
  const res = await fetch('/api/auth/facebook/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortToken: shortLivedToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to exchange token');
  }
  return res.json();
}
