# Gasto Consciente

Aplicação web de gestão financeira pessoal desenvolvida com HTML5, CSS3 e JavaScript puro (Vanilla JS), com armazenamento local pelo navegador.

> Observação sobre os dados: a persistência do `localStorage` em páginas abertas pelo protocolo `file://` pode variar conforme o navegador e suas configurações. Para uma demonstração em que seja essencial garantir que os dados continuem salvos entre sessões, execute o `index.html` modular usando Live Server ou publique a pasta em uma hospedagem estática, como GitHub Pages.

## Funcionalidades

- Dashboard com saldo acumulado, receitas, despesas, economia, gráficos e movimentações recentes.
- Cadastro, edição, exclusão e filtros de receitas e despesas.
- Orçamento mensal total e limites por categoria.
- Relatórios com comparação mensal, despesas por categoria e evolução do resultado.
- Metas financeiras com prazo, progresso e registro de economias.
- Perfil, preferências, remoção de dados de demonstração e limpeza dos dados financeiros.
- Interface responsiva para desktop, tablet e celular.
- Dados fictícios de demonstração identificados e removíveis.

## Organização

```text
gasto-consciente-entrega/
├── index.html                  # versão modular (usar Live Server)
├── index-apresentacao.html     # versão independente (abrir com duplo clique)
├── README.md
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── transactions.js
│   ├── dashboard.js
│   ├── charts.js
│   ├── budget.js
│   ├── reports.js
│   ├── goals.js
│   └── storage.js
└── assets/
    ├── images/
    └── icons/
```

## Armazenamento

Os dados são guardados localmente no navegador pela chave `gastoConsciente.v1`. Não existe backend nem sincronização entre dispositivos. Para remover os dados de exemplo, acesse **Configurações → Remover dados de exemplo**. Para apagar os dados financeiros, use **Configurações → Limpar dados financeiros**.
