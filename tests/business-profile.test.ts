import { beforeEach, expect, mock, test } from "bun:test";

const upsert = mock(async (_values: unknown, _options: unknown) => ({ error: null }));
const from = mock((_table: string) => ({ upsert }));
mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "owner-id" } } }) },
    from,
  },
}));

const { saveMyBusinessProfile, saveMyDefaultEstimateNotes } = await import("../src/lib/db");

beforeEach(() => {
  upsert.mockClear();
  from.mockClear();
});

test("company changes update the existing owner's profile instead of inserting a duplicate", async () => {
  const values = { company_name: "Updated company", address: "123 Main St", city: "Miami", state: "FL", zip: "33101", phone: "(561) 123-4567" };
  await saveMyBusinessProfile(values);
  expect(from).toHaveBeenCalledWith("business_profiles");
  expect(upsert).toHaveBeenCalledWith(
    { user_id: "owner-id", ...values, updated_at: expect.any(String) },
    { onConflict: "user_id" },
  );
});

test("saving estimate notes updates the same owner's row without replacing company details", async () => {
  await saveMyDefaultEstimateNotes("Payment due in 30 days");
  expect(upsert).toHaveBeenCalledWith(
    { user_id: "owner-id", default_estimate_notes: "Payment due in 30 days", updated_at: expect.any(String) },
    { onConflict: "user_id" },
  );
});