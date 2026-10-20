export interface Technique {
  termino: string
  /** Regex source (no capture groups) matched case- and word-insensitively against step text */
  patron: string
  definicion: string
}

export const TECHNIQUES: Technique[] = [
  { termino: 'Confitar', patron: 'confit\\p{L}*', definicion: 'Cocinar a fuego muy bajo, sumergido en aceite o grasa, para que quede tierno sin dorarse. El aceite debe burbujear muy poco: si chisporrotea, baja el fuego.' },
  { termino: 'Cortar en juliana', patron: 'juliana', definicion: 'Cortar en tiras largas y finas, como cerillas (unos 3-4 mm de grosor). Primero corta láminas finas, apílalas y córtalas a lo largo.' },
  { termino: 'Cortar en brunoise', patron: 'brunoise', definicion: 'Cortar en dados muy pequeños (2-3 mm). Haz primero una juliana fina y después corta las tiras en cuadraditos.' },
  { termino: 'Pochar', patron: 'poch\\p{L}*', definicion: 'Cocinar verdura (sobre todo cebolla) a fuego lento con un poco de aceite hasta que quede blanda y transparente, sin que se dore. Suele llevar 10-15 min.' },
  { termino: 'Rehogar', patron: 'rehog\\p{L}*', definicion: 'Cocinar brevemente un alimento en poco aceite a fuego medio, removiendo, para que se impregne de grasa y sabor sin llegar a dorarse.' },
  { termino: 'Sofreír', patron: 'sofr\\p{L}*', definicion: 'Freír ligeramente en poco aceite a fuego medio hasta que el alimento empiece a dorarse. Es la base de muchos guisos (sofrito).' },
  { termino: 'Saltear', patron: 'salte\\p{L}*', definicion: 'Cocinar rápido a fuego fuerte con poco aceite, moviendo la sartén o removiendo sin parar para que se dore por fuera y quede jugoso.' },
  { termino: 'Marcar', patron: 'marc(?:a|ar|ad[oa]s?|ando)', definicion: 'Dorar la superficie de carne o pescado a fuego muy fuerte, poco tiempo por cada lado, para darle color y sabor. El interior se termina después.' },
  { termino: 'Nacarar', patron: 'nacar\\p{L}*', definicion: 'Rehogar el arroz en aceite caliente durante 1 min, removiendo, hasta que los granos se vuelvan algo translúcidos. Así quedan más sueltos.' },
  { termino: 'Reducir', patron: 'redu[cz]\\p{L}*', definicion: 'Hervir un líquido sin tapar para que se evapore parte del agua: la salsa espesa y el sabor se concentra. Remueve de vez en cuando.' },
  { termino: 'Al dente', patron: 'al dente', definicion: 'Punto de la pasta (o la verdura) cocida pero que aún ofrece una ligera resistencia al morder. Pruébala 1-2 min antes del tiempo del paquete.' },
  { termino: 'Blanquear', patron: 'blanque(?:ar|a|ado|ada)', definicion: 'Hervir un alimento muy poco tiempo (30 s a 2 min) y enfriarlo enseguida en agua con hielo para fijar el color y cortar la cocción.' },
  { termino: 'Tamizar', patron: 'tamiz\\p{L}*', definicion: 'Pasar la harina (u otro polvo) por un colador fino para quitar grumos y airearla. Da bizcochos más esponjosos.' },
  { termino: 'Movimientos envolventes', patron: 'movimientos envolventes', definicion: 'Mezclar con una espátula de abajo hacia arriba, girando el bol, sin batir. Así no se pierde el aire de los huevos o la nata montada.' },
  { termino: 'A punto de nieve', patron: 'a punto de nieve', definicion: 'Batir claras de huevo hasta que estén blancas, firmes y no se caigan al dar la vuelta al bol.' },
  { termino: 'Baño maría', patron: 'baño mar[ií]a', definicion: 'Calentar un recipiente metido dentro de otro con agua caliente, para que el calor sea suave y uniforme (chocolate, flanes).' },
  { termino: 'Desglasar', patron: 'desglas\\p{L}*', definicion: 'Echar un líquido (vino, caldo) en la sartén caliente tras dorar algo y rascar el fondo para despegar los restos tostados, que dan mucho sabor.' },
  { termino: 'Escalfar', patron: 'escalf\\p{L}*', definicion: 'Cocinar en agua o caldo caliente sin que llegue a hervir con fuerza (unos 80-90 °C). Típico de huevos y pescados.' },
]
