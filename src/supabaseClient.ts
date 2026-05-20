import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co"
const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii"

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
