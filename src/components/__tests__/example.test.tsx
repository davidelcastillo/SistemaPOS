import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cn } from "@/lib/utils";

function Counter({ className }: { className?: string }) {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className={cn("rounded px-4 py-2", className)}
      onClick={() => setCount((value) => value + 1)}
    >
      Count: {count}
    </button>
  );
}

describe("Counter", () => {
  it("renders and increments on click", async () => {
    const user = userEvent.setup();
    render(<Counter className="bg-blue-500" />);

    const button = screen.getByRole("button", { name: /count/i });
    expect(button).toHaveClass("bg-blue-500", "px-4");

    await user.click(button);
    await user.click(button);

    expect(button).toHaveTextContent("Count: 2");
  });
});