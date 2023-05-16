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
    solutionSpeed: number = 75;
    solutionRunning: boolean = false;
    hasBeenWon: boolean = false;
    private clickHistory: GraphNode[] = [];
    private solutionClicks: GraphNode[] = [];
    constructor() { }

    public initializeGraph(numberOfNodes: number, maxEdgesPerNode: number, graphDensity: number, scrambleFactor: number): void {
        this.graph = this.generateGraph(numberOfNodes, maxEdgesPerNode, graphDensity);
        this.solutionClicks = [];
        this.randomClicks(scrambleFactor);
        this.clickHistory = [];
    }

    generateGraph(numberOfNodes: number, maxEdgesPerNode: number, graphDensity: number): Graph {
        // Create nodes
        const nodes = Array.from({length: numberOfNodes}, (_, i) => new GraphNode(i.toString(), 0));
        // Create a circular graph
        let edges = Array.from({length: numberOfNodes}, (_, i) => {
            const source = nodes[i];
            const target = nodes[(i+1) % numberOfNodes];
            const edge = new Edge(i, this.randomEdgeType(), nodes, source, target);
            this.addEdgeToNode(edge, source);
            this.addEdgeToNode(edge, target);
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
                this.addEdgeToNode(edge, source);
                this.addEdgeToNode(edge, target);
                edges.push(edge);
            }
        }
        const removingEdges = Math.floor(Math.random() * numberOfNodes + graphDensity/15);
        for (let i = 0; i < removingEdges; i++){
            const edgeIndex = Math.floor(Math.random() * edges.length);
            const candidateEdge = edges[edgeIndex];
            edges = this.removeEdgeCompletely(candidateEdge, edges);
        }
        return new Graph(nodes, edges);
    }
    
    addEdgeToNode(edge: Edge, node: GraphNode): void {
        node.edges.push(edge);
    }

    removeEdgeCompletely(edge: Edge, edges: Edge[]): Edge[] {
        if(edge.source.edges.length < 3 || edge.target.edges.length < 3){
            return edges;
        }
        edge.target.edges = edge.target.edges.filter(e => e !== edge);
        edge.source.edges = edge.source.edges.filter(e => e !== edge);
        edges = edges.filter(e => e !== edge);
        return edges;
    }    

    randomEdgeType(): EdgeType {
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

    public nodeClicked(node: GraphNode, solutionPlaying: boolean = false): void {
        if(this.solutionRunning && !solutionPlaying){
            return;
        }
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
        if(this.checkForWin(solutionPlaying)){
            if(this.hasBeenWon){
                return;
            }
            this.hasBeenWon = true;
            setTimeout(() => {
                alert(`Won in ${this.clickHistory.length} moves.`);
            }, 150);
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
        if(this.solutionRunning){
            return;
        }
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
        this.solutionRunning = true;
        let index = this.solutionClicks.length - 1;
        const playNext = () => {
            if (index < 0) {
                this.solutionRunning = false;
                this.hasBeenWon = true;
            } else {
                this.nodeClicked(this.solutionClicks[index], true);
                index--;
                setTimeout(playNext, (2100 - 20*this.solutionSpeed));
            }
        }
        playNext();
    }

    public undoLastAction(): void {
        const node = this.clickHistory.pop();
        if (node) {
            this.nodeClickedReverse(node);
        }
    }

    public resetGame(): void {
        this.hasBeenWon = false;
        while (this.clickHistory.length > 0) {
            this.undoLastAction();
        }
    }

    checkForWin(solutionPlaying: boolean = false): boolean {
        if(solutionPlaying){
            return false;
        }
        return this.graph.nodes.every(node => node.value === 0);
    }    
}
