import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';

import { AppComponent } from './app.component';
import { BoardComponent } from './components/board/board.component';
import { TutorialComponent } from './components/tutorial/tutorial.component';

import { GameService } from './services/game.service';


@NgModule({
	declarations: [
		AppComponent,
		BoardComponent,
  TutorialComponent,
	],
	imports: [
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        MatFormFieldModule,
        MatButtonModule,
        MatInputModule,
        MatSliderModule,
        MatCardModule,
        
	],
	providers: [
		GameService,
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
