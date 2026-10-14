import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';

const pages = ['Sniffer', 'Search', 'Rank', 'Profile', 'Config', 'Account', 'Support'];

export function AppHeader({ compact = false }: { compact?: boolean }) {
    const links = compact ? ['Support'] : pages;
    return (
        <nav className="navtop" aria-label="Main navigation">
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
        </nav>
    );
}
