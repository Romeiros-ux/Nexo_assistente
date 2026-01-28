/**
 * Teste: Verifica se metadata aparece no prompt gerado
 */
import { buildChatPrompt, ChatContext } from '../src/prompts/master.prompt';

const testContext: ChatContext = {
  user_profile: 'TI',
  query: 'Qual o IDEB de 2023?',
  chunks: [
    {
      content: 'O IDEB dos Anos Iniciais em 2023 foi 5.2',
      source: {
        document_name: 'ideb_2023_AI.xlsx',
        document_type: 'REPORT'
      },
      similarity: 0.85,
      metadata: {
        year: 2023,
        education_stage: 'AI',
        subdomain: 'IDEB'
      }
    },
    {
      content: 'O IDEB dos Anos Finais em 2023 foi 4.8',
      source: {
        document_name: 'ideb_2023_AF.xlsx',
        document_type: 'REPORT'
      },
      similarity: 0.82,
      metadata: {
        year: 2023,
        education_stage: 'AF',
        subdomain: 'IDEB'
      }
    }
  ]
};

console.log('🧪 TESTE: Metadata Enriquecida no Prompt\n');
console.log('='.repeat(80));

const prompt = buildChatPrompt(testContext);

console.log(prompt);
console.log('\n' + '='.repeat(80));

// Validações
const checks = [
  { label: '📅 Ano visível', test: prompt.includes('Ano: 2023') },
  { label: '🎓 Etapa AI visível', test: prompt.includes('Anos Iniciais') },
  { label: '🎓 Etapa AF visível', test: prompt.includes('Anos Finais') },
  { label: '📊 Categoria visível', test: prompt.includes('IDEB') },
];

console.log('\n✅ VALIDAÇÕES:\n');
checks.forEach(check => {
  const icon = check.test ? '✅' : '❌';
  console.log(`${icon} ${check.label}`);
});

const allPassed = checks.every(c => c.test);
console.log('\n' + '='.repeat(80));
console.log(allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM!');

process.exit(allPassed ? 0 : 1);
