import { useDocumentLocale } from '../i18n/useT';
import { Logo } from '../ui/Logo';

export function App() {
  useDocumentLocale();
  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <Logo size="lg" />
    </main>
  );
}
