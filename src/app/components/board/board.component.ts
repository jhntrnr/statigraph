import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { GameService } from '../../services/game.service';
import { GraphNode } from '../../models/graph-node.model';
import { Edge, EdgeType } from '../../models/edge.model';

@Component({
    selector: 'app-board',
    templateUrl: './board.component.html',
    styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('board', { static: false }) boardContainer!: ElementRef;
    nodeElements!: d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown>;
    textElements!: d3.Selection<d3.BaseType | SVGTextElement, GraphNode, SVGGElement, unknown>;
    links!: d3.Selection<SVGLineElement, Edge, SVGGElement, unknown>;
    svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    resizableGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
    objectGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
    animationGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
    simulation!: d3.Simulation<GraphNode, undefined>;
    resizeObserver!: ResizeObserver;
    nodesMovable: boolean = false;
    svgWidth!: number;
    svgHeight!: number;
    numberOfNodes: number = 6;
    maxEdgesPerNode: number = 3;
    graphDensity: number = 4;
    scrambleFactor: number = 10;
    repulsionForce: number = 500;
    solutionSpeed: number = 75;
    private gameStateChangedSub!: Subscription;
    constructor(public gameService: GameService) { }

    ngOnInit(): void {
        this.setupGraph();
    }

    ngAfterViewInit(): void {
        this.finishSettingUpGraph();
    }
    
    ngOnDestroy(): void {
        this.gameStateChangedSub.unsubscribe();
        this.resizeObserver.disconnect();
    }

    finishSettingUpGraph(): void {
        this.resizeObserver = new ResizeObserver(entries => {
            for(let entry of entries) {
                this.svgWidth = entry.contentRect.width;
                this.svgHeight = entry.contentRect.height;
                this.updateSvgSize();
                this.updateCenterForce();
            }
        });
    
        this.resizeObserver.observe(this.boardContainer.nativeElement);
        this.svgWidth = this.boardContainer.nativeElement.clientWidth;
        this.svgHeight = this.boardContainer.nativeElement.clientHeight;
        this.drawGraph();
    }

    setupGraph(): void {
        this.gameService.initializeGraph(this.numberOfNodes, this.maxEdgesPerNode, this.graphDensity, this.scrambleFactor);
        this.gameStateChangedSub = this.gameService.gameStateChanged
            .subscribe(({node, reverseAnimation}) => {
                this.updateNodeColors();
                this.updateNodeTexts();
                this.updateEdgeColors();
                node.edges.forEach((edge) => {
                    if(edge.type === EdgeType.PERIODIC && edge.currentCycle === edge.period){
                        return;
                    }
                    if(edge.type === EdgeType.DIRECTED && edge.source !== node){
                        return;
                    }
                    const linkElement = this.links.filter((d: Edge) => d === edge);
                    const valueTransfer = this.resizableGroup.append('circle')
                        .attr('r', 10)
                        .attr('fill', 'rgba(144, 238, 144, 0.75)')
                        .attr('stroke', 'none');
        
                        valueTransfer.transition()
                        .duration(500)
                        .attrTween('transform', this.translateAlong(linkElement.node() as SVGLineElement, reverseAnimation ? edge.source === node : edge.source !== node))
                        .remove();
                });
                this.createRipple(node, reverseAnimation);
            });
    }

    createSvg(): void {
        this.svg = d3.select(this.boardContainer.nativeElement).append('svg')
            .attr('id','gameBoard');
        
        const defs = this.svg.append('defs');
            defs.append('marker')
                    .attr('id','arrowStart')
                    .attr('markerWidth',20)
                    .attr('markerHeight',15)
                    .attr('refX',-15)
                    .attr('refY',7.5)
                    .attr('orient','auto')
                    .attr('markerUnits','userSpaceOnUse')
                    .append('polygon')
                        .attr('points','0 0, 20 7.5, 0 15');
    
            defs.append('marker')
                .attr('id','arrowEnd')
                .attr('markerWidth',20)
                .attr('markerHeight',15)
                .attr('refX',35)
                .attr('refY',7.5)
                .attr('orient','auto')
                .attr('markerUnits','userSpaceOnUse')
                .append('polygon')
                    .attr('points','0 0, 20 7.5, 0 15');

        this.resizableGroup = this.svg.append('g');
        this.animationGroup = this.resizableGroup.append('g');
        this.objectGroup = this.resizableGroup.append('g');
    }    

    newGraph(): void {
        d3.select(this.boardContainer.nativeElement).select('svg').remove();
        this.createSvg();
        if (this.gameStateChangedSub) {
            this.gameStateChangedSub.unsubscribe();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.setupGraph();
        this.finishSettingUpGraph();
    }    

    resetGraph(): void {
        this.gameService.resetGame();
    }

    solveGraph(): void {
        this.playSolution();
    }

    playSolution(): void {
        this.gameService.playSolution();
    }

    drawGraph(): void {
        const nodes: GraphNode[] = this.gameService.graph.nodes;
        const links: Edge[] = this.gameService.graph.edges;
        if (!this.svg || !this.resizableGroup) {
            this.createSvg();
        }

        const simulation = d3.forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength(-this.repulsionForce))
            .force('center', d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
            .force('link', d3.forceLink().links(links).id((d: any) => d.id))
            .on('tick', ticked);

        const link = this.objectGroup.append('g')
            .attr('stroke', '#000')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke-width', d => {
                if(d.type === EdgeType.DOUBLE){
                    return 12;
                } else{
                    return 4;
                }
            })
            .attr('marker-start', d => {
                if(d.type === EdgeType.DIRECTED){
                    return 'url(#arrowStart)';
                }
                else{
                    return '';
                }
            })
            .attr('marker-end', d => {
                if(d.type === EdgeType.DIRECTED){
                    return 'url(#arrowEnd)';
                }
                else{
                    return '';
                }
            })
            .attr('stroke-dasharray', d => {
                if(d.type === EdgeType.PERIODIC){
                    return '1, 10';
                }
                else{
                    return '';
                }
            })
            .attr('stroke-linecap', d => {
                if(d.type === EdgeType.PERIODIC){
                    return 'round';
                }
                else{
                    return '';
                }
            });
        
        const doubleLink = this.objectGroup.append('g')
            .attr('stroke', '#fff')
            .selectAll('line')
            .data(links)
            .enter()
            .filter(d => d.type === EdgeType.DOUBLE)
            .append('line')
            .attr('stroke-width', 6);

        const nodeElements = this.objectGroup.append('g')
            .attr('stroke', '#000')
            .attr('stroke-width', 1.5)
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', 15)
            .attr('fill', '#69b3a2')
            .call(d3.drag<SVGCircleElement, GraphNode>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('click', (event: Event, d: GraphNode) => {
                event.preventDefault();
                this.gameService.nodeClicked(d);
            });

        nodeElements.attr('fill', d => {
                if (d.value === 0) {
                    return 'white';
                } else if (d.value > 0) {
                    return 'palegreen';
                } else {
                    return 'salmon';
                }
            });

        const textElements = this.objectGroup.append('g')
            .selectAll('text')
            .data(nodes)
            .join('text')
            .text(d => d.value)
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'black')
            .style('user-select', 'none')
            .style('pointer-events', 'none');
        
        const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 5])
            .on('zoom', (event) => {
                this.resizableGroup.attr('transform', event.transform);
            });
    
        this.svg.call(zoomBehavior)
        .on("dblclick.zoom", null);

        function ticked() {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
            doubleLink
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
            nodeElements
                .attr('cx', (d: any) => d.x)
                .attr('cy', (d: any) => d.y);

            textElements
                .attr('x', d => d.x!)
                .attr('y', d => d.y!);
        }

        function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, node: GraphNode): void {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            node.fx = node.x;
            node.fy = node.y;
        }
        
        function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, node: GraphNode): void {
            node.fx = event.x;
            node.fy = event.y;
        }        
        
        function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, node: GraphNode): void {    
            if (!event.active) simulation.alphaTarget(0);
            node.fx = null;
            node.fy = null;
        }

        this.nodeElements = nodeElements;
        this.textElements = textElements;
        this.links = link;
        this.simulation = simulation;
    }

    @HostListener('window:keydown.control.z', ['$event'])
    onCtrlZ(event: KeyboardEvent): void {
        event.preventDefault();
        this.gameService.undoLastAction();
    }

    translateAlong(path: SVGLineElement, reverse: boolean = false) {
        const length = path.getTotalLength();
        return function(d: any, i: number, a: any) {
            return function(t: number) {
                const p = reverse ? path.getPointAtLength((1 - t) * length) : path.getPointAtLength(t * length);
                return `translate(${p.x},${p.y})`;
            };
        };
    }

    createRipple(node: GraphNode, reverse: boolean): void {
        if(!node.x || !node.y){
            return;
        }
        const ripple = this.animationGroup.append('circle')
            .attr('cx', node.x)
            .attr('cy', node.y)
            .attr('r', reverse ? 50 : 0)
            .attr('fill', 'black')
            .attr('opacity', reverse ? 0 : 1)
            .style('pointer-events', 'none');
    
        ripple.transition()
            .duration(500)
            .attr('r', reverse ? 0 : 50)
            .attr('opacity', reverse ? 1 : 0)
            .end().then(() => ripple.remove());
    }

    updateNodeColors(): void {
        this.nodeElements
            .attr('fill', d => {
                if (d.value === 0) {
                    return 'white';
                } else if (d.value > 0) {
                    return 'palegreen';
                } else {
                    return 'salmon';
                }
            });
    }

    updateNodeTexts(): void {
        this.textElements.text(d => d.value);
    }

    updateEdgeColors(): void {
        this.links
            .attr('stroke', d => {
                if(d.type === EdgeType.PERIODIC && d.currentCycle !== d.period){
                    return '#ddd'
                }
                else{
                    return '#000';
                }
            });
    }

    updateSvgSize(): void {
        if(this.svg) {
            this.svg
                .attr('width', this.svgWidth)
                .attr('height', this.svgHeight);
        }
    }

    updateCenterForce(): void {
        this.simulation.force('center', d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2));
        this.simulation.alpha(1).restart();
    }

    onRepulsionForceChange(event: any): void {
        this.repulsionForce = event.value;
        this.simulation.force('charge', d3.forceManyBody().strength(-this.repulsionForce));
        this.simulation.alpha(1).restart();
    }

    onSolutionSpeedChange(event: any): void {
        this.solutionSpeed = event.value;
        this.gameService.solutionSpeed = this.solutionSpeed;
    }
}