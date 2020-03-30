import Graph from "graphology";
import gexf from "graphology-gexf/browser";

import initGraphController from "./graphController";
import defaultConfig from "./defaultConfig";

import "../styles.css";

const PARAMS = new URLSearchParams(window.location.search);

function loadConfig(path) {
  return path
    ? fetch(path)
        .then((response) => response.json())
        .then((data) => ({
          ...defaultConfig,
          ...data,
        }))
    : Promise.resolve(defaultConfig);
}

function loadGraph(path) {
  return fetch(path)
    .then((response) => response.text())
    .then((data) => gexf.parse(Graph, data));
}

function finalize() {
  document.body.classList.remove("loading");
}

// Bootstrap:
loadConfig(PARAMS.get("config"))
  .then((config) =>
    Promise.all([config, loadGraph(PARAMS.get("graph") || config.graphPath)])
  )
  .then(([config, graph]) => initGraphController(config, graph, document.body))
  .then(finalize)
  .catch((error) => {
    // TODO:
    // Deal with errors
  });
