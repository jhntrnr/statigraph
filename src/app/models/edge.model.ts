import { SimulationLinkDatum } from 'd3';

import { GraphNode } from "./graph-node.model";

export enum EdgeType {
    STANDARD = 'standard',
    DOUBLE = 'double',
    DIRECTED = 'directed',
    PERIODIC = 'periodic'
}

export class Edge implements SimulationLinkDatum<GraphNode>{
    id: number;
    type: EdgeType;
    nodes: GraphNode[];
	source: GraphNode;
    target: GraphNode;
    direction!: GraphNode;
    period!: number;
	currentCycle!: number;

    constructor(id: number, type: EdgeType, nodes: GraphNode[], source: GraphNode, target: GraphNode, direction?: GraphNode) {
        this.id = id;
        this.type = type;
        this.nodes = nodes;
		this.source = source;
        this.target = target;
        if (type === EdgeType.PERIODIC) {
            this.period = 2;
			this.currentCycle = 2;
        }
    }
}