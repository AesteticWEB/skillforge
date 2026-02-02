import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-simulator-page',
  templateUrl: './simulator.page.html',
  styleUrl: './simulator.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorPage {}
