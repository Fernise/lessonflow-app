/** Only server-managed Supabase app metadata grants feedback administration. */
export function isFeedbackAdmin(user) {
  return user?.app_metadata?.feedback_admin === true;
}
