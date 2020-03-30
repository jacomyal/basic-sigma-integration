# Basic sigma.js integration

## How to...

### ...install

- Clone the repo and run `npm install` in it

### ...run the dev version with the sample graph

The sample graph is the classic cooccurences network of the characters from [Les Misérables](https://en.wikipedia.org/wiki/Les_Mis%C3%A9rables).

- Run `npm start` in the repo
- Open `http://localhost:3000/` in your browser

### ...run the dev version with your own graph

- Copy your own GEXF graph `my-graph.gexf` into the `data` directory
- Run `npm start` in the repo
- Open `http://localhost:3000/?graph=my-graph.gexf` in your browser

### ...run the dev version with your settings

- Copy your own GEXF graph `my-graph.gexf` into the `data` directory
- Copy your own JSON settings file `my-settings.json` into the `data` directory as well (check `src/defaultConfig.js` to see what settings are accepted)
- Run `npm start` in the repo
- Open `http://localhost:3000/?graph=my-graph.gexf&config=my-settings.json` in your browser

### ...build for production

- Run `npm run build` in the repo
- Copy where you need them `index.html` and the `build` folder, and eventually the sample graph is you still need it

## Roadmap - "MVP"

- [x] Load a GEXF graph
- [x] Zoom in, zoom out and center graph buttons
- [x] Hovering a node highlights its neighbors
- [ ] Network errors and HTTP errors handling
- [ ] Load a GraphML graph

## Roadmap - futur releases

- [ ] Button to download the raw data
- [ ] Captions
- [ ] Node sizes / colors selection
- [ ] Attributes repartition charts
