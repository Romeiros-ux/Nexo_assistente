/**
 * Ponto de Entrada da Aplicação
 * 
 * Inicializa o servidor HTTP e gerencia o lifecycle da aplicação.
 * Este arquivo é responsável por:
 * - Iniciar o servidor Express
 * - Gerenciar graceful shutdown
 * - Tratamento de erros não capturados
 */

import { createApp } from './app';
import { env } from './config/env';
import { testSupabaseConnection } from './config/supabase';
import { startProcessor } from './queues/indexing.processor';

/**
 * Inicializa o servidor
 */
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...\n');

    // Valida conexão com o Supabase
    console.log('📡 Testando conexão com Supabase...');
    const isConnected = await testSupabaseConnection();
    
    if (isConnected) {
      console.log('✅ Conexão com Supabase estabelecida\n');
    } else {
      console.warn('⚠️  Aviso: Não foi possível verificar conexão com Supabase');
      console.warn('   A API iniciará, mas pode haver problemas de conectividade\n');
    }

    // Cria a aplicação Express
    console.log('📦 Criando aplicação Express...');
    const app = createApp();
    console.log('✅ Aplicação Express criada\n');

    // Inicia o processador de jobs de indexação em background
    console.log('🔄 Iniciando processador de background jobs...');
    startProcessor();
    console.log('✅ Processador de jobs iniciado\n');

    // Inicia o servidor na porta configurada
    // Em produção (Render), escuta em 0.0.0.0 para aceitar conexões externas
    // Em desenvolvimento, escuta em 127.0.0.1 (localhost apenas)
    const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    console.log(`🔌 Tentando ouvir na porta ${env.PORT} (host: ${host})...`);
    const server = app.listen(env.PORT, host, () => {
      const address = server.address();
      console.log('='.repeat(50));
      console.log(`✅ Servidor rodando no ambiente: ${env.NODE_ENV}`);
      console.log(`✅ Endereço: ${JSON.stringify(address)}`);
      console.log(`✅ Porta: ${env.PORT}`);
      console.log(`✅ URL: http://${host}:${env.PORT}`);
      console.log(`✅ API: http://${host}:${env.PORT}${env.API_PREFIX}`);
      console.log(`✅ Health Check: http://${host}:${env.PORT}/health`);
      console.log('='.repeat(50));
      console.log('\n📝 Logs de requisições:\n');
    });

    // Log de erro se o servidor não conseguir iniciar
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ ERRO: Porta ${env.PORT} já está em uso!`);
        console.error('   Mate o processo ou use outra porta.');
        process.exit(1);
      } else {
        console.error('❌ ERRO ao iniciar servidor:', error);
        process.exit(1);
      }
    });

    // ==========================================
    // GRACEFUL SHUTDOWN
    // ==========================================

    /**
     * Gerencia o desligamento gracioso da aplicação
     * Garante que todas as conexões sejam fechadas adequadamente
     */
    const gracefulShutdown = (signal: string) => {
      console.log(`\n⚠️  Sinal ${signal} recebido, encerrando servidor...`);

      server.close(() => {
        console.log('✅ Servidor encerrado com sucesso');
        
        // Aqui você pode fechar outras conexões (Redis, MongoDB, etc.)
        // await closeOtherConnections();
        
        process.exit(0);
      });

      // Força o encerramento após 10 segundos
      setTimeout(() => {
        console.error('❌ Forçando encerramento após timeout');
        process.exit(1);
      }, 10000);
    };

    // Escuta sinais de término
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ==========================================
    // TRATAMENTO DE ERROS NÃO CAPTURADOS
    // ==========================================

    /**
     * Captura erros não tratados em promises
     */
    process.on('unhandledRejection', (reason: Error) => {
      console.error('❌ Unhandled Rejection:', reason);
      // Em produção, você pode querer notificar um serviço de monitoramento
      // e fazer shutdown gracioso
    });

    /**
     * Captura exceções não tratadas
     */
    process.on('uncaughtException', (error: Error) => {
      console.error('❌ Uncaught Exception:', error);
      // Exceções não capturadas são críticas - devemos encerrar
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Inicia o servidor
startServer();
