import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

// GET - List all available templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const { data: templates, error } = await supabase
      .from('invoicing_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/invoicing/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
