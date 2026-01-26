import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage, DocumentSource, ResponseSection } from "@/types/document";

function deriveConversationTitle(firstUserMessage: string) {
  const normalized = firstUserMessage.replace(/\s+/g, " ").trim();
  if (!normalized) return "Nova conversa";
  const max = 60;
  return normalized.length > max ? `${normalized.slice(0, max).trim()}…` : normalized;
}

type ConversationRow = {
  id: string;
  title: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ChatQueryResponse = {
  answer: string;
  sources: Array<{ documentId: string; documentName: string }>;
  error?: string;
};

async function queryAI(query: string, conversationId: string): Promise<ChatQueryResponse> {
  const { data, error } = await supabase.functions.invoke("chat-query", {
    body: { query, conversationId },
  });

  if (error) {
    console.error("chat-query error:", error);
    return {
      answer: "Erro ao processar a consulta. Tente novamente.",
      sources: [],
      error: error.message,
    };
  }

  if (data?.error) {
    return {
      answer: data.error,
      sources: [],
      error: data.error,
    };
  }

  return {
    answer: data?.answer || "Não foi possível gerar uma resposta.",
    sources: data?.sources || [],
  };
}

function parseResponseToSections(answer: string, sources: DocumentSource[]): ResponseSection[] {
  // Tenta identificar seções na resposta
  const sections: ResponseSection[] = [];
  
  // Sempre adiciona a resposta principal
  sections.push({
    type: "summary",
    title: "📌 Resposta",
    content: answer,
  });

  // Se houver fontes, adiciona seção de referências
  if (sources.length > 0) {
    const refsContent = sources
      .map((s, i) => `${i + 1}. ${s.documentName}`)
      .join("\n");
    sections.push({
      type: "references",
      title: "📚 Fontes Consultadas",
      content: refsContent,
    });
  }

  return sections;
}

export function useChatHistory() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    [conversations],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    setConversations((data || []) as ConversationRow[]);
    return (data || []) as ConversationRow[];
  }, [user]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const mapped: ChatMessage[] = (data || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.role === "assistant" ? m.content : m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(mapped);
    },
    [user],
  );

  const ensureConversation = useCallback(async () => {
    if (!user) return;
    const existing = await loadConversations();
    if (existing && existing.length > 0) {
      setActiveConversationId((prev) => prev ?? existing[0].id);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Nova conversa" })
      .select("id")
      .single();
    if (error) throw error;
    const newId = (data as any)?.id as string;
    setActiveConversationId(newId);
    await loadConversations();
  }, [loadConversations, user]);

  useEffect(() => {
    if (!user) return;
    ensureConversation().catch(() => {
      // silencioso; erros serão tratados na UI quando necessário
    });
  }, [ensureConversation, user]);

  useEffect(() => {
    if (!user || !activeConversationId) return;
    setIsLoading(true);
    loadMessages(activeConversationId)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeConversationId, loadMessages, user]);

  const newConversation = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Nova conversa" })
      .select("id")
      .single();
    if (error) throw error;
    const id = (data as any)?.id as string;
    await loadConversations();
    setActiveConversationId(id);
    setMessages([]);
  }, [loadConversations, user]);

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!user) return;
      const nextTitle = title.trim() || "Nova conversa";
      const { error } = await supabase
        .from("conversations")
        .update({ title: nextTitle })
        .eq("id", conversationId);
      if (error) throw error;
      await loadConversations();
    },
    [loadConversations, user],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      // 1) remove mensagens primeiro (evita lixo órfão)
      const { error: msgErr } = await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (msgErr) throw msgErr;

      // 2) remove a conversa
      const { error: cErr } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", user.id);
      if (cErr) throw cErr;

      const remaining = (await loadConversations()) || [];
      const nextId = remaining[0]?.id ?? null;

      if (activeConversationId === conversationId) {
        setActiveConversationId(nextId);
        setMessages([]);
      }

      if (!nextId) {
        await newConversation();
      }
    },
    [activeConversationId, loadConversations, newConversation, user],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeConversationId) return;
      setIsLoading(true);
      try {
        const isFirstUserMessageInConversation = messages.length === 0;
        const shouldAutoTitle =
          isFirstUserMessageInConversation &&
          (!!activeConversation && (activeConversation.title || "").trim() === "Nova conversa");

        // 1) salva mensagem do usuário
        const { data: uMsg, error: uErr } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: "user",
            content,
          })
          .select("id, role, content, created_at")
          .single();
        if (uErr) throw uErr;

        setMessages((prev) => [
          ...prev,
          {
            id: (uMsg as any).id,
            role: "user",
            content: (uMsg as any).content,
            timestamp: new Date((uMsg as any).created_at),
          },
        ]);

        // 1.1) define título da conversa com base na 1ª pergunta
        if (shouldAutoTitle) {
          const title = deriveConversationTitle(content);
          const { error: tErr } = await supabase
            .from("conversations")
            .update({ title })
            .eq("id", activeConversationId)
            .eq("user_id", user.id);
          if (!tErr) {
            await loadConversations();
          }
        }

        // 2) Consulta a IA com base nos documentos
        const aiResponse = await queryAI(content, activeConversationId);
        const sources: DocumentSource[] = aiResponse.sources.map((s) => ({
          documentId: s.documentId,
          documentName: s.documentName,
        }));
        const sections = parseResponseToSections(aiResponse.answer, sources);

        const { data: aMsg, error: aErr } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: "assistant",
            content: aiResponse.answer,
          })
          .select("id, role, content, created_at")
          .single();
        if (aErr) throw aErr;

        setMessages((prev) => [
          ...prev,
          {
            id: (aMsg as any).id,
            role: "assistant",
            content: aiResponse.answer,
            timestamp: new Date((aMsg as any).created_at),
            sections,
            sources,
          },
        ]);

        await loadConversations();
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversation, activeConversationId, loadConversations, messages.length, user],
  );

  return {
    conversations: sortedConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isLoading,
    sendMessage,
    newConversation,
    renameConversation,
    deleteConversation,
    refreshConversations: loadConversations,
  };
}
