import { useEffect, useState, type ReactNode } from 'react';

// Keep the year current even when a window stays open across New Year's midnight.
export function Footer({ children, links }: { children?: ReactNode; links?: ReactNode }) {
    const [year, setYear] = useState(() => new Date().getFullYear());

    useEffect(() => {
        const refresh = () => setYear(new Date().getFullYear());
        const timer = window.setInterval(refresh, 60_000);
        window.addEventListener('focus', refresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    return (
        <footer>
            {children}
            <p>Copyright &copy; {year}{' '}
                <a href="mailto:tntmusicstudios2018@gmail.com" onClick={event => {
                    event.preventDefault();
                    window.api.openExternalLink(event.currentTarget.href);
                }}>TNTMusicStudios</a>
            </p>
            {links}
        </footer>
    );
}
