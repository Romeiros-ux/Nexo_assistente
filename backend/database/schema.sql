-- ==================================================
-- SCHEMA DO BANCO DE DADOS - ASSISTENTE INSTITUCIONAL
-- ==================================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('TI', 'Comissão', 'Diretor', 'Coordenação', 'Secretaria de Educação')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Remove trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- SEED INICIAL
-- ==================================================

-- Usuário admin inicial
-- Senha: Admin@123 (hash bcrypt)
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Administrador',
  'admin@teste.com',
  '$2b$10$X3ZqD6Z7k9K8yJ4qT1wLJ.v7Z0P5MQR3H5K9J8qL7K6yZ5P4MQR3H',
  'TI',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Comentário: A senha será atualizada no primeiro login via API
-- Para gerar o hash correto, use o endpoint POST /users com a senha desejada

-- ==================================================
-- UNIDADES EDUCACIONAIS E VÍNCULOS
-- ==================================================

-- Tabela de Unidades Educacionais
CREATE TABLE IF NOT EXISTS educational_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('school', 'center', 'department')),
  code VARCHAR(50) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Relacionamento Usuário x Unidade (muitos para muitos)
CREATE TABLE IF NOT EXISTS user_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES educational_units(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_educational_units_type ON educational_units(type);
CREATE INDEX IF NOT EXISTS idx_educational_units_status ON educational_units(status);
CREATE INDEX IF NOT EXISTS idx_educational_units_code ON educational_units(code);
CREATE INDEX IF NOT EXISTS idx_user_units_user_id ON user_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_units_unit_id ON user_units(unit_id);

-- Trigger para atualizar updated_at em educational_units
DROP TRIGGER IF EXISTS update_educational_units_updated_at ON educational_units;

CREATE TRIGGER update_educational_units_updated_at 
  BEFORE UPDATE ON educational_units 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- SEED - UNIDADES EDUCACIONAIS
-- ==================================================

-- Unidades educacionais de exemplo
INSERT INTO educational_units (name, type, code, address, status)
VALUES 
  ('Escola Municipal João Silva', 'school', 'EM001', 'Rua das Flores, 123', 'active'),
  ('Centro de Educação Infantil Maria Santos', 'center', 'CEI001', 'Av. Principal, 456', 'active'),
  ('Secretaria Municipal de Educação', 'department', 'SME001', 'Praça Central, 1', 'active')
ON CONFLICT (code) DO NOTHING;

-- Vincula o admin a todas as unidades (exemplo)
-- Na prática, o TI não precisa de vínculo pois tem acesso a tudo
-- Mas pode ser útil para relatórios
INSERT INTO user_units (user_id, unit_id)
SELECT u.id, eu.id
FROM users u
CROSS JOIN educational_units eu
WHERE u.email = 'admin@teste.com'
ON CONFLICT (user_id, unit_id) DO NOTHING;
