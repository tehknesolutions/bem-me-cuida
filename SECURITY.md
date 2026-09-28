# Política de segurança — BemMeCuida

## Classificação dos dados

Todo conteúdo relacionado a humor, diário, medicamentos, tratamentos, substâncias, crises e contatos de apoio deve ser tratado como dado sensível.

## Regras obrigatórias

1. Nenhum texto emocional pode ser enviado a logs, analytics, crash reports ou ferramentas de sessão.
2. Nenhuma chave `service_role` pode existir no aplicativo, no bundle ou no repositório.
3. Toda tabela exposta ao cliente deve possuir Row Level Security habilitada e testada.
4. O banco local deve usar SQLCipher em builds distribuídos.
5. A chave do banco local deve permanecer no SecureStore/Keychain/Keystore.
6. Notificações devem usar conteúdo discreto por padrão.
7. Exportações exigem ação explícita e confirmação do usuário.
8. A tela de crise precisa funcionar sem autenticação e sem conexão.
9. A IA, quando adicionada, não pode diagnosticar nem orientar alteração medicamentosa.
10. Capturas de tela de testes nunca devem conter dados reais de usuários.
11. O app switcher deve ocultar conteúdo sensível; no Android, a captura permanece bloqueada por padrão.
12. Falhas de sincronização podem registrar apenas códigos sanitizados, nunca payloads ou textos do usuário.
13. Alterações remotas devem validar conta e versão antes de sobrescrever o registro existente.
14. Relatórios de diagnóstico podem conter somente estados técnicos; nome, e-mail, IDs, tokens e conteúdo emocional são proibidos.
15. Credenciais de contas E2E devem ser fornecidas por ambiente e nunca versionadas nos fluxos Maestro.

## Relato de vulnerabilidade

Não abra issues públicas com informações sensíveis. Encaminhe o relato diretamente à Tehkné Solutions pelo canal interno definido para segurança.


Planos de apoio e contatos de confiança são dados sensíveis. O app não deve inferir risco, registrar o conteúdo em logs nem substituir serviços de emergência.
