const express = require('express');
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = require('agora-access-token');
const auth = require('../middleware/auth');

const router = express.Router();

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;
const EXPIRE = parseInt(process.env.TOKEN_EXPIRE_SECONDS || "3600", 10);

// generate RTC token (for audio/video calls)
// expects { channelName, uid } in body. uid can be number (uid) or string (account).
router.post('/rtc', auth, (req, res) => {
  const { channelName, uid } = req.body;
  if (!channelName || (uid === undefined || uid === null)) {
    return res.status(400).json({ error: 'channelName and uid are required' });
  }

  try {
    // uid as number recommended for RTC token with uid
    const role = RtcRole.PUBLISHER;
    const currentTs = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTs + EXPIRE;

    // if uid is numeric use buildTokenWithUid, else buildTokenWithUserAccount
    let token;
    if (!isNaN(Number(uid))) {
      token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channelName, Number(uid), role, privilegeExpireTs);
    } else {
      token = RtcTokenBuilder.buildTokenWithUserAccount(APP_ID, APP_CERT, channelName, uid, role, privilegeExpireTs);
    }

    return res.json({ token, expireAt: privilegeExpireTs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not generate RTC token' });
  }
});

// generate RTM token (for Agora RTM authentication)
// expects { account } in body — account is a string (user id/account)
router.post('/rtm', auth, (req, res) => {
  const { account } = req.body;
  if (!account) return res.status(400).json({ error: 'account is required' });

  try {
    const currentTs = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTs + EXPIRE;

    const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERT, account, RtmRole.Rtm_User, privilegeExpireTs);
    return res.json({ token, expireAt: privilegeExpireTs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate RTM token' });
  }
});

module.exports = router;
