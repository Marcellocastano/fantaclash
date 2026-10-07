import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { matchRoute } from './site/router';
import { SitePage } from './site/SitePage';
import './index.css';

/**
 * Avvio nel browser: se la pagina è stata pre-renderizzata React riprende
 * l'HTML esistente (hydration), altrimenti (sviluppo) disegna da zero.
 */
const container = document.getElementById('root')!;
const dataBlock = document.getElementById('page-data');
const data: unknown = dataBlock?.textContent ? JSON.parse(dataBlock.textContent) : null;
const page = (
  <StrictMode>
    <SitePage match={matchRoute(window.location.pathname)} data={data} />
  </StrictMode>
);

if (container.firstElementChild) hydrateRoot(container, page);
else createRoot(container).render(page);
