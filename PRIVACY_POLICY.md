# Privacy Policy for SponsorPulse AI

**Last Updated:** [Insert Date]

Welcome to SponsorPulse AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your data is handled transparently and securely. This Privacy Policy explains how SponsorPulse AI collects, uses, and protects your information when you use our Google Chrome Extension.

## 1. Information We Do Not Collect

Our core philosophy is data minimization. To provide our services, we **do not** collect, store, or transmit:
*   Your name, email address, or any personally identifiable information (PII).
*   Your personal browsing history or web activity.
*   Your YouTube account details or watch history.

## 2. How Our Technology Protects You

To fetch skipping timestamps for the videos you watch without tracking your behavior, we utilize a privacy-preserving architecture:

*   **Cryptographic Hashing:** When you load a YouTube video, the extension processes the video identifier locally on your device using a secure, one-way SHA-256 hashing algorithm.
*   **Anonymous Backend Requests:** Only the resulting cryptographic hash is sent to our backend servers to retrieve the necessary segment data (sponsors, merch drops, etc.). Our servers cannot reverse-engineer this hash to determine which specific video you are watching.
*   **No Server-Side Logging:** Our backend does not log IP addresses, user agents, or the hashes themselves in association with any user profile.

## 3. Local Data Storage

SponsorPulse AI requires certain data to function, all of which is stored strictly on your device using `chrome.storage.local`:
*   **User Preferences:** Your settings (e.g., auto-skip toggles for specific categories).
*   **Gamification Statistics:** The total amount of time you have saved by skipping segments.
*   **Cache:** Temporary cached segment data to improve performance and reduce network requests.

**This data never leaves your device.** We do not sync this data to our servers, nor do we use `chrome.storage.sync` or transmit it to any third-party services.

## 4. Permissions Justification

SponsorPulse AI requests the following permissions for strictly functional purposes:
*   **`host_permissions` (`*://*.youtube.com/*`):** Required to read the current video player state, display timeline overlays, and execute the skip functionality. The extension does not execute on or monitor any other websites.
*   **`scripting`:** Required to dynamically inject the interactive skipping user interface (toast notifications and timeline blocks) into the YouTube player without requiring a page reload.
*   **`storage`:** Required to save your customized preferences and local statistics as detailed in Section 3.

## 5. Third-Party Data Sharing

We **do not** sell, trade, or otherwise transfer any user data to outside parties. Your data is not used for credit scoring, lending, or any advertising purposes. Our data practices strictly comply with the Google Chrome Web Store User Data Policy.

## 6. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify users of any material changes by updating the "Last Updated" date at the top of this document.

## 7. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
**[Your Contact Email / GitHub Repository Link]**
