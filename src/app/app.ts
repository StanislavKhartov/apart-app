import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KufarService } from './kufar.service';
import { Ad } from './ad.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  ads = signal<Ad[]>([]);
  selectedAd = signal<Ad | null>(null);
  
  // Состояние фильтра
  roomsFilter = signal<string>('all');
  isFilterOpen = signal<boolean>(false); // Скрыт по умолчанию

  sortField = signal<keyof Ad>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  roomOptions = computed(() => {
    const rooms = this.ads().map(ad => ad.rooms);
    return ['all', ...new Set(rooms)].sort();
  });

  displayAds = computed(() => {
    let data = [...this.ads()];
    if (this.roomsFilter() !== 'all') {
      data = data.filter(ad => ad.rooms === this.roomsFilter());
    }

    const field = this.sortField();
    const order = this.sortOrder();

    return data.sort((a, b) => {
      const getVal = (item: Ad) => {
        let val = item[field] ?? '';
        if (field === 'price') {
          if (String(val).toLowerCase().includes('договор')) return Infinity;
          return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        }
        if (field === 'created_at') return new Date(String(val)).getTime();
        return val;
      };
      const valA = getVal(a);
      const valB = getVal(b);
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

  // Переключение видимости фильтра
  toggleFilter(event: Event) {
    event.stopPropagation();
    this.isFilterOpen.update(v => !v);
  }

  // Выбор комнаты
  selectRoom(option: string) {
    this.roomsFilter.set(option);
    this.isFilterOpen.set(false);
  }

  // Закрытие фильтра при клике вне его области
  @HostListener('document:click')
  closeFilter() {
    this.isFilterOpen.set(false);
  }

  toggleSort(field: keyof Ad) {
    if (field === 'rooms') return;
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  openView(ad: Ad) { this.selectedAd.set(ad); }
  closeModal() { this.selectedAd.set(null); }

  getBgColor(interest: number): string {
    const colors: any = { 1: '#fff', 2: '#f0faff', 3: '#fffcf0', 4: '#fff7f0', 5: '#fff2f0' };
    return colors[interest] || '#fff';
  }

  getRoomDigit(roomString: string): string {
  if (roomString === 'all') return 'Все';
  return roomString.replace(/[^0-9+]/g, '');
}
}