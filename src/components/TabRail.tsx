import { useEffect, useState, RefObject } from 'react';
import { Folder } from '../types';
import './TabRail.css';

type TabRailProps = {
  folders: Folder[];
  counts: Record<string, number>;
  scrollRoot: RefObject<HTMLDivElement>;
};

// Fore-edge tabs, one per folder: height follows open tasks, click turns to that divider.
export default function TabRail({ folders, counts, scrollRoot }: TabRailProps) {
  const [activeId, setActiveId] = useState<string | null>(folders[0]?.id ?? null);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = root.getBoundingClientRect().top + 24;
      let current: string | null = folders[0]?.id ?? null;
      for (const folder of folders) {
        const el = root.querySelector<HTMLElement>(`[data-folder-id="${folder.id}"]`);
        if (el && el.getBoundingClientRect().top <= top) current = folder.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [folders, scrollRoot]);

  const turnTo = (folderId: string) => {
    const root = scrollRoot.current;
    const el = root?.querySelector<HTMLElement>(`[data-folder-id="${folderId}"]`);
    if (!root || !el) return;
    root.scrollTo({ top: root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 12 });
    setActiveId(folderId);
  };

  return (
    <nav className="tab-rail" aria-label="Folders">
      {folders.map((folder, index) => {
        const open = counts[folder.id] ?? 0;
        const minHeight = Math.min(112, 44 + open * 6);
        return (
          <button
            key={folder.id}
            type="button"
            className={`rail-tab ${activeId === folder.id ? 'active' : ''}`}
            style={{
              '--tab': `var(--hue-${index % 7})`,
              '--tab-ink': `var(--hue-${index % 7}-ink)`,
              minHeight,
            } as React.CSSProperties}
            onClick={() => turnTo(folder.id)}
            title={`${folder.name}: ${open} open`}
            aria-current={activeId === folder.id ? 'true' : undefined}
          >
            <span className="rail-tab-label">{folder.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
