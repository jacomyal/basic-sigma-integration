export default {
  // Where to load the graph from:
  graphPath: "les-miserables.gexf",

  // Metadata:
  metadata: {
    title: "Graph title",
    subtitle: "Graph subtitle",
    description: "Graph description"
  },

  // Actionable things from the user
  actions: {
    toggleEdges: false,
    chooseNodeColor: false,
    chooseNodeSize: false
  },

  // App initial state:
  initial: {
    displayEdges: true
  }
};
