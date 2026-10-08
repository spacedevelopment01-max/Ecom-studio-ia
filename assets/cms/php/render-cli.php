<?php
/**
 * Rendu en ligne de commande (tests de parité du studio, jamais livré dans un thème) :
 *   php render-cli.php < entrée.json  →  HTML de chaque section, séparés par une ligne « <!--es-section--> ».
 * Entrée : { dir, assetBase, strings, globals, sections: [{ type, section }] }.
 */
require __DIR__ . '/es-liquid.php';
$in = json_decode(stream_get_contents(STDIN), true);
EsFilters::$assetBase = $in['assetBase'] ?? '';
EsFilters::$strings = $in['strings'] ?? [];
$out = [];
foreach ($in['sections'] as $s) $out[] = es_liquid_render_section($in['dir'], $s['type'], $s['section'], $in['globals'] ?? []);
echo implode("\n<!--es-section-->\n", $out);
