// src/utils/errorHandler.ts

/**
 * Traduz erros técnicos (Supabase, Fetch, JS) para mensagens amigáveis em português,
 * e obrigatoriamente loga o erro bruto no console para depuração técnica do desenvolvedor.
 * 
 * @param error O objeto de erro bruto capturado no catch
 * @param context Um contexto amigável do que estava tentando ser feito (Ex: "ao salvar o vídeo")
 * @returns Uma string amigável para ser exibida num Toast para o usuário final.
 */
export function getFriendlyErrorMessage(error: unknown, context: string = "na operação"): string {
  // 1. Extração segura da mensagem técnica do erro
  let technicalMsg = "";
  if (error instanceof Error) {
    technicalMsg = error.message;
  } else if (typeof error === "string") {
    technicalMsg = error;
  } else if (error && typeof error === "object" && (error as any).message) {
    technicalMsg = (error as any).message;
  } else {
    technicalMsg = JSON.stringify(error) || "Erro misterioso detectado.";
  }

  // 2. Sempre logar o erro técnico real no console, de forma MUITO visível, para o desenvolvedor ver
  console.error(`\n❌ ====== [AVISO TÉCNICO] ====== ❌`);
  console.error(`Contexto: Falha ${context}`);
  console.error(`Mensagem de Erro Real:\n`, technicalMsg);
  if (error instanceof Error && error.stack) {
    console.error(`Stack Trace:\n`, error.stack);
  } else if (!(error instanceof Error) && typeof error === "object") {
    console.error(`Objeto Bruto:\n`, JSON.stringify(error, null, 2));
  }
  console.error(`======================================\n`);

  const msgLower = technicalMsg.toLowerCase();

  // 3. Dicionário de Tradução Amigável (De técnico para Português Polido)
  
  // A. Erros de Rede e Internet
  if (msgLower.includes("failed to fetch") || msgLower.includes("network_error") || msgLower.includes("network request failed")) {
    return `Sua conexão com a internet caiu ou está instável ${context}. Verifique sua rede e tente novamente.`;
  }
  
  // B. Erros de Banco de Dados (Supabase/PostgreSQL)
  if (msgLower.includes("duplicate key value violates unique constraint") || msgLower.includes("23505")) {
    return `Esse registro ou item já existe no banco de dados. Você tentou criar uma duplicata ${context}.`;
  }
  if (msgLower.includes("row-level security") || msgLower.includes("rls") || msgLower.includes("violates row-level security policy") || msgLower.includes("42501")) {
    return `Detectamos que você não tem permissão para modificar ou visualizar esse dado ${context}. Seu login expirou ou você não é o dono dessa conta.`;
  }
  if (msgLower.includes("jwt expired") || msgLower.includes("jwt attempt") || msgLower.includes("not authenticated")) {
    return `Sua sessão de segurança expirou. Por favor, atualize a página ou faça login novamente ${context}.`;
  }
  if (msgLower.includes("violates foreign key constraint") || msgLower.includes("23503")) {
    return `Tentativa de salvar informação que depende de outro dado que não existe mais ${context}.`;
  }
  
  // C. Erros de Limite de Inteligência Artificial (OpenRouter/AI33/Outros)
  if (msgLower.includes("429") || msgLower.includes("rate limit") || msgLower.includes("quota exceeded") || msgLower.includes("insufficient quota")) {
    return `Cota global de acesso gratuito da Inteligência Artificial estourada (Erro 429) ${context}. A requisição foi bloqueada pela provedora externa (Adicione saldo ou tente depois).`;
  }
  if (msgLower.includes("401") && (msgLower.includes("ai") || msgLower.includes("provider"))) {
    return `As chaves de acesso (API Keys) da Inteligência Artificial foram revogadas ou estão sem créditos no painel (Erro 401) ${context}.`;
  }

  // D. Erro de Edge Function Gateway (Erro 500/502)
  if (msgLower.includes("500") || msgLower.includes("edge function returned a non-2xx status code")) {
    return `O nosso servidor central teve um colapso repentino ${context}. Nossa equipe técnica já foi notificada.`;
  }

  // E. Fallback caso a string técnica seja pequena o suficiente para o usuário ou de nossa autoria
  if (technicalMsg.length < 150 && !technicalMsg.includes("{") && !technicalMsg.includes("uuid")) {
    // É um de nossos erros Customizados (ex: "Sem cenas", "API key not found")
    return `Erro ${context}: ${technicalMsg}`;
  }

  // F. Pior dos casos (Erro gigante JSON cuspido na tela)
  return `Ocorreu uma falha técnica interna complexa ${context}. O diagnóstico já foi enviado para os programadores no console. Tente mais tarde.`;
}
