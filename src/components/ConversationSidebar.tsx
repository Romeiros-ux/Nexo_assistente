import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [filter, setFilter] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // garante que o input de renomear reflita a conversa ativa quando abrir
    if (!renameOpen) return;
    if (!renameId) return;
    const c = conversations.find((x) => x.id === renameId);
    setRenameValue(c?.title ?? "");
  }, [conversations, renameId, renameOpen]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, filter]);

  return (
    <Sidebar collapsible="icon" className={cn(collapsed ? "w-14" : "w-60")}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversas</SidebarGroupLabel>
          <SidebarGroupContent>
            {!collapsed ? (
              <div className="px-2 pb-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                />
              </div>
            ) : null}

            <div className={cn("px-2 pb-2", collapsed && "px-1")}
            >
              <Button
                type="button"
                variant="outline"
                size={collapsed ? "icon" : "sm"}
                className={cn(collapsed ? "h-8 w-8" : "w-full justify-start")}
                onClick={onNew}
              >
                <MessageSquarePlus className="h-4 w-4" />
                {!collapsed ? <span className="ml-2">Nova conversa</span> : null}
              </Button>
            </div>

            <SidebarMenu>
              {filtered.length === 0 ? (
                <SidebarMenuItem>
                  <div className={cn("px-2 py-2 text-xs text-muted-foreground", collapsed && "hidden")}>
                    Nenhuma conversa.
                  </div>
                </SidebarMenuItem>
              ) : (
                filtered.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <div className={cn("group relative flex items-center")}
                    >
                      <SidebarMenuButton
                        type="button"
                        isActive={!!activeId && activeId === c.id}
                        onClick={() => onSelect(c.id)}
                        tooltip={collapsed ? c.title : undefined}
                        className={cn("hover:bg-muted/50 pr-9")}
                      >
                        <span className={cn("truncate", collapsed && "hidden")}>{c.title || "(Sem título)"}</span>
                        {collapsed ? <span className="sr-only">{c.title}</span> : null}
                      </SidebarMenuButton>

                      {/* ações (somente quando expandido) */}
                      {!collapsed ? (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={`Ações da conversa ${c.title}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRenameId(c.id);
                                  setRenameOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => {
                                  setDeleteId(c.id);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}
                    </div>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Renomear */}
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Ex.: Evasão escolar 2024"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRenameOpen(false);
                setRenameId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!renameId) return;
                await onRename(renameId, renameValue);
                setRenameOpen(false);
                setRenameId(null);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a conversa e todas as mensagens dela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                await onDelete(deleteId);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
