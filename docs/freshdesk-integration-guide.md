# 🚀 Guia de Integração Freshdesk baseada em Eventos

Este guia explica como implementar uma integração robusta e escalável com o Freshdesk usando o sistema de eventos do NestJS.

## 📋 **Visão Geral da Arquitetura**

```
[Tickets Service] 
       ↓ (emite eventos)
[Event System (@nestjs/event-emitter)]
       ↓ (escuta eventos)
[Freshdesk Event Listener] 
       ↓ (chama API)
[Freshdesk Service] 
       ↓ (sincroniza)
[Freshdesk Platform]
```

## 🔧 **Configuração Inicial**

### 1. **Configuração por Empresa**

Cada empresa configura seu próprio Freshdesk através da API de integrações:

```json
{
  "domain": "https://suaempresa.freshdesk.com",
  "api_key": "sua_api_key_freshdesk_aqui",
  "auto_responses": true,
  "priority_analysis": true,
  "business_hours_check": true,
  "ai_integration": true,
  "ticket_transfer": true,
  "contact_sync": true,
  "phone": "+5511999999999"
}
```

### 2. **Obter API Key do Freshdesk**

1. Faça login no seu Freshdesk
2. Vá para **Admin → API**
3. Gere uma nova chave ou use uma existente
4. Configure através do endpoint de integrações da sua API

### 3. **Configuração Já Existente** ✅

As configurações do Freshdesk são armazenadas no campo `config` (JSON) da tabela `integrations` existente. Não é necessário criar tabelas adicionais.

## 📂 **Estrutura de Arquivos Criados**

```
src/
├── integrations/
│   └── freshdesk/
│       ├── freshdesk.service.ts           # API calls para Freshdesk
│       ├── freshdesk-event.listener.ts    # Event listeners
│       └── freshdesk.module.ts            # Módulo principal
└── events/
    └── tickets.events.ts                  # Classes de eventos (já existia)
```

## 🎯 **Como Funciona**

### **1. Fluxo de Criação de Ticket**

```typescript
// 1. Ticket é criado no sistema interno
const ticket = await this.ticketRepository.save(newTicket);

// 2. Evento é emitido
this.eventEmitter.emit('ticket.created', new TicketCreatedEvent(...));

// 3. Listener escuta e executa ações no Freshdesk
@OnEvent('ticket.created')
async handleTicketCreated(event: TicketCreatedEvent) {
  // - Busca configuração da empresa no campo config (JSON)
  // - Cria/busca contato no Freshdesk
  // - Cria ticket no Freshdesk
}
```

### **2. Eventos Disponíveis**

| Evento | Quando é Disparado | Ação no Freshdesk |
|--------|-------------------|-------------------|
| `ticket.created` | Novo ticket criado | Cria ticket e contato |
| `ticket.message.created` | Nova mensagem adicionada | Adiciona nota/resposta |
| `ticket.status.changed` | Status do ticket alterado | Atualiza status |
| `human.assistance.requested` | IA solicita ajuda humana | Marca como urgente |

## 🔗 **Implementação nos Pontos de Emissão**

### **No TicketsService - Adicionando EventEmitter**

```typescript
// 1. Adicionar import
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketCreatedEvent, ... } from '../events/tickets.events';

// 2. Injetar no construtor
constructor(
  // ... outros serviços
  private readonly eventEmitter: EventEmitter2,
) {}
```

### **Exemplo: Emitir evento quando ticket é criado**

```typescript
// Na função createNewTicket (linha ~682)
const savedTicket = await this.ticketRepository.save(newTicket);

// EMITIR EVENTO
this.eventEmitter.emit('ticket.created', new TicketCreatedEvent(
  savedTicket.id,
  buffer.customerId,
  buffer.companyId,
  buffer.customerName,
  buffer.customerPhone,
  buffer.messages.map(msg => ({ content: msg.content, type: msg.type }))
));
```

### **Exemplo: Emitir evento quando mensagem é criada**

```typescript
// Na função createNewMessage (linha ~608)
const savedMessage = await this.ticketMessageRepository.save(newTicketMessage);

this.eventEmitter.emit('ticket.message.created', new TicketMessageCreatedEvent(
  ticketId,
  ticket.companyId,
  message,
  messageType,
  senderType,
  senderName,
  ticket.freshdeskTicketId // campo adicional no ticket (se necessário)
));
```

## 🎛️ **Configurações Avançadas**

### **Mapeamento de Status**

O sistema mapeia automaticamente os status internos para o Freshdesk:

```typescript
// Status interno → Freshdesk
AI → 2 (Aberto)
IN_PROGRESS → 3 (Pendente)  
CLOSED → 5 (Fechado)
```

### **Mapeamento de Prioridades**

```typescript
// Prioridade interna → Freshdesk
LOW → 1
MEDIUM → 2
HIGH → 3
URGENT → 4
```

### **Funcionalidades Configuráveis**

| Campo | Descrição | Comportamento |
|-------|-----------|---------------|
| `auto_responses` | Respostas Automáticas | Ativa respostas automáticas baseadas em horário |
| `priority_analysis` | Análise de Prioridade | Analisa prioridade dos tickets automaticamente |
| `business_hours_check` | Horário de Funcionamento | Verifica horário antes de enviar mensagens |
| `ai_integration` | Integração com IA | Permite que a IA responda mensagens automaticamente |
| `ticket_transfer` | Transferência de Tickets | Gerencia transferência de tickets entre status |
| `contact_sync` | Sincronização de Contatos | Sincroniza contatos entre sistemas |

### **Lógica Condicional dos Eventos**

```typescript
// Exemplo: Criação de ticket com verificações condicionais
@OnEvent('ticket.created')
async handleTicketCreated(event: TicketCreatedEvent) {
  const config = await this.getFreshdeskConfig(event.companyId);
  
  // 1. Sincronização de contatos (se habilitada)
  if (config.contact_sync !== false) {
    // Busca/cria contato no Freshdesk
  }
  
  // 2. Análise de prioridade (se habilitada)
  if (config.priority_analysis) {
    // Analisa palavras-chave para definir prioridade
  }
  
  // 3. Cria ticket com configurações aplicadas
}
```

### **Campos Personalizados**

O sistema salva informações do ticket interno como campos personalizados:

```typescript
custom_fields: {
  omni_ticket_id: event.ticketId,
  omni_company_id: event.companyId,
  customer_phone: event.customerPhone,
}
```

## 🔍 **Monitoramento e Logs**

O sistema inclui logs detalhados para rastreamento:

```typescript
// Logs automáticos incluem:
- "Processando evento ticket.created para ticket X"
- "Contato criado no Freshdesk: Y"
- "Ticket criado no Freshdesk: Z"
- "Erro ao processar evento: ..."
```

## 🚦 **Próximos Passos**

### **1. Implementação Básica**
- [ ] Configurar integração Freshdesk via API (/integrations/freshdesk)
- [ ] Adicionar imports no `TicketsService`
- [ ] Implementar emissão de eventos em pontos-chave
- [ ] (Opcional) Adicionar campo `freshdeskTicketId` na entidade Ticket

### **Exemplo de Configuração Completa**

```bash
POST /integrations/freshdesk
{
  "domain": "https://minhaempresa.freshdesk.com",
  "api_key": "gAn123xyz456",
  "auto_responses": true,          // Habilita respostas automáticas
  "priority_analysis": true,       // Analisa prioridade automaticamente
  "business_hours_check": true,    // Verifica horário comercial
  "ai_integration": false,         // Desabilita mensagens da IA
  "ticket_transfer": true,         // Permite transferência de status
  "contact_sync": true,            // Sincroniza contatos
  "phone": "+5511988776655"        // Telefone de contato
}
```

**Resultado:** A empresa terá uma integração personalizada que:
- ✅ Cria tickets com prioridade inteligente
- ✅ Sincroniza contatos automaticamente  
- ✅ Respeita horário comercial para respostas
- ❌ Não processa mensagens da IA
- ✅ Sincroniza mudanças de status

### **2. Funcionalidades Avançadas**
- [ ] Webhook reverso (receber atualizações do Freshdesk)
- [ ] Retry automático em caso de falha
- [ ] Dashboard de sincronização
- [ ] Sincronização histórica de tickets

### **3. Outras Integrações**
- [ ] Zendesk (usando a mesma arquitetura)
- [ ] Intercom
- [ ] ServiceNow

## ⚡ **Vantagens desta Abordagem**

1. **Desacoplamento**: Serviços não dependem diretamente da integração
2. **Escalabilidade**: Fácil adicionar novas integrações
3. **Resilência**: Eventos podem ser reprocessados em caso de falha
4. **Auditoria**: Logs completos de todas as operações
5. **Flexibilidade**: Cada integração pode ter sua própria lógica

## 🐛 **Troubleshooting**

### **Problemas Comuns**

1. **"Freshdesk API Key inválida"**
   - Verifique se a API key está correta
   - Confirme se o domínio está no formato correto

2. **"Eventos não estão sendo processados"**
   - Verifique se o `EventEmitterModule` está importado
   - Confirme se o listener está registrado como provider

3. **"Ticket não encontrado no Freshdesk"**
   - Verifique se a integração Freshdesk está ativa para a empresa
   - Confirme se o ticket foi criado com sucesso
   - Verifique os logs de sincronização

### **Logs para Debug**

```bash
# Filtrar logs relacionados ao Freshdesk
grep "Freshdesk" logs/application.log

# Ver eventos sendo processados
grep "Processando evento" logs/application.log
```

## 📞 **Suporte**

Este sistema foi projetado para ser robusto e auto-suficiente. Em caso de dúvidas:

1. Consulte os logs detalhados
2. Verifique a documentação da API do Freshdesk
3. Teste com tickets simples primeiro
4. Use o ambiente de desenvolvimento para validar

---

## 🎉 **Resumo das Funcionalidades Implementadas**

### ✅ **Recursos Disponíveis:**
1. **Configuração por Empresa** - Cada empresa tem suas próprias credenciais e configurações
2. **Sincronização Condicional** - Funcionalidades podem ser habilitadas/desabilitadas individualmente
3. **Análise Inteligente** - Prioridade automática baseada em palavras-chave
4. **Horário Comercial** - Respeita configurações de tempo para respostas automáticas
5. **Controle de IA** - Permite filtrar mensagens da inteligência artificial
6. **Transferência Flexível** - Sincronização de status pode ser desabilitada
7. **Gestão de Contatos** - Sincronização opcional entre sistemas

### 🔧 **Campos do DTO Implementados:**
```typescript
{
  domain: string,              // Obrigatório
  api_key: string,             // Obrigatório
  auto_responses?: boolean,    // Opcional
  priority_analysis?: boolean, // Opcional
  business_hours_check?: boolean, // Opcional
  ai_integration?: boolean,    // Opcional
  ticket_transfer?: boolean,   // Opcional
  contact_sync?: boolean,      // Opcional
  phone?: string              // Opcional
}
```

**🎉 Pronto! Sua integração Freshdesk baseada em eventos está configurada e pronta para escalar!** 