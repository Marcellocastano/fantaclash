import { Icon } from '../../components/Icon';
import { ContentLayout } from '../ContentLayout';

/** Pagina 404 (servita da Netlify con codice 404, non indicizzata) */
export function NotFoundPage() {
  return (
    <ContentLayout>
      <div className="py-16 text-center">
        <p className="font-display text-[8rem] font-black text-whistle leading-none">404</p>
        <h1 className="font-display text-5xl font-black text-ink leading-none mt-4">Pagina non trovata</h1>
        <p className="text-lg text-ink-soft mt-5">Questa pagina non esiste o è stata spostata.</p>
        <a href="/" className="btn-cta mt-10">
          Torna alla home
          <Icon name="arrow" className="w-7 h-7" />
        </a>
      </div>
    </ContentLayout>
  );
}
