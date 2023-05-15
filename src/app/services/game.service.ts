import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GraphNode } from '../models/graph-node.model';
import { Edge, EdgeType } from '../models/edge.model';
import { Graph } from '../models/graph.model';

interface GameStateChange {
    node: GraphNode;
    reverseAnimation: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class GameService {
    graph!: Graph;
    gameStateChanged = new Subject<GameStateChange>();
    private clickHistory: GraphNode[] = [];
    private solutionClicks: GraphNode[] = [];
    constructor() { }

    public initializeGraph(numberOfNodes: number, maxEdgesPerNode: number, graphDensity: number, scrambleFactor: number): void {
        this.graph = this.generateGraph(numberOfNodes, maxEdgesPerNode, graphDensity);
        this.solutionClicks = [];
        this.randomClicks(scrambleFactor);
        this.clickHistory = [];
    }

    public generateGraph(numberOfNodes: number, maxEdgesPerNode: number, graphDensity: number): Graph {
        // Create nodes
        const nodes = Array.from({length: numberOfNodes}, (_, i) => new GraphNode(i.toString(), 0));
        // Create a circular graph
        const edges = Array.from({length: numberOfNodes}, (_, i) => {
            const source = nodes[i];
            const target = nodes[(i+1) % numberOfNodes];
            const edge = new Edge(i, this.randomEdgeType(), nodes, source, target);
            source.edges.push(edge);
            target.edges.push(edge);
            return edge;
        });
        // Add additional edges
        const additionalEdges = Math.floor(Math.random() * numberOfNodes + graphDensity);
        for (let i = 0; i < additionalEdges; i++) {
            const sourceIndex = Math.floor(Math.random() * numberOfNodes);
            const targetIndex = (sourceIndex + 1 + Math.floor(Math.random() * (numberOfNodes - 1))) % numberOfNodes;
            const source = nodes[sourceIndex];
            const target = nodes[targetIndex];
            let shouldCancelEdge = edges.some(edge => {
                if(source.edges.length >= maxEdgesPerNode || target.edges.length >= maxEdgesPerNode){
                    return true;
                }
                if (edge.source === source && edge.target === target) {
                    return true;
                }
                if (edge.source === target && edge.target === source) {
                    return true;
                }
                return false;
            });
            if (!shouldCancelEdge) {
                const edge = new Edge(numberOfNodes + i, this.randomEdgeType(), nodes, source, target);
                source.edges.push(edge);
                target.edges.push(edge);
                edges.push(edge);
            }
        }
        return new Graph(nodes, edges);
    }
    
    public randomEdgeType(): EdgeType {
        const r = Math.random();
        if (r < 0.5) return EdgeType.STANDARD;
        else if (r < 0.66) return EdgeType.DOUBLE;
        else if (r < 0.83) return EdgeType.DIRECTED;
        else return EdgeType.PERIODIC;
    }

    // Scramble the state by performing N "reverse" clicks
    randomClicks(numberOfClicks: number): void {
        for (let i = 0; i < numberOfClicks; i++) {
            const randomNodeIndex = Math.floor(Math.random() * this.graph.nodes.length);
            const randomNode = this.graph.nodes[randomNodeIndex];
            this.nodeClickedReverse(randomNode, true);
        }
    }

    public nodeClicked(node: GraphNode): void {
        this.graph.edges.forEach(edge => {
            if (edge.source === node || edge.target === node) {
                let otherNode: GraphNode = (edge.source === node) ? <GraphNode>edge.target : <GraphNode>edge.source;
                switch (edge.type) {
                    case EdgeType.STANDARD:
                        node.value -= 1;
                        otherNode.value += 1;
                        break;
                    case EdgeType.DOUBLE:
                        node.value -= 2;
                        otherNode.value += 2;
                        break;
                    case EdgeType.DIRECTED:
                        if (edge.source === node) {
                            node.value -= 1;
                            otherNode.value += 1;
                        }
                        break;
                    case EdgeType.PERIODIC:
                        if(edge.currentCycle === edge.period){
                            node.value -= 1;
                            otherNode.value += 1;
                        }
                        break;
                }
            }
        });
        this.incrementPeriodicEdges();
        this.clickHistory.push(node);
        this.gameStateChanged.next({ node, reverseAnimation: false });
        if(this.checkForWin()){
            console.log(`won`);
        }
    }

    incrementPeriodicEdges(): void {
        this.graph.edges.forEach(edge => {
            if(edge.type === EdgeType.PERIODIC){
                if(edge.currentCycle === edge.period){
                    edge.currentCycle = 0;
                }
                edge.currentCycle += 1;

            }
        });
    }

    // "reverse" clicks are exactly cancelled by regular clicks
    public nodeClickedReverse(node: GraphNode, addToSolution: boolean = false): void {
        this.graph.edges.forEach(edge => {
            if (edge.source === node || edge.target === node) {
                let otherNode: GraphNode = (edge.source === node) ? <GraphNode>edge.target : <GraphNode>edge.source;
                switch (edge.type) {
                    case EdgeType.STANDARD:
                        node.value += 1;
                        otherNode.value -= 1;
                        break;
                    case EdgeType.DOUBLE:
                        node.value += 2;
                        otherNode.value -= 2;
                        break;
                    case EdgeType.DIRECTED:
                        if (edge.source === node) {
                            node.value += 1;
                            otherNode.value -= 1;
                        }
                        break;
                    case EdgeType.PERIODIC:
                        if(edge.currentCycle !== edge.period){
                            node.value += 1;
                            otherNode.value -= 1;
                        }
                        break;
                }
            }
        });
        this.incrementPeriodicEdges();
        if(addToSolution){
            this.solutionClicks.push(node);
        }
        this.gameStateChanged.next({ node, reverseAnimation: true });
    }

    public playSolution(): void {
        this.resetGame();
        console.log(this.solutionClicks.length);
        let index = this.solutionClicks.length - 1;
        const intervalId = setInterval(() => {
            if (index < 0) {
                clearInterval(intervalId);
            } else {
                this.nodeClicked(this.solutionClicks[index]);
                index--;
            }
        }, 250);
    }

    public undoLastAction(): void {
        const node = this.clickHistory.pop();
        if (node) {
            this.nodeClickedReverse(node);
        }
    }

    public resetGame(): void {
        while (this.clickHistory.length > 0) {
            this.undoLastAction();
        }
    }

    public checkForWin(): boolean {
        return this.graph.nodes.every(node => node.value === 0);
    }    
}
