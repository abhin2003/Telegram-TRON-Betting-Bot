const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('bets').select('*');
  
  if (error) {
    console.error("Error reading bets:", error.message);
  } else {
    console.log("Success! Data:", data);
  }
}

test();
