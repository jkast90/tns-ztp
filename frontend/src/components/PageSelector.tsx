export interface PageConfig {
  id: string;
  label: string;
  icon?: string;
}

interface Props {
  pages: PageConfig[];
  activePage: string;
  onPageChange: (pageId: string) => void;
}

export function PageSelector({ pages, activePage, onPageChange }: Props) {
  return (
    <div className="tabs">
      {pages.map((page) => (
        <button
          key={page.id}
          className={`tab${activePage === page.id ? ' active' : ''}`}
          onClick={() => onPageChange(page.id)}
        >
          {page.label}
        </button>
      ))}
    </div>
  );
}
