import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import i18n from '../lib/i18n';
import type { Language } from '../lib/language';

/** Renders the whole app at a given route in jsdom and waits for the queries. */
export async function renderRoute(path: string, language: Language = 'pt-PT') {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;

  await act(async () => {
    root = createRoot(container);
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
  });
  await settle();

  // Sheets and toasts render in a portal on document.body, so the helpers look
  // at the whole document, not just the container.
  const view = {
    container,
    text: () => document.body.textContent ?? '',
    /** Waits for lazily loaded routes / pending queries to show up. */
    async waitForText(needle: string, timeout = 2000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if ((document.body.textContent ?? '').includes(needle)) {
          await settle(2); // let the pending queries of that screen land too
          return;
        }
        await settle(1);
      }
      throw new Error(`"${needle}" não apareceu no ecrã. Texto atual: ${document.body.textContent?.slice(0, 400)}`);
    },
    async click(label: string) {
      const target = clickable(document.body, label);
      if (!target) throw new Error(`Não encontrei nada para clicar com o texto "${label}"`);
      await act(async () => {
        target.click();
      });
      await settle();
    },
    cleanup() {
      act(() => root.unmount());
      container.remove();
      queryClient.clear();
    },
  };
  return view;
}

export async function settle(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function clickable(container: HTMLElement, label: string): HTMLElement | undefined {
  const candidates = [...container.querySelectorAll<HTMLElement>('button, a, [role="radio"], [role="tab"]')];
  return (
    candidates.find((el) => el.textContent?.trim() === label) ??
    candidates.find((el) => el.textContent?.includes(label)) ??
    candidates.find((el) => el.getAttribute('aria-label')?.includes(label))
  );
}
