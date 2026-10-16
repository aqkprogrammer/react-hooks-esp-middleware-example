import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useSpeechSynthesis } from '../../../hooks/device';

export default function UseSpeechSynthesisDemo() {
  const ids = { text: useId(), voice: useId(), rate: useId(), pitch: useId() };
  const synth = useSpeechSynthesis();
  const [text, setText] = useState(
    'Hooks let you use state and other React features in functions.',
  );
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  if (!synth.isSupported) {
    return (
      <Callout tone="warn" title="Not supported in this browser">
        <code>speechSynthesis</code> is not available here, so text cannot be read aloud.
      </Callout>
    );
  }

  const voice = synth.voices.find((item) => item.voiceURI === voiceURI) ?? null;

  return (
    <div className="stack">
      <Panel title="Read text aloud" description="Speaking requires a click first in Chromium.">
        <div className="field">
          <label className="field-label" htmlFor={ids.text}>
            Text
          </label>
          <textarea
            id={ids.text}
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <div className="row">
          <label htmlFor={ids.voice}>Voice</label>
          <select
            id={ids.voice}
            value={voiceURI}
            onChange={(event) => setVoiceURI(event.target.value)}
          >
            <option value="">Browser default</option>
            {synth.voices.map((item) => (
              <option key={item.voiceURI} value={item.voiceURI}>
                {item.name} ({item.lang})
              </option>
            ))}
          </select>
          {synth.voices.length === 0 ? (
            <span className="small muted">Voices are still loading…</span>
          ) : null}
        </div>
        <div className="row">
          <label htmlFor={ids.rate}>Rate {rate.toFixed(1)}</label>
          <input
            id={ids.rate}
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
          <label htmlFor={ids.pitch}>Pitch {pitch.toFixed(1)}</label>
          <input
            id={ids.pitch}
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={pitch}
            onChange={(event) => setPitch(Number(event.target.value))}
          />
        </div>
        <div className="row">
          <Button
            variant="primary"
            disabled={text.trim() === ''}
            onClick={() => synth.speak(text, { voice, rate, pitch })}
          >
            Speak
          </Button>
          <Button onClick={synth.pause} disabled={!synth.speaking || synth.paused}>
            Pause
          </Button>
          <Button onClick={synth.resume} disabled={!synth.paused}>
            Resume
          </Button>
          <Button variant="danger" onClick={synth.cancel} disabled={!synth.speaking}>
            Stop
          </Button>
        </div>
        <ValueTable
          label="Speech state"
          rows={{
            Speaking: (
              <Badge tone={synth.speaking ? 'success' : 'neutral'}>{String(synth.speaking)}</Badge>
            ),
            Paused: String(synth.paused),
            'Voices installed': synth.voices.length,
          }}
        />
        {synth.error ? (
          <Callout tone="danger" title={`Speech error: ${synth.error}`}>
            {synth.error === 'not-allowed'
              ? 'The browser blocked speech because there was no user interaction yet.'
              : 'The speech engine reported an error.'}
          </Callout>
        ) : null}
      </Panel>
    </div>
  );
}
