import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { DuesLedgerEntry, DuesSettings } from '../types';
import { mockDuesSettings, mockLedger } from './mockStore';

export async function listLedger(): Promise<DuesLedgerEntry[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('dues_ledger').select('*').order('occurred_at', { ascending: false });
    if (error) throw error;
    return data as DuesLedgerEntry[];
  }
  return [...mockLedger].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function getBalance(ledger: DuesLedgerEntry[]): number {
  return ledger.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0);
}

export async function getDuesSettings(): Promise<DuesSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('dues_settings').select('*').single();
    if (error) throw error;
    return data as DuesSettings;
  }
  return mockDuesSettings;
}

export async function updateDuesSettings(settings: DuesSettings): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('dues_settings').update(settings).eq('id', 1);
    if (error) throw error;
    return;
  }
  Object.assign(mockDuesSettings, settings);
}

export async function addExpense(amount: number, memo: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('dues_ledger').insert({
      type: 'expense',
      amount,
      memo,
      auto_recognized: false,
      occurred_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }
  mockLedger.push({
    id: `l-${Date.now()}`,
    type: 'expense',
    amount,
    memo,
    autoRecognized: false,
    occurredAt: new Date().toISOString(),
  });
}

export interface OcrResult {
  memberName: string;
  amount: number;
  occurredAt: string;
}

export async function uploadReceiptAndRecognize(fileUri: string): Promise<OcrResult> {
  if (isSupabaseConfigured && supabase) {
    const fileName = `receipts/${Date.now()}.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('dues-receipts').upload(fileName, blob);
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.functions.invoke('ocr-receipt', { body: { path: fileName } });
    if (error) throw error;
    return data as OcrResult;
  }
  return {
    memberName: '레이지',
    amount: 30000,
    occurredAt: new Date().toISOString(),
  };
}

export async function confirmIncome(result: OcrResult, memberId?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('dues_ledger').insert({
      type: 'income',
      amount: result.amount,
      memo: `${result.memberName} 입금`,
      member_id: memberId ?? null,
      auto_recognized: true,
      occurred_at: result.occurredAt,
    });
    if (error) throw error;
    return;
  }
  mockLedger.push({
    id: `l-${Date.now()}`,
    type: 'income',
    amount: result.amount,
    memo: `${result.memberName} 입금`,
    memberId,
    autoRecognized: true,
    occurredAt: result.occurredAt,
  });
}
