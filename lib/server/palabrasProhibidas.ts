/**
 * Palabras prohibidas en nombres de persona y de empresa (§4.7).
 *
 * Origen: "List of Dirty, Naughty, Obscene and Otherwise Bad Words" de
 * Shutterstock (github.com/LDNOOBW), listas `es` y `en`, licencia CC BY 4.0.
 *
 * Se curó a mano sobre la lista original:
 *  - Se QUITARON entradas que en México son palabras legítimas y bloquearían a
 *    gente con nombres válidos: concha (pan dulce y apodo de Concepción),
 *    martillo, heroína, infierno, drogas, asno, maciza, trío, sádico...
 *  - Se AGREGARON groserías mexicanas de uso corriente que la lista no traía
 *    (chinga, culero, mamón, panocha, naco, pendeja, puto…): la lista en
 *    español original solo tiene 68 entradas y es de español peninsular.
 *  - Se ignoran entradas de 1-2 letras: no aportan y disparan falsos positivos.
 *
 * Todo va normalizado: minúsculas y sin acentos. La comparación es por
 * PALABRA COMPLETA, nunca por subcadena — si no, "Cassandra", "computadora",
 * "cálculo", "análisis" y "Titán" quedarían bloqueados.
 */

/** Una sola palabra: se compara contra cada token del texto. */
export const PALABRAS_PROHIBIDAS = new Set([
  '2g1c', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'apeshit', 'arsehole', 'asesinato',
  'ass', 'asshole', 'assmunch', 'autoerotic', 'babeland', 'bangbros', 'bangbus', 'bareback',
  'barenaked', 'bastard', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beaner', 'beaners',
  'beastiality', 'bestiality', 'bimbos', 'birdlock', 'bitch', 'bitches', 'blowjob',
  'blumpkin', 'bollera', 'bollocks', 'boludo', 'bondage', 'boner', 'boob', 'boobs',
  'bukkake', 'bulldyke', 'bullshit', 'bunghole', 'busty', 'butt', 'buttcheeks', 'butthole',
  'cabron', 'caca', 'cagada', 'cagar', 'cagon', 'camgirl', 'camslut', 'camwhore',
  'carpetmuncher', 'chichis', 'chinga', 'chingada', 'chingado', 'chingar', 'chingas',
  'chingatumadre', 'chinguen', 'chupada', 'chupapollas', 'cialis', 'circlejerk', 'clit',
  'clitoris', 'clusterfuck', 'cock', 'cocks', 'cono', 'coon', 'coons', 'coprolagnia',
  'coprophilia', 'cornhole', 'cornudo', 'creampie', 'culera', 'culero', 'culiao', 'culo',
  'cum', 'cumming', 'cumshot', 'cumshots', 'cunnilingus', 'cunt', 'darkie', 'daterape',
  'deepthroat', 'dendrophilia', 'dick', 'dildo', 'dingleberries', 'dingleberry',
  'doggiestyle', 'doggystyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'dvda',
  'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'esperma', 'eunuch', 'fag',
  'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femdom', 'figging', 'fingerbang',
  'fingering', 'fisting', 'follador', 'follar', 'footjob', 'forro', 'frotting', 'fuck',
  'fuckin', 'fucking', 'fucktards', 'fudgepacker', 'futanari', 'g-spot', 'gangbang',
  'genitals', 'gilipichis', 'gilipollas', 'goatcx', 'goatse', 'gokkun', 'goodpoop',
  'goregasm', 'grope', 'guro', 'handjob', 'hardcore', 'hentai', 'hijadeputa', 'hijaputa',
  'hijodeputa', 'hijoputa', 'homoerotic', 'honkey', 'hooker', 'horny', 'humping', 'idiota',
  'imbecil', 'incest', 'intercourse', 'jailbait', 'jigaboo', 'jiggaboo', 'jiggerboo',
  'jilipollas', 'jizz', 'jota', 'joto', 'juggs', 'kapullo', 'kike', 'kinbaku', 'kinkster',
  'kinky', 'knobbing', 'lameculos', 'livesex', 'lolita', 'lovemaking', 'macizorra',
  'maldito', 'mamada', 'mamar', 'mames', 'mamon', 'mamona', 'marica', 'maricon',
  'mariconazo', 'masturbate', 'masturbating', 'masturbation', 'mierda', 'milf', 'mong',
  'motherfucker', 'muffdiving', 'naca', 'naco', 'nalgas', 'nambla', 'nawashi', 'nazi',
  'negro', 'neonazi', 'nigga', 'nigger', 'nimphomania', 'nipple', 'nipples', 'nsfw', 'nude',
  'nudity', 'nutten', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'orgasm', 'orgy',
  'orina', 'paedophile', 'paki', 'panocha', 'panties', 'panty', 'pedo', 'pedobear',
  'pedophile', 'pegging', 'pelotudo', 'pendeja', 'pendejas', 'pendejo', 'pendejos', 'penis',
  'perra', 'pezon', 'pikey', 'pinche', 'pis', 'pissing', 'pisspig', 'pito', 'playboy',
  'ponyplay', 'poof', 'poon', 'poontang', 'poopchute', 'porn', 'porno', 'pornography',
  'poronga', 'prostituta', 'pthc', 'pubes', 'punany', 'pussy', 'puta', 'putamadre', 'putas',
  'putazo', 'puto', 'putos', 'queaf', 'queef', 'quim', 'racista', 'raghead', 'ramera',
  'rape', 'raping', 'rapist', 'rectum', 'rimjob', 'rimming', 's&m', 'sadism', 'santorum',
  'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexcam', 'sexo', 'sexual', 'sexuality',
  'sexually', 'sexy', 'shemale', 'shibari', 'shit', 'shitblimp', 'shitty', 'shota',
  'shrimping', 'skeet', 'slanteye', 'slut', 'smut', 'snatch', 'snowballing', 'sodomize',
  'sodomy', 'soplagaitas', 'soplapollas', 'spastic', 'spic', 'splooge', 'spooge', 'spunk',
  'strapon', 'strappado', 'suck', 'sucks', 'swastika', 'swinger', 'threesome', 'throating',
  'thumbzilla', 'tit', 'tits', 'titties', 'titty', 'topless', 'tosser', 'towelhead',
  'tranny', 'travesti', 'tribadism', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie',
  'undressing', 'upskirt', 'urophilia', 'vagina', 'verga', 'vergallo', 'vergas', 'verguero',
  'viagra', 'vibrator', 'vorarephilia', 'voyeur', 'voyeurweb', 'voyuer', 'vulva', 'wank',
  'wetback', 'whore', 'worldsex', 'xxx', 'yaoi', 'yiffy', 'zoophilia', 'zorra',
]);

/** Varias palabras: se buscan como frase dentro del texto normalizado. */
export const FRASES_PROHIBIDAS = new Set([
  '2 girls 1 cup', 'alabama hot pocket', 'alaskan pipeline', 'auto erotic', 'baby batter',
  'baby juice', 'ball gag', 'ball gravy', 'ball kicking', 'ball licking', 'ball sack',
  'ball sucking', 'barely legal', 'beaver cleaver', 'beaver lips', 'big black',
  'big breasts', 'big knockers', 'big tits', 'black cock', 'blonde action',
  'blonde on blonde action', 'blow job', 'blow your load', 'blue waffle', 'booty call',
  'brown showers', 'brunette action', 'bullet vibe', 'bung hole', 'camel toe',
  'carpet muncher', 'chocolate rosebuds', 'cleveland steamer', 'clover clamps',
  'concha de tu madre', 'date rape', 'deep throat', 'dirty pillows', 'dirty sanchez',
  'dog style', 'doggie style', 'doggy style', 'donkey punch', 'double dong',
  'double penetration', 'dp action', 'dry hump', 'eat my ass', 'female squirting',
  'foot fetish', 'fuck buttons', 'fudge packer', 'gang bang', 'gay sex', 'giant cock',
  'girl on', 'girl on top', 'girls gone wild', 'god damn', 'golden shower', 'goo girl',
  'group sex', 'hacer una paja', 'hand job', 'hard core', 'hija de puta', 'hijo de puta',
  'hot carl', 'hot chick', 'how to kill', 'how to murder', 'huge fat', 'jack off',
  'jail bait', 'jelly donut', 'jerk off', 'leather restraint', 'leather straight jacket',
  'lemon party', 'make me come', 'male squirting', 'menage a trois', 'missionary position',
  'mound of venus', 'mr hands', 'muff diver', 'nig nog', 'nsfw images', 'one cup two girls',
  'one guy one jar', 'phone sex', 'piece of shit', 'piss pig', 'pleasure chest',
  'pole smoker', 'poop chute', 'prince albert piercing', 'raging boner', 'reverse cowgirl',
  'rosy palm', 'rosy palm and her 5 sisters', 'rusty trombone', 'sexo oral', 'shaved beaver',
  'shaved pussy', 'splooge moose', 'spread legs', 'strap on', 'strip club', 'style doggy',
  'suicide girls', 'sultry women', 'tainted love', 'taste my', 'tea bagging',
  'tetas grandes', 'tied up', 'tight white', 'tongue in a', 'tub girl', 'two girls one cup',
  'urethra play', 'venus mound', 'vete a la mierda', 'violet wand', 'wet dream',
  'white power', 'wrapping men', 'wrinkled starfish', 'yellow showers',
]);
