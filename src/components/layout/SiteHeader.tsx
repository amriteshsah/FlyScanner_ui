import { useState } from 'react';
import { Bell, Menu, Plane, UserRound, X } from 'lucide-react';
import { Link } from 'react-router';
import { getCurrentUser } from '../../features/account/services/mockAccountStore';

type SiteHeaderProps = {
  onAction?: (message: string) => void;
};

export default function SiteHeader({ onAction }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(getCurrentUser());
  const accountPath = signedIn ? '/account' : '/login';

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
        <Link to="/explore" onClick={closeMenu}>Explore</Link>
        <Link to={signedIn ? '/account?tab=alerts' : '/login?next=%2Faccount%3Ftab%3Dalerts'} onClick={closeMenu}>Price alerts</Link>
      </nav>
      <div className="header-actions">
        <button className="icon-button notification" type="button" aria-label="Notifications" onClick={() => onAction?.('Notifications will appear here when the notification service is connected.')}><Bell size={18} /></button>
        <Link className="signin" to={accountPath} onClick={closeMenu}>
          {signedIn ? <><UserRound size={15} /> My account</> : 'Sign in'}
        </Link>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
  );
}
