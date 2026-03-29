import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Ad } from './ad.model';

@Injectable({ providedIn: 'root' })
export class KufarService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://gqendbwmiravkcxgbpfa.supabase.co',
      'sb_publishable_J4j8zJIO5YXakElrQIpO0Q_j8Rb-JMh'
    );
  }

  // Получаем только актуальные (не удаленные и не старые версии)
  async getActiveAds() {
    const { data, error } = await this.supabase
      .from('ads')
      .select('*')
      .eq('is_deleted', false)
      .is('updated_to', null)
      .order('created_at', { ascending: false });
    return data as Ad[];
  }

  // Логика сохранения изменений (Версионность)
  async updateAdVersion(oldAd: Ad, newData: Partial<Ad>) {
    // 1. Создаем новую запись на основе старой + новые изменения
    const { data: newRecord, error: insertError } = await this.supabase
      .from('ads')
      .insert([{
        ...oldAd,
        ...newData,
        id: undefined, // генерируется новый
        created_at: undefined 
      }])
      .select()
      .single();

    if (newRecord) {
      // 2. Старую запись помечаем как обновленную, указывая ID новой
      await this.supabase
        .from('ads')
        .update({ updated_to: newRecord.id })
        .eq('id', oldAd.id);
    }
  }

  async deleteAd(id: string) {
    await this.supabase
      .from('ads')
      .update({ is_deleted: true })
      .eq('id', id);
  }
}