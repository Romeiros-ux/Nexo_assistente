import { Header } from "@/components/Header";
import { ChatArea } from "@/components/ChatArea";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useChatHistory } from "@/hooks/useChatHistory";

const Index = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isLoading,
    sendMessage,
    newConversation,
    renameConversation,
    deleteConversation,
  } = useChatHistory();

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
          onNew={newConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />

        <SidebarInset>
          <div className="min-h-[100dvh] bg-background flex flex-col">
            <Header showSidebarTrigger />

            <main className="flex-1 min-h-0 container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col">
              <div className="flex-1 min-h-0">
                <ChatArea
                  messages={messages}
                  onSendMessage={sendMessage}
                  onNewConversation={newConversation}
                  isLoading={isLoading}
                  selectedDocumentCount={1}
                />
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
