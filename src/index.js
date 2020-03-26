import Graph from "graphology";
import gexf from "graphology-gexf/browser";

import initGraphController from "./graphController";

const STAGE = document.getElementById("stage");
const CONTROLS = document.getElementById("controls");

// 1. Identify graph path:
//    The path is read from the "graph" query param in the URL, and fallbacks to
//    "data/graph.gexf" else.
//    Don't hesitate to hardcode the path here to prevent users to load the
//    graph they want.
const graphPath =
  new URLSearchParams(window.location.search).get("config") || "les-miserables.gexf";

// 2. Prepare graph:
function prepareGraph(dataString) {
  return gexf.parse(Graph, dataString);
}

// 3. Setup interactions:

// 4. Ready!
function finalize() {
  document.body.classList.remove("loading");
}

// Bootstrap:
fetch(graphPath)
  .then(response => {
    if (response.ok) {
      return response.text();
    } else {
      // TODO:
      // Deal with bad responses
    }
  })
  .then(data => prepareGraph(data))
  .then(graph => initGraphController(graph, STAGE, CONTROLS))
  .then(finalize)
  .catch(error => {
    // TODO:
    // Deal with errors
  });
