/**
 * A *simulation* of how React stores Hook state: per component, an ordered
 * list of "slots" created on the first render. On every later render the
 * n-th Hook call reads the n-th slot — React has no other way to know which
 * call is which. Nothing here calls real Hooks.
 */

export type HookKind = 'useState' | 'useEffect';

export interface HookCall {
  kind: HookKind;
  /** What the call is for, e.g. "name" or "persistForm". */
  label: string;
  /** Initial value (useState) or effect description (useEffect). */
  value: string;
}

export type ScenarioId = 'conditional-effect' | 'loop-state';
export type Variant = 'broken' | 'fixed';

export interface Scenario {
  id: ScenarioId;
  title: string;
  /** What the scenario's boolean input means. */
  conditionLabel: string;
  broken: string;
  fixed: string;
}

export const scenarios: readonly Scenario[] = [
  {
    id: 'conditional-effect',
    title: 'Conditional useEffect',
    conditionLabel: 'The name field is filled in',
    broken: [
      "const [name, setName] = useState('Mary');",
      "if (name !== '') {",
      '  useEffect(function persistForm() { … });',
      '}',
      "const [surname, setSurname] = useState('Poppins');",
      'useEffect(function updateTitle() { … });',
    ].join('\n'),
    fixed: [
      "const [name, setName] = useState('Mary');",
      'useEffect(function persistForm() {',
      "  if (name !== '') { … } // condition inside the Hook",
      '});',
      "const [surname, setSurname] = useState('Poppins');",
      'useEffect(function updateTitle() { … });',
    ].join('\n'),
  },
  {
    id: 'loop-state',
    title: 'useState in a loop',
    conditionLabel: 'The list is reversed',
    broken: [
      "const people = reversed ? ['Poppins', 'Mary'] : ['Mary', 'Poppins'];",
      '// One useState per item, called in a loop:',
      'const drafts = people.map((person) => useState(`${person} draft`));',
    ].join('\n'),
    fixed: [
      "const people = reversed ? ['Poppins', 'Mary'] : ['Mary', 'Poppins'];",
      'return people.map((person) => <PersonRow key={person} person={person} />);',
      '',
      'function PersonRow({ person }) {',
      '  // Each row has its own slot list; React matches rows by key, not position.',
      '  const [draft, setDraft] = useState(`${person} draft`);',
      '}',
    ].join('\n'),
  },
];

/**
 * The Hook calls one render makes. `condition` means "name is filled in" for
 * the conditional-effect scenario and "the list is reversed" for the loop.
 */
export function hookCalls(scenario: ScenarioId, variant: Variant, condition: boolean): HookCall[] {
  if (scenario === 'conditional-effect') {
    const callsPersist = variant === 'fixed' || condition;
    return [
      { kind: 'useState', label: 'name', value: 'Mary' },
      ...(callsPersist
        ? [{ kind: 'useEffect', label: 'persistForm', value: 'persistForm effect' } as const]
        : []),
      { kind: 'useState', label: 'surname', value: 'Poppins' },
      { kind: 'useEffect', label: 'updateTitle', value: 'updateTitle effect' },
    ];
  }
  if (variant === 'fixed') {
    // Each <PersonRow key> owns its slots, so the pairing never depends on order.
    return [
      { kind: 'useState', label: 'PersonRow key="Mary" › draft', value: 'Mary draft' },
      { kind: 'useState', label: 'PersonRow key="Poppins" › draft', value: 'Poppins draft' },
    ];
  }
  const people = condition ? ['Poppins', 'Mary'] : ['Mary', 'Poppins'];
  return people.map((person) => ({
    kind: 'useState',
    label: `${person} draft`,
    value: `${person} draft`,
  }));
}

export type SlotStatus = 'ok' | 'wrong-state' | 'order-changed' | 'missing' | 'extra';

export interface SlotRow {
  index: number;
  /** Slot created on the first render (undefined: no such slot). */
  slot?: HookCall;
  /** Call made by this render (undefined: this render made fewer calls). */
  call?: HookCall;
  status: SlotStatus;
  explanation: string;
}

export interface Verdict {
  tone: 'success' | 'warn' | 'danger';
  message: string;
}

/** Pairs this render's calls with the slots by position, exactly like React does. */
export function compareSlots(slots: readonly HookCall[], calls: readonly HookCall[]): SlotRow[] {
  const rows: SlotRow[] = [];
  for (let index = 0; index < Math.max(slots.length, calls.length); index += 1) {
    const slot = slots[index];
    const call = calls[index];
    if (slot && call) {
      if (slot.kind !== call.kind) {
        rows.push({
          index,
          slot,
          call,
          status: 'order-changed',
          explanation: `${call.kind} (${call.label}) landed in the ${slot.kind} slot of “${slot.label}”.`,
        });
      } else if (slot.label !== call.label) {
        rows.push({
          index,
          slot,
          call,
          status: 'wrong-state',
          explanation: `“${call.label}” silently reads “${slot.label}”'s value: ${JSON.stringify(slot.value)}.`,
        });
      } else {
        rows.push({ index, slot, call, status: 'ok', explanation: `Reads its own slot.` });
      }
    } else if (slot) {
      rows.push({ index, slot, status: 'missing', explanation: 'No call reached this slot.' });
    } else if (call) {
      rows.push({ index, call, status: 'extra', explanation: 'No slot exists for this call.' });
    }
  }
  return rows;
}

/** What React itself would report for these rows. */
export function verdict(rows: readonly SlotRow[]): Verdict {
  const has = (status: SlotStatus) => rows.some((row) => row.status === status);
  if (has('extra')) {
    return {
      tone: 'danger',
      message: 'React throws: “Rendered more hooks than during the previous render.”',
    };
  }
  if (has('missing')) {
    return {
      tone: 'danger',
      message:
        'React throws: “Rendered fewer hooks than expected. This may be caused by an accidental early return statement.”',
    };
  }
  if (has('order-changed')) {
    return {
      tone: 'danger',
      message:
        'In development React warns: “React has detected a change in the order of Hooks” — state and effects now belong to the wrong calls.',
    };
  }
  if (has('wrong-state')) {
    return {
      tone: 'warn',
      message:
        'No error and no warning — React only checks Hook *types*, so a component silently shows another Hook’s state.',
    };
  }
  return { tone: 'success', message: 'Every call reads its own slot. The order is stable.' };
}
