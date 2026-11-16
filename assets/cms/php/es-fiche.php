<?php
/**
 * E-COM STUDIO IA — la fiche produit d'un site monté par SINA, hors de Shopify (chantier « plateformes »).
 *
 * Les pièces d'achat du site (bloc d'achat, tailles et couleurs, lots, packs, barre d'achat) sont écrites une seule
 * fois, en Liquid, avec les objets de Shopify (« product », « variant »). Ici, le produit RÉEL de la plateforme
 * (celui de la boutique) prend la forme de ces objets : prix, versions, stock et identifiants viennent de la
 * boutique à chaque affichage, jamais de valeurs figées à l'export.
 *
 * La plateforme donne un tableau neutre (es_fiche_objet) :
 *   id, titre, handle, url, description, marque, images [{src, alt}], choisie (identifiant de version ou null),
 *   options  [{nom, valeurs [{nom, teinte}]}],
 *   versions [{id, options [valeur…], centimes, barre (centimes ou null), dispo (bool), sku,
 *              stock (entier, ou NULL quand la boutique ne gère pas le stock de cette version), reliquat (bool),
 *              image (indice dans images, ou null), url}]
 * Stock : « inventory_management » ne vaut « shopify » que si la plateforme GÈRE le stock de la version ; sinon il
 * est vide et aucune quantité restante ne peut s'afficher (« plus que N » seulement avec le vrai stock).
 */

/** Valeur d'une option (« Noir », « M ») : s'écrit comme son nom, et répond à .selected, .available, .variant, .swatch. */
class EsValeur implements JsonSerializable {
	private $d;
	public function __construct(array $d) { $this->d = $d; }
	public function field_exists($k) { return array_key_exists($k, $this->d); }
	public function get($k) { return $this->d[$k] ?? null; }
	public function __toString() { return (string) ($this->d['name'] ?? ''); }
	#[\ReturnTypeWillChange]
	public function jsonSerialize() { return (string) ($this->d['name'] ?? ''); }
}

/** Le produit de la plateforme sous la forme de l'objet « product » de Shopify. */
function es_fiche_objet(array $p) {
	$images = [];
	foreach ($p['images'] ?? [] as $i => $im) {
		if (empty($im['src'])) continue;
		$images[] = ['src' => (string) $im['src'], 'alt' => (string) ($im['alt'] ?? ''), 'position' => $i + 1, 'id' => $i + 1];
	}
	$noms = array_map(function ($o) { return (string) $o['nom']; }, $p['options'] ?? []);
	$variants = [];
	foreach ($p['versions'] ?? [] as $v) {
		$opts = array_values(array_map('strval', $v['options'] ?? []));
		$gere = array_key_exists('stock', $v) && $v['stock'] !== null;
		$image = isset($v['image']) && isset($images[$v['image']]) ? $images[$v['image']] : null;
		$variants[] = [
			'id' => (string) $v['id'],
			'title' => $opts ? implode(' / ', $opts) : 'Default Title',
			'options' => $opts, 'option1' => $opts[0] ?? null, 'option2' => $opts[1] ?? null, 'option3' => $opts[2] ?? null,
			'price' => (int) $v['centimes'],
			'compare_at_price' => isset($v['barre']) && (int) $v['barre'] > (int) $v['centimes'] ? (int) $v['barre'] : null,
			'available' => !empty($v['dispo']),
			'sku' => (string) ($v['sku'] ?? ''),
			// Le vrai stock, seulement quand la boutique le gère.
			'inventory_management' => $gere ? 'shopify' : null,
			'inventory_quantity' => $gere ? (int) $v['stock'] : 0,
			'inventory_policy' => !empty($v['reliquat']) ? 'continue' : 'deny',
			'url' => (string) ($v['url'] ?? ($p['url'] ?? '')),
			'featured_image' => $image, 'image' => $image,
			'requires_shipping' => true,
		];
	}
	$choisie = null; $premiere = null;
	foreach ($variants as $v) {
		if ($premiere === null && $v['available']) $premiere = $v;
		if (isset($p['choisie']) && (string) $p['choisie'] === $v['id']) $choisie = $v;
	}
	$courante = $choisie ?: ($premiere ?: ($variants[0] ?? null));
	$options = [];
	foreach ($p['options'] ?? [] as $i => $o) {
		$valeurs = [];
		foreach ($o['valeurs'] ?? [] as $val) {
			$nom = (string) $val['nom'];
			// Disponible : une version au moins porte cette valeur et peut s'acheter. Version visée : celle qui garde les
			// autres choix en cours, sinon la première disponible avec cette valeur.
			$dispo = false; $cible = null;
			foreach ($variants as $v) {
				if (($v['options'][$i] ?? null) !== $nom) continue;
				if ($v['available']) $dispo = true;
				$meme = true;
				foreach ($v['options'] as $j => $x) if ($j !== $i && $courante && ($courante['options'][$j] ?? null) !== $x) $meme = false;
				if ($meme && ($cible === null || !$cible['_meme'])) $cible = $v + ['_meme' => true];
				elseif ($cible === null && $v['available']) $cible = $v + ['_meme' => false];
			}
			if ($cible) unset($cible['_meme']);
			$valeurs[] = new EsValeur(['name' => $nom, 'selected' => $courante && ($courante['options'][$i] ?? null) === $nom, 'available' => $dispo, 'variant' => $cible, 'swatch' => ['color' => !empty($val['teinte']) ? (string) $val['teinte'] : null]]);
		}
		$options[] = ['name' => (string) $o['nom'], 'position' => $i + 1, 'values' => $valeurs, 'selected_value' => $courante ? ($courante['options'][$i] ?? null) : null];
	}
	$prix = array_map(function ($v) { return $v['price']; }, $variants);
	$dispo = false; foreach ($variants as $v) if ($v['available']) $dispo = true;
	return [
		'id' => (string) ($p['id'] ?? ''), 'title' => (string) ($p['titre'] ?? ''), 'handle' => (string) ($p['handle'] ?? ''), 'url' => (string) ($p['url'] ?? ''),
		'description' => (string) ($p['description'] ?? ''), 'content' => (string) ($p['description'] ?? ''), 'vendor' => (string) ($p['marque'] ?? ''), 'type' => '', 'tags' => [],
		'available' => $dispo,
		'price' => $courante ? $courante['price'] : ($prix ? min($prix) : 0), 'price_min' => $prix ? min($prix) : 0, 'price_max' => $prix ? max($prix) : 0, 'price_varies' => $prix && min($prix) !== max($prix),
		'compare_at_price' => $courante ? $courante['compare_at_price'] : null,
		'featured_image' => ($courante && $courante['featured_image']) ? $courante['featured_image'] : ($images[0] ?? null), 'images' => $images, 'media' => $images,
		'options' => $noms, 'options_with_values' => $options,
		'has_only_default_variant' => count($noms) === 0,
		'variants' => $variants,
		'selected_variant' => $choisie, 'first_available_variant' => $premiere, 'selected_or_first_available_variant' => $courante,
	];
}

/**
 * Garde des offres : une pièce qui montre un prix de lot, un pack ou un cadeau (« data-tn-lots », « data-tn-packs »,
 * « data-tn-offre ») n'est rendue que si les remises de l'offre sont EN PLACE dans cette boutique. Sinon elle ne
 * s'affiche pas : aucun prix que le panier ne tiendrait pas.
 */
function es_fiche_garde($html, $remises_en_place) {
	if ($remises_en_place) return $html;
	return preg_match('/\sdata-tn-(?:lots|packs|pack|offre)\b/', $html) ? '' : $html;
}

/** Montant en centimes → texte dans la monnaie de la boutique (réglages de format donnés par la plateforme). */
function es_fiche_argent($centimes, array $f) {
	$dec = (int) ($f['decimales'] ?? 2);
	$n = number_format(((int) $centimes) / 100, $dec, (string) ($f['virgule'] ?? ','), (string) ($f['milliers'] ?? ' '));
	// « 29,00 » se dit « 29 » : même écriture que l'aperçu du Studio.
	if ($dec > 0 && !empty($f['sansZeros'])) $n = preg_replace('/' . preg_quote((string) ($f['virgule'] ?? ','), '/') . '0+$/', '', $n);
	return (string) ($f['avant'] ?? '') . $n . (string) ($f['apres'] ?? "\u{00a0}€");
}
