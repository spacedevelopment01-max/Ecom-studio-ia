<?php
namespace {
/**
 * E-COM STUDIO IA — moteur de rendu des sections Liquid hors de Shopify (CMS Engine V2, phase 11A).
 *
 * Les thèmes exportés vers WordPress rendent ici EXACTEMENT les mêmes fichiers de sections que le thème Shopify et
 * que l'aperçu du studio (aucun second gabarit à maintenir). Les fichiers ont été préparés à l'export (schéma retiré,
 * balise {% liquid %} dépliée, {% render %} remplacé par {% include %}). Bibliothèque : liquid/liquid (MIT), copie
 * non modifiée dans ./liquid ; les écarts avec Shopify (« blank », formulaires, feuilles de style de section,
 * filtres Shopify) sont comblés ci-dessous.
 */

if (!defined('ES_LIQUID_DIR')) define('ES_LIQUID_DIR', __DIR__);

spl_autoload_register(function ($class) {
	if (strpos($class, 'Liquid\\') !== 0) return;
	$file = ES_LIQUID_DIR . '/liquid/' . str_replace('\\', '/', $class) . '.php';
	if (is_file($file)) require_once $file;
});

}

/** Le nom de classe donne le nom de balise (TagIf → if … endif) : même nom que la balise remplacée. */
namespace EsLiquid {
/** Valeur « vide » au sens de Shopify (blank) : nil, faux, chaîne vide ou d'espaces, tableau vide. */
function is_blank($v) {
	if ($v === null || $v === false) return true;
	if (is_string($v)) return trim($v) === '';
	if (is_array($v)) return count($v) === 0;
	return false;
}

/** Comparaisons avec « blank » / « empty » (absentes de la bibliothèque) : même sens que Shopify. */
trait EsBlankAware {
	protected function interpretCondition($left, $right, $op, \Liquid\Context $context) {
		foreach ([['blank', 'empty']] as $words) {
			if (in_array($right, $words, true) || in_array($left, $words, true)) {
				$other = in_array($right, $words, true) ? $left : $right;
				$isBlank = is_blank($context->get($other));
				if ($op === '==') return $isBlank;
				if ($op === '!=' || $op === '<>') return !$isBlank;
			}
		}
		return parent::interpretCondition($left, $right, $op, $context);
	}
}
class TagIf extends \Liquid\Tag\TagIf { use EsBlankAware; }
class TagUnless extends \Liquid\Tag\TagUnless { use EsBlankAware; }

/** {% form 'type', class: '…', id: '…' %} … {% endform %} : formulaire HTML simple (envoi géré par le CMS). */
class TagForm extends \Liquid\AbstractBlock {
	private $attrs = [];
	private $formType = '';
	public function __construct($markup, array &$tokens, ?\Liquid\FileSystem $fileSystem = null) {
		if (preg_match('/^\s*[\'"]([\w-]+)[\'"]/', $markup, $t)) $this->formType = $t[1];
		if (preg_match_all('/(\w+)\s*:\s*(\'[^\']*\'|"[^"]*")/', $markup, $m, PREG_SET_ORDER)) {
			foreach ($m as $x) $this->attrs[$x[1]] = substr($x[2], 1, -1);
		}
		parent::__construct($markup, $tokens, $fileSystem);
	}
	public function render(\Liquid\Context $context) {
		$a = '';
		foreach (['id', 'class'] as $k) if (!empty($this->attrs[$k])) $a .= ' ' . $k . '="' . htmlspecialchars($this->attrs[$k], ENT_QUOTES) . '"';
		$context->push();
		$context->set('form', ['posted_successfully?' => false, 'errors' => null]);
		// Mêmes champs cachés que Shopify ; l'adresse d'envoi est fournie par le CMS (es_form_action).
		$action = function_exists('es_form_action') ? es_form_action($this->formType) : '#';
		$out = '<form method="post" action="' . htmlspecialchars($action, ENT_QUOTES) . '" accept-charset="UTF-8"' . $a . '>'
			. '<input type="hidden" name="form_type" value="' . htmlspecialchars($this->formType, ENT_QUOTES) . '"><input type="hidden" name="utf8" value="✓">'
			. parent::render($context) . '</form>';
		$context->pop();
		return $out;
	}
}
/** {% stylesheet %} : les styles de section sont déjà rassemblés dans la feuille du thème exporté. */
class TagStylesheet extends \Liquid\AbstractBlock {
	public function render(\Liquid\Context $context) { return ''; }
}

}

namespace {
/** Filtres de Shopify utilisés par les sections. */
class EsFilters {
	public static $assetBase = '';
	public static $strings = [];
	public static function asset_url($input) { return self::$assetBase . rawurlencode((string)$input); }
	public static function image_url($input) { return is_array($input) ? ($input['src'] ?? '') : (string)$input; }
	public static function image_tag($input) { return '<img src="' . htmlspecialchars((string)$input, ENT_QUOTES) . '" alt="" loading="lazy">'; }
	public static function stylesheet_tag($input) { return '<link href="' . htmlspecialchars((string)$input, ENT_QUOTES) . '" rel="stylesheet" type="text/css" media="all">'; }
	public static function placeholder_svg_tag($input, $class = '') { return '<svg class="' . htmlspecialchars((string)$class, ENT_QUOTES) . '" viewBox="0 0 100 100" aria-hidden="true"></svg>'; }
	public static function payment_type_svg_tag($input) { return ''; }
	public static function default_errors($input) { return ''; }
	public static function money($input) { return is_numeric($input) ? number_format($input / 100, 2, ',', ' ') . ' €' : (string)$input; }
	public static function t($input) {
		$v = self::$strings[(string)$input] ?? null;
		if ($v === null) return (string)$input;
		$args = array_slice(func_get_args(), 1);
		// Interpolation {{ name }} : la bibliothèque passe les arguments nommés dans un tableau.
		foreach ($args as $a) if (is_array($a)) foreach ($a as $k => $val) $v = str_replace(['{{ ' . $k . ' }}', '{{' . $k . '}}'], (string)$val, $v);
		return $v;
	}
}

/**
 * Rendu d'une section. $dir : dossier contenant sections/ et snippets/ (fichiers préparés à l'export).
 * $globals : settings, shop, routes, linklists, cart, request (mêmes noms que dans Shopify).
 */
function es_liquid_render_section($dir, $type, array $section, array $globals) {
	static $templates = [];
	\Liquid\Liquid::set('INCLUDE_SUFFIX', 'liquid');
	\Liquid\Liquid::set('INCLUDE_PREFIX', '');
	$file = $dir . '/sections/' . preg_replace('/[^a-z0-9_-]/', '', $type) . '.liquid';
	if (!is_file($file)) return '';
	if (!isset($templates[$file])) {
		$tpl = new \Liquid\Template($dir . '/snippets');
		$tpl->registerTag('if', 'EsLiquid\\TagIf');
		$tpl->registerTag('unless', 'EsLiquid\\TagUnless');
		$tpl->registerTag('form', 'EsLiquid\\TagForm');
		$tpl->registerTag('stylesheet', 'EsLiquid\\TagStylesheet');
		$tpl->registerFilter('EsFilters');
		$tpl->parse(file_get_contents($file));
		$templates[$file] = $tpl;
	}
	return $templates[$file]->render(['section' => $section] + $globals);
}
}
