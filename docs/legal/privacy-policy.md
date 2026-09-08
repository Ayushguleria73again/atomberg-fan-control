# Privacy Policy — FanControl

> **TEMPLATE — not legal advice.** Fill in every `[BRACKETED]` placeholder and have a lawyer review this before public launch, especially if you'll have users in the EU/UK (GDPR), California (CCPA/CPRA), or India (DPDP Act). Antigravity should render this at `/privacy`.

**Effective date:** [DATE]
**Who we are:** FanControl ("we", "us", "the Service"), operated by [YOUR NAME / ENTITY], contactable at [CONTACT EMAIL].

## 1. What this app does
FanControl lets you control your own Atomberg smart fans from a web app. To do that, you connect your own Atomberg account by providing your Atomberg **API key** and **refresh token**, which you generate in the Atomberg Home app.

## 2. Information we collect
- **Account data:** your email address and a securely hashed password (we never store your password in plain text).
- **Atomberg credentials:** the API key and refresh token you choose to connect. These are **encrypted at rest** (AES-256-GCM) and are used only to talk to Atomberg's API on your behalf. We do not store them in plain text and we never display them back to you.
- **Device data:** the fan names, IDs, and current state returned by Atomberg for your account, so we can show and control your fans. This may be cached briefly to respect Atomberg's rate limits.
- **Technical data:** basic logs (timestamps, IP address, error events) needed to run and secure the Service. **We do not log your credentials.**
- **Voice:** if you use voice control, speech is processed **on your device**; audio is not sent to us or stored by us. [Update this line if you enable any cloud transcription fallback.]

We do **not** knowingly collect data from children under [13/16].

## 3. How we use your information
- To authenticate you and operate the Service.
- To connect to Atomberg and control your fans at your request.
- To secure the Service, prevent abuse, and debug problems.
We do **not** sell your personal information, and we do **not** use your data for advertising.

## 4. How your credentials are protected
- Encrypted at rest with AES-256-GCM; the encryption key is stored separately from the database.
- Decrypted only in memory, only to make a request to Atomberg on your behalf, then discarded.
- Never written to logs, never returned in any response, never shared with third parties other than Atomberg (to control your fans).
See our security practices in [docs/14-credential-security.md](../14-credential-security.md).

## 5. Third parties we rely on (sub-processors)
- **Atomberg** — the fan manufacturer's cloud API; your credentials and commands go to Atomberg to control your fans. Your use is also subject to Atomberg's own terms and privacy policy.
- **[Neon]** — database hosting (stores your account and your *encrypted* credentials).
- **[Clerk]** — authentication/identity.
- **[Vercel]** — application hosting.
- **[Upstash]** — caching/rate-limiting.
Each processes data only to provide their service to us. [Confirm and update this list to match what you actually deploy.]

## 6. Data retention & deletion
- We keep your data while your account is active.
- You can **disconnect** your Atomberg account at any time, which deletes the stored (encrypted) credentials.
- You can **delete your account**, which removes your account and all connected credentials. Contact [CONTACT EMAIL] or use the in-app delete option.

## 7. Your rights
Depending on where you live, you may have rights to access, correct, delete, or export your data, and to object to certain processing. To exercise them, contact [CONTACT EMAIL]. [Add GDPR/CCPA/DPDP-specific language as your lawyer advises.]

## 8. Security
We follow the practices in our security documentation, but no system is perfectly secure. If we become aware of a breach affecting your data, we will notify you and the relevant authorities as required by law.

## 9. International transfers
Your data may be processed in [COUNTRIES/REGIONS] where we and our providers operate. [Add transfer-mechanism language if serving EU/UK users.]

## 10. Changes
We may update this policy; we'll post the new effective date here and, for material changes, notify you.

## 11. Contact
Questions or requests: [CONTACT EMAIL].
