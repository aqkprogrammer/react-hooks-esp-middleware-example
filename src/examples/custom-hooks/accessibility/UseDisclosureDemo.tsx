import { useState } from 'react';
import { Panel } from '../../../components/ui';
import { useDisclosure } from '../../../hooks';
import './UseDisclosureDemo.css';

const FAQ = [
  {
    id: 'shipping',
    question: 'How long does shipping take?',
    answer: 'Orders ship within 2 working days and usually arrive 3–5 days later.',
  },
  {
    id: 'returns',
    question: 'Can I return an item?',
    answer: 'Yes, within 30 days. Use the prepaid label included in the parcel.',
  },
  {
    id: 'warranty',
    question: 'Is there a warranty?',
    answer: 'Every product has a two-year warranty against manufacturing defects.',
  },
];

/** An accordion (WAI-ARIA pattern) and a "show more" disclosure. */
export default function UseDisclosureDemo() {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(['shipping']));
  const [multiple, setMultiple] = useState(false);
  const more = useDisclosure();

  const setOpen = (id: string, open: boolean) =>
    setOpenIds((previous) => {
      const next = new Set(multiple ? previous : []);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="stack">
      <Panel
        title="FAQ accordion"
        description="Each heading contains a button; Enter or Space toggles it."
      >
        <label className="row">
          <input
            type="checkbox"
            checked={multiple}
            onChange={(event) => setMultiple(event.target.checked)}
          />
          Allow several sections open at once
        </label>
        <div className="disclosure-demo-accordion">
          {FAQ.map((item) => (
            <AccordionItem
              key={item.id}
              question={item.question}
              answer={item.answer}
              open={openIds.has(item.id)}
              onOpenChange={(open) => setOpen(item.id, open)}
            />
          ))}
        </div>
      </Panel>
      <Panel title="Show more">
        <p>The kettle boils 1.7 litres in under four minutes and switches off automatically.</p>
        <div {...more.panelProps}>
          <p>It has a removable limescale filter, a 360° base and a water window on both sides.</p>
        </div>
        <button type="button" className="btn btn-sm" {...more.triggerProps}>
          {more.isOpen ? 'Show less' : 'Show more'}
        </button>
      </Panel>
    </div>
  );
}

function AccordionItem({
  question,
  answer,
  open,
  onOpenChange,
}: {
  question: string;
  answer: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Controlled: the parent decides whether other sections close.
  const disclosure = useDisclosure({ open, onOpenChange });
  return (
    <div className="disclosure-demo-item">
      <h4 className="disclosure-demo-heading">
        <button type="button" className="disclosure-demo-trigger" {...disclosure.triggerProps}>
          <span aria-hidden="true" className="disclosure-demo-icon">
            {disclosure.isOpen ? '−' : '+'}
          </span>
          {question}
        </button>
      </h4>
      <div
        {...disclosure.panelProps}
        role="region"
        aria-labelledby={disclosure.triggerProps.id}
        className="disclosure-demo-panel"
      >
        <p>{answer}</p>
      </div>
    </div>
  );
}
