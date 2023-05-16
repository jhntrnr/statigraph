import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-tutorial',
    templateUrl: './tutorial.component.html',
    styleUrls: ['./tutorial.component.css']
})
export class TutorialComponent implements OnInit {
    public isExpanded: boolean = false;
    public images = [
        'assets/tutorial1.png',
        'assets/tutorial2.png',
        'assets/tutorial3.png',
        'assets/tutorial4.png'
    ];
    public currentImageIndex = 0;
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
    toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
    }
    
    nextImage(): void {
        if (this.currentImageIndex < this.images.length - 1) {
            this.currentImageIndex++;
        }
    }
    
    prevImage(): void {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
        }
    }
}
