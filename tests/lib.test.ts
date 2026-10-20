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

import { adaptRecipe, adaptationsFor } from '../src/lib/adapt.ts'
import { splitByTechniques } from '../src/lib/techniques.ts'
import { inferUtensils, parseRecipeText } from '../src/lib/recipes.ts'
import type { Utensil } from '../src/types/inventory.ts'
import type { Recipe } from '../src/types/recipe.ts'

test('parseRecipeText reads a caption with emoji headers, bullets, meta and chatter', () => {
  const r = parseRecipeText(`POLLO ASADO 🍗
Para 4 personas | Prep 15 min | Cocción 60 min
✅ Ingredientes
• 1 kg de muslos de pollo
• 3 dientes de ajo
✅ Pasos
1) Precalienta el horno a 200 °C.
2) Hornea 50 min.
¡Guárdalo! 👇
#receta #pollo`)
  assert.equal(r.raciones, 4)
  assert.equal(r.tiempoPrep, 15)
  assert.equal(r.tiempoCoccion, 60)
  assert.deepEqual(r.ingredientes, [
    { nombre: 'muslos de pollo', cantidad: 1, unidad: 'kg' },
    { nombre: 'dientes de ajo', cantidad: 3, unidad: 'ud' },
  ])
  assert.deepEqual(r.pasos, ['Precalienta el horno a 200 °C.', 'Hornea 50 min.'])
  assert.deepEqual(parseRecipeText('[Música] 🎵').ingredientes, [])
  assert.deepEqual(inferUtensils(r.pasos), ['Horno'])
})

test('splitByTechniques highlights techniques case/accent-safely and keeps text intact', () => {
  const text = 'Confita las patatas y la cebolla en juliana. Luego sofríe el ajo y reduce 10 min.'
  const segs = splitByTechniques(text)
  const terms = segs.filter((s) => typeof s !== 'string').map((s) => s.tecnica.termino)
  assert.deepEqual(terms, ['Confitar', 'Cortar en juliana', 'Sofreír', 'Reducir'])
  assert.equal(segs.map((s) => (typeof s === 'string' ? s : s.texto)).join(''), text)
  assert.deepEqual(splitByTechniques('Bate hasta que blanqueen'), ['Bate hasta que blanqueen'], 'no false positive')
  assert.equal(splitByTechniques('Marca los muslos').length, 2)
})

const slowCooker: Utensil = { id: 'a', nombre: 'Olla lenta', capacidad: '3,1 L', categoria: 'Olla lenta', disponible: true }
const airfryer: Utensil = { id: 'b', nombre: 'Airfryer compacta', categoria: 'Airfryer', disponible: true }
const roast: Recipe = {
  id: 'x', titulo: 'Pollo asado', origen: 'url', raciones: 4, tiempoPrep: 15, tiempoCoccion: 60,
  utensilios: ['Horno', 'Sartén'], ingredientes: [],
  pasos: ['Precalienta el horno a 200 °C.', 'Coloca las patatas en la bandeja.', 'Marca el pollo 3 min por lado.', 'Hornea 50 min, dándole la vuelta a mitad.'],
}

test('adaptations: offered only with matching equipment, never twice', () => {
  assert.deepEqual(adaptationsFor(roast, [slowCooker, airfryer]).map((a) => a.label), [
    'Adaptar receta para tu Olla lenta 3,1 L',
    'Adaptar tiempos para tu Airfryer compacta',
  ])
  assert.deepEqual(adaptationsFor(roast, [{ ...slowCooker, disponible: false }]), [])
  const shortOven = { ...roast, pasos: ['Hornea 12-15 min.'] }
  assert.equal(adaptationsFor(shortOven, [slowCooker]).length, 0, 'too short for a slow cooker')
  const adapted = adaptRecipe(roast, adaptationsFor(roast, [slowCooker])[0])
  assert.deepEqual(adaptationsFor(adapted, [slowCooker, airfryer]), [])
})

test('adaptRecipe rewrites steps for slow cooker and airfryer', () => {
  const slow = adaptRecipe(roast, { kind: 'slow', utensil: slowCooker, label: '' })
  assert.equal(slow.adaptadaA, 'Olla lenta 3,1 L')
  assert.notEqual(slow.id, roast.id)
  assert.ok(!slow.pasos.some((p) => /precalienta/i.test(p)))
  assert.ok(slow.pasos.includes('Marca el pollo 3 min por lado.'), 'short sear untouched')
  assert.ok(slow.pasos.includes('Cocina en la olla lenta 4-5 h en alto o 6-8 h en bajo, dándole la vuelta a mitad.'))
  assert.deepEqual(slow.utensilios, ['Sartén', 'Olla lenta'])

  const air = adaptRecipe(roast, { kind: 'air', utensil: airfryer, label: '' })
  assert.equal(air.pasos[0], 'Precalienta la airfryer a 180 °C durante 3 min.')
  assert.equal(air.pasos[1], 'Coloca las patatas en la cesta.')
  assert.equal(air.pasos[3], 'Cocina en la airfryer 40 min, dándole la vuelta a mitad.')
  assert.equal(air.tiempoCoccion, 48)
  assert.deepEqual(air.utensilios, ['Sartén', 'Airfryer'])
})

import { MOCK_POSTS } from '../src/data/posts.ts'

test('every mock post yields a full recipe from audio or caption', () => {
  for (const [platform, post] of Object.entries(MOCK_POSTS)) {
    const audio = parseRecipeText(post.transcripcion)
    const caption = parseRecipeText(post.descripcion)
    const ingredientes = audio.ingredientes.length ? audio.ingredientes : caption.ingredientes
    const pasos = audio.pasos.length ? audio.pasos : caption.pasos
    assert.ok(ingredientes.length >= 5, `${platform} ingredients`)
    assert.equal(pasos.length, 5, `${platform} steps`)
  }
  assert.equal(parseRecipeText(MOCK_POSTS.TikTok.transcripcion).pasos.length, 0, 'TikTok audio is music only')
})

import { isOptional, splitByChanges, substitutesFor } from '../src/lib/substitutes.ts'
import { scaleRecipe } from '../src/lib/recipes.ts'

test('scaleRecipe multiplies quantities with sensible rounding', () => {
  const base: Recipe = {
    id: 'r', titulo: 't', origen: 'manual', raciones: 2, tiempoPrep: 0, tiempoCoccion: 0, pasos: [],
    ingredientes: [
      { nombre: 'arroz', cantidad: 150, unidad: 'g' },
      { nombre: 'huevos', cantidad: 3, unidad: 'ud' },
      { nombre: 'leche', cantidad: 0.25, unidad: 'l' },
      { nombre: 'sal' },
    ],
  }
  const four = scaleRecipe(base, 4)
  assert.equal(four.raciones, 4)
  assert.deepEqual(four.ingredientes.map((i) => i.cantidad), [300, 6, 0.5, undefined])
  assert.deepEqual(scaleRecipe(base, 3).ingredientes.map((i) => i.cantidad), [225, 4.5, 0.38, undefined])
  assert.deepEqual(scaleRecipe(base, 1).ingredientes[1].cantidad, 1.5)
  assert.equal(scaleRecipe(base, 2), base, 'same servings returns the same object')
  assert.equal(base.ingredientes[0].cantidad, 150, 'not mutated')
  // the scaled amount drives the shortfall
  assert.equal(shortfall(four.ingredientes[0], [{ id: 'p', nombre: 'Arroz bomba', categoria: 'Granos/Pastas', cantidad: 200, unidad: 'g' }])!.cantidad, 100)
})

test('isOptional and substitutesFor', () => {
  assert.ok(isOptional('orégano'))
  assert.ok(isOptional('1 cucharadita de pimentón de la Vera'))
  assert.ok(!isOptional('muslos de pollo'))
  assert.ok(!isOptional('salsa de tomate'), 'tomate sauce is not soja sauce')
  const subs = substitutesFor('Mantequilla', pantry)
  assert.deepEqual(subs, [
    { nombre: 'aceite de oliva', enDespensa: true },
    { nombre: 'margarina', enDespensa: false },
  ])
  assert.deepEqual(substitutesFor('caviar', pantry), [])
})

test('splitByChanges marks ingredient mentions accent- and plural-insensitively', () => {
  const changes = [
    { nombre: 'muslos de pollo', sustituto: 'pavo', parcial: false },
    { nombre: 'orégano', sustituto: null, parcial: false },
    { nombre: '2 dientes de ajo', sustituto: null, parcial: true },
  ]
  const text = 'Marca los muslos, añade el ORÉGANO y el ajo picado. Sin ajos extra.'
  const segs = splitByChanges(text, changes)
  assert.equal(segs.map((s) => (typeof s === 'string' ? s : s.texto)).join(''), text)
  assert.deepEqual(
    segs.filter((s) => typeof s !== 'string').map((s) => [s.texto, s.cambio.sustituto]),
    [['muslos', 'pavo'], ['ORÉGANO', null], ['ajo', null], ['ajos', null]],
  )
  assert.deepEqual(splitByChanges('Hornea 40 min', changes), ['Hornea 40 min'])
})
