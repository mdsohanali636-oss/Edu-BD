import { supabase } from './src/supabaseClient';

async function checkPolicies() {
  console.log("=== Checking RLS Policies on Subscription Tables ===");
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql_text: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('subscription_packages', 'subscription_benefits', 'subscription_settings', 'subscription_requests');"
  });

  if (error) {
    // If execute_sql_query RPC is not defined/disabled, let's query via standard SELECT if allowed, or log error
    console.log("Failed to query via RPC, trying custom test query on table.");
    console.error("RPC Error:", error);
  } else {
    console.log("Policies found:", data);
  }
}

checkPolicies();
