# perpdex-subgraph

## Subgraphs

### The Graph

-   Mumbai
    -   Explorer: `https://thegraph.com/hosted-service/subgraph/krkzts/perpdex-mumbai`
    -   HTTP: `https://api.thegraph.com/subgraphs/name/krkzts/perpdex-mumbai`
    -   WebSocket: `wss:/api.thegraph.com/subgraphs/name/krkzts/perpdex-mumbai`

```bash
npm i

# deploy to The Graph
npx graph auth --product hosted-service <YOUR_THE_GRAPH_ACCESS_TOKEN>
# create a subgraph in the graph dashboard first (need github admin permission)
npm run deploy-the-graph:mumbai

```
