import { createClient } from '@supabase/supabase-js'

// 👇 Reemplazá estos dos valores por los de TU proyecto de Supabase.
// Los encontrás en: Supabase > tu proyecto > Project Settings > API
const supabaseUrl = 'https://wbboiafbtuekfixpftls.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiYm9pYWZidHVla2ZpeHBmdGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MTM1MzQsImV4cCI6MjEwMzM4OTUzNH0.MAuUrZ9iiGVFzV6-YOWBZ-vqIklTr1ZHS2VoKXrrVc4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
