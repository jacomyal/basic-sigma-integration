export default {
  // Where to load the graph from:
  graphPath: "les-miserables.gexf",

  // Metadata:
  metadata: {
    title: "Graph title",
    subtitle: "Graph subtitle",
    description: "Graph description",
  },

  // Caption:
  nodeColors: null, // Set to a field name, to map colors

  // Rendering:
  rendering: {
    minNodeSize: 3,
    maxNodeSize: 15,
    minEdgeSize: 2,
    maxEdgeSize: 6,
  },
};
