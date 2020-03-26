import {WebGLRenderer} from "sigma";

const ZOOM_DURATION = 300;
const GREY = "#ddd";

let config = null;
let graph = null;
let sigma = null;
let state = {
  selectedNode: null,
  hoveredNode: null,
}

/**
 * STATE CONTROLLERS:
 * ******************
 */
function selectNode(node) {
  if (node === state.selectedNode) return;

  if (state.selectedNode) sigma.unhighlightNode(state.selectedNode);
  if (node) sigma.highlightNode(node);

  state.selectedNode = node;
  sigma.refresh();
}

function hoverNode(node) {
  if (node === state.hoveredNode) return;

  state.hoveredNode = node;
  sigma.refresh();
}


/**
 * RENDERING:
 * **********
 */
function nodeReducer(node, data) {
  let greyed = false;

  if (state.selectedNode) {
    if (state.selectedNode !== node && !graph.edge(node, state.selectedNode)) {
      greyed = true;
    }
  }

  if (state.hoveredNode) {
    if (state.selectedNode && (state.hoveredNode === node || graph.edge(node, state.hoveredNode))) {
      greyed = false;
    }

    if (!state.selectedNode && state.hoveredNode !== node && !graph.edge(node, state.hoveredNode)) {
      greyed = true;
    }
  }

  return greyed ? {
    ...data,
    label: "",
    color: GREY,
  } : data;
}

function edgeReducer(edge, data) {
  let greyed = false;
  let hidden = false;
  const [source, target] = graph.extremities(edge);

  if (state.selectedNode) {
    if (state.selectedNode !== source && state.selectedNode !== target) {
      greyed = true;
    }
  }

  if (state.hoveredNode) {
    if (state.selectedNode && (state.hoveredNode === source || state.hoveredNode === target)) {
      greyed = false;
    }

    if (!state.selectedNode && (state.hoveredNode !== source && state.hoveredNode !== target)) {
      greyed = true;
    }
  }

  return greyed ? {...data, label: "", color: GREY, hidden} : {...data, hidden};
}


/**
 * BOOTSTRAP:
 * **********
 */
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
  sigma.on("enterNode", ({node}) => hoverNode(node));
  sigma.on("leaveNode", () => hoverNode());
  sigma.on("clickNode", ({node}) => selectNode(state.selectedNode === node ? null : node));
  sigma.on("clickStage", () => selectNode())
}
