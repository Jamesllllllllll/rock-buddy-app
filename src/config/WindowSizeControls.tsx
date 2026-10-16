import { useState, type FormEvent } from 'react';
import { AsyncState } from '../ui/AsyncState';
import { useAction } from '../ui/useAction';
import { useResource } from '../ui/useResource';
import { MINIMUM_SIZE, MAXIMUM_SIZE } from '../window-size';

type WindowSize = { width: number; height: number };

// Read the real window dimensions each time Config opens.
export function WindowSizeControls() {
    const size = useResource('window-size', () => window.api.getWindowSize(), { cache: false });

    return (
        <div className="window-size-settings">
            <AsyncState {...size} retry={size.reload} />
            {size.data && <WindowSizeForm key={size.updatedAt} initial={size.data} />}
        </div>
    );
}

// Apply both dimensions together so editing one field never resizes the window mid-entry.
function WindowSizeForm({ initial }: { initial: WindowSize }) {
    const [width, setWidth] = useState(String(initial.width));
    const [height, setHeight] = useState(String(initial.height));
    const action = useAction();
    const valid = Number.isInteger(Number(width)) && Number(width) >= MINIMUM_SIZE.width && Number(width) <= MAXIMUM_SIZE
        && Number.isInteger(Number(height)) && Number(height) >= MINIMUM_SIZE.height && Number(height) <= MAXIMUM_SIZE;

    function apply(event: FormEvent) {
        event.preventDefault();
        if (!valid) return;

        void action.run(async () => {
            const actual = await window.api.setWindowSize({ width: Number(width), height: Number(height) });
            setWidth(String(actual.width));
            setHeight(String(actual.height));
        });
    }

    return (
        <form onSubmit={apply}>
            <div className="config-row window-size-row">
                <strong title="Outer window size in display-scaled pixels, including the window frame.">Window size:</strong>
                <label>Width <input type="number" min={MINIMUM_SIZE.width} max={MAXIMUM_SIZE} step={1} required
                    value={width} onChange={event => setWidth(event.target.value)} disabled={action.pending} /></label>
                <label>Height <input type="number" min={MINIMUM_SIZE.height} max={MAXIMUM_SIZE} step={1} required
                    value={height} onChange={event => setHeight(event.target.value)} disabled={action.pending} /></label>
                <button type="submit" className="config-action" disabled={!valid || action.pending}>Apply size</button>
            </div>
            <AsyncState error={action.error} />
        </form>
    );
}
