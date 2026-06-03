"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/lib/actions/documents";
import { DocumentWithPermission } from "@/lib/types";
import DocRow from "./DocRow";
import DocDetailPanel from "./DocDetailPanel";
import ShareDialog from "./ShareDialog";
import UploadButton from "./UploadButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Plus, FileText, Share2 } from "lucide-react";
import { runDashboardMutation } from "@/lib/dashboard-actions";

interface Props {
  ownedDocs: DocumentWithPermission[];
  sharedDocs: DocumentWithPermission[];
  currentUserId: string; // available for child panels if needed
}

type ActiveTab = "mine" | "shared";

export default function DocList({ ownedDocs, sharedDocs }: Props) {
  const router = useRouter();
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("mine");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [shareDocId,    setShareDocId]    = useState<string | null>(null);
  const [pendingCount,  setPendingCount]  = useState(0);

  const beginMutation = () => setPendingCount((n) => n + 1);
  const endMutation   = () => setPendingCount((n) => Math.max(0, n - 1));
  const isRefreshing  = pendingCount > 0;

  function handleCreate() {
    void runDashboardMutation({
      begin: beginMutation,
      end: endMutation,
      refresh: () => router.refresh(),
      mutate: async () => { await createDocument(); },
    });
  }

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    setSelectedDocId(null);
  }

  const currentDocs  = activeTab === "mine" ? ownedDocs : sharedDocs;
  const selectedDoc  = currentDocs.find((d) => d.id === selectedDocId) ?? null;
  const panelVisible = selectedDoc !== null;

  function toggleSelect(docId: string) {
    setSelectedDocId((prev) => (prev === docId ? null : docId));
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleCreate} disabled={isRefreshing}>
          {isRefreshing
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          New document
        </Button>
        <UploadButton
          onMutationStart={beginMutation}
          onMutationEnd={endMutation}
          onRefresh={() => router.refresh()}
        />
      </div>

      {/* Card with tabs + list + optional right panel */}
      <div className="flex rounded-lg border overflow-hidden min-h-[460px] bg-background">

        {/* ── Main list area ── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Tab bar */}
          <div className="flex border-b bg-muted/20 shrink-0">
            <TabButton
              active={activeTab === "mine"}
              onClick={() => switchTab("mine")}
              icon={<FileText className="h-4 w-4" />}
              label="My Documents"
              count={ownedDocs.length}
            />
            <TabButton
              active={activeTab === "shared"}
              onClick={() => switchTab("shared")}
              icon={<Share2 className="h-4 w-4" />}
              label="Shared with me"
              count={sharedDocs.length}
            />
          </div>

          {/* Column headers */}
          {currentDocs.length > 0 && (
            <div className="flex items-center px-4 py-2 border-b bg-muted/10 text-xs font-medium text-muted-foreground shrink-0">
              <div className="flex-1 mr-4 flex items-center gap-3">
                <span className="w-4" />{/* icon placeholder */}
                Name
              </div>
              {activeTab === "shared" && (
                <div className="w-40 hidden sm:block">Sharing</div>
              )}
              <div className="w-32 hidden md:block">Last Updated</div>
              <div className="w-8" />
            </div>
          )}

          {/* Rows or empty state */}
          {currentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center flex-1 px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {activeTab === "mine"
                  ? <FileText className="h-5 w-5 text-muted-foreground" />
                  : <Share2   className="h-5 w-5 text-muted-foreground" />}
              </div>
              <p className="text-sm font-medium">
                {activeTab === "mine" ? "No documents yet" : "No shared documents"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {activeTab === "mine"
                  ? "Create a new document or upload a .txt / .md file to get started."
                  : "Documents others share with you will appear here."}
              </p>
              {activeTab === "mine" && (
                <Button className="mt-4" size="sm" onClick={handleCreate} disabled={isRefreshing}>
                  <Plus className="h-4 w-4" /> New document
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {currentDocs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  isOwner={activeTab === "mine"}
                  selected={selectedDocId === doc.id}
                  onSelect={() => toggleSelect(doc.id)}
                  onMutationStart={beginMutation}
                  onMutationEnd={endMutation}
                  onRefresh={() => { router.refresh(); setSelectedDocId(null); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right detail panel ── */}
        {panelVisible && selectedDoc && (
          <DocDetailPanel
            doc={selectedDoc}
            isOwner={activeTab === "mine"}
            onClose={() => setSelectedDocId(null)}
            onManageShare={() => setShareDocId(selectedDoc.id)}
          />
        )}
      </div>

      {shareDocId && (
        <ShareDialog
          docId={shareDocId}
          open={true}
          onOpenChange={(open) => { if (!open) setShareDocId(null); }}
        />
      )}
    </div>
  );
}

// ── Tab button ───────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
        active
          ? "border-primary text-primary bg-background"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30",
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={cn(
          "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
