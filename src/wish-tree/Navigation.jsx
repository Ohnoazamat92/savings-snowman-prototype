import { useLayoutEffect, useRef } from 'react';
import navigation from './navigation.html?raw';

export function Navigation() {
  const host = useRef(null);
  useLayoutEffect(() => {
    const root = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    // Исходная шапка и её CSS изолированы от стилей ёлки.
    root.innerHTML = `<link rel="stylesheet" href="${import.meta.env.BASE_URL}source.css">
      <style>
        :host{display:block;position:relative;z-index:200;--tui-font-text-m:400 15px/24px TinkoffSans,Arial,sans-serif;--tui-text-primary:#000000cc;--tui-text-action:#126df7}
        header::before{display:none!important}
        .abXXtoYXt:not([data-open]){display:none}
        .abhWSee1M{min-width:0;max-width:1104px;width:calc(100% - 40px);zoom:1!important}
        [data-test$="-popover"][data-open], [data-test="hidden-login"][data-open]{opacity:1;visibility:visible;pointer-events:auto;transform:none}
        @media(max-width:760px){.cbdNIsumo{flex-wrap:wrap;max-height:none;gap:8px}.abeZkq7aP{order:3;width:100%;overflow-x:auto}.bbeZkq7aP{padding:0;justify-content:space-between}.db7SwyU4R{padding:4px 8px;white-space:nowrap}.abXXtoYXt{max-width:100%;max-height:70svh;overflow:auto}.abCAwUhUN{margin-right:auto}}
      </style>${navigation.replaceAll('/assets/', `${import.meta.env.BASE_URL}assets/`)}`;
    const close = () => {
      root.querySelectorAll('[data-open]').forEach(el => el.removeAttribute('data-open'));
      root.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    };
    const click = event => {
      const skip = event.target.closest('[data-test="skip-link"]');
      if (skip) { event.preventDefault(); document.getElementById('main-title')?.focus(); return; }
      const button = event.target.closest('[data-test="open-menu-button"],.bbEZ9TBXB,[data-test="open-login-button"]');
      if (!button) return;
      const item = button.closest('[data-item-type="menu"],.abEZ9TBXB');
      const popup = item?.querySelector('[data-test$="-popover"],[data-test="hidden-login"]');
      if (!popup) return;
      const wasOpen = popup.hasAttribute('data-open');
      close();
      if (!wasOpen) { popup.setAttribute('data-open', ''); button.setAttribute('aria-expanded', 'true'); }
    };
    const outside = event => { if (!event.composedPath().includes(host.current)) close(); };
    const escape = event => { if (event.key === 'Escape') { close(); event.target.focus(); } };
    root.addEventListener('click', click);
    root.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); root.removeEventListener('click', click); root.removeEventListener('keydown', escape); root.replaceChildren(); };
  }, []);
  return <div ref={host} />;
}
