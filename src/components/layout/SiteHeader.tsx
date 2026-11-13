import { useState } from 'react';
import { Bell, Menu, Plane, X } from 'lucide-react';
import { Link } from 'react-router';

type SiteHeaderProps = {
  onAction?: (message: string) => void;
};

export default function SiteHeader({ onAction }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="FlyScanner home" onClick={closeMenu}>
        <span className="brand-mark"><Plane size={19} fill="currentColor" /></span>
        <span>fly<span>scanner</span></span>
      </Link>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        <Link to="/#flights" onClick={closeMenu}>Flights</Link>
        <Link to="/#inspiration" onClick={closeMenu}>Explore</Link>
        <button type="button" onClick={() => { closeMenu(); onAction?.('Price alerts will be available in a later release.'); }}>Price alerts</button>
      </nav>
      <div className="header-actions">
        <button className="icon-button notification" type="button" aria-label="Notifications" onClick={() => onAction?.('Notifications will be available when user accounts are connected.')}><Bell size={18} /><i /></button>
        <button className="signin" type="button" onClick={() => onAction?.('Sign-in will be connected when authentication is implemented.')}>Sign in</button>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
  );
}
