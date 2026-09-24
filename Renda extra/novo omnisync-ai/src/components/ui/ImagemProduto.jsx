import { useState } from 'react';
import { Package } from 'lucide-react';

// ============================================
// ImagemProduto — imagem com fallback elegante:
// se a URL falhar, mostra um ícone no lugar.
// ============================================
export function ImagemProduto({ src, alt = '', className = '' }) {
  const [erro, setErro] = useState(false);

  if (erro || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}
        role="img"
        aria-label={alt || 'sem imagem'}
      >
        <Package className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErro(true)}
      className={`object-cover ${className}`}
    />
  );
}
