import { Link2, Search } from "lucide-react";

export function URLInput({
  url,
  setUrl,
  onAnalyze,
  loading
}: {
  url: string;
  setUrl: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-soft ring-1 ring-stone-200">
      <label className="mb-2 block text-sm font-semibold text-stone-700" htmlFor="youtube-url">
        유튜브 레시피 URL
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3">
          <Link2 aria-hidden className="h-4 w-4 shrink-0 text-stone-500" />
          <input
            id="youtube-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-carrot-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-carrot-700 disabled:bg-stone-300"
        >
          <Search aria-hidden className="h-4 w-4" />
          {loading ? "분석 중..." : "분석하기"}
        </button>
      </div>
    </div>
  );
}
