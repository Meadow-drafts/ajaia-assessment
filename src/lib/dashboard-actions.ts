type DashboardMutationArgs = {
  begin: () => void;
  end: () => void;
  refresh: () => void;
  mutate: () => Promise<void>;
};

export async function runDashboardMutation({
  begin,
  end,
  refresh,
  mutate,
}: DashboardMutationArgs) {
  begin();
  try {
    await mutate();
    refresh();
  } finally {
    end();
  }
}
