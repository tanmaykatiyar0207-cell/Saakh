const { createClient } = require('@supabase/supabase-js');

// Config from supabase-config.js
const SUPABASE_URL = 'https://nqedvdkpcnbrqvpywgfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZWR2ZGtwY25icnF2cHl3Z2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTExMjgsImV4cCI6MjA5OTc4NzEyOH0.Lm_1zeJ5OZLp9jevJ7KYnrjgtkVCBjhWFk5DiSMQOho';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedData() {
  console.log("Starting seeding process...");
  
  // 1. Authenticate or Create user "Iyengar Bakery"
  const email = 'iyengar@example.com';
  const password = 'password123';
  const shopName = 'Iyengar Bakery';

  console.log(`Signing up user ${email} (${shopName})...`);
  
  let { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        shop_name: shopName
      }
    }
  });

  if (authError && authError.message.includes('User already registered')) {
    console.log("User already exists, signing in...");
    const res = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    authData = res.data;
    authError = res.error;
  }

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log(`Successfully authenticated user ID: ${userId}`);

  // 2. Seed saakh_documents
  console.log("Seeding documents...");
  const docsToSeed = [
    {
      user_id: userId,
      file_name: 'Flour_Sugar_Invoice_June.pdf',
      file_type: 'application/pdf',
      created_at: '2026-06-05T10:00:00Z',
      extracted_data: { netProfit: -1500, expenses: [{ description: 'Flour and Sugar bulk purchase', amount: 1500 }] }
    },
    {
      user_id: userId,
      file_name: 'Daily_Sales_Report_June.csv',
      file_type: 'text/csv',
      created_at: '2026-06-15T18:00:00Z',
      extracted_data: { netProfit: 8000, income: [{ description: 'Daily counter sales', amount: 8000 }] }
    },
    {
      user_id: userId,
      file_name: 'Electricity_Bill_June.pdf',
      file_type: 'application/pdf',
      created_at: '2026-06-25T11:00:00Z',
      extracted_data: { netProfit: -400, expenses: [{ description: 'Electricity Bill', amount: 400 }] }
    }
  ];

  for (const doc of docsToSeed) {
    const { error } = await supabase.from('saakh_documents').insert(doc);
    if (error) {
       if(error.code === '42P01') console.log('Table saakh_documents might not exist yet.');
       else console.error("Error inserting document:", error);
    }
  }

  // 3. Seed saakh_forecasts
  console.log("Seeding forecast data...");
  const mockForecast = {
    avgDailyIncome: 4500,
    avgDailyExpense: 1200,
    currentBalance: 12500,
    projectedRunwayDays: 145,
    growthRate: 5.2,
    predictions: [
      { date: '2026-07-18', predictedBalance: 12500 },
      { date: '2026-07-19', predictedBalance: 15800 },
      { date: '2026-07-20', predictedBalance: 19100 }
    ],
    gemmaSuggestion: "Your counter sales are strong, but the bulk purchase of flour/sugar on Day 5 will temporarily reduce your runway. Consider delaying the misc packaging purchase to Day 15 to maintain a healthier cash buffer."
  };

  const { error: forecastError } = await supabase.from('saakh_forecasts').insert({
    user_id: userId,
    forecast_data: mockForecast,
    created_at: new Date().toISOString()
  });

  if (forecastError) {
    if(forecastError.code === '42P01') console.log('Table saakh_forecasts might not exist yet.');
    else console.error("Error inserting forecast:", forecastError);
  }

  // 4. Seed saakh_scores
  console.log("Seeding score history...");
  const scoresToSeed = [
    { user_id: userId, score: 650 },
    { user_id: userId, score: 675 },
    { user_id: userId, score: 710 },
    { user_id: userId, score: 735 }
  ];

  for (const score of scoresToSeed) {
    const { error: scoreError } = await supabase.from('saakh_scores').insert(score);
    if (scoreError) {
      if(scoreError.code === '42P01') console.log('Table saakh_scores might not exist yet.');
      else console.error("Error inserting score:", scoreError);
    }
  }

  console.log("Seeding complete! You can log in with: iyengar@example.com / password123");
}

seedData();
