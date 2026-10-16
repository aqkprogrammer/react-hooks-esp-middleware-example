import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useEventListener } from '../hooks';
import { Link } from './components/Link';
import { ApiReferencePage } from './pages/ApiReferencePage';
import { BrowsePage } from './pages/BrowsePage';
import { EntryPage } from './pages/EntryPage';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useThemePreference, type ThemePreference } from './preferences';
import { navigate, useLocation, type Location } from './router';
import './styles/global.css';
import './styles/app.css';

const navItems: Array<{ label: string; to: string; params?: Record<string, string> }> = [
  { label: 'Home', to: '/' },
  { label: 'Built-in Hooks', to: '/browse', params: { section: 'built-in' } },
  { label: 'Performance', to: '/browse', params: { section: 'built-in', category: 'Performance' } },
  {
    label: 'Modern React',
    to: '/browse',
    params: { section: 'built-in', category: 'Modern React (19+)' },
  },
  { label: 'Custom Hooks', to: '/browse', params: { section: 'custom' } },
  { label: 'Real-World Scenarios', to: '/browse', params: { section: 'scenario' } },
  { label: 'State & Middleware', to: '/browse', params: { section: 'state' } },
  { label: 'ESP-JS Integration', to: '/browse', params: { section: 'esp' } },
  { label: 'Testing', to: '/browse', params: { section: 'testing' } },
  { label: 'Rules & Anti-patterns', to: '/browse', params: { section: 'anti-pattern' } },
  { label: 'API Reference', to: '/api' },
  { label: 'Learning Path', to: '/learn' },
];

function Page({ location }: { location: Location }) {
  const { path } = location;
  if (path === '/') return <HomePage />;
  if (path === '/browse') return <BrowsePage location={location} />;
  if (path === '/learn') return <LearnPage />;
  if (path === '/api') return <ApiReferencePage />;
  const entryMatch = /^\/entry\/([a-z0-9-]+)$/.exec(path);
  if (entryMatch?.[1]) return <EntryPage id={entryMatch[1]} />;
  return <NotFoundPage />;
}

export function App() {
  const location = useLocation();
  const [theme, setTheme] = useThemePreference();
  const [navOpen, setNavOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const ids = { search: useId(), theme: useId(), nav: useId() };
  const routeKey = `${location.path}?${location.params.toString()}`;
  const [lastPath, setLastPath] = useState(location.path);

  // Close the mobile nav when the route changes (adjusting state during render
  // instead of in an effect avoids an extra render with stale UI).
  if (lastPath !== location.path) {
    setLastPath(location.path);
    setNavOpen(false);
  }

  // Move focus to the main region on navigation so screen-reader and keyboard
  // users start at the new content; also scroll to top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.path]);

  // "/" focuses search, like many documentation sites.
  useEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      searchRef.current?.focus();
    }
  });

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchRef.current?.value.trim();
    navigate('/browse', query ? { q: query } : {});
  };

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="app-header">
        <button
          type="button"
          className="btn btn-ghost nav-toggle"
          aria-expanded={navOpen}
          aria-controls={ids.nav}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          <span className="visually-hidden">Navigation</span>
        </button>
        <a className="brand" href="#/">
          <span aria-hidden="true">⚛︎</span> React Hooks Playground
        </a>
        <form className="header-search" role="search" onSubmit={onSearch}>
          <label htmlFor={ids.search} className="visually-hidden">
            Search hooks
          </label>
          <input
            ref={searchRef}
            id={ids.search}
            key={routeKey}
            className="input"
            type="search"
            placeholder="Search hooks…  (press /)"
            defaultValue={location.path === '/browse' ? (location.params.get('q') ?? '') : ''}
          />
        </form>
        <div className="header-theme">
          <label htmlFor={ids.theme} className="visually-hidden">
            Color theme
          </label>
          <select
            id={ids.theme}
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemePreference)}
          >
            <option value="system">System theme</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </header>
      <div className="app-body">
        <nav id={ids.nav} className={`app-nav${navOpen ? ' open' : ''}`} aria-label="Sections">
          <ul>
            {navItems.map((item) => (
              <li key={item.label}>
                <Link to={item.to} {...(item.params ? { params: item.params } : {})} matchParams>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="small muted nav-footer">
            <a
              href="https://github.com/aqkprogrammer/react-hooks-esp-middleware-example"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub ↗
            </a>
          </p>
        </nav>
        <main id="main" ref={mainRef} tabIndex={-1} className="app-main">
          <Page location={location} />
        </main>
      </div>
    </div>
  );
}
