import { describe, it, expect } from 'vitest';
import { montarFornecedorOsm } from '../src/services/osm.js';

// ============================================
// Parse dos elementos do Overpass em
// fornecedores. Foco: contato direto
// (telefone, e-mail, WhatsApp) + localização.
// ============================================

function el(tags, extra = {}) {
  return { type: 'node', id: 1, lat: -22.9, lon: -47.06, tags, ...extra };
}

describe('montarFornecedorOsm', () => {
  it('elemento sem nome é ignorado', () => {
    expect(montarFornecedorOsm(el({ 'addr:street': 'Rua A' }))).toBeNull();
  });

  it('lê telefone (phone e contact:phone) e site', () => {
    const a = montarFornecedorOsm(el({ name: 'Loja A', phone: '11 3456-7890' }));
    expect(a.telefone).toBe('11 3456-7890');

    const b = montarFornecedorOsm(el({ name: 'Loja B', 'contact:phone': '11 9999-0000' }));
    expect(b.telefone).toBe('11 9999-0000');
  });

  it('lê e-mail válido e descarta valor sem arroba', () => {
    const ok = montarFornecedorOsm(el({ name: 'Loja', 'contact:email': 'vendas@loja.com' }));
    expect(ok.email).toBe('vendas@loja.com');

    const invalido = montarFornecedorOsm(el({ name: 'Loja', email: 'sem-arroba' }));
    expect(invalido.email).toBeNull();
  });

  it('WhatsApp explícito com número é usado como está', () => {
    const f = montarFornecedorOsm(el({ name: 'Loja', 'contact:whatsapp': '5511987654321' }));
    expect(f.whatsapp).toBe('5511987654321');
  });

  it('contact:whatsapp=yes aponta para o telefone capturado', () => {
    const f = montarFornecedorOsm(el({
      name: 'Loja',
      phone: '(11) 98765-4321',
      'contact:whatsapp': 'yes',
    }));
    expect(f.whatsapp).toBe('(11) 98765-4321');
  });

  it('contact:whatsapp=no não vira WhatsApp mesmo com telefone', () => {
    const f = montarFornecedorOsm(el({
      name: 'Loja',
      phone: '11 3456-7890',
      'contact:whatsapp': 'no',
    }));
    expect(f.telefone).toBe('11 3456-7890');
    expect(f.whatsapp).toBeNull();
  });

  it('endereço, cidade e UF vêm das tags e caem no contexto quando ausentes', () => {
    const comTag = montarFornecedorOsm(el({
      name: 'Loja',
      'addr:street': 'Av. Central',
      'addr:housenumber': '1000',
      'addr:city': 'Betim',
      'addr:state': 'mg',
    }));
    expect(comTag.endereco).toBe('Av. Central, 1000');
    expect(comTag.cidade).toBe('Betim');
    expect(comTag.uf).toBe('MG');

    const semTag = montarFornecedorOsm(el({ name: 'Loja' }), { cidade: 'Campinas', uf: 'sp' });
    expect(semTag.endereco).toBeNull();
    expect(semTag.cidade).toBe('Campinas');
    expect(semTag.uf).toBe('SP');
  });

  it('categoria prioriza shop/office e usa o contexto como fallback', () => {
    expect(montarFornecedorOsm(el({ name: 'L', shop: 'general' })).categoria).toBe('general');
    expect(montarFornecedorOsm(el({ name: 'L', office: 'company' })).categoria).toBe('company');
    expect(montarFornecedorOsm(el({ name: 'L' }), { categoria: 'wholesale' }).categoria)
      .toBe('wholesale');
  });

  it('geo finita vira lat/lng, inválida vira null (usa center se houver)', () => {
    const f = montarFornecedorOsm(el({ name: 'L' }));
    expect(f.lat).toBe(-22.9);
    expect(f.lng).toBe(-47.06);

    const way = montarFornecedorOsm({
      type: 'way',
      id: 9,
      center: { lat: -23.1, lon: -46.9 },
      tags: { name: 'L' },
    });
    expect(way.osmId).toBe('way/9');
    expect(way.lat).toBe(-23.1);
    expect(way.lng).toBe(-46.9);

    const semGeo = montarFornecedorOsm({ type: 'node', id: 2, tags: { name: 'L' } });
    expect(semGeo.lat).toBeNull();
    expect(semGeo.lng).toBeNull();
  });

  it('fonte é sempre osm e o id mantém tipo/id do Overpass', () => {
    const f = montarFornecedorOsm(el({ name: 'L' }));
    expect(f.fonte).toBe('osm');
    expect(f.osmId).toBe('node/1');
    expect(f.nome).toBe('L');
  });
});
