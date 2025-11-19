import { Routes } from '@angular/router';
import { BudgetComponent } from './budget/budget.component';

export const routes: Routes = [

    { path: 'budget', component: BudgetComponent },
  
    { path: '', redirectTo: 'budget', pathMatch: 'full' }

];
