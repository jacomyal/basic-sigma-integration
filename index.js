import Graph from "graphology";
import gexf from "graphology-gexf/browser";
import { WebGLRenderer } from "sigma";

const ZOOM_DURATION = 300;

const STAGE = document.getElementById("stage");
const CONTROLS = document.getElementById("controls");
const CAPTION = document.getElementById("caption");

// Hovered nodes management:
let highlightedNodes = null;
let highlightedEdges = null;
function nodeReducer(node, data) {
  if (highlightedNodes && !highlightedNodes[node])
    return { ...data, color: "#ddd", label: "" };

  return data;
}
function edgeReducer(edge, data) {
  if (highlightedEdges && !highlightedEdges[edge])
    return { ...data, hidden: true, label: "" };

  return { ...data, hidden: false };
}

// 1. Identify graph path:
//    The path is read from the "graph" query param in the URL, and fallbacks to
//    "data/graph.gexf" else.
//    Don't hesitate to hardcode the path here to prevent users to load the
//    graph they want.
const graphPath =
  new URLSearchParams(window.location.search).get("graph") || "les-miserables.gexf";

// 2. Prepare graph:
function prepareGraph(dataString, container) {
  const graph = gexf.parse(Graph, dataString);
  const sigma = new WebGLRenderer(graph, container, {
    nodeReducer,
    edgeReducer
  });

  return sigma;
}

// 3. Setup interactions:
function setupInteractions(sigma, container) {
  // Control boutons
  [
    ["zoom", cam => cam.animatedZoom({ duration: ZOOM_DURATION })],
    ["unzoom", cam => cam.animatedUnzoom({ duration: ZOOM_DURATION })],
    ["center", cam => cam.animatedReset({ duration: ZOOM_DURATION })]
  ].forEach(([action, handler]) => {
    container
      .querySelector(`button[data-action="${action}"]`)
      .addEventListener("click", () => handler(sigma.getCamera()));
  });

  // Nodes rollover:
  sigma.on("enterNode", ({ node }) => {
    highlightedNodes = sigma.graph
      .neighbors(node)
      .reduce((iter, node) => ({ ...iter, [node]: true }), {});
    highlightedNodes[node] = true;

    highlightedEdges = sigma.graph
      .edges(node)
      .reduce((iter, edge) => ({ ...iter, [edge]: true }), {});

    sigma.refresh();
  });
  sigma.on("leaveNode", () => {
    highlightedNodes = null;
    highlightedEdges = null;

    sigma.refresh();
  });
}

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
  .then(data => prepareGraph(data, STAGE))
  .then(sigma => setupInteractions(sigma, CONTROLS))
  .then(finalize)
  .catch(error => {
    // TODO:
    // Deal with errors
  });
