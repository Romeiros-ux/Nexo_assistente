-- =============================================
-- CONVERSATIONS TABLES
-- =============================================

-- Tabela principal de conversações
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Auto-gerado da primeira pergunta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Mensagens da conversação (histórico)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB, -- chunks usados, tokens, custo, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at);

-- RLS (Row Level Security) - usuário só vê suas conversas
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê apenas suas conversas
CREATE POLICY conversations_user_policy ON conversations
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Usuário vê apenas mensagens de suas conversas
CREATE POLICY messages_user_policy ON conversation_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- COMENTÁRIOS (DOCUMENTAÇÃO)
-- =============================================

COMMENT ON TABLE conversations IS 'Conversações do chat - agrupa mensagens de uma sessão';
COMMENT ON TABLE conversation_messages IS 'Mensagens individuais (user/assistant) de cada conversação';
COMMENT ON COLUMN conversation_messages.metadata IS 'JSON com chunks usados, tokens, custo, sources, etc';
