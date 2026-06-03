import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Next.js server APIs used by the action ──────────────
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Mock the Supabase server client ──────────────────────────
// The ownership check calls .select().eq().eq().single() — two chained
// .eq() calls. The chain object must return itself from .eq() so the
// second call doesn't throw "eq is not a function".
const mockSingle = vi.fn();
const mockEq     = vi.fn();
const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockRpc    = vi.fn();

// Chain: .select() → .eq() → .eq() → .single()
const chainObj = { eq: mockEq, single: mockSingle };
mockEq.mockReturnValue(chainObj);       // every .eq() returns the same chain
mockSelect.mockReturnValue(chainObj);   // .select() starts the chain

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Import AFTER mocks are registered
import { shareDocument } from "@/lib/actions/shares";

// ─────────────────────────────────────────────────────────────

const OWNER_ID  = "owner-uuid-111";
const OTHER_ID  = "other-uuid-222";
const DOC_ID    = "doc-uuid-333";
const DOC_SHARE_EMAIL = "colleague@example.com";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shareDocument", () => {
  it("returns an error when the caller is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await shareDocument(DOC_ID, DOC_SHARE_EMAIL, "view");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not authenticated/i);
  });

  it("returns an error when the caller does not own the document", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    // Ownership check returns null (not the owner)
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await shareDocument(DOC_ID, DOC_SHARE_EMAIL, "view");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not the owner/i);
  });

  it("prevents a user from sharing a document with themselves", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    // Ownership check passes
    mockSingle.mockResolvedValue({ data: { id: DOC_ID }, error: null });
    // Email resolves to the same user
    mockRpc.mockResolvedValue({ data: OWNER_ID, error: null });

    const result = await shareDocument(DOC_ID, "owner@example.com", "view");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/can't share.*yourself/i);
  });

  it("returns an error when the target email has no account", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockSingle.mockResolvedValue({ data: { id: DOC_ID }, error: null });
    // RPC returns null — no user found
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await shareDocument(DOC_ID, "ghost@example.com", "view");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no account found/i);
  });

  it("successfully shares the document when all checks pass", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockSingle.mockResolvedValue({ data: { id: DOC_ID }, error: null });
    mockRpc.mockResolvedValue({ data: OTHER_ID, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const result = await shareDocument(DOC_ID, DOC_SHARE_EMAIL, "edit");

    expect(result.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        doc_id:      DOC_ID,
        shared_with: OTHER_ID,
        shared_by:   OWNER_ID,
        permission:  "edit",
      }),
      expect.objectContaining({ onConflict: "doc_id,shared_with" })
    );
  });

  it("returns an error when the database upsert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockSingle.mockResolvedValue({ data: { id: DOC_ID }, error: null });
    mockRpc.mockResolvedValue({ data: OTHER_ID, error: null });
    mockUpsert.mockResolvedValue({ error: { message: "unique constraint violation" } });

    const result = await shareDocument(DOC_ID, DOC_SHARE_EMAIL, "view");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unique constraint/i);
  });
});
