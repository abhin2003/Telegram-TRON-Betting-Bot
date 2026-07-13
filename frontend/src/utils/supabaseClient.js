export const supabase = {
  from: () => ({
    select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
    insert: () => Promise.resolve({ error: null }),
    on: () => ({ subscribe: () => ({}) })
  })
};
