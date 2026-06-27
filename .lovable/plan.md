# Aqua Clear Pool Services — 3 páginas

Construir uma aplicação estática (sem backend) com 3 rotas idênticas às imagens enviadas, usando dados mockados.

## Layout compartilhado (header escuro azul-marinho)
- Logo "AQUA CLEAR / POOL SERVICES" (gota azul) à esquerda
- 3 abas grandes no centro: INVOICE, CLIENTES, ESTIMATIVA (aba ativa fica branca)
- Ícones de busca, sino com badge "3", e perfil "MO – Melissa Oliveira / Admin" à direita
- Implementado em `src/routes/__root.tsx` com `<Outlet />`

## Rotas
- `/` → redireciona para `/invoice`
- `/invoice` → página INVOICE (imagem 3)
- `/clientes` → página CLIENTES (imagem 2)
- `/estimativa` → página ESTIMATIVA (imagem 1)

## Página INVOICE (`src/routes/invoice.tsx`)
Grid 3 colunas:
- **Esquerda — Invoices**: botão "+ New Invoice", tabs (All/Paid/Sent/Overdue/Draft), busca, lista de 5 cards (INV-2025-058…054) com cliente, data, valor e badge de status, botão "View All Invoices"
- **Centro — Invoice detalhado**: header com badge PAID, botões Download PDF e "...", card branco com logo Aqua Clear, dados da empresa, "INVOICE / INV-2025-058", Date/Due Date, Bill To, Service Address, tabela (Description/QTY/Rate/Amount) com 5 linhas, Subtotal/Tax/Total, "Thank you!" e Payment Method
- **Direita — Estimate #EST-2025-031**: badge PENDING, imagem de piscina, título "Pool Repair & Maintenance" + descrição, lista de 5 serviços com preço, Subtotal/Tax/Total, botões "Approve Estimate" (azul) e "Download PDF"
- **Rodapé full-width**: 5 categorias de serviço com ícones (Pool Cleaning, Repairs, Equipment, Chemicals, Scheduled Service)

## Página CLIENTES (`src/routes/clientes.tsx`)
Grid 2 colunas (sidebar + main):
- **Sidebar esquerda**: "Clientes" + botão "+ Novo Cliente", busca, card "Resumo" (Total 128, Ativos 96, Novos 7, Serviços 42), "Próximos Serviços" com 5 itens (data, cliente, badge tipo), card "Cliente Portal" com botão "Compartilhar Link"
- **Main direita**: "Lista de Clientes", filtros (Todos os status, Filtrar, Exportar), tabela com 8 clientes (avatar colorido + iniciais, nome+Residencial, contato, endereço, último serviço, próximo serviço, badge status Ativo/Inativo, ações olho/calendário/menu), paginação "Mostrando 1 a 8 de 128"

## Página ESTIMATIVA (`src/routes/estimativa.tsx`)
Grid 3 colunas:
- **Esquerda — Estimativas**: botão "+ Nova Estimativa", tabs (Todas/Pendentes/Enviadas/Aprovadas/Expiradas), busca + filtro, lista de 5 cards (EST-2025-031…027) com cliente, serviço, data, valor, badge status (Pendente/Aprovada/Enviada/Expirada), botão "Ver todas as estimativas"
- **Centro — Estimativa detalhada**: header "Estimativa #EST-2025-031" + badge PENDENTE, botões Enviar/PDF/..., card branco com logo + "ESTIMATIVA / EST-2025-031", dados empresa, Data/Válida até, Cliente, Endereço do Serviço, tabela "Serviços Solicitados" com 5 linhas (ícone+nome, descrição, qtd, valor unit., total), Observações em bullets, Subtotal/Desconto/Total
- **Direita — Resumo da Estimativa**: imagem da piscina, lista (Serviços 5 itens, Válida até, Tempo estimado 3-4 horas, Garantia 30 dias), card azul "Próximos Passos", botão verde "Aprovar Estimativa" + "Solicitar Alterações", card "Dúvidas?" com telefone e email

## Imagens
- Logo gota Aqua Clear: gerar SVG inline (não precisa imagegen)
- Foto da piscina (usada em Invoice e Estimativa): 1 imagem gerada via imagegen, salva em `src/assets/pool.jpg`

## Design tokens (`src/styles.css`)
- `--brand-navy: oklch(...)` para header (#0b1a3a aprox)
- `--brand-blue: oklch(...)` azul primário dos botões/títulos
- Badges: amber/PENDENTE, green/APROVADA, blue/ENVIADA, gray/EXPIRADA, green/PAID, blue/SENT, orange/OVERDUE
- Avatares circulares com cores pastéis (JS azul, MO laranja, RJ roxo, LA amarelo, CM rosa, EB verde, DW azul claro, SG amarelo claro)
- Fonte: Inter (sistema)

## Stack técnico
- Frontend puro, sem Lovable Cloud (dados mockados em arrays nos arquivos das rotas)
- Componentes shadcn já disponíveis: Button, Input, Badge, Card, Tabs, Table, Avatar
- Ícones via `lucide-react`
- Tudo em português (PT-BR) nas páginas Clientes/Estimativa; Invoice em inglês conforme imagem

## Não inclui
- Funcionalidade real de CRUD, envio de email, geração de PDF, autenticação
- Backend ou banco de dados
- Apenas as 3 telas idênticas às imagens
