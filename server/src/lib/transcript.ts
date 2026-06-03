/**
 * Mock transcript fetcher.
 *
 * Returns a realistic timed-text transcript string.
 * Replace this with the real YouTube timedtext API fetch for production.
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  console.log(`[fetchTranscript] Fetching transcript for video: ${videoId}`);

  // Simulated network delay
  await new Promise((r) => setTimeout(r, 50));

  return `[00:00:00] Hey everyone welcome back to the channel
[00:00:04] Today we're going to be talking about the best budget laptops of 2025
[00:00:10] But first this video is brought to you by NordVPN
[00:00:14] Use my link in the description and use promo code TECH to get 73% off
[00:00:20] Plus an extra four months free on their two year plan
[00:00:25] NordVPN encrypts your internet traffic and hides your IP address
[00:00:30] It also has a built in threat protection feature
[00:00:35] Sign up with my link down below and try it risk free for 30 days
[00:00:42] Alright so let's get into the laptops
[00:00:46] The first one I want to talk about is the Lenovo IdeaPad
[00:00:52] It comes with an AMD Ryzen 5 processor and 16GB of RAM
[00:01:00] The battery life on this thing is absolutely incredible
[00:01:06] I was getting around 12 hours of normal use
[00:01:12] Next up is the Acer Aspire 5
[00:01:16] This one has an Intel Core i5 and a 512GB SSD
[00:01:22] The display is really nice for the price
[00:01:28] You get a 1080p IPS panel with decent color accuracy
[00:01:35] Alright that wraps up today's video
[00:01:38] If you found this helpful please like and subscribe`;
}
