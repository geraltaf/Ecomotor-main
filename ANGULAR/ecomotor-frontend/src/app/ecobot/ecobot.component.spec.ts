import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ecobot } from './ecobot.component';

describe('Ecobot', () => {
  let component: Ecobot;
  let fixture: ComponentFixture<Ecobot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ecobot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ecobot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
