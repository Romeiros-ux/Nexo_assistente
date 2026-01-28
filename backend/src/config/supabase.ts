/**
 * Configuração do Cliente Supabase
 * 
 * Cria e configura a instância do cliente Supabase para interação com o banco de dados.
 * Este arquivo centraliza toda a configuração relacionada ao Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Interface para definir o tipo do database do Supabase
 * Baseada no schema.sql do projeto
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password: string;
          role: 'TI' | 'Comissão' | 'Diretor' | 'Coordenação' | 'Secretaria de Educação';
          status: 'active' | 'inactive' | 'suspended';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password: string;
          role: 'TI' | 'Comissão' | 'Diretor' | 'Coordenação' | 'Secretaria de Educação';
          status?: 'active' | 'inactive' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password?: string;
          role?: 'TI' | 'Comissão' | 'Diretor' | 'Coordenação' | 'Secretaria de Educação';
          status?: 'active' | 'inactive' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
      };
      educational_units: {
        Row: {
          id: string;
          name: string;
          type: 'school' | 'center' | 'department';
          code: string | null;
          address: string | null;
          phone: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'school' | 'center' | 'department';
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'school' | 'center' | 'department';
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_units: {
        Row: {
          id: string;
          user_id: string;
          unit_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unit_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

/**
 * Cliente Supabase com chave anônima
 * Usado para operações que respeitam Row Level Security (RLS)
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Não persistir sessão no servidor
      autoRefreshToken: false, // Não atualizar token automaticamente
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'edu-ia-assistente',
      },
    },
  }
);

/**
 * Cliente Supabase com service role key
 * Usado para operações administrativas que ignoram RLS
 * ⚠️ USE COM CUIDADO - Bypassa todas as regras de segurança
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'edu-ia-assistente',
        'x-client-info': 'supabase-js-node',
      },
    },
  }
);

/**
 * Testa a conexão com o Supabase
 * Útil para health checks e inicialização
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // Tenta fazer uma query simples na tabela users (que sabemos que existe)
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    // Se não houver erro, a conexão está ok
    if (error) {
      console.error('Erro na query de teste:', error.message);
      // Mesmo com erro na query, se não for erro de conexão, consideramos ok
      return !error.message.includes('connection');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao testar conexão com Supabase:', error);
    return false;
  }
}

/**
 * Obtém informações sobre o banco de dados
 * Útil para debugging e monitoramento
 */
export async function getDatabaseInfo() {
  try {
    const { data, error } = await supabaseAdmin.rpc('version' as any);
    
    if (error) {
      return {
        connected: false,
        error: error.message,
      };
    }

    return {
      connected: true,
      url: env.SUPABASE_URL,
      version: data,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
