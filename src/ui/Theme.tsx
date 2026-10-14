import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react';

const themes = ['dark', 'light', 'classic', 'streamer'];
const ThemeContext = createContext<{
    theme: string;
    color: string;
    text: string;
    set: (key: string, value: string) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        return themes.includes(saved) ? saved : 'dark';
    });
    const [color, setColor] = useState(() => localStorage.getItem('streamer-color') || '#ffffff');
    const [text, setText] = useState(
        () => localStorage.getItem('streamer-text-color') || '#000000',
    );

    function set(key: string, value: string) {
        localStorage.setItem(key, value);
        if (key === 'theme') setTheme(value);
        if (key === 'streamer-color') setColor(value);
        if (key === 'streamer-text-color') setText(value);
    }

    const style =
        theme === 'streamer'
            ? ({
                  '--streamer-color': color,
                  '--streamer-text-color': text,
                  background: color,
                  color: text,
              } as CSSProperties)
            : undefined;
    return (
        <ThemeContext value={{ theme, color, text, set }}>
            <link rel="stylesheet" href={`./common/${theme}-theme.css`} />
            <div className="app-shell" style={style}>
                {children}
            </div>
        </ThemeContext>
    );
}

export function ThemeControls() {
    const value = useContext(ThemeContext)!;
    return (
        <div className="theme-controls">
            {value.theme === 'streamer' && (
                <>
                    <label>
                        Background Color:{' '}
                        <input
                            type="color"
                            value={value.color}
                            onChange={(event) => value.set('streamer-color', event.target.value)}
                        />
                    </label>
                    <label>
                        Text Color:{' '}
                        <input
                            type="color"
                            value={value.text}
                            onChange={(event) =>
                                value.set('streamer-text-color', event.target.value)
                            }
                        />
                    </label>
                </>
            )}
            <label>
                Theme:{' '}
                <select
                    value={value.theme}
                    onChange={(event) => value.set('theme', event.target.value)}
                >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="classic">Retro</option>
                    <option value="streamer">Custom</option>
                </select>
            </label>
        </div>
    );
}
