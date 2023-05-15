import { SimulationNodeDatum } from 'd3';
import { Edge } from './edge.model';

export class GraphNode implements SimulationNodeDatum {
    id: string;
    value: number;
    edges: Edge[];
    x?: number | undefined;
    y?: number | undefined;
    vx?: number | undefined;
    vy?: number | undefined;
    index?: number | undefined;
    fx?: number | null;
    fy?: number | null;

    constructor(id: string, value: number) {
        this.id = id;
        this.value = value;
        this.edges = [];
    }
}