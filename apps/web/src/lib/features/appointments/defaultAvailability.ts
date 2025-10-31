/**
 * @file Default availability configuration
 * Provides default business hours when no availability is configured
 */

import { getServiceSupabase } from "@/lib/supabase/service";

export type DefaultAvailabilityConfig = {
  weekday: number;
  start_time: string;
  end_time: string;
};

/**
 * Default business hours (Monday-Saturday, 9AM-6PM)
 */
export const DEFAULT_AVAILABILITY: DefaultAvailabilityConfig[] = [
  { weekday: 0, start_time: '09:00', end_time: '18:00' }, // Monday
  { weekday: 1, start_time: '09:00', end_time: '18:00' }, // Tuesday
  { weekday: 2, start_time: '09:00', end_time: '18:00' }, // Wednesday
  { weekday: 3, start_time: '09:00', end_time: '18:00' }, // Thursday
  { weekday: 4, start_time: '09:00', end_time: '18:00' }, // Friday
  { weekday: 5, start_time: '10:00', end_time: '14:00' }, // Saturday
];

/**
 * Ensures a tenant has availability configured.
 * If not, creates default availability automatically.
 */
export async function ensureAvailabilityExists(tenantId: string): Promise<boolean> {
  try {
    const service = getServiceSupabase();
    
    // Check if availability already exists
    const { data: existing, error: checkError } = await service
      .from('appointment_availability')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    if (checkError) {
      console.error('[ensureAvailability] Check error:', checkError);
      return false;
    }
    
    // If availability exists, we're good
    if (existing && existing.length > 0) {
      return true;
    }
    
    // No availability found, create default
    console.log('[ensureAvailability] Creating default availability for tenant:', tenantId);
    
    const nowIso = new Date().toISOString();
    const records = DEFAULT_AVAILABILITY.map(config => ({
      tenant_id: tenantId,
      weekday: config.weekday,
      start_time: config.start_time,
      end_time: config.end_time,
      created_at: nowIso,
      updated_at: nowIso
    }));
    
    const { error: insertError } = await service
      .from('appointment_availability')
      .insert(records);
    
    if (insertError) {
      console.error('[ensureAvailability] Insert error:', insertError);
      return false;
    }
    
    console.log('[ensureAvailability] Successfully created default availability');
    return true;
  } catch (error) {
    console.error('[ensureAvailability] Unexpected error:', error);
    return false;
  }
}
