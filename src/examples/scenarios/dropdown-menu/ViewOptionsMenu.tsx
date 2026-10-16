import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useClickOutside, useRovingTabIndex } from '../../../hooks';
import { findByFirstLetter, MENU_ITEMS, type MenuItemDefinition, type SortKey } from './menuModel';

export interface ViewSettings {
  showHidden: boolean;
  showSizes: boolean;
  sortBy: SortKey;
}

export interface ViewOptionsMenuProps {
  settings: ViewSettings;
  onSettingsChange: (next: ViewSettings) => void;
  onAction: (id: 'new-folder' | 'refresh') => void;
}

const LABELS = MENU_ITEMS.map((item) => item.label);

/**
 * WAI-ARIA APG "menu button": a `<button aria-haspopup="menu">` that opens
 * a `role="menu"` with `menuitem`, `menuitemcheckbox` and `menuitemradio`
 * children. Focus moves into the menu (roving tabindex), and returns to the
 * button whenever the menu closes from the keyboard or after an action.
 */
export function ViewOptionsMenu({ settings, onSettingsChange, onAction }: ViewOptionsMenuProps) {
  const id = useId();
  const buttonId = `${id}-button`;
  const menuId = `${id}-menu`;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setActiveIndex, getItemProps } = useRovingTabIndex({
    count: MENU_ITEMS.length,
    orientation: 'vertical',
    loop: true,
  });

  // The menu only exists after the commit that opened it: focus then.
  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [isOpen]);

  const open = (focusIndex: number) => {
    setActiveIndex(focusIndex);
    setIsOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useClickOutside(
    [menuRef, buttonRef],
    () => close(menuRef.current?.contains(document.activeElement) ?? false),
    { enabled: isOpen },
  );

  const isChecked = (item: MenuItemDefinition) =>
    item.kind === 'checkbox'
      ? settings[item.id]
      : item.kind === 'radio'
        ? settings.sortBy === item.id
        : undefined;

  /** Returns whether the item did something (disabled items do not). */
  const activate = (item: MenuItemDefinition): boolean => {
    if (item.kind === 'checkbox') {
      onSettingsChange({ ...settings, [item.id]: !settings[item.id] });
    } else if (item.kind === 'radio') {
      onSettingsChange({ ...settings, sortBy: item.id });
    } else if (item.disabled) {
      return false;
    } else if (item.id !== 'share') {
      onAction(item.id);
    }
    return true;
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 0 : MENU_ITEMS.length - 1);
    }
    // Enter and Space activate the native button, i.e. onClick.
  };

  const onItemKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLElement>,
    roving: (event: KeyboardEvent<HTMLElement>) => void,
  ) => {
    const item = MENU_ITEMS[index];
    if (!item) return;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        return;
      case 'Tab':
        // Close and let Tab continue from the button, so focus lands on the
        // next element in the page (Shift+Tab lands on the button itself).
        if (event.shiftKey) event.preventDefault();
        close(true);
        return;
      case 'Enter':
        event.preventDefault();
        if (activate(item)) close(true);
        return;
      case ' ':
        event.preventDefault();
        // Space toggles checkbox/radio items without closing the menu.
        if (activate(item) && item.kind === 'action') close(true);
        return;
      default:
        break;
    }
    const printable =
      event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey;
    if (printable && !event.altKey) {
      event.preventDefault();
      const target = findByFirstLetter(LABELS, index, event.key);
      if (target !== -1) setActiveIndex(target, { focus: true });
      return;
    }
    roving(event);
  };

  const renderItem = (item: MenuItemDefinition, index: number) => {
    const itemProps = getItemProps(index);
    const checked = isChecked(item);
    const role =
      item.kind === 'checkbox'
        ? 'menuitemcheckbox'
        : item.kind === 'radio'
          ? 'menuitemradio'
          : 'menuitem';
    const disabled = item.kind === 'action' ? item.disabled : undefined;
    return (
      <div
        key={item.id}
        {...itemProps}
        role={role}
        aria-checked={checked}
        aria-disabled={disabled ? true : undefined}
        className="dropdown-menu-item"
        onKeyDown={(event) => onItemKeyDown(index, event, itemProps.onKeyDown)}
        onClick={() => {
          if (activate(item)) close(true);
        }}
      >
        <span className="dropdown-menu-check" aria-hidden="true">
          {checked ? (item.kind === 'radio' ? '●' : '✓') : ''}
        </span>
        <span>{item.label}</span>
        {disabled ? <span className="dropdown-menu-hint">{disabled}</span> : null}
      </div>
    );
  };

  // Sections of the flat item list, in DOM order.
  const section = (kinds: ReadonlyArray<MenuItemDefinition['kind']>, ids?: readonly string[]) =>
    MENU_ITEMS.flatMap((item, index) =>
      kinds.includes(item.kind) && (!ids || ids.includes(item.id)) ? [renderItem(item, index)] : [],
    );

  return (
    <div className="dropdown-menu">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? close(false) : open(0))}
        onKeyDown={onButtonKeyDown}
      >
        View options <span aria-hidden="true">▾</span>
      </button>
      {isOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="dropdown-menu-popup"
        >
          {section(['action'], ['new-folder', 'refresh'])}
          <div role="separator" className="dropdown-menu-separator" />
          {section(['checkbox'])}
          <div role="separator" className="dropdown-menu-separator" />
          <div role="group" aria-label="Sort by" className="dropdown-menu-group">
            <span className="dropdown-menu-group-label" aria-hidden="true">
              Sort by
            </span>
            {section(['radio'])}
          </div>
          <div role="separator" className="dropdown-menu-separator" />
          {section(['action'], ['share'])}
        </div>
      ) : null}
    </div>
  );
}
