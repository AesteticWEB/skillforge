import { Component } from '@angular/core';
import { AppShellWidget } from '../widgets/app-shell/app-shell.widget';

@Component({
  selector: 'app-root',
  imports: [AppShellWidget],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
