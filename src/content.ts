/**
 * content.ts — SponsorPulse Hello World
 *
 * Injects a floating "Hello World" button into the bottom-right corner
 * of any YouTube page. This is the baseline test to confirm the
 * extension compiles and loads correctly.
 */

function injectHelloWorldButton(): void {
  // Avoid injecting more than once (e.g. on YouTube's SPA navigation)
  if (document.getElementById('sponsor-pulse-hello-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'sponsor-pulse-hello-btn';
  btn.textContent = '👋 Hello from SponsorPulse!';

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '99999',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)';
    btn.style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.6)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.45)';
  });

  btn.addEventListener('click', () => {
    alert('✅ SponsorPulse content script is working!');
  });

  document.body.appendChild(btn);
  console.log('[SponsorPulse] Hello World button injected.');
}

// Run immediately — document_idle guarantees <body> exists
injectHelloWorldButton();
