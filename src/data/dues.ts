import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { DuesLedgerEntry, DuesSettings } from '../types';
import { CURRENT_USER_ID, mockDuesSettings, mockLedger } from './mockStore';

export async function listLedger(): Promise<DuesLedgerEntry[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('dues_ledger').select('*').order('occurred_at', { ascending: false });
    if (error) throw error;
    return camelizeDeep<DuesLedgerEntry[]>(data ?? []);
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
    return camelizeDeep<DuesSettings>(data);
  }
  return mockDuesSettings;
}

export async function updateDuesSettings(settings: DuesSettings): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('dues_settings')
      .update({ monthly_fee: settings.monthlyFee, deposit_day: settings.depositDay, notify_on: settings.notifyOn })
      .eq('id', 1);
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
  recognized: boolean;
}

export async function uploadReceiptAndRecognize(fileUri: string): Promise<OcrResult> {
  if (isSupabaseConfigured && supabase) {
    const fileName = `receipts/${Date.now()}.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('dues-receipts').upload(fileName, blob);
    if (uploadError) throw uploadError;

    // The upload itself succeeded; OCR recognition is a best-effort convenience
    // on top of it. If the OCR function isn't deployed or fails, fall back to
    // an empty form instead of throwing away the already-uploaded receipt.
    try {
      const { data, error } = await supabase.functions.invoke('ocr-receipt', { body: { path: fileName } });
      if (error) throw error;
      return { ...(data as Omit<OcrResult, 'recognized'>), recognized: true };
    } catch {
      return { memberName: '', amount: 0, occurredAt: new Date().toISOString(), recognized: false };
    }
  }
  return {
    memberName: '레이지',
    amount: 30000,
    occurredAt: new Date().toISOString(),
    recognized: true,
  };
}

// Self-service: a member uploads proof of their OWN payment. No OCR/name
// matching needed since the uploader is the payer; this is separate from the
// admin-only bulk OCR flow above.
export async function uploadOwnReceipt(fileUri: string, amount: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getAuthUserId();
    const fileName = `receipts/self-${userId}-${Date.now()}.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('dues-receipts').upload(fileName, blob);
    if (uploadError) throw uploadError;
    const { error } = await supabase.from('dues_ledger').insert({
      type: 'income',
      amount,
      memo: '본인 회비 납부',
      member_id: userId,
      auto_recognized: false,
      receipt_url: fileName,
      occurred_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }
  mockLedger.push({
    id: `l-${Date.now()}`,
    type: 'income',
    amount,
    memo: '본인 회비 납부',
    memberId: CURRENT_USER_ID,
    autoRecognized: false,
    occurredAt: new Date().toISOString(),
  });
}

export function hasPaidThisMonth(ledger: DuesLedgerEntry[], memberId: string): boolean {
  const now = new Date();
  return ledger.some(
    (e) =>
      e.type === 'income' &&
      e.memberId === memberId &&
      new Date(e.occurredAt).getFullYear() === now.getFullYear() &&
      new Date(e.occurredAt).getMonth() === now.getMonth(),
  );
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
