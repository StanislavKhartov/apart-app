import { Component, OnInit, signal, computed} from '@angular/core'; // Добавили signal
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KufarService } from './kufar.service';
import { Ad } from './ad.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'] // Подключаем SCSS файл
})
export class App implements OnInit {
  ads = signal<Ad[]>([]);
  selectedAd = signal<Ad | null>(null);

  // Состояние сортировки
  sortField = signal<keyof Ad>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Вычисляемый список: автоматически сортируется при изменении ads, sortField или sortOrder
  sortedAds = computed(() => {
    const data = [...this.ads()];
    const field = this.sortField();
    const order = this.sortOrder();

    return data.sort((a, b) => {
      let valA: any = a[field] || '';
      let valB: any = b[field] || '';

      // Умный парсинг для цен и комнат
      if (field === 'price' || field === 'rooms') {
        valA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
        valB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
      }
      
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  });

  constructor(private kufarService: KufarService) {}

  ngOnInit() { this.refresh(); }

  async refresh() {
    const data = await this.kufarService.getActiveAds();
    this.ads.set(data || []);
  }

  toggleSort(field: keyof Ad) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  openEdit(ad: Ad) {
    this.selectedAd.set({ ...ad });
  }

  closeModal() {
    this.selectedAd.set(null);
  }

  async updateInterest(newInterest: any) {
    const ad = this.selectedAd();
    if (ad) {
      ad.interest = Number(newInterest);
      await this.kufarService.updateAdVersion(ad, { interest: ad.interest });
      this.refresh();
    }
  }

  async updateComment(event: any) {
    const ad = this.selectedAd();
    const newComment = event.target.value;
    if (ad && ad.comment !== newComment) {
      ad.comment = newComment;
      await this.kufarService.updateAdVersion(ad, { comment: newComment });
      this.refresh();
    }
  }

  async removeInModal() {
    const ad = this.selectedAd();
    if (ad && confirm('Удалить эту запись?')) {
      await this.kufarService.deleteAd(ad.id!);
      this.closeModal();
      this.refresh();
    }
  }

  getBgColor(interest: number): string {
    const colors: any = { 1: '#fff', 2: '#f0faff', 3: '#fffcf0', 4: '#fff7f0', 5: '#fff2f0' };
    return colors[interest] || '#fff';
  }
}