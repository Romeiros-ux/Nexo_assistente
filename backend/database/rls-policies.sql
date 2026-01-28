-- ==================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA POR LINHA
-- ==================================================

-- IMPORTANTE: RLS no Supabase garante que os dados sejam filtrados
-- automaticamente no nível do banco de dados, independente do frontend.
-- Isso impede que requisições maliciosas ou bugs no código exponham
-- dados de outras unidades.

-- Habilita RLS nas tabelas principais
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- POLÍTICAS RLS - USERS
-- ==================================================

-- Política: TI pode ver todos os usuários
CREATE POLICY "ti_select_all_users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'active'
    )
  );

-- Política: Usuários podem ver seu próprio registro
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Política: TI pode criar usuários
CREATE POLICY "ti_insert_users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'active'
    )
  );

-- Política: TI pode atualizar usuários
CREATE POLICY "ti_update_users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'active'
    )
  );

-- Política: Usuários podem atualizar seu próprio registro (exceto role)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Política: TI pode deletar usuários
CREATE POLICY "ti_delete_users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'active'
    )
  );

-- ==================================================
-- POLÍTICAS RLS - EDUCATIONAL_UNITS
-- ==================================================

-- Política: TI e Secretaria de Educação podem ver todas as unidades
CREATE POLICY "ti_secretaria_select_all_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'Secretaria de Educação')
      AND users.status = 'active'
    )
  );

-- Política: Comissão pode ver todas as unidades (read-only)
CREATE POLICY "comissao_select_all_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Comissão'
      AND users.status = 'active'
    )
  );

-- Política: Diretor e Coordenação veem apenas unidades vinculadas
CREATE POLICY "diretor_coordenacao_select_own_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN user_units ON users.id = user_units.user_id
      WHERE users.id = auth.uid()
      AND users.role IN ('Diretor', 'Coordenação')
      AND users.status = 'active'
      AND user_units.unit_id = educational_units.id
    )
  );

-- Política: TI pode criar unidades
CREATE POLICY "ti_insert_units" ON educational_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- Política: TI pode atualizar unidades
CREATE POLICY "ti_update_units" ON educational_units
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- Política: TI pode deletar unidades
CREATE POLICY "ti_delete_units" ON educational_units
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- ==================================================
-- POLÍTICAS RLS - USER_UNITS (Vínculos)
-- ==================================================

-- Política: TI pode ver todos os vínculos
CREATE POLICY "ti_select_all_user_units" ON user_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- Política: Usuários podem ver seus próprios vínculos
CREATE POLICY "users_select_own_units" ON user_units
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: TI pode criar vínculos
CREATE POLICY "ti_insert_user_units" ON user_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- Política: TI pode deletar vínculos
CREATE POLICY "ti_delete_user_units" ON user_units
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'active'
    )
  );

-- ==================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ==================================================

-- Função: Verifica se usuário tem acesso global
CREATE OR REPLACE FUNCTION has_global_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role IN ('TI', 'Secretaria de Educação')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Retorna IDs das unidades que o usuário pode acessar
CREATE OR REPLACE FUNCTION get_accessible_unit_ids(user_id UUID)
RETURNS TABLE(unit_id UUID) AS $$
BEGIN
  -- Se tem acesso global, retorna todas as unidades ativas
  IF has_global_access(user_id) THEN
    RETURN QUERY
    SELECT eu.id
    FROM educational_units eu
    WHERE eu.status = 'active';
  -- Caso contrário, retorna apenas unidades vinculadas
  ELSE
    RETURN QUERY
    SELECT uu.unit_id
    FROM user_units uu
    WHERE uu.user_id = get_accessible_unit_ids.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Valida se usuário pode acessar uma unidade específica
CREATE OR REPLACE FUNCTION can_access_unit(user_id UUID, unit_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- TI e Secretaria têm acesso a tudo
  IF has_global_access(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verifica se há vínculo
  RETURN EXISTS (
    SELECT 1 FROM user_units uu
    WHERE uu.user_id = can_access_unit.user_id
    AND uu.unit_id = can_access_unit.unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ==================================================

COMMENT ON FUNCTION has_global_access IS 'Verifica se usuário tem acesso global (TI ou Secretaria)';
COMMENT ON FUNCTION get_accessible_unit_ids IS 'Retorna IDs das unidades que o usuário pode acessar';
COMMENT ON FUNCTION can_access_unit IS 'Valida se usuário pode acessar uma unidade específica';

-- ==================================================
-- INSTRUÇÕES DE APLICAÇÃO
-- ==================================================

-- Para aplicar essas políticas RLS no Supabase:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Execute este script completo
-- 4. Verifique em "Database" > "Policies" se as políticas foram criadas
-- 5. Teste com diferentes perfis de usuário

-- IMPORTANTE: RLS garante segurança no nível do banco de dados.
-- Mesmo que o frontend seja comprometido, os dados permanecem protegidos.

-- ==================================================
-- FIM DAS POLÍTICAS RLS
-- ==================================================
