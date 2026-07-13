const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase insert...");
  const { error: insertError } = await supabase.from('bets').insert([{
    id: "test-tx-" + Date.now(),
    player: "test-wallet",
    prediction: "ODD",
    amount: 10,
    asset: "TRX",
    block: 12345,
    result: "WIN",
    payout: 18
  }]);

  if (insertError) {
    console.error("Error inserting:", insertError.message, insertError.details, insertError.hint);
  } else {
    console.log("Insert success!");
    const { data } = await supabase.from('bets').select('*');
    console.log("Data in table:", data);
  }
}

test();
