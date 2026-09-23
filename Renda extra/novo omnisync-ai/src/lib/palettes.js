// ============================================
// palettes.js — paletas de cores do sistema.
// Cada paleta define os tons principais usados em
// botões, gráficos, bordas ativas e destaques.
// Os valores são tripletos RGB (formato "R G B")
// para funcionar com a opacidade do Tailwind e
// com os gráficos do Recharts.
// ============================================

export const PALETAS = [
  {
    id: 'amber',
    nome: 'Amarelo Seller',
    descricao: 'Amber / Yellow',
    cores: {
      50: '255 251 235',
      100: '254 243 199',
      400: '251 191 36',
      500: '245 158 11',
      600: '217 119 6',
      700: '180 83 9',
    },
  },
  {
    id: 'violet',
    nome: 'Roxo Corporativo',
    descricao: 'Violet / Purple',
    cores: {
      50: '245 243 255',
      100: '237 233 254',
      400: '167 139 250',
      500: '139 92 246',
      600: '124 58 237',
      700: '109 40 217',
    },
  },
  {
    id: 'blue',
    nome: 'Azul Executivo',
    descricao: 'Blue / Indigo',
    cores: {
      50: '238 242 255',
      100: '224 231 255',
      400: '129 140 248',
      500: '99 102 241',
      600: '79 70 229',
      700: '67 56 202',
    },
  },
  {
    id: 'emerald',
    nome: 'Verde Esmeralda',
    descricao: 'Emerald / Teal',
    cores: {
      50: '236 253 245',
      100: '209 250 229',
      400: '52 211 153',
      500: '16 185 129',
      600: '5 150 105',
      700: '4 120 87',
    },
  },
  {
    id: 'slate',
    nome: 'Grafite',
    descricao: 'Slate / Zinc',
    cores: {
      50: '248 250 252',
      100: '241 245 249',
      400: '148 163 184',
      500: '100 116 139',
      600: '71 85 105',
      700: '51 65 85',
    },
  },
];

export const PALETA_PADRAO = 'amber';

// Retorna a paleta pelo id (com fallback para a padrão).
export function getPaleta(id) {
  return PALETAS.find(p => p.id === id) ?? PALETAS[0];
}

// Converte um tripleto RGB ("139 92 246") em cor CSS.
export function rgbCor(tripleto, alpha = 1) {
  return `rgb(${tripleto} / ${alpha})`;
}
