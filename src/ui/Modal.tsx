import { useEffect, useRef, type ReactNode } from 'react';

// Native dialogs provide focus trapping and Escape handling without extra roots.
export function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current!;
        element.showModal();
        return () => element.close();
    }, []);

    return (
        <dialog ref={dialog} aria-label={title} onCancel={onClose} className="app-dialog">
            <button className="close" aria-label="Close" onClick={onClose}>
                ×
            </button>
            <h2>{title}</h2>
            {children}
        </dialog>
    );
}
