import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { suggest } from "@/api";

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function SearchBox({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const dq = useDebounced(q.trim());
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["suggest", dq], queryFn: () => suggest(dq), enabled: dq.length > 1 });

  const go = (term: string) => { setOpen(false); setQ(term); navigate({ to: "/search", search: { q: term } }); };

  return (
    <form role="search" className="relative w-full" onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? data[active] : q); }}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, data.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search products, brands, categories…"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-expanded={open && data.length > 0}
        className="h-10 w-full rounded-xl border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ring"
      />
      {open && dq.length > 1 && data.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-soft">
          {data.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={() => go(s)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${i === active ? "bg-accent" : ""}`}>
                <Search className="h-3.5 w-3.5 text-muted-foreground" />{s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
