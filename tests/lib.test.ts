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

import { buildImport, cleanTitle, detectPlatform, guessIngredients } from '../src/lib/recipeImport.ts'

test('buildImport reads a one-line TikTok caption into a full recipe', () => {
  const caption =
    'Lentejas de la abuela 🥣 #receta Para 4 personas Ingredientes: 300 g de lentejas pardinas, 1 cebolla, 2 dientes de ajo, 1,5 l de caldo Preparación: 1. Pocha la cebolla 10 min. 2. Añade las lentejas y el caldo y cuece 45 min. #lentejas'
  const { recipe, completa, ingredientesDeducidos } = buildImport('https://www.tiktok.com/@a/video/1', { texto: caption })
  assert.ok(completa)
  assert.ok(!ingredientesDeducidos)
  assert.equal(recipe.titulo, 'Lentejas de la abuela')
  assert.equal(recipe.raciones, 4)
  assert.deepEqual(recipe.ingredientes.map((i) => [i.cantidad, i.unidad, i.nombre]), [
    [300, 'g', 'lentejas pardinas'],
    [1, 'ud', 'cebolla'],
    [2, 'ud', 'dientes de ajo'],
    [1.5, 'l', 'caldo'],
  ])
  assert.deepEqual(recipe.pasos, ['Pocha la cebolla 10 min.', 'Añade las lentejas y el caldo y cuece 45 min.'])
  assert.equal(recipe.tiempoCoccion, 55)
})

test('buildImport never invents steps: title-only links get deduced ingredients and no steps', () => {
  const { recipe, completa, ingredientesDeducidos } = buildImport('https://youtu.be/x', { titulo: 'Pechuga de pollo al limón con arroz | Receta fácil' })
  assert.ok(!completa)
  assert.ok(ingredientesDeducidos)
  assert.equal(recipe.titulo, 'Pechuga de pollo al limón con arroz | Receta fácil')
  assert.deepEqual(recipe.ingredientes.map((i) => i.nombre), ['limón', 'pollo', 'arroz'])
  assert.deepEqual(recipe.pasos, [])
  const empty = buildImport('https://www.instagram.com/reel/x', {})
  assert.equal(empty.recipe.titulo, 'Receta importada')
  assert.deepEqual(empty.recipe.ingredientes, [])
})

test('import helpers', () => {
  assert.equal(detectPlatform('https://vm.tiktok.com/ZMabc/'), 'TikTok')
  assert.equal(detectPlatform('https://youtu.be/abc'), 'YouTube')
  assert.equal(detectPlatform('https://eviltiktok.com/x'), null)
  assert.equal(detectPlatform('no es un enlace'), null)
  assert.equal(cleanTitle('#receta #fácil\nTarta de queso 🍰 #postre'), 'Tarta de queso')
  assert.deepEqual(guessIngredients('pasta con tomate frito y queso'), ['queso', 'pasta', 'tomate frito'])
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

import { arrayOf, isShoppingItem, readStored, servingsMap, writeStored, type KVStorage } from '../src/lib/storage.ts'
import type { ShoppingItem } from '../src/types/inventory.ts'

const fakeStorage = (init: Record<string, string> = {}): KVStorage & { data: Record<string, string> } => ({
  data: { ...init },
  getItem(k) {
    return k in this.data ? this.data[k] : null
  },
  setItem(k, v) {
    this.data[k] = v
  },
})

test('readStored: roundtrip, salvage of bad items, corrupt backup, blocked storage', () => {
  const validate = arrayOf<ShoppingItem>(isShoppingItem)
  const good: ShoppingItem = { id: 's1', nombre: 'Patatas', categoria: 'Verduras/Hortalizas', cantidad: 2, unidad: 'kg', comprado: true }
  const fallback: ShoppingItem[] = []

  const s = fakeStorage()
  assert.equal(readStored(s, 'k', fallback, validate), fallback, 'empty storage -> fallback')
  assert.ok(writeStored(s, 'k', [good]))
  assert.deepEqual(readStored(s, 'k', fallback, validate), [good])

  // one malformed item doesn't wipe the list
  s.setItem('k', JSON.stringify([good, { id: 'x', nombre: 'roto' }, null]))
  assert.deepEqual(readStored(s, 'k', fallback, validate), [good])

  // unparseable JSON is backed up, never silently lost
  s.setItem('k', '[{"id":"s1",')
  assert.equal(readStored(s, 'k', fallback, validate), fallback)
  assert.equal(s.data['k__corrupt_backup'], '[{"id":"s1",')

  const blocked: KVStorage = { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('QuotaExceeded') } }
  assert.equal(readStored(blocked, 'k', fallback, validate), fallback)
  assert.equal(writeStored(blocked, 'k', [good]), false)

  assert.equal(servingsMap({ r1: 4, r2: 'x' }), undefined)
  assert.deepEqual(servingsMap({ r1: 4 }), { r1: 4 })
})

import { canonicalTikTokUrl, extractTikTokItem, parseTikTokUrl, pickRecipeComments, vttToText } from '../api/_sources.ts'

test('TikTok source parsers', () => {
  assert.deepEqual(parseTikTokUrl('https://www.tiktok.com/@cocina_ana/video/7412345678901234567?is_from_webapp=1'), { author: 'cocina_ana', id: '7412345678901234567' })
  assert.deepEqual(parseTikTokUrl('https://vm.tiktok.com/ZMabc/'), { id: undefined })
  assert.deepEqual(parseTikTokUrl('https://www.tiktok.com/@/video/123?_r=1'), { author: undefined, id: '123' }, 'mobile redirect has no handle')
  assert.deepEqual(parseTikTokUrl('https://www.tiktok.com/@_/video/123'), { author: undefined, id: '123' })
  assert.deepEqual(parseTikTokUrl('https://m.tiktok.com/v/123.html'), { id: '123' })
  assert.equal(canonicalTikTokUrl('123'), 'https://www.tiktok.com/@_/video/123')

  const json = JSON.stringify({
    __DEFAULT_SCOPE__: {
      'webapp.video-detail': {
        itemInfo: {
          itemStruct: {
            desc: 'Lentejas 🥣 Ingredientes: 300 g de lentejas',
            author: { uniqueId: 'cocina_ana' },
            music: { original: true, playUrl: 'https://v45.tiktokcdn-eu.com/audio.mp3' },
            video: {
              playAddr: 'https://attacker.example.com/v.mp4',
              claInfo: { captionInfos: [{ language: 'eng-US', url: 'https://v16.tiktokcdn.com/en.vtt' }, { language: 'spa-ES', url: 'https://v16.tiktokcdn.com/es.vtt' }] },
              subtitleInfos: [{ LanguageCodeName: 'fra-FR', Url: 'javascript:alert(1)' }],
            },
          },
        },
      },
    },
  })
  const item = extractTikTokItem(`<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${json}</script></html>`)
  assert.deepEqual(item, {
    desc: 'Lentejas 🥣 Ingredientes: 300 g de lentejas',
    author: 'cocina_ana',
    captionUrls: ['https://v16.tiktokcdn.com/es.vtt', 'https://v16.tiktokcdn.com/en.vtt'],
    audioUrl: 'https://v45.tiktokcdn-eu.com/audio.mp3',
    videoUrl: undefined,
  }, 'Spanish track first, non-https and non-TikTok hosts dropped')
  assert.equal(extractTikTokItem('<html>login wall</html>'), null)

  assert.equal(
    vttToText('WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nHoy hacemos <c>lentejas</c>\n\n2\n00:00:02.000 --> 00:00:04.000\nHoy hacemos lentejas\nPon 300 gramos'),
    'Hoy hacemos lentejas\nPon 300 gramos',
  )

  const comments = {
    comments: [
      { text: 'qué rico!!', user: { unique_id: 'fan1' }, author_pin: false, stick_position: 0 },
      { text: 'Receta: 300 g lentejas, 1 cebolla...', user: { unique_id: 'cocina_ana' }, author_pin: false, stick_position: 0 },
      { text: 'Fijado: pasos en la descripción', user: { unique_id: 'otro' }, author_pin: true },
    ],
  }
  assert.deepEqual(pickRecipeComments(comments, 'cocina_ana'), ['Receta: 300 g lentejas, 1 cebolla...', 'Fijado: pasos en la descripción'])
  assert.deepEqual(pickRecipeComments({ status_code: 10201 }, 'x'), [])
})

import { parseSpokenRecipe } from '../src/lib/recipeImport.ts'

test('parseSpokenRecipe turns a spoken transcript into ingredients and steps', () => {
  const t =
    'Hola a todos, hoy hacemos unas lentejas de la abuela. Necesitas 300 gramos de lentejas, una cebolla, dos dientes de ajo, un litro de caldo y una cucharada de pimentón. ' +
    'Primero pica la cebolla muy finita. Luego sofríe la cebolla con un chorrito de aceite durante diez minutos. Añade las lentejas y el caldo. ' +
    'Deja que cueza unos 45 minutos. ¡Y a disfrutar, dale like!'
  const { ingredientes, pasos } = parseSpokenRecipe(t)
  const byName = Object.fromEntries(ingredientes.map((i) => [i.nombre, [i.cantidad, i.unidad]]))
  assert.deepEqual(byName['lentejas'], [300, 'g'])
  assert.deepEqual(byName['cebolla'], [1, 'ud'])
  assert.deepEqual(byName['ajo'], [2, 'ud'])
  assert.deepEqual(byName['caldo'], [1, 'l'])
  assert.deepEqual(byName['pimentón'], [15, 'ml'])
  assert.ok(!ingredientes.some((i) => /minutos|chorrito/.test(i.nombre)), 'no times or vague amounts as ingredients')
  assert.deepEqual(pasos, [
    'Pica la cebolla muy finita.',
    'Sofríe la cebolla con un chorrito de aceite durante diez minutos.',
    'Añade las lentejas y el caldo.',
    'Deja que cueza unos 45 minutos.',
  ])
})
