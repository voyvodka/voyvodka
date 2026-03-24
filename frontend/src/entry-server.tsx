import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router";

import { App } from "./App";
import { DataProvider } from "./context/DataContext";
import type { SSRData } from "./context/DataContext";

type Callbacks = {
  onShellReady: () => void;
  onShellError: (err: unknown) => void;
  onError: (err: unknown) => void;
};

export function render(url: string, ssrData: SSRData, callbacks: Callbacks) {
  return renderToPipeableStream(
    <StaticRouter location={url}>
      <DataProvider value={ssrData}>
        <App />
      </DataProvider>
    </StaticRouter>,
    callbacks,
  );
}

export type { SSRData };
export { getPageMeta } from "./lib/meta";
