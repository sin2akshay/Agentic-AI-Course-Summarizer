import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'session/1', pathMatch: 'full' },
  {
    path: 'session/:id',
    loadComponent: () => import('./session/session').then((module) => module.SessionComponent)
  },
  { path: '**', redirectTo: 'session/1' }
];
