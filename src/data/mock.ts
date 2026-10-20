import type { PantryItem, ShoppingItem, Utensil } from '../types/inventory'
import type { Recipe } from '../types/recipe'
import { RECIPE_CATALOG } from './recipes'

// Expiry dates relative to today so the "caduca pronto" states always show up
const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv') // sv locale formats as YYYY-MM-DD
}

export const MOCK_PANTRY: PantryItem[] = [
  { id: 'p1', nombre: 'Pimentón de la Vera', categoria: 'Especias', cantidad: 75, unidad: 'g' },
  { id: 'p2', nombre: 'Comino molido', categoria: 'Especias', cantidad: 40, unidad: 'g' },
  { id: 'p3', nombre: 'Orégano', categoria: 'Especias', cantidad: 20, unidad: 'g' },
  { id: 'p4', nombre: 'Pechuga de pollo', categoria: 'Carnes', cantidad: 600, unidad: 'g', fechaCaducidad: inDays(2) },
  { id: 'p5', nombre: 'Carne picada mixta', categoria: 'Carnes', cantidad: 500, unidad: 'g', fechaCaducidad: inDays(-1) },
  { id: 'p6', nombre: 'Lomo de salmón', categoria: 'Pescados', cantidad: 2, unidad: 'ud', fechaCaducidad: inDays(1) },
  { id: 'p7', nombre: 'Atún en lata', categoria: 'Pescados', cantidad: 6, unidad: 'ud', fechaCaducidad: inDays(400) },
  { id: 'p8', nombre: 'Cebolla', categoria: 'Verduras/Hortalizas', cantidad: 4, unidad: 'ud' },
  { id: 'p9', nombre: 'Tomate pera', categoria: 'Verduras/Hortalizas', cantidad: 1, unidad: 'kg', fechaCaducidad: inDays(5) },
  { id: 'p10', nombre: 'Ajo', categoria: 'Verduras/Hortalizas', cantidad: 2, unidad: 'ud' },
  { id: 'p11', nombre: 'Pimiento rojo', categoria: 'Verduras/Hortalizas', cantidad: 0, unidad: 'ud' },
  { id: 'p12', nombre: 'Limón', categoria: 'Frutas', cantidad: 3, unidad: 'ud', fechaCaducidad: inDays(10) },
  { id: 'p13', nombre: 'Plátano', categoria: 'Frutas', cantidad: 5, unidad: 'ud', fechaCaducidad: inDays(3) },
  { id: 'p14', nombre: 'Leche entera', categoria: 'Lácteos', cantidad: 1.5, unidad: 'l', fechaCaducidad: inDays(6) },
  { id: 'p15', nombre: 'Yogur natural', categoria: 'Lácteos', cantidad: 4, unidad: 'ud', fechaCaducidad: inDays(0) },
  { id: 'p16', nombre: 'Queso manchego', categoria: 'Lácteos', cantidad: 250, unidad: 'g', fechaCaducidad: inDays(30) },
  { id: 'p17', nombre: 'Arroz bomba', categoria: 'Granos/Pastas', cantidad: 1, unidad: 'kg' },
  { id: 'p18', nombre: 'Espaguetis', categoria: 'Granos/Pastas', cantidad: 500, unidad: 'g' },
  { id: 'p19', nombre: 'Garbanzos cocidos', categoria: 'Granos/Pastas', cantidad: 2, unidad: 'ud', fechaCaducidad: inDays(200) },
  { id: 'p20', nombre: 'Aceite de oliva virgen extra', categoria: 'Salsas/Aceites', cantidad: 750, unidad: 'ml' },
  { id: 'p21', nombre: 'Salsa de soja', categoria: 'Salsas/Aceites', cantidad: 150, unidad: 'ml', fechaCaducidad: inDays(120) },
  { id: 'p22', nombre: 'Huevos', categoria: 'Otros', cantidad: 8, unidad: 'ud', fechaCaducidad: inDays(9) },
  { id: 'p23', nombre: 'Pan de molde', categoria: 'Otros', cantidad: 1, unidad: 'ud', fechaCaducidad: inDays(4) },
]

export const MOCK_UTENSILS: Utensil[] = [
  { id: 'u1', nombre: 'Sartén antiadherente 28 cm', categoria: 'Sartén', disponible: true },
  { id: 'u2', nombre: 'Sartén de hierro', categoria: 'Sartén', disponible: false },
  { id: 'u3', nombre: 'Paellera 40 cm', categoria: 'Sartén', disponible: true },
  { id: 'u4', nombre: 'Olla exprés', categoria: 'Olla', disponible: true },
  { id: 'u5', nombre: 'Cazo pequeño', categoria: 'Olla', disponible: true },
  { id: 'u6', nombre: 'Horno convencional', categoria: 'Horno', disponible: true },
  { id: 'u7', nombre: 'Microondas', categoria: 'Horno', disponible: true },
  { id: 'u8', nombre: 'Airfryer 5 l', categoria: 'Airfryer', disponible: true },
  { id: 'u9', nombre: 'Batidora de mano', categoria: 'Batidora', disponible: true },
  { id: 'u10', nombre: 'Batidora de vaso', categoria: 'Batidora', disponible: false },
  { id: 'u11', nombre: 'Cuchillo de chef', categoria: 'Utensilio manual', disponible: true },
  { id: 'u12', nombre: 'Rallador', categoria: 'Utensilio manual', disponible: true },
  { id: 'u13', nombre: 'Mortero', categoria: 'Utensilio manual', disponible: true },
  { id: 'u14', nombre: 'Báscula de cocina', categoria: 'Utensilio manual', disponible: false },
]

export const MOCK_RECIPES: Recipe[] = RECIPE_CATALOG.slice(0, 4).map((r, i) => ({ ...r, id: `r${i + 1}`, origen: 'manual' }))

export const MOCK_SHOPPING: ShoppingItem[] = [
  { id: 's1', nombre: 'Patatas', categoria: 'Verduras/Hortalizas', cantidad: 2, unidad: 'kg', comprado: false },
  { id: 's2', nombre: 'Pimiento rojo', categoria: 'Verduras/Hortalizas', cantidad: 2, unidad: 'ud', comprado: true },
  { id: 's3', nombre: 'Yogur natural', categoria: 'Lácteos', cantidad: 8, unidad: 'ud', comprado: false },
]
