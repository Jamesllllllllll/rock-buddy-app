import { useEffect, useRef, type ReactNode } from 'react';

// Native dialogs provide focus trapping and Escape handling without extra roots.
export function Modal({
    title,
    onClose,
    children,
    className = '',
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current!;
        const previousFocus = document.activeElement;
        const previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        element.showModal();
        return () => {
            element.close();
            document.documentElement.style.overflow = previousOverflow;
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, []);

    return (
        <dialog ref={dialog} aria-label={title} onCancel={onClose} className={`app-dialog ${className}`}>
            <button className="close" aria-label="Close" onClick={onClose}>
                ×
            </button>
            <h2>{title}</h2>
            {children}
        </dialog>
    );
}
