# YOGENDRA AI — Centered animated voice-agent page

Yeh custom frontend hai. Ismein centre mein animated orb, centre mein animated **Start Talking** button, aur LiveKit agent ke bolne par orb bounce/pulse karta hai.

## Zaroori baat

Is version mein LiveKit ka hosted `embed-popup.js` istemal nahi hota. Woh widget hamesha bottom-right launcher dikhata hai aur uska speaking status is page ko expose nahi karta. Yeh page LiveKit Client SDK se seedha connect hota hai, isliye orb ko agent ke speaking state ke saath animate kar sakta hai.

## Netlify par sahi tarah deploy karna

**Is ZIP ko Netlify Drop / manual folder upload mein seedha upload na karein.** Yeh Vite + React project hai; Netlify ko build chalana hoga aur Netlify Function bhi deploy karni hogi.

### 1. GitHub par project upload karein

1. Is ZIP ko download karke **Extract All** karein.
2. GitHub par ek naya repository banayein, jaise `yogendra-ai-voice`.
3. Extracted folder ke andar ki saari files/folders repository ke root mein upload karein. Root mein `package.json`, `netlify.toml`, `index.html`, `src/`, aur `netlify/functions/` dikhna chahiye.
4. `.env.example` mein koi real secret nahi hai; ise upload rehne de sakte hain. Real `.env` file ya API secret kabhi GitHub par upload na karein.

### 2. Netlify ko GitHub repository se connect karein

1. Netlify Dashboard → **Add new project** → **Import an existing project**.
2. GitHub choose karke `yogendra-ai-voice` repository select karein.
3. Build settings verify karein:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions` (yeh `netlify.toml` mein set hai)
4. Deploy start karein.

### 3. Netlify Environment Variables add karein

Netlify site → **Project configuration / Site configuration → Environment variables** mein yeh variables add karein:

- `LIVEKIT_URL` — LiveKit Project URL. LiveKit Project Settings mein **Project URL** use karein; SIP URL nahi. Agar URL `https://` se shuru ho, function use `wss://` mein convert kar dega.
- `LIVEKIT_API_KEY` — LiveKit Project Settings → API Keys se API key.
- `LIVEKIT_API_SECRET` — us API key ka secret. **Ise chat, HTML, GitHub, ya browser code mein kabhi share na karein.** Sirf Netlify environment variable mein rakhein.
- `LIVEKIT_AGENT_NAME` — Agent Builder / Agent Overview mein dikhne wala exact **Agent Name** (case-sensitive). `CA_...` wala Embed Agent ID nahi.
- `ALLOWED_ORIGIN` — website ka exact origin, misaal: `https://prismatic-fairy-39e607.netlify.app` (aakhri `/` nahi).

Variables add karne ke baad **Redeploy** karein taaki function unhe read kar sake.

### 4. Test

1. Published Netlify URL kholein.
2. Centre wala **Start Talking** button dabayein.
3. Browser microphone permission ko Allow karein.
4. Agent se baat karein. Agent bolte waqt orb bounce/pulse karega; call ke dauran Mute aur End Conversation centre mein dikhenge.

## Security

`LIVEKIT_API_SECRET` ko public client-side code mein kabhi na rakhein aur kisi chat mein paste na karein. Browser mein sirf short-lived visitor token jaata hai; token server-side Netlify Function banata hai. Agar secret kabhi public ho gaya ho, LiveKit mein rotate karein.
