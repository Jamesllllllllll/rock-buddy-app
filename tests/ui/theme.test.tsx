import './dom';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeControls, ThemeProvider } from '../../src/ui/Theme';

Object.assign(globalThis, { localStorage: window.localStorage });

afterEach(() => {
    cleanup();
    localStorage.clear();
});

// Exercise the same controls used by the Config page.
function openCustomTheme() {
    const view = render(<ThemeProvider><ThemeControls /></ThemeProvider>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Theme:' }), { target: { value: 'streamer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    return view;
}

test('custom theme preserves existing colors and saves changes across remounts', () => {
    localStorage.setItem('streamer-color', '#123456');
    localStorage.setItem('streamer-text-color', '#abcdef');
    const view = openCustomTheme();
    assert.equal((screen.getByLabelText('Background') as HTMLInputElement).value, '#123456');
    assert.equal((screen.getByLabelText('Text') as HTMLInputElement).value, '#abcdef');

    fireEvent.change(screen.getByLabelText('Panels'), { target: { value: '#223344' } });
    fireEvent.change(screen.getByLabelText('Corners'), { target: { value: '12' } });
    assert.equal(localStorage.getItem('streamer-panel-color'), '#223344');
    assert.equal(localStorage.getItem('streamer-radius'), '12');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    assert.equal(screen.queryByRole('dialog'), null);

    view.unmount();
    openCustomTheme();
    assert.equal((screen.getByLabelText('Panels') as HTMLInputElement).value, '#223344');
    assert.equal((screen.getByLabelText('Corners') as HTMLSelectElement).value, '12');
});

test('accent text stays readable and reset restores the palette and corners', () => {
    const view = openCustomTheme();
    const shell = view.container.querySelector<HTMLElement>('.app-shell')!;

    fireEvent.change(screen.getByLabelText('Accent'), { target: { value: '#ffffff' } });
    assert.equal(shell.style.getPropertyValue('--streamer-accent-text'), '#000000');
    fireEvent.change(screen.getByLabelText('Accent'), { target: { value: '#000000' } });
    assert.equal(shell.style.getPropertyValue('--streamer-accent-text'), '#ffffff');
    fireEvent.change(screen.getByLabelText('Corners'), { target: { value: '0' } });
    assert.equal(shell.style.getPropertyValue('--streamer-radius'), '0px');

    fireEvent.click(screen.getByRole('button', { name: 'Reset defaults' }));
    assert.equal(localStorage.getItem('streamer-accent-color'), '#65349b');
    assert.equal(localStorage.getItem('streamer-radius'), '6');
    assert.equal(shell.style.getPropertyValue('--streamer-radius'), '6px');
});

test('invalid saved settings fall back safely and other themes omit custom overrides', () => {
    localStorage.setItem('streamer-color', 'invalid');
    localStorage.setItem('streamer-radius', '999');
    const view = openCustomTheme();
    assert.equal((screen.getByLabelText('Background') as HTMLInputElement).value, '#ffffff');
    assert.equal((screen.getByLabelText('Corners') as HTMLSelectElement).value, '6');

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Theme:' }), { target: { value: 'light' } });
    assert.equal(screen.queryByRole('button', { name: 'Customize' }), null);
    assert.equal(view.container.querySelector<HTMLElement>('.app-shell')!.style.getPropertyValue('--streamer-color'), '');
});
