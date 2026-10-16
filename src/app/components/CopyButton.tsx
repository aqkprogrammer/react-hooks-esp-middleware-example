import { useEffect, useState } from 'react';
import { Button } from '../../components/ui';

/** Copies text with the async Clipboard API and announces the result. */
export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <>
      <Button size="sm" onClick={copy}>
        {status === 'copied' ? 'Copied!' : status === 'failed' ? 'Copy failed' : label}
      </Button>
      <span className="visually-hidden" role="status">
        {status === 'copied' ? 'Copied to clipboard' : status === 'failed' ? 'Copy failed' : ''}
      </span>
    </>
  );
}
