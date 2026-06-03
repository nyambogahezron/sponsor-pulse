const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

function activateTab(targetTab: string): void {
  tabBtns.forEach((btn) => {
    const isActive = btn.dataset.tab === targetTab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${targetTab}`);
  });
}

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab) activateTab(tab);
  });
});

const faqItems = document.querySelectorAll<HTMLElement>('.faq-item');

faqItems.forEach((item) => {
  const btn = item.querySelector<HTMLButtonElement>('.faq-q');
  btn?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all
    faqItems.forEach((i) => {
      i.classList.remove('open');
    });
    // Toggle current
    if (!isOpen) item.classList.add('open');
  });
});
