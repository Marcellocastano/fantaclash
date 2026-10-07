import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

/**
 * Toggle tema chiaro/scuro. Un'unica istanza montata alla volta.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const toDark = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      aria-label={toDark ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
      className="p-2 border border-line-strong rounded-sm text-ink hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
    >
      <Icon name={toDark ? 'moon' : 'sun'} className="w-5 h-5" />
    </button>
  );
}
