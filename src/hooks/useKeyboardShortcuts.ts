import { useEffect, useRef } from 'react';

type ShortcutHandler = () => void;

export function useKeyboardShortcuts(handlers: {
  escape?: ShortcutHandler;
  ctrlF?: ShortcutHandler;
  ctrlD?: ShortcutHandler;
  delete?: ShortcutHandler;
  ctrlZ?: ShortcutHandler;
  ctrlY?: ShortcutHandler;
}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { escape, ctrlF, ctrlD, delete: deleteKey, ctrlZ, ctrlY } = handlersRef.current;

      if (e.key === 'Escape' && escape) {
        e.preventDefault();
        escape();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f' && ctrlF) {
        e.preventDefault();
        ctrlF();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && ctrlD) {
        e.preventDefault();
        ctrlD();
      } else if (e.key === 'Delete' && deleteKey) {
        deleteKey();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && ctrlZ) {
        e.preventDefault();
        ctrlZ();
      } else if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
                 ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && ctrlY)) {
        e.preventDefault();
        if (ctrlY) ctrlY();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

