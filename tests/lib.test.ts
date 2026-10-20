// Run with: npm test (Node 24 strips the TypeScript types natively)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deductFromPantry, mergeItems } from '../src/lib/pantry.ts'
import { parseIngredientLine, shortfall, stepSeconds } from '../src/lib/recipes.ts'
import type { PantryItem } from '../src/types/inventory.ts'

const pantry: PantryItem[] = [
  { id: '1', nombre: 'Aceite de oliva virgen extra', categoria: 'Salsas/Aceites', cantidad: 750, unidad: 'ml' },
  { id: '2', nombre: 'Tomate pera', categoria: 'Verduras/Hortalizas', cantidad: 1, unidad: 'kg' },
  { id: '3', nombre: 'Salsa de soja', categoria: 'Salsas/Aceites', cantidad: 100, unidad: 'ml' },
  { id: '4', nombre: 'Pimiento rojo', categoria: 'Verduras/Hortalizas', cantidad: 0, unidad: 'ud' },
  { id: '5', nombre: 'Limón', categoria: 'Frutas', cantidad: 3, unidad: 'ud' },
  { id: '6', nombre: 'Tomate cherry', categoria: 'Verduras/Hortalizas', cantidad: 200, unidad: 'g', fechaCaducidad: '2026-01-01' },
]

test('mergeItems sums matching items with unit conversion', () => {
  const out = mergeItems(pantry, [
    { nombre: 'aceite de oliva VIRGEN extra', categoria: 'Salsas/Aceites', cantidad: 1, unidad: 'l' },
    { nombre: 'Tomate pera', categoria: 'Verduras/Hortalizas', cantidad: 500, unidad: 'g' },
    { nombre: 'Limon', categoria: 'Frutas', cantidad: 200, unidad: 'g' }, // incompatible unit -> new row
    { nombre: 'Espinacas', categoria: 'Verduras/Hortalizas', cantidad: 300, unidad: 'g' },
  ])
  assert.equal(out.find((p) => p.id === '1')!.cantidad, 1750)
  assert.equal(out.find((p) => p.id === '2')!.cantidad, 1.5)
  assert.equal(out.find((p) => p.id === '5')!.cantidad, 3)
  assert.equal(out.length, pantry.length + 2)
  assert.equal(pantry[0].cantidad, 750, 'input not mutated')
})

test('parseIngredientLine', () => {
  assert.deepEqual(parseIngredientLine('200 g de arroz'), { nombre: 'arroz', cantidad: 200, unidad: 'g' })
  assert.deepEqual(parseIngredientLine('500ml leche'), { nombre: 'leche', cantidad: 500, unidad: 'ml' })
  assert.deepEqual(parseIngredientLine('1,5 kg patatas'), { nombre: 'patatas', cantidad: 1.5, unidad: 'kg' })
  assert.deepEqual(parseIngredientLine('2 huevos'), { nombre: 'huevos', cantidad: 2, unidad: 'ud' })
  assert.deepEqual(parseIngredientLine('1 limón'), { nombre: 'limón', cantidad: 1, unidad: 'ud' })
  assert.deepEqual(parseIngredientLine('2 láminas de lasaña'), { nombre: 'láminas de lasaña', cantidad: 2, unidad: 'ud' })
  assert.deepEqual(parseIngredientLine('sal'), { nombre: 'sal' })
  assert.equal(parseIngredientLine('   '), null)
})

test('shortfall: names, plurals, accents, quantities', () => {
  assert.equal(shortfall({ nombre: 'aceite de oliva', cantidad: 1, unidad: 'l' }, pantry)!.cantidad, 0.25)
  assert.equal(shortfall({ nombre: 'aceite de oliva', cantidad: 500, unidad: 'ml' }, pantry), null)
  assert.equal(shortfall({ nombre: 'tomates', cantidad: 1200, unidad: 'g' }, pantry), null, 'sums 1 kg + 200 g')
  assert.equal(shortfall({ nombre: 'limones', cantidad: 2, unidad: 'ud' }, pantry), null)
  assert.equal(shortfall({ nombre: 'limón', cantidad: 100, unidad: 'g' }, pantry), null, 'incompatible unit counts as present')
  assert.equal(shortfall({ nombre: 'sal' }, pantry), null, 'basic')
  assert.ok(shortfall({ nombre: 'salsa de tomate' }, pantry))
  assert.ok(shortfall({ nombre: 'pimiento rojo', cantidad: 1, unidad: 'ud' }, pantry), 'out of stock')
  assert.ok(shortfall({ nombre: 'patatas' }, pantry))
})

test('deductFromPantry subtracts exact amounts, soonest expiry first, never below 0', () => {
  const out = deductFromPantry(pantry, [
    { nombre: 'tomate', cantidad: 300, unidad: 'g' }, // 200 g cherry (expires first) + 100 g pera
    { nombre: 'aceite de oliva', cantidad: 2, unidad: 'l' },
    { nombre: 'limón', cantidad: 1, unidad: 'ud' },
    { nombre: 'sal' },
  ])
  const q = (id: string) => out.find((p) => p.id === id)!.cantidad
  assert.equal(q('6'), 0)
  assert.equal(q('2'), 0.9)
  assert.equal(q('1'), 0)
  assert.equal(q('5'), 2)
  assert.equal(pantry[1].cantidad, 1, 'input not mutated')
})

test('stepSeconds', () => {
  assert.equal(stepSeconds('Cuece 18 min a fuego medio'), 1080)
  assert.equal(stepSeconds('hornea 12-15 min.'), 720)
  assert.equal(stepSeconds('Deja reposar 1 hora'), 3600)
  assert.equal(stepSeconds('Precalienta el horno a 200 °C.'), null)
  assert.equal(stepSeconds('Añade 2 huevos'), null)
})
