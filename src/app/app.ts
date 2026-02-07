import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { MeuHandle } from './core/model/main.interface';
import { MainService } from './core/services/main.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [ReactiveFormsModule],
})
export class App {
  private mainService = inject(MainService);

  ano = new Date().getFullYear();
  followsList = signal<any[]>([]);
  cursor = signal<string | undefined>(undefined);
  loading = signal(false);
  dadosHandle = signal<MeuHandle | null>(null);

  bskyForm = new FormGroup({
    token: new FormControl('', [Validators.required, Validators.minLength(5)]),
    myHandle: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  get token() {
    return this.bskyForm.get('token');
  }
  get myHandle() {
    return this.bskyForm.get('myHandle');
  }

  async analyze() {
    if (this.bskyForm.invalid) {
      this.bskyForm.markAllAsTouched();
      return;
    }

    this.followsList.set([]);

    const { token, myHandle } = this.bskyForm.getRawValue();

    this.loading.set(true);

    this.dadosHandle.set(await lastValueFrom(this.mainService.getProfile(token!, myHandle!)));

    this.mainService.loadAllFollowersToCache(token!, myHandle!).subscribe({
      next: () => this.loadMoreFollows(),
      error: () => this.loading.set(false),
    });
  }

  loadMoreFollows() {
    const tokenValue = this.token?.value;
    const handleValue = this.myHandle?.value;
    if (!tokenValue || !handleValue) return;
    this.loading.set(true);
    this.mainService.getFollowsWithStatus(tokenValue, handleValue, this.cursor()).subscribe({
      next: (res) => {
        this.followsList.update((current) => [...current, ...res.follows]);
        this.cursor.set(res.cursor || undefined);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
