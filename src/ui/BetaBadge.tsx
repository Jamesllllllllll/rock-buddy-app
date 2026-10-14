import { useEffect, useState } from 'react';

// Identify the test build without taking a whole row away from gameplay.
export function BetaBadge() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        window.api.getBetaNotice()
            .then((notice) => {
                if (mounted) setMessage(notice);
            })
            .catch(() => console.warn('Could not read the beta notice.'));

        return () => {
            mounted = false;
        };
    }, []);

    if (!message) return null;

    return (
        <span id="beta-notice" className="beta-badge" tabIndex={0} aria-describedby="beta-details">
            Beta
            <span id="beta-details" className="beta-details" role="tooltip">
                {message}
            </span>
        </span>
    );
}
