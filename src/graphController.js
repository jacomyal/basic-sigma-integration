import { WebGLRenderer } from "sigma";
import _ from "lodash";

const ZOOM_DURATION = 300;
const LIGHT_GREY = "#eee";
const GREY = "#bbb";

let config = null;
let graph = null;
let sigma = null;

const state = {
  selectedNode: null,
  hoveredNode: null,

  activeSuggestion: null,
  suggestions: null,
};
const dom = {};

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

function searchNodes(query) {
  const STOP_COUNTING_AT = 105;
  const MAX_DISPLAYED = 5;

  if (!query) {
    state.suggestions = null;
    state.activeSuggestion = null;
    dom.datalist.innerHTML = "";
    return;
  }

  const re = new RegExp(query, "i");
  const results = _(graph.nodes())
    .map((node) => ({ node, label: graph.getNodeAttribute(node, "label") }))
    .filter(({ label }) => re.test(label))
    .take(STOP_COUNTING_AT + 1)
    .value();

  state.suggestions = results.slice(0, MAX_DISPLAYED);
  state.activeSuggestion = null;

  const options = state.suggestions.map(
    ({ node, label }) =>
      `<option tabindex="1" data-nodeid="${encodeURIComponent(
        node
      )}">${label}</option>`
  );

  if (results.length > STOP_COUNTING_AT) {
    options.push(
      `<option disabled="true">Plus de ${
        STOP_COUNTING_AT - MAX_DISPLAYED
      } autres résultats</option>`
    );
  } else if (results.length > MAX_DISPLAYED) {
    const remaining = results.length - MAX_DISPLAYED;
    options.push(
      `<option disabled="true">${remaining} autre${
        remaining > 1 ? "s" : ""
      } résultat${remaining > 1 ? "s" : ""}</option>`
    );
  } else if (!results.length) {
    options.push(`<option disabled="true">Aucun résultat</option>`);
  }

  dom.datalist.innerHTML = options.join("");
}

function highlightSuggestion(index) {
  state.activeSuggestion = index;

  const activeOption = dom.datalist.querySelector("option.active");
  if (activeOption) activeOption.classList.remove("active");

  if (typeof state.activeSuggestion === "number") {
    const newActiveOption = dom.datalist.querySelector(
      `option:nth-child(${state.activeSuggestion + 1})`
    );
    if (newActiveOption) newActiveOption.classList.add("active");
  }
}

function focusNode(nodeId) {
  selectNode(nodeId);
  sigma.getCamera().animatedReset({ duration: ZOOM_DURATION });
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
    if (
      state.selectedNode &&
      (state.hoveredNode === node || graph.edge(node, state.hoveredNode))
    ) {
      greyed = false;
    }

    if (
      !state.selectedNode &&
      state.hoveredNode !== node &&
      !graph.edge(node, state.hoveredNode)
    ) {
      greyed = true;
    }
  }

  return greyed
    ? {
        ...data,
        label: "",
        color: LIGHT_GREY,
      }
    : { ...data, zIndex: 1 };
}

function edgeReducer(edge, data) {
  let greyed = true;
  let hidden = false;
  const [source, target] = graph.extremities(edge);

  if (state.selectedNode) {
    if (state.selectedNode === source || state.selectedNode === target) {
      greyed = false;
    } else {
      hidden = true;
    }
  }

  if (
    state.hoveredNode &&
    (state.hoveredNode === source || state.hoveredNode === target)
  ) {
    if (state.selectedNode) {
      hidden = false;
    } else {
      greyed = false;
    }
  }

  return greyed
    ? { ...data, label: "", color: LIGHT_GREY, hidden }
    : { ...data, zIndex: 1, color: GREY, hidden };
}

/**
 * BOOTSTRAP:
 * **********
 */
export default function init(inputConfig, inputGraph, domGraph, domControls) {
  config = inputConfig;
  graph = inputGraph;

  // Prepare graph:
  // 1. Interpolate node sizes:
  if (
    config.rendering &&
    typeof config.rendering.minNodeSize === "number" &&
    typeof config.rendering.maxNodeSize === "number"
  ) {
    const { minNodeSize, maxNodeSize } = config.rendering;
    let minSize = Infinity;
    let maxSize = -Infinity;

    graph.nodes().forEach((node) => {
      const size = graph.getNodeAttribute(node, "size") || 0.001;
      if (typeof size === "number") {
        minSize = Math.min(minSize, size);
        maxSize = Math.max(maxSize, size);
      }
    });

    if (minSize === Infinity || maxSize === -Infinity) {
      minSize = maxSize = 1;
    }

    if (minSize === maxSize) {
      maxSize++;
    }

    graph.nodes().forEach((node) => {
      const size = graph.getNodeAttribute(node, "size") || minSize;
      graph.setNodeAttribute(
        node,
        "size",
        ((size - minSize) / (maxSize - minSize)) * (maxNodeSize - minNodeSize) +
          minNodeSize
      );
    });
  }

  // 2. Interpolate edge sizes:
  if (
    config.rendering &&
    typeof config.rendering.minEdgeSize === "number" &&
    typeof config.rendering.maxEdgeSize === "number"
  ) {
    const { minEdgeSize, maxEdgeSize } = config.rendering;
    let minSize = Infinity;
    let maxSize = -Infinity;

    graph.edges().forEach((node) => {
      const size = graph.getEdgeAttribute(node, "size") || 0.001;
      if (typeof size === "number") {
        minSize = Math.min(minSize, size);
        maxSize = Math.max(maxSize, size);
      }
    });

    if (minSize === Infinity || maxSize === -Infinity) {
      minSize = maxSize = 1;
    }

    if (minSize === maxSize) {
      maxSize++;
    }

    graph.edges().forEach((node) => {
      const size = graph.getEdgeAttribute(node, "size") || minSize;
      graph.setEdgeAttribute(
        node,
        "size",
        ((size - minSize) / (maxSize - minSize)) * (maxEdgeSize - minEdgeSize) +
          minEdgeSize
      );
    });
  }

  sigma = new WebGLRenderer(graph, domGraph, {
    nodeReducer,
    edgeReducer,
  });

  // Bind controls:
  [
    ["zoom", (cam) => cam.animatedZoom({ duration: ZOOM_DURATION })],
    ["unzoom", (cam) => cam.animatedUnzoom({ duration: ZOOM_DURATION })],
    ["center", (cam) => cam.animatedReset({ duration: ZOOM_DURATION })],
  ].forEach(([action, handler]) => {
    domControls
      .querySelector(`button[data-action="${action}"]`)
      .addEventListener("click", () => handler(sigma.getCamera()));
  });

  // Bind search:
  dom.datalist = domControls.querySelector("datalist");
  dom.searchField = domControls.querySelector("input[type='search']");
  dom.searchField.addEventListener("input", (e) => searchNodes(e.target.value));
  dom.searchField.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "ArrowUp":
        if (state.activeSuggestion === 0) {
          highlightSuggestion(null);
        } else if (typeof state.activeSuggestion === "number") {
          highlightSuggestion(state.activeSuggestion - 1);
        } else {
          highlightSuggestion((state.suggestions || []).length - 1);
        }
        e.preventDefault();
        break;
      case "ArrowDown":
        if (state.activeSuggestion === (state.suggestions || []).length - 1) {
          highlightSuggestion(null);
        } else if (typeof state.activeSuggestion === "number") {
          highlightSuggestion(state.activeSuggestion + 1);
        } else {
          highlightSuggestion(0);
        }
        e.preventDefault();
        break;
      case "Enter":
        if (typeof state.activeSuggestion === "number") {
          focusNode(state.suggestions[state.activeSuggestion].node);
          e.target.blur();
          dom.searchField.value = "";
          searchNodes("");
        }
        break;
    }
  });
  dom.datalist.addEventListener("click", (e) => {
    const nodeId = e.target.getAttribute("data-nodeid");
    if (nodeId) {
      focusNode(nodeId);
      e.target.blur();
      dom.searchField.value = "";
      searchNodes("");
    }
  });

  // Bind sigma events:
  sigma.on("enterNode", ({ node }) => hoverNode(node));
  sigma.on("leaveNode", () => hoverNode());
  sigma.on("clickNode", ({ node }) =>
    selectNode(state.selectedNode === node ? null : node)
  );
  sigma.on("clickStage", () => selectNode());
}
