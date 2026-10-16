import { useLayoutEffect, useRef, useState } from 'react';
import { MIN_COLUMN_WIDTH, type ScoreColumn } from './ScoreColumns';

// Measure unwrapped headings so font changes and restored widths cannot clip them.
export function useColumnMinimums(enabled: boolean, columns: string, font?: string) {
    const table = useRef<HTMLTableElement>(null);
    const [minimums, setMinimums] = useState<Partial<Record<ScoreColumn, number>>>({});

    useLayoutEffect(() => {
        if (!enabled || !table.current) return;
        const headings = [...table.current.querySelectorAll<HTMLElement>('[data-column-heading]')];
        let active = true;

        function measure() {
            if (!active) return;
            const next: Partial<Record<ScoreColumn, number>> = {};
            for (const heading of headings) {
                const cell = heading.closest('th')!;
                const style = window.getComputedStyle(cell);
                const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
                const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
                const width = heading.getBoundingClientRect().width + (padding || 0) + (border || 0);
                next[heading.dataset.columnHeading as ScoreColumn] = Math.max(MIN_COLUMN_WIDTH, Math.ceil(width));
            }

            // Ignore observer callbacks that did not change any minimum width.
            setMinimums(previous => Object.keys(next).every(id => previous[id as ScoreColumn] === next[id as ScoreColumn])
                ? previous : next);
        }

        measure();
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        headings.forEach(heading => observer?.observe(heading));
        observer?.observe(table.current);
        void document.fonts?.ready.then(measure);
        document.fonts?.addEventListener('loadingdone', measure);
        return () => {
            active = false;
            observer?.disconnect();
            document.fonts?.removeEventListener('loadingdone', measure);
        };
    }, [enabled, columns, font]);

    return { table, minimums };
}
