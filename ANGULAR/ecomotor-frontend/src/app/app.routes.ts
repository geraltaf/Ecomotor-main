import { Routes } from '@angular/router';
import { LandingComponent } from './component/landing/landing.component';
import { LoginComponent } from './component/login/login.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { ComputerVisionComponent } from './computer-vision/computer-vision.component';
import { EcobotComponent } from './ecobot/ecobot.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'landing', component: LandingComponent},
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'computerVision', component: ComputerVisionComponent },
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'ecobot', component: EcobotComponent }
];