import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useSpeechRecognition, type SpeechRecognitionErrorInfo } from '../../../hooks/device';

const languages = [
  ['en-US', 'English (US)'],
  ['en-GB', 'English (UK)'],
  ['es-ES', 'Español'],
  ['fr-FR', 'Français'],
  ['de-DE', 'Deutsch'],
] as const;

function explain(error: SpeechRecognitionErrorInfo): string {
  switch (error.code) {
    case 'not-allowed':
      return 'Microphone access was denied (or the page is not served over HTTPS). Allow it in the site settings and try again.';
    case 'service-not-allowed':
      return 'The browser or operating system refused the speech service.';
    case 'no-speech':
      return 'No speech was detected. Check your microphone and speak a little louder.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'The recognition service could not be reached (Chrome needs a network connection).';
    default:
      return error.message;
  }
}

export default function UseSpeechRecognitionDemo() {
  const languageId = useId();
  const [lang, setLang] = useState<string>('en-US');
  const [continuous, setContinuous] = useState(true);
  const [fallbackText, setFallbackText] = useState('');
  const speech = useSpeechRecognition({ lang, continuous });

  if (!speech.isSupported) {
    return (
      <div className="stack">
        <Callout tone="warn" title="Not supported in this browser">
          Speech recognition is available in Chromium-based browsers and Safari, but not in Firefox.
          Always keep a typed alternative:
        </Callout>
        <label className="field">
          <span className="field-label">Type instead</span>
          <textarea
            rows={3}
            value={fallbackText}
            onChange={(event) => setFallbackText(event.target.value)}
          />
        </label>
      </div>
    );
  }

  const busy = speech.status !== 'idle';

  return (
    <div className="stack">
      <Callout tone="warn" title="Privacy">
        Nothing is recorded until you press <strong>Start</strong>; the browser then asks for
        microphone access. In Chrome the audio is sent to Google&apos;s server-based recognition
        service — do not dictate anything sensitive.
      </Callout>
      <Panel title="Dictation">
        <div className="row">
          <label htmlFor={languageId}>Language</label>
          <select
            id={languageId}
            value={lang}
            disabled={busy}
            onChange={(event) => setLang(event.target.value)}
          >
            {languages.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <label className="row">
            <input
              type="checkbox"
              checked={continuous}
              disabled={busy}
              onChange={(event) => setContinuous(event.target.checked)}
            />
            Keep listening after a pause
          </label>
        </div>
        <div className="row">
          <Button variant="primary" onClick={speech.start} disabled={busy}>
            Start
          </Button>
          <Button onClick={speech.stop} disabled={speech.status !== 'listening'}>
            Stop
          </Button>
          <Button variant="danger" onClick={speech.abort} disabled={!busy}>
            Abort
          </Button>
          <Button variant="ghost" onClick={speech.reset} disabled={busy || !speech.transcript}>
            Clear
          </Button>
        </div>
        <ValueTable
          label="Recognition state"
          rows={{
            Status: <Badge tone={speech.listening ? 'success' : 'neutral'}>{speech.status}</Badge>,
            Transcript: speech.transcript || '—',
            'Hearing…': <span className="muted">{speech.interimTranscript || '—'}</span>,
          }}
        />
        <p className="visually-hidden" aria-live="polite">
          {speech.listening ? 'Listening' : ''}
        </p>
        {speech.error ? (
          <Callout tone="danger" title={`Error: ${speech.error.code}`}>
            {explain(speech.error)}
          </Callout>
        ) : null}
      </Panel>
    </div>
  );
}
