import dotenv from 'dotenv';
dotenv.config({ path: './config/config.env' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) console.error('Error:', error);
  else console.log('Buckets:', data.map(b => b.name));
}

listBuckets();
