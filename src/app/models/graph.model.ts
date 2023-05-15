import { GraphNode } from './graph-node.model'
import { Edge } from './edge.model';

export class Graph {
    nodes: GraphNode[];
    edges: Edge[];

    constructor(nodes: GraphNode[], edges: Edge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }
}