import { WebGLRenderer } from "sigma";
import palette from "iwanthue/precomputed/force-vector-pimp";
import _ from "lodash";

const MAX_DIFFERENT_COLORS = 15;
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

  captions: null,
  captionsDict: null,
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

  if (state.selectedNode) {
    const {
      x,
      y,
      z,
      size,
      color,
      label,
      ...nodeData
    } = graph.getNodeAttributes(state.selectedNode);
    dom.nodeDetail.innerHTML = `
      <h3>${label}</h3>
      <ul class="content">${Object.keys(nodeData)
        .map(
          (key) =>
            `<li><span class="key">${key}</span><span class="value">${nodeData[key]}</span></li>`
        )
        .join("")}</ul>
      <div class="cross" tabindex="1">×</div>`;
  } else {
    dom.nodeDetail.innerHTML = "";
  }

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

function setCaptionValueVisible(value, checked) {
  state.captionsDict[value].visible = checked;
  sigma.refresh();
}

function focusCaptionValue(value) {
  // Detect if the value is already focused:
  const checkAll =
    state.captions.filter(({ visible }) => visible).length === 1 &&
    state.captionsDict[value].visible;

  [...dom.caption.querySelectorAll("input[type=checkbox")].forEach((input) => {
    input.checked = checkAll || input.getAttribute("data-value") === value;
  });
  state.captions.forEach((caption) => {
    caption.visible = checkAll || caption.value === value;
  });
  sigma.refresh();
}

/**
 * RENDERING:
 * **********
 */
function nodeReducer(node, data) {
  let greyed = false;
  let hideLabel;

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
      hideLabel = true;
    }
  }

  if (greyed) {
    hideLabel = greyed;
  }

  if (
    config.nodeColors &&
    state.captions &&
    state.captions.some(({ visible }) => !visible)
  ) {
    greyed = !state.captionsDict[
      graph.getNodeAttribute(node, config.nodeColors)
    ].visible;

    if (!state.selectedNode && !state.hoveredNode) {
      hideLabel = greyed;
    }
  }

  return {
    ...data,
    label: hideLabel ? "" : data.label,
    color: greyed ? LIGHT_GREY : data.color,
    zIndex: greyed ? 0 : 1,
  };
}

function edgeReducer(edge, data) {
  let hidden = false;
  const [source, target] = graph.extremities(edge);

  if (state.selectedNode) {
    if (state.selectedNode !== source && state.selectedNode !== target) {
      hidden = true;
    }
  }

  if (state.hoveredNode) {
    if (
      state.selectedNode &&
      (state.hoveredNode === source || state.hoveredNode === target)
    ) {
      hidden = false;
    } else if (
      !state.selectedNode &&
      !(state.hoveredNode === source || state.hoveredNode === target)
    ) {
      hidden = true;
    }
  }

  // When all edges are displayed, show them as LIGHT_GREY.
  // When only some are visible, show them as GREY.
  return {
    ...data,
    color: state.selectedNode || state.hoveredNode ? GREY : LIGHT_GREY,
    hidden,
  };
}

/**
 * BOOTSTRAP:
 * **********
 */
function prepareGraph() {
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

  // 3. (if needed) set node colors:
  if (config.nodeColors && state.captions) {
    const colorsDict = state.captions.reduce(
      (iter, { value, color }) => ({ ...iter, [value]: color }),
      {}
    );
    graph
      .nodes()
      .forEach((node) =>
        graph.setNodeAttribute(
          node,
          "color",
          colorsDict[graph.getNodeAttribute(node, config.nodeColors)] || GREY
        )
      );
  }
}

function prepareCaption() {
  const values = {};

  // Determine colors:
  graph.nodes().forEach((node) => {
    const value = graph.getNodeAttribute(node, config.nodeColors);
    values[value] = (values[value] || 0) + 1;
  });

  const colors =
    palette[Math.min(MAX_DIFFERENT_COLORS, Object.keys(values).length)];

  state.captions = _.sortBy(Object.keys(values), (value) => -values[value]).map(
    (value, i) => ({
      value,
      count: values[value],
      color: colors[i],
      visible: true,
    })
  );
  state.captionsDict = _.keyBy(state.captions, "value");

  // Display caption:
  dom.caption.innerHTML = `
    <h3>Légende</h3>
    <ul class="content">${state.captions
      .map(
        ({ value, color, count }, i) => `
        <li>
          <input type="checkbox" data-value="${value}" id="caption-${i}" checked>
          <label title="Noeuds avec la valeur ${value} pour l'attribut ${
          config.nodeColors
        } : ${count}" for="caption-${i}">
              <span class="circle" style="background: ${
                color || GREY
              }"></span> ${value}
              <a class="focus" title="Focus sur cette valeur" tabindex="1" href="#" data-value="${value}">🔍</a>
          </label>
        </li>`
      )
      .join("")}</ul>
    <div class="cross" tabindex="1">×</div>
  `;
}

export default function init(inputConfig, inputGraph, domRoot) {
  // Identify relevant DOM containers:
  dom.stage = domRoot.querySelector("#stage");
  dom.caption = domRoot.querySelector("#caption");
  dom.controls = domRoot.querySelector("#controls");
  dom.nodeDetail = domRoot.querySelector("#node-detail");
  dom.datalist = dom.controls.querySelector("datalist");
  dom.searchField = dom.controls.querySelector("input[type='search']");

  config = inputConfig;
  graph = inputGraph;
  sigma = new WebGLRenderer(graph, dom.stage, {
    ...((config.rendering || {}).sigmaSettings || {}),
    nodeReducer,
    edgeReducer,
  });

  if (config.nodeColors) {
    prepareCaption();
    dom.caption.classList.remove("hidden");
    dom.controls
      .querySelector('button[data-action="caption"]')
      .classList.remove("hidden");
  }

  prepareGraph();

  // Bind controls:
  [
    ["zoom", (cam) => cam.animatedZoom({ duration: ZOOM_DURATION })],
    ["unzoom", (cam) => cam.animatedUnzoom({ duration: ZOOM_DURATION })],
    ["center", (cam) => cam.animatedReset({ duration: ZOOM_DURATION })],
    ["caption", () => dom.caption.classList.remove("hidden")],
  ].forEach(([action, handler]) => {
    dom.controls
      .querySelector(`button[data-action="${action}"]`)
      .addEventListener("click", () => handler(sigma.getCamera()));
  });

  dom.nodeDetail.addEventListener("click", (e) => {
    if (e.target.classList.contains("cross")) {
      selectNode();
    }
  });
  dom.caption.addEventListener("click", (e) => {
    if (e.target.classList.contains("cross")) {
      dom.caption.classList.add("hidden");
    }

    if (e.target.classList.contains("focus")) {
      focusCaptionValue(e.target.getAttribute("data-value"));
      e.preventDefault();
    }
  });
  dom.caption.addEventListener("change", (e) => {
    const target = e.target;
    const value = target.getAttribute("data-value");

    if (value && typeof target.checked === "boolean") {
      setCaptionValueVisible(value, target.checked);
    }
  });

  // Bind search:
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
