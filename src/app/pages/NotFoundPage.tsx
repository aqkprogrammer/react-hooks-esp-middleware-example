import { href } from '../router';

export function NotFoundPage() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p>
        That topic doesn’t exist. <a href={href('/browse')}>Browse all topics</a> or{' '}
        <a href={href('/')}>go home</a>.
      </p>
    </div>
  );
}
