import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function SearchForm({
  defaultValue = "",
  placeholder = "Cari judul dataset, topik, atau kata kunci…",
}) {
  return (
    <form
      action="/dataset"
      method="get"
      role="search"
      className="public-search-form flex w-full max-w-2xl min-w-0 flex-col gap-2 sm:flex-row"
    >
      <label className="sr-only" htmlFor="dataset-search">
        Cari dataset
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          id="dataset-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="h-12 pl-10"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="min-h-12 w-full shrink-0 sm:w-auto"
      >
        <span className="hidden sm:inline">Cari data</span>
        <span className="sm:hidden">Cari</span>
      </Button>
    </form>
  );
}
