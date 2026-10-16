import * as React from "react";
import * as ReactDOM from "react-dom";
import { WorkspaceProvider } from "./context/context";
import { Workspace } from "./Workspace";
import { AccumulatorsProvider, AccumulatorsTile } from "./tiles/accumulators";
import { PriceTileProvider, PriceTile } from "./tiles/priceTile";

const rootElement = document.getElementById("root");
ReactDOM.render(
  // The workspace exists to simulate events from the dtp-client-web shell, and also act like a package,
  // ie. dtp-client-functional-fx-options, just for the purpose of this example
  <WorkspaceProvider>
    <Workspace>
      <PriceTileProvider>
        <PriceTile />
      </PriceTileProvider>
      <AccumulatorsProvider>
        <AccumulatorsTile />
      </AccumulatorsProvider>
    </Workspace>
  </WorkspaceProvider>,
  rootElement
);
