import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "./App";
import { DataProvider } from "./context/DataContext";
import type { SSRData } from "./context/DataContext";
import "./styles.css";

const ssrData: SSRData = window.__SSR_DATA__ ?? {};

ReactDOM.hydrateRoot(
  document.getElementById("root")!,
  <BrowserRouter>
    <DataProvider value={ssrData}>
      <App />
    </DataProvider>
  </BrowserRouter>,
);
