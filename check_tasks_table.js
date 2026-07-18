const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nqedvdkpcnbrqvpywgfj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZWR2ZGtwY25icnF2cHl3Z2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTExMjgsImV4cCI6MjA5OTc4NzEyOH0.Lm_1zeJ5OZLp9jevJ7KYnrjgtkVCBjhWFk5DiSMQOho');

async function check() {
  const { data, error } = await supabase.from('saakh_tasks').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
