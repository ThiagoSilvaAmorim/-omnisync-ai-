import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Produtos reais (pesquisa de mercado 2026).
const produtos = [
  { nome: 'Fone Bluetooth TWS Pro', sku: 'FON-001', categoria: 'Eletrônicos', preco: 159.9, estoque: 120, minimo: 30, status: 'ativo', fornecedor: 'TecParts Ltda' },
  { nome: 'Smartwatch Fitness', sku: 'SWT-002', categoria: 'Eletrônicos', preco: 249.9, estoque: 45, minimo: 20, status: 'ativo', fornecedor: 'TecParts Ltda' },
  { nome: 'Capinha de Celular TPU', sku: 'CAP-003', categoria: 'Acessórios', preco: 34.9, estoque: 320, minimo: 80, status: 'ativo', fornecedor: 'TecParts Ltda' },
  { nome: 'Kit Skincare Básico', sku: 'SKN-004', categoria: 'Beleza', preco: 69.9, estoque: 90, minimo: 30, status: 'ativo', fornecedor: 'Bella Cosméticos' },
  { nome: 'Camiseta Estampada', sku: 'CAM-005', categoria: 'Moda', preco: 79.9, estoque: 150, minimo: 50, status: 'ativo', fornecedor: 'ModaBras Atacado' },
  { nome: 'Creatina Monohidratada 300g', sku: 'CRE-006', categoria: 'Suplementos', preco: 89.9, estoque: 200, minimo: 60, status: 'ativo', fornecedor: 'NutriVida' },
  { nome: 'Air Fryer 4 Litros', sku: 'AFR-007', categoria: 'Eletrodomésticos', preco: 349.9, estoque: 40, minimo: 25, status: 'ativo', fornecedor: 'EletroMix' },
  { nome: 'Aspirador Portátil', sku: 'ASP-008', categoria: 'Casa', preco: 349.9, estoque: 25, minimo: 20, status: 'baixo', fornecedor: 'CasaBem Dist.' },
  { nome: 'Máquina de Café Expresso', sku: 'CAF-009', categoria: 'Cozinha', preco: 499.9, estoque: 18, minimo: 15, status: 'ativo', fornecedor: 'CasaBem Dist.' },
  { nome: 'Cadeira Ergonômica Home Office', sku: 'CAD-010', categoria: 'Home Office', preco: 799.9, estoque: 12, minimo: 15, status: 'baixo', fornecedor: 'EletroMix' },
  { nome: 'Câmera de Segurança Wi-Fi', sku: 'CAM-011', categoria: 'Segurança', preco: 189.9, estoque: 55, minimo: 25, status: 'ativo', fornecedor: 'TecParts Ltda' },
  { nome: 'Tapete Higiênico Pet', sku: 'PET-012', categoria: 'Pets', preco: 59.9, estoque: 8, minimo: 20, status: 'critico', fornecedor: 'PetStore Atacado' },
];

const pedidos = [
  { id: 'PED-1001', cliente: 'João Silva', data: '20/05/2026', total: 349.9, itens: 2, status: 'entregue' },
  { id: 'PED-1002', cliente: 'Maria Santos', data: '20/05/2026', total: 159.9, itens: 1, status: 'enviado' },
  { id: 'PED-1003', cliente: 'Pedro Oliveira', data: '19/05/2026', total: 949.7, itens: 3, status: 'processando' },
  { id: 'PED-1004', cliente: 'Ana Costa', data: '19/05/2026', total: 69.9, itens: 1, status: 'pendente' },
  { id: 'PED-1005', cliente: 'Carlos Lima', data: '18/05/2026', total: 499.9, itens: 2, status: 'entregue' },
  { id: 'PED-1006', cliente: 'Fernanda Alves', data: '18/05/2026', total: 89.9, itens: 1, status: 'cancelado' },
];

const clientes = [
  { nome: 'Loja Tech Center', tipo: 'loja', email: 'contato@techcenter.com.br', telefone: '(11) 3333-1000', cidade: 'São Paulo', segmento: 'Varejo', totalPedidos: 32, totalGasto: 48600, status: 'vip', ultimoContato: '20/05/2026' },
  { nome: 'João Silva', tipo: 'pessoa', email: 'joao@email.com', telefone: '(11) 99999-1234', cidade: 'São Paulo', segmento: 'Consumidor', totalPedidos: 12, totalGasto: 4320, status: 'ativo', ultimoContato: '19/05/2026' },
  { nome: 'Maria Santos', tipo: 'pessoa', email: 'maria@email.com', telefone: '(11) 98888-5678', cidade: 'Rio de Janeiro', segmento: 'Consumidor', totalPedidos: 8, totalGasto: 2980, status: 'ativo', ultimoContato: '18/05/2026' },
  { nome: 'Boutique Bella Moda', tipo: 'loja', email: 'compras@bellamoda.com.br', telefone: '(21) 3222-4400', cidade: 'Rio de Janeiro', segmento: 'Moda', totalPedidos: 18, totalGasto: 27800, status: 'vip', ultimoContato: '17/05/2026' },
  { nome: 'Pedro Oliveira', tipo: 'pessoa', email: 'pedro@email.com', telefone: '(21) 97777-4321', cidade: 'Belo Horizonte', segmento: 'Consumidor', totalPedidos: 15, totalGasto: 6890, status: 'vip', ultimoContato: '16/05/2026' },
  { nome: 'Distribuidora CasaBem', tipo: 'loja', email: 'pedidos@casabem.com.br', telefone: '(31) 3444-5500', cidade: 'Belo Horizonte', segmento: 'Casa', totalPedidos: 26, totalGasto: 41200, status: 'ativo', ultimoContato: '15/05/2026' },
  { nome: 'Ana Costa', tipo: 'pessoa', email: 'ana@email.com', telefone: '(31) 96666-8765', cidade: 'Porto Alegre', segmento: 'Consumidor', totalPedidos: 3, totalGasto: 720, status: 'inativo', ultimoContato: '10/05/2026' },
  { nome: 'Carlos Lima', tipo: 'pessoa', email: 'carlos@email.com', telefone: '(41) 95555-1111', cidade: 'Curitiba', segmento: 'Revendedor', totalPedidos: 22, totalGasto: 15400, status: 'vip', ultimoContato: '12/05/2026' },
  { nome: 'Pet Store Amigo', tipo: 'loja', email: 'contato@petstoreamigo.com.br', telefone: '(41) 3888-7700', cidade: 'Curitiba', segmento: 'Pets', totalPedidos: 14, totalGasto: 9800, status: 'ativo', ultimoContato: '11/05/2026' },
  { nome: 'Fernanda Alves', tipo: 'pessoa', email: 'fernanda@email.com', telefone: '(51) 94444-2222', cidade: 'Salvador', segmento: 'Consumidor', totalPedidos: 1, totalGasto: 89.9, status: 'novo', ultimoContato: '08/05/2026' },
];

async function main() {
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  for (const p of produtos) await prisma.product.create({ data: p });
  for (const o of pedidos) await prisma.order.create({ data: o });
  for (const c of clientes) await prisma.customer.create({ data: c });

  console.log(`Seed concluído: ${produtos.length} produtos, ${pedidos.length} pedidos, ${clientes.length} clientes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
