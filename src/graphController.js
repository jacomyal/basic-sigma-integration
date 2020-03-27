import {WebGLRenderer} from "sigma";
import _ from "lodash";

const ZOOM_DURATION = 300;
const GREY = "#ddd";

let config = null;
let graph = null;
let sigma = null;
let state = {
  selectedNode: null,
  hoveredNode: null,

  activeSuggestion: null,
  suggestions: null,
};


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

function searchNodes(query, datalist) {
  const STOP_COUNTING_AT = 105;
  const MAX_DISPLAYED = 5;

  if (!query) {
    state.suggestions = null;
    state.activeSuggestion = null;
    datalist.innerHTML = "";
    return;
  }

  const re = new RegExp(query, "i");
  const results = _(graph.nodes())
    .map(node => ({node, label: graph.getNodeAttribute(node, "label")}))
    .filter(({label}) => re.test(label))
    .take(STOP_COUNTING_AT + 1)
    .value();

  state.suggestions = results.slice(0, MAX_DISPLAYED);
  state.activeSuggestion = null;

  const options = state.suggestions.map(({node, label}) => `<option tabindex="1" data-nodeid="${node}">${label}</option>`);

  if (results.length > STOP_COUNTING_AT) {
    options.push(`<option disabled="true">Plus de ${STOP_COUNTING_AT - MAX_DISPLAYED} autres résultats</option>`)
  } else if (results.length > MAX_DISPLAYED) {
    const remaining = results.length - MAX_DISPLAYED;
    options.push(`<option disabled="true">${remaining} autre${remaining > 1 ? "s" : ""} résultat${remaining > 1 ? "s" : ""}</option>`);
  } else if (!results.length) {
    options.push(`<option disabled="true">Aucun résultat</option>`);
  }

  datalist.innerHTML = options.join("");
}

function highlightSuggestion(index, datalist) {
  state.activeSuggestion = index;

  const activeOption = datalist.querySelector("option.active");
  if (activeOption) activeOption.classList.remove("active");

  if (typeof state.activeSuggestion === "number") {
    const newActiveOption = datalist.querySelector(`option:nth-child(${state.activeSuggestion + 1})`);
    if (newActiveOption) newActiveOption.classList.add("active");
  }
}

function focusNode(nodeId) {
  selectNode(nodeId);
  sigma.getCamera().animatedReset({duration: ZOOM_DURATION});
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

  // Bind search:
  const datalist = domControls.querySelector("datalist");
  const searchField = domControls.querySelector("input[type='search']");
  searchField.addEventListener("input", e =>
    searchNodes(e.target.value, datalist)
  );
  searchField.addEventListener("keydown", e => {
    switch (e.code) {
      case "ArrowUp":
        if (state.activeSuggestion === 0) {
          highlightSuggestion(null, datalist);
        } else if (typeof state.activeSuggestion === "number") {
          highlightSuggestion(state.activeSuggestion - 1, datalist);
        } else {
          highlightSuggestion((state.suggestions || []).length - 1, datalist);
        }
        e.preventDefault();
        break;
      case "ArrowDown":
        if (state.activeSuggestion === (state.suggestions || []).length - 1) {
          highlightSuggestion(null, datalist);
        } else if (typeof state.activeSuggestion === "number") {
          highlightSuggestion(state.activeSuggestion + 1, datalist);
        } else {
          highlightSuggestion(0, datalist);
        }
        e.preventDefault();
        break;
      case "Enter":
        if (typeof state.activeSuggestion === "number") {
          focusNode(state.suggestions[state.activeSuggestion].node);
          e.target.blur();
          searchField.value = "";
          searchNodes("", datalist);
        }
        break;
    }
  });
  datalist.addEventListener("click", e => {
    const nodeId = e.target.getAttribute("data-nodeid");
    if (nodeId) {
      focusNode(nodeId);
      e.target.blur();
      searchField.value = "";
      searchNodes("", datalist);
    }
  });

  // Bind sigma events:
  sigma.on("enterNode", ({node}) => hoverNode(node));
  sigma.on("leaveNode", () => hoverNode());
  sigma.on("clickNode", ({node}) => selectNode(state.selectedNode === node ? null : node));
  sigma.on("clickStage", () => selectNode())
}
