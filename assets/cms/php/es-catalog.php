<?php
/** Validation du catalogue livré. Fichiers locaux seulement, aucune URL temporaire ni récupération réseau. */
function es_catalog_read($file, $mediaDir)
{
    $c = json_decode((string) file_get_contents($file), true, 128, JSON_THROW_ON_ERROR);
    if (($c['version'] ?? null) !== 1 || !preg_match('/^[a-f0-9]{24}$/', $c['source'] ?? '') || count($c['products'] ?? []) > 40) throw new RuntimeException('catalog_invalid');
    $root = realpath($mediaDir);
    foreach ($c['media'] ?? [] as $name => $info) {
        $path = $root ? realpath($root . '/' . $name) : false;
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/', $name) || !$path || dirname($path) !== $root || !hash_equals($info['sha256'] ?? '', hash_file('sha256', $path))) throw new RuntimeException('catalog_media_integrity: ' . $name);
    }
    $handles = []; $skus = [];
    foreach ($c['products'] ?? [] as $p) {
        if (!preg_match('/^[a-zA-Z0-9_-]{1,180}$/', $p['handle'] ?? '') || isset($handles[$p['handle']])) throw new RuntimeException('catalog_handle_invalid');
        $handles[$p['handle']] = true;
        if (!preg_match('/^[A-Z]{3}$/', $p['currency'] ?? '')) throw new RuntimeException('catalog_currency_invalid');
        foreach ([$p['price'], $p['compare_at_price']] as $value) if ($value !== null && (!is_int($value) || $value < 0)) throw new RuntimeException('catalog_price_invalid');
        $keys = [$p['sku']]; $seen = [];
        foreach ($p['variants'] ?? [] as $v) {
            if ($p['options'] && (count($v['options']) !== count($p['options']) || isset($seen[json_encode($v['options'])]))) throw new RuntimeException('catalog_variant_invalid');
            $seen[json_encode($v['options'])] = true;
            if ($v['price'] !== null && (!is_int($v['price']) || $v['price'] < 0)) throw new RuntimeException('catalog_price_invalid');
            if (isset($v['inventory_quantity']) && (!is_int($v['inventory_quantity']) || $v['inventory_quantity'] < 0)) throw new RuntimeException('catalog_stock_invalid');
            if ($p['options']) $keys[] = $v['sku'];
            if (!empty($v['image']) && !isset($c['media'][$v['image']])) throw new RuntimeException('catalog_variant_image_invalid');
        }
        foreach ($keys as $key) {
            $fold = class_exists('Normalizer') ? Normalizer::normalize($key, Normalizer::FORM_KD) : (function_exists('remove_accents') ? remove_accents($key) : $key);
            $fold = strtr(mb_strtolower(preg_replace('/\p{M}/u', '', $fold)), ['ß' => 'ss', 'æ' => 'ae', 'œ' => 'oe']);
            if ($key === '' || isset($skus[$fold])) throw new RuntimeException('catalog_sku_collision');
            $skus[$fold] = true;
        }
        foreach ($p['images'] as $name) if (!isset($c['media'][$name])) throw new RuntimeException('catalog_image_invalid');
    }
    return $c;
}
