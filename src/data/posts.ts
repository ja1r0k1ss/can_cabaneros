/** What a scraper would return for a video post: title, audio transcript (one segment per line) and caption */
export interface VideoPost {
  titulo: string
  transcripcion: string
  descripcion: string
}

// One canned post per platform: the TikTok has only music, the Reel only chatter, the YouTube video dictates the recipe
export const MOCK_POSTS: Record<string, VideoPost> = {
  TikTok: {
    titulo: 'Lentejas de la abuela en 1 hora 🥣 #receta #lentejas #comidacasera',
    transcripcion: '[Música] 🎵',
    descripcion: `Lentejas de la abuela, de las de toda la vida 🥣
⏱ Prep: 15 min · Cocción: 45 min · 4 raciones
Ingredientes:
- 300 g de lentejas pardinas
- 1 cebolla
- 1 zanahoria
- 2 dientes de ajo
- 1 pimiento rojo
- 1 chorizo
- 1 cucharadita de pimentón de la Vera
- 1 l de caldo de verduras
- Aceite de oliva
- Sal
Preparación:
1. Pica la cebolla, la zanahoria y el pimiento en brunoise.
2. Pocha la verdura en la cazuela con un chorrito de aceite a fuego lento 10 min.
3. Añade el ajo y el chorizo en rodajas y rehoga 2 min. Retira del fuego y agrega el pimentón.
4. Incorpora las lentejas lavadas y el caldo. Cuece a fuego medio 45 min hasta que estén tiernas.
5. Rectifica de sal y deja reposar 5 min antes de servir.
#lentejas #recetasfaciles #cuchara`,
  },
  Instagram: {
    titulo: 'Pollo asado con patatas 🍗🥔',
    transcripcion: 'Hoy os enseño mi pollo asado favorito\n¡crujiente por fuera y jugoso por dentro!\nGuarda el post para no perderlo 👇',
    descripcion: `POLLO ASADO CON PATATAS 🍗🥔
Para 4 personas | Prep 15 min | Cocción 60 min
✅ Ingredientes
• 1 kg de muslos de pollo
• 600 g de patatas
• 1 cebolla
• 1 limón
• 3 dientes de ajo
• 100 ml de vino blanco
• 30 ml de aceite de oliva
• 2 g de romero
✅ Pasos
1) Precalienta el horno a 200 °C.
2) Corta las patatas en rodajas y la cebolla en juliana y colócalas en la bandeja.
3) Marca los muslos en la sartén 3 min por lado para dorar la piel.
4) Pon el pollo sobre las patatas con el ajo, el limón y el romero. Riega con el vino y el aceite.
5) Hornea 50 min, dándole la vuelta a mitad.
¡Cuéntame si lo pruebas! 👇
#pollo #asado #recetas`,
  },
  YouTube: {
    titulo: 'Bizcocho de yogur ESPONJOSO (receta fácil) | Can Cabañeros',
    transcripcion: `Bizcocho de yogur esponjoso para 8 porciones
Ingredientes:
1 yogur natural
3 huevos
200 g de azúcar
250 g de harina
100 ml de aceite de girasol
16 g de levadura química
Pasos:
1. Precalienta el horno a 180 °C.
2. Bate los huevos con el azúcar hasta que blanqueen y doblen su volumen.
3. Añade el yogur y el aceite y mezcla.
4. Tamiza la harina con la levadura e incorpórala con movimientos envolventes.
5. Hornea 40 min sin abrir la puerta. Comprueba con un palillo.`,
    descripcion: 'Suscríbete para más recetas 👉 youtube.com/@cancabaneros\nMi libro de recetas: https://example.com',
  },
}
