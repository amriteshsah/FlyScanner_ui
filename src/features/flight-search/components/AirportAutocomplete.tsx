import { useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Airport } from '../services/mockFlightApi';

type AirportAutocompleteProps = {
  label: string;
  value: string;
  placeholder: string;
  airports: Airport[];
  onChange: (value: string) => void;
  onSelect: (airport: Airport) => void;
};

export default function AirportAutocomplete({
  label, value, placeholder, airports, onChange, onSelect,
}: AirportAutocompleteProps) {
  const inputId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return airports.slice(0, 7);
    return airports.filter((airport) => [
      airport.city, airport.country, airport.code, airport.airportName,
    ].some((field) => field.toLowerCase().includes(query))).slice(0, 7);
  }, [airports, value]);

  function choose(airport: Airport) {
    onSelect(airport);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={open ? "field airport-autocomplete is-open" : "field airport-autocomplete"} ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>
      <div className="airport-input-row">
        <MapPin size={17} aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && options[activeIndex] ? listId + '-' + options[activeIndex].code : undefined}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => { onChange(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
              window.setTimeout(() => setOpen(false), 120);
            }
          }}
        />
      </div>
      <small>{label === 'FROM' ? 'Departure city or airport' : 'Where would you like to go?'}</small>
      {open && options.length > 0 && (
        <div className="airport-options" id={listId} role="listbox" aria-label={label === 'FROM' ? 'Departure airports' : 'Destination airports'}>
          {options.map((airport, index) => (
            <button
              id={listId + '-' + airport.code}
              className={index === activeIndex ? 'airport-option active' : 'airport-option'}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              key={airport.code}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(airport)}
            >
              <span className="airport-option-icon"><MapPin size={16} /></span>
              <span className="airport-option-copy"><strong>{airport.city}, {airport.country}</strong><small>{airport.airportName}</small></span>
              <b>{airport.code}</b>
            </button>
          ))}
        </div>
      )}
      {open && value.trim() && options.length === 0 && (
        <div className="airport-options airport-no-match" role="status">No matching airports. Try a city or 3-letter airport code.</div>
      )}
    </div>
  );
}
