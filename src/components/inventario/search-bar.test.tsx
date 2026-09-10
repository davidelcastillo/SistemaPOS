import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchBar, SEARCH_DEBOUNCE_MS } from "@/components/inventario/search-bar";

describe("SearchBar — SE-R2 debounce + SE-R4 no barcode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("emits a single settled query after 300ms of typing (SE-R2 first scenario)", async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox", { name: /buscar/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: "cola" } });
    });

    expect(input).toHaveValue("cola");
    expect(onSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("cola");
  });

  it("suppresses requests while typing faster than 300ms and settles only once (SE-R2 second scenario)", async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox", { name: /buscar/i }) as HTMLInputElement;
    await act(async () => {
      for (const char of "remera") {
        fireEvent.change(input, { target: { value: input.value + char } });
        vi.advanceTimersByTime(100);
      }
    });

    expect(onSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("remera");
  });

  it("does not expose a barcode input (SE-R4)", () => {
    render(<SearchBar onSearch={vi.fn()} />);

    expect(screen.queryByRole("searchbox", { name: /barcode|código de barras/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/barcode|código de barras/i)).not.toBeInTheDocument();
  });

  it("clears the query when the input is emptied without emitting stale searches", async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox", { name: /buscar/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: "cola" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("renders with a flat design input labelled for accessibility", () => {
    render(<SearchBar onSearch={vi.fn()} />);

    const input = screen.getByRole("searchbox", { name: /buscar productos/i });
    expect(input).toHaveAttribute("placeholder");
    expect(input).toHaveAttribute("type", "search");
  });
});
