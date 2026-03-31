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
  currency = signal<'BYN' | 'USD'>('BYN');
  selectedAd = signal<Ad | null>(null);
  
  // Видимость окон
  isFilterOpen = signal(false);
  isPriceFilterOpen = signal(false);

  // Состояние фильтров и сортировки
  roomsFilter = signal<string>('all');
  sortField = signal<keyof Ad>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Обычные переменные для [(ngModel)] (для корректной работы инпутов)
  tempMin: number | null = null;
  tempMax: number | null = null;

  // Сигналы для примененных значений фильтра цен
  appliedMin = signal<number | null>(null);
  appliedMax = signal<number | null>(null);

  constructor(private kufarService: KufarService) {}

  ngOnInit() { this.refresh(); }

  async refresh() {
    const data = await this.kufarService.getActiveAds();
    this.ads.set(data || []);
  }

  // --- МЕТОДЫ ОТКРЫТИЯ (С изоляцией клика) ---

  toggleFilter(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation(); // Не дает клику уйти "выше" к документу
    this.isPriceFilterOpen.set(false);
    this.isFilterOpen.update(v => !v);
  }

  togglePriceFilter(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation(); // Не дает клику уйти "выше"
    this.isFilterOpen.set(false);
    this.isPriceFilterOpen.update(v => !v);
    
    if (this.isPriceFilterOpen()) {
      this.tempMin = this.appliedMin();
      this.tempMax = this.appliedMax();
    }
  }

  @HostListener('document:click')
  closeAllDropdowns() {
    // Этот метод сработает, только если клик НЕ был по кнопкам фильтра
    this.isFilterOpen.set(false);
    this.isPriceFilterOpen.set(false);
  }

  // --- ЛОГИКА ФИЛЬТРАЦИИ И СОРТИРОВКИ ---

  selectRoom(option: string, event: MouseEvent) {
    event.stopPropagation();
    this.roomsFilter.set(option);
    this.isFilterOpen.set(false);
  }

  applyPriceFilter(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.appliedMin.set(this.tempMin);
    this.appliedMax.set(this.tempMax);
    this.isPriceFilterOpen.set(false);
  }

  clearPriceFilter(event: MouseEvent) {
    event.stopPropagation();
    this.tempMin = null;
    this.tempMax = null;
    this.applyPriceFilter();
  }

  toggleSort(field: keyof Ad) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

  private parseNum(val: any): number {
    if (!val || String(val).toLowerCase().includes('договор')) return -1;
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? -1 : n;
  }

  displayAds = computed(() => {
    let data = [...this.ads()];
    const curr = this.currency();

    if (this.roomsFilter() !== 'all') {
      data = data.filter(ad => ad.rooms === this.roomsFilter());
    }

    const min = this.appliedMin();
    const max = this.appliedMax();
    if (min !== null || max !== null) {
      data = data.filter(ad => {
        const p = this.parseNum(curr === 'BYN' ? ad.price : ad.price_usd);
        if (p === -1) return false;
        return (min === null || p >= min) && (max === null || p <= max);
      });
    }

    const field = this.sortField();
    const order = this.sortOrder();
    return data.sort((a, b) => {
      const getVal = (item: Ad) => {
        if (field === 'price') {
          const v = curr === 'BYN' ? item.price : item.price_usd;
          const num = this.parseNum(v);
          return num === -1 ? Infinity : num;
        }
        if (field === 'rooms') return this.parseNum(item.rooms);
        if (field === 'created_at') return new Date(item.created_at || 0).getTime();
        return item[field] ?? '';
      };
      const vA = getVal(a); const vB = getVal(b);
      return vA < vB ? (order === 'asc' ? -1 : 1) : (order === 'asc' ? 1 : -1);
    });
  });

  roomOptions = computed(() => {
    const rooms = this.ads().map(ad => ad.rooms);
    return ['all', ...new Set(rooms)].sort();
  });

  getRoomDigit(roomString: string): string {
    if (roomString === 'all') return 'Все';
    return roomString.replace(/[^0-9+]/g, '');
  }

  getBgColor(interest: number): string {
    const colors: any = { 1: '#fff', 2: '#f0faff', 3: '#fffcf0', 4: '#fff7f0', 5: '#fff2f0' };
    return colors[interest] || '#fff';
  }

  openView(ad: Ad) { this.selectedAd.set(ad); }
  closeModal() { this.selectedAd.set(null); }
}