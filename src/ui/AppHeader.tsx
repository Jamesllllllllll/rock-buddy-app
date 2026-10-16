import { Fragment, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BetaBadge } from './BetaBadge';

const pages = ['Sniffer', 'Search', 'Rank', 'Profile', 'Config', 'Account', 'Support'];

export function AppHeader({ compact = false, children }: { compact?: boolean; children?: ReactNode }) {
    const links = compact ? ['Support'] : pages;
    return (
        <nav className="navtop" aria-label="Main navigation">
            <BetaBadge />
            {links.map((name, index) => (
                <Fragment key={name}>
                    {index > 0 && name !== 'Config' && <span aria-hidden="true">|</span>}
                    <NavLink
                        to={`/${name.toLowerCase()}`}
                        style={name === 'Config' || compact ? { marginLeft: 'auto' } : undefined}
                    >
                        {name}
                    </NavLink>
                </Fragment>
            ))}
            {children}
        </nav>
    );
}
