# Política de Privacidade — Argila

**Versão:** 1.0  
**Última atualização:** [DATA DE PUBLICAÇÃO]  
**Controlador:** [RAZÃO SOCIAL], CNPJ [CNPJ], sede em [ENDEREÇO COMPLETO]  
**Encarregado (DPO):** [NOME DO DPO] — [dpo@argila.app]

Esta Política descreve como a Argila coleta, utiliza, compartilha, armazena e protege dados pessoais, em conformidade com a **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei 13.709/2018)**, o **Marco Civil da Internet (Lei 12.965/2014)** e o **Código de Defesa do Consumidor (Lei 8.078/1990)**.

Ao usar a Plataforma, você confirma ter lido e compreendido esta Política. Alguns tratamentos descritos aqui dependem ainda de consentimento explícito ou de outras bases legais, detalhadas abaixo.

---

## 1. Quem somos

A Argila é um serviço de software como serviço (SaaS) operado pela entidade responsável identificada no topo deste documento.

## 2. Papéis no tratamento de dados

A Argila atua em dois papéis distintos, dependendo do tipo de dado tratado:

### 2.1. Controladora

A Argila é **controladora** dos dados pessoais do **Professor** — nome, e-mail, credenciais, dados de cobrança, dados de navegação, dias ativos — e define as finalidades e os meios desse tratamento.

### 2.2. Operadora

A Argila é **operadora** dos dados pessoais dos **Alunos** inseridos pelo Professor. Nesse caso:

- o **Professor é o controlador** dos dados dos Alunos, pois é quem decide inserir essas informações e define a finalidade pedagógica do tratamento;
- a Argila trata esses dados **por conta e ordem do Professor**, exclusivamente para executar as funcionalidades contratadas;
- cabe ao Professor obter e documentar a base legal adequada para tratamento dos dados dos Alunos, observando os arts. 7º, 11 e 14 da LGPD, incluindo o consentimento específico do responsável legal nos casos de Alunos menores de idade.

## 3. Dados coletados

### 3.1. Dados do Professor

Coletados no cadastro, no uso da Plataforma e no checkout:

- **Identificação:** nome completo, e-mail.
- **Autenticação:** senha (armazenada como hash com salting) ou identificador de conta Google (OAuth).
- **Cobrança:** identificador de cliente no Asaas, nome, país, UF, histórico de cobranças, método de pagamento utilizado (PIX ou cartão), status de inadimplência. **Dados de cartão de crédito e dados bancários para PIX não são armazenados pela Argila**, permanecendo sob custódia do Asaas.
- **Uso da Plataforma:** dias de acesso ("dias ativos"), eventos do funil de checkout, ações administrativas na conta.
- **Técnicos:** endereço IP, tipo de navegador e dispositivo, idioma, identificadores de sessão.
- **Aceite legal:** versão dos Termos e da Política aceita, data e hora do aceite.

### 3.2. Dados dos Alunos

Inseridos pelo Professor conforme sua necessidade pedagógica:

- nome do Aluno e turma (opcional);
- diários de aula e conteúdo trabalhado;
- pontuações de compreensão, atenção e engajamento atribuídas pelo Professor;
- observações textuais do Professor;
- arquivos anexados a diários (PDF, imagens, áudio ou vídeo), limitados a 10 MB por arquivo;
- dados derivados calculados pela Plataforma (tendência de atenção, pontuação agregada).

A Argila **não solicita** dados sensíveis dos Alunos (saúde, religião, origem racial, orientação sexual, dados genéticos ou biométricos). O Professor deve evitar inseri-los e, se absolutamente necessários à atividade pedagógica, somente com base legal adequada e consentimento específico do titular ou responsável.

### 3.3. Dados gerados por IA

A partir do Conteúdo do Professor, modelos de IA de terceiros geram:

- classificação do tipo de aula (teórica, prática, mista);
- pontuações sugeridas;
- indicadores de atenção;
- Relatórios textuais sobre progressão dos Alunos.

Esses dados derivados ficam associados aos Alunos correspondentes e seguem a mesma política de tratamento.

## 4. Finalidades e bases legais (art. 7º da LGPD)

| Finalidade | Dados envolvidos | Base legal |
|---|---|---|
| Criar e manter a conta do Professor | Dados do Professor | Execução de contrato (art. 7º, V) |
| Processar cobranças e assinaturas | Identificação e cobrança | Execução de contrato (V) e cumprimento de obrigação legal/regulatória (II) |
| Prestar funcionalidades pedagógicas (diários, perfis, Relatórios) | Professor e Alunos | Execução do contrato com a Argila (V); legítimo interesse do Professor-controlador (IX) |
| Gerar Relatórios e indicadores por IA | Conteúdo do Professor | Execução de contrato (V); operação por conta do Professor-controlador |
| Autenticar e proteger a conta | Autenticação, IP, sessão | Legítimo interesse em segurança (IX) |
| Medir uso e melhorar o produto | Dias ativos, funil, dados agregados | Legítimo interesse em melhoria (IX) |
| Comunicações transacionais | E-mail do Professor | Execução de contrato (V) |
| Comunicações de marketing | E-mail do Professor | Consentimento (I), revogável a qualquer tempo |
| Cumprir obrigações legais, fiscais e atender autoridades | Dados relacionados | Obrigação legal (II) |
| Defender direitos em processo administrativo ou judicial | Dados relacionados | Exercício regular de direitos (VI) |

## 5. Compartilhamento com terceiros

A Argila compartilha dados com os operadores abaixo, exclusivamente na medida necessária à prestação do serviço:

| Parceiro | Finalidade | Dados compartilhados | País |
|---|---|---|---|
| **Supabase** | Banco de dados, storage de arquivos, autenticação | Dados armazenados na Plataforma | EUA (AWS) |
| **Vercel** | Hospedagem e execução de código | Dados em trânsito durante as requisições | EUA |
| **Anthropic** | Processamento por IA | Trechos do Conteúdo do Professor e dos Alunos necessários à geração da resposta | EUA |
| **Asaas** | Processamento de pagamentos | Identificação e cobrança do Professor | Brasil |
| **Google** | Autenticação OAuth (opcional) | Identificador da conta Google e e-mail | EUA |
| **Autoridades públicas** | Cumprimento de ordem judicial ou obrigação legal | Dados solicitados | Brasil |

A Argila **não vende** dados pessoais e **não compartilha** dados com terceiros para fins de marketing próprio desses terceiros.

## 6. Transferência internacional de dados (art. 33 da LGPD)

Parte dos operadores está sediada fora do Brasil, especialmente nos Estados Unidos. A transferência internacional segue as hipóteses autorizadas pelo art. 33 da LGPD, com base em:

- execução de contrato com o Professor (art. 33, II);
- cláusulas contratuais específicas firmadas com os operadores estrangeiros, exigindo padrão de proteção equivalente ao da LGPD;
- compromissos dos provedores de IA de não utilizar os dados para treinamento de seus modelos de base.

## 7. Crianças e adolescentes (art. 14 da LGPD)

7.1. A Argila **não é dirigida diretamente** a crianças e adolescentes: a conta é criada por um Professor maior de idade.

7.2. Os Alunos, contudo, podem ser menores de idade. Nesses casos, a base legal do tratamento é de responsabilidade do **Professor-controlador**, que deverá obter o **consentimento específico e em destaque** de pelo menos um dos pais ou responsável legal, nos termos do art. 14, §1º da LGPD, ou atuar com outra base legal aplicável previstas em lei.

7.3. A Argila não direciona publicidade a crianças e não coleta dados em excesso além do estritamente pedagógico.

7.4. O responsável legal pelo Aluno menor pode, a qualquer tempo, solicitar ao Professor a revogação do consentimento, a correção ou a exclusão dos dados. A Argila apoia tecnicamente o Professor para atender a essa solicitação quando necessário.

## 8. Retenção e descarte

8.1. Dados do Professor e dos Alunos são retidos enquanto a conta estiver ativa.

8.2. **Rebaixamento para Explorar (downgrade):** ao fim efetivo da assinatura cancelada, os Relatórios e Turmas do plano Professor são excluídos permanentemente após **90 (noventa) dias** de retenção. Durante esse prazo, a reassinatura preserva o acesso.

8.3. **Exclusão de conta:** a solicitação de exclusão inicia janela de retenção de **90 (noventa) dias**, ao fim da qual a conta e os dados associados são excluídos de forma irreversível dos sistemas da Argila.

8.4. **Retenção legal:** alguns dados podem ser mantidos por prazos específicos para cumprimento de obrigações legais, como:

- registros de acesso a aplicações: **6 (seis) meses**, conforme art. 15 do Marco Civil da Internet;
- documentos fiscais e de cobrança: **5 (cinco) anos**, conforme legislação tributária aplicável;
- dados necessários à defesa em processo judicial ou administrativo: até o trânsito em julgado da demanda.

8.5. Após esses prazos, os dados são efetivamente eliminados ou anonimizados.

## 9. Direitos do titular (art. 18 da LGPD)

Os titulares (Professores e Alunos) podem, a qualquer tempo:

- **confirmar** a existência de tratamento;
- **acessar** os dados tratados;
- **corrigir** dados incompletos, inexatos ou desatualizados;
- **anonimizar, bloquear ou eliminar** dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;
- solicitar **portabilidade** a outro fornecedor;
- **eliminar** dados tratados com base no consentimento, ressalvadas as hipóteses do art. 16 da LGPD;
- obter **informação sobre entidades** com as quais os dados foram compartilhados;
- obter informação sobre a **possibilidade de não fornecer consentimento** e suas consequências;
- **revogar consentimento** quando essa for a base legal do tratamento.

### Como exercer os direitos

- **Professor:** pode exercer a maior parte dos direitos diretamente pela Plataforma (editar perfil, excluir conta, cancelar assinatura) ou pelo canal `dpo@argila.app`.
- **Aluno ou responsável legal:** deve, em regra, dirigir-se ao Professor-controlador que o cadastrou. A Argila, como operadora, apoia a resposta quando tecnicamente necessário, ou responde diretamente em hipóteses em que a legislação exigir.

Solicitações serão respondidas em até **15 (quinze) dias**, nos termos do art. 19 da LGPD.

## 10. Segurança da informação (art. 46 da LGPD)

A Argila adota medidas técnicas e administrativas razoáveis para proteger os dados, incluindo:

- conexão criptografada (TLS/HTTPS) em todas as comunicações;
- segregação de acesso por linha de dados por Professor (row-level security) no banco;
- armazenamento de senhas por meio de hashes com salting;
- buckets privados com URLs assinadas de expiração curta para arquivos;
- registros de auditoria em funções sensíveis;
- contratação de operadores com postura reconhecida de segurança.

Nenhum sistema é 100% seguro. Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a Argila comunicará a ANPD e os titulares afetados em prazo razoável, nos termos do art. 48 da LGPD.

## 11. Cookies e tecnologias similares

A Plataforma utiliza cookies e tecnologias equivalentes para:

- manter a sessão autenticada (cookies estritamente necessários);
- lembrar preferências do Professor;
- medir uso agregado (analytics de primeira parte, sem fingerprinting ou rastreamento cruzado).

A Argila **não utiliza** cookies de publicidade de terceiros no MVP. A configuração pode ser ajustada nas preferências do navegador; a recusa de cookies estritamente necessários pode inviabilizar o uso da Plataforma.

## 12. Comunicações

- **Transacionais:** sempre enviadas (confirmações de pagamento, avisos de inadimplência, atualizações relevantes dos Termos ou desta Política).
- **Marketing:** opcionais, enviadas somente com consentimento prévio; podem ser revogadas a qualquer tempo pelo link de descadastro nos e-mails ou pelo `dpo@argila.app`.

## 13. Alterações desta Política

A Argila pode atualizar esta Política periodicamente. Mudanças relevantes são comunicadas por e-mail ou aviso na Plataforma com antecedência razoável. A versão vigente é sempre identificada pelo número de versão e pela data no topo deste documento.

## 14. Contato e encarregado (DPO)

- **Encarregado:** [NOME DO DPO]
- **E-mail:** [dpo@argila.app]
- **Endereço:** [ENDEREÇO COMPLETO]

Você também pode registrar reclamações diretamente à **Autoridade Nacional de Proteção de Dados (ANPD)** — [www.gov.br/anpd](https://www.gov.br/anpd).

---

## Histórico de versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | [DATA] | Versão inicial (MVP) |
