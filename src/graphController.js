import {WebGLRenderer} from "sigma";

const ZOOM_DURATION = 300;

// Internal state:
let config = null;
let graph = null;
let sigma = null;
let state = {
  highlightedNodes: null,
  highlightedEdges: null,
};

function refresh() {
  if (sigma) sigma.refresh();
}

function nodeReducer(node, data) {
  if (state.highlightedNodes && !state.highlightedNodes[node])
    return {...data, color: "#ddd", label: ""};

  return data;
}

function edgeReducer(edge, data) {
  if (state.highlightedEdges && !state.highlightedEdges[edge])
    return {...data, hidden: true, label: ""};

  return {...data, hidden: false};
}

export default function init(inputConfig, inputGraph, domGraph, domControls) {
  config = inputConfig;
  graph = inputGraph;
  sigma = new WebGLRenderer(graph, domGraph, {
    nodeReducer,
    edgeReducer
  });

  // Bind controls:
  [
    ["zoom", cam => cam.animatedZoom({duration: ZOOM_DURATION})],
    ["unzoom", cam => cam.animatedUnzoom({duration: ZOOM_DURATION})],
    ["center", cam => cam.animatedReset({duration: ZOOM_DURATION})]
  ].forEach(([action, handler]) => {
    domControls
      .querySelector(`button[data-action="${action}"]`)
      .addEventListener("click", () => handler(sigma.getCamera()));
  });

  // Bind sigma events:
  sigma.on("enterNode", ({node}) => {
    state.highlightedNodes = sigma.graph
      .neighbors(node)
      .reduce((iter, node) => ({...iter, [node]: true}), {});
    state.highlightedNodes[node] = true;

    state.highlightedEdges = sigma.graph
      .edges(node)
      .reduce((iter, edge) => ({...iter, [edge]: true}), {});

    refresh();
  });
  sigma.on("leaveNode", () => {
    state.highlightedNodes = null;
    state.highlightedEdges = null;

    refresh();
  });
}
