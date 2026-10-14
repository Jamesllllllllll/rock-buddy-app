import { useEffect, useState, type ReactNode } from 'react';

// Keep the year current even when a window stays open across New Year's midnight.
export function Footer({ children }: { children?: ReactNode }) {
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
            <p>Copyright &copy; {year} TNTMusicStudios</p>
        </footer>
    );
}
