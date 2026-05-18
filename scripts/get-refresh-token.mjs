// One-time script to obtain a Steam mobile refresh token (~6 month lifetime).
// The token can be pasted into the site's "Connect Steam account" UI; it will
// be auto-detected as a refresh token and stored accordingly.
//
// Prerequisites:
//   npm install steam-session   (run once in the project root)
//
// Usage:
//   node scripts/get-refresh-token.mjs

import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from 'steam-session';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = createInterface({ input, output });

function decodeJwtExp(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp;
  } catch { return null; }
}

async function main() {
  console.log('=== Steam Refresh Token Generator ===\n');

  const accountName = await rl.question('Steam username: ');

  // Node readline doesn't hide password input natively — the token won't leave
  // this terminal and is never sent anywhere except Steam's own auth servers.
  output.write('Steam password: ');
  const password = await rl.question('');

  const session = new LoginSession(EAuthTokenPlatformType.MobileApp);
  session.loginTimeout = 60000;

  let startResult;
  try {
    startResult = await session.startWithCredentials({ accountName, password });
  } catch (err) {
    console.error('\nLogin failed:', err.message);
    process.exit(1);
  }

  if (startResult.actionRequired) {
    const actions = startResult.validActions || [];
    const hasDeviceCode  = actions.some(a => a.type === EAuthSessionGuardType.DeviceCode);
    const hasEmailCode   = actions.some(a => a.type === EAuthSessionGuardType.EmailCode);
    const hasDeviceConf  = actions.some(a => a.type === EAuthSessionGuardType.DeviceConfirmation);

    if (hasDeviceConf && !hasDeviceCode && !hasEmailCode) {
      console.log('\nApprove the login in your Steam mobile app, then press Enter…');
      await rl.question('');
    } else {
      const label = hasDeviceCode ? 'Steam Guard code (authenticator app)' : 'Steam Guard code (email)';
      const code = (await rl.question(`\n${label}: `)).trim();
      try {
        await session.submitSteamGuardCode(code);
      } catch (err) {
        console.error('\nInvalid code:', err.message);
        process.exit(1);
      }
    }
  }

  await new Promise((resolve, reject) => {
    session.on('authenticated', resolve);
    session.on('error', (err) => reject(err));
    session.on('timeout', () => reject(new Error('Login timed out')));
  });

  rl.close();

  const exp = decodeJwtExp(session.refreshToken);
  const expDate = exp ? new Date(exp * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown';

  console.log('\n✓ Authenticated successfully');
  console.log(`  Valid until: ${expDate}`);
  console.log('\nPaste this token into the site\'s "Connect Steam account" box:\n');
  console.log(session.refreshToken);
  console.log('');
}

main().catch((err) => {
  console.error('\nUnexpected error:', err.message || err);
  process.exit(1);
});
