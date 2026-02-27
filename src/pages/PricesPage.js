import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, ProductTag } from '../components/UIComponents';
import { formatCurrency } from '../utils/helpers';
import { PRODUCT_COLORS } from '../utils/constants';

// ============================================
// PÁGINA: Gestión de Precios (Solo Admin)
// Permite editar los precios de cada producto
// ============================================

const PricesPage = () => {
  const { prices, setPrices } = useApp();
  const [editing, setEditing] = useState(null);     // Producto que se está editando
  const [tempPrice, setTempPrice] = useState('');    // Precio temporal mientras edita

  // Guardar el nuevo precio
  const handleSave = (product) => {
    const val = parseFloat(tempPrice);
    if (!isNaN(val) && val > 0) {
      setPrices((prev) => ({ ...prev, [product]: val }));
    }
    setEditing(null);
  };

  // Iniciar edición
  const handleEdit = (product, currentPrice) => {
    setEditing(product);
    setTempPrice(currentPrice.toString());
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditing(null);
    setTempPrice('');
  };

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Gestión de Precios
      </h2>
      <p className="text-muted mb-3">
        Configure los precios por galón de cada producto
      </p>

      <div className="grid-2">
        {Object.entries(prices).map(([product, price]) => {
          const colors = PRODUCT_COLORS[product];
          const isEditing = editing === product;

          return (
            <Card
              key={product}
              style={{ borderTop: `3px solid ${colors.accent}` }}
            >
              <div className="flex-between">
                <div>
                  <ProductTag product={product} />

                  <div style={{ fontSize: 32, fontWeight: 800, marginTop: 12, color: colors.accent }}>
                    {isEditing ? (
                      <input
                        className="input-field"
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          width: 160,
                          color: colors.accent,
                          background: 'transparent',
                          borderColor: colors.accent,
                        }}
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(product)}
                        autoFocus
                        type="number"
                        step="0.01"
                      />
                    ) : (
                      formatCurrency(price)
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    por galón
                  </div>
                </div>

                <div>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn
                        variant="success"
                        className="btn-icon"
                        onClick={() => handleSave(product)}
                      >
                        ✓
                      </Btn>
                      <Btn
                        variant="ghost"
                        className="btn-icon"
                        onClick={handleCancel}
                      >
                        ✕
                      </Btn>
                    </div>
                  ) : (
                    <Btn
                      variant="ghost"
                      className="btn-icon"
                      onClick={() => handleEdit(product, price)}
                    >
                      ✏️
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricesPage;
